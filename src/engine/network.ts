/**
 * Builds a pipe graph from the CAD plan in networkData.json.
 *
 * The CAD file stores each main as a polyline. Tees are not drawn as separate objects: a branch
 * simply starts at a point that lies on another main. So the graph builder has to
 *   1. collect every polyline endpoint as a candidate junction,
 *   2. split any main where a junction lands on one of its segments,
 *   3. merge points that sit within a small tolerance of each other into one node.
 * Villa services and hydrant branches become short pipes ending at a demand node.
 */
export interface PlanPath { id: string; name: string; kind: string; points: number[][]; length: number; od: number; }
export interface PlanAsset { name: string; kind: string; point: number[]; }
export interface PlanData { paths: PlanPath[]; assets: PlanAsset[]; }

export interface Node { id: number; x: number; y: number; label: string; kind: 'junction' | 'villa' | 'hydrant' | 'source' | 'irrigation'; }
export interface Pipe { id: string; name: string; from: number; to: number; length: number; od: number; kind: string; }
export interface Network { nodes: Node[]; pipes: Pipe[]; source: number; hydrants: { name: string; node: number }[]; villas: number[]; }

const SNAP = 0.15; // metres — CAD vertices that should coincide differ by a few millimetres

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Distance from point p to segment ab and the parameter t (0..1) of the foot of the perpendicular. */
function pointToSegment(p: number[], a: number[], b: number[]) {
 const dx = b[0] - a[0], dy = b[1] - a[1];
 const len2 = dx * dx + dy * dy;
 const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
 const foot = [a[0] + t * dx, a[1] + t * dy];
 return { d: dist(p, foot), t, foot };
}

/** Inserts every junction that lies on the interior of a polyline segment, so tees become vertices. */
function splitAtJunctions(points: number[][], junctions: number[][]): number[][] {
 const out: number[][] = [points[0]];
 for (let i = 0; i < points.length - 1; i++) {
  const a = points[i], b = points[i + 1];
  const hits = junctions
   .map(j => ({ j, ...pointToSegment(j, a, b) }))
   .filter(h => h.d < SNAP && h.t > 1e-4 && h.t < 1 - 1e-4 && dist(h.j, a) > SNAP && dist(h.j, b) > SNAP)
   .sort((p, q) => p.t - q.t);
  for (const h of hits) out.push(h.foot);
  out.push(b);
 }
 return out;
}

export function buildNetwork(data: PlanData): Network {
 const nodes: Node[] = [];
 const nodeAt = (p: number[], label = '', kind: Node['kind'] = 'junction'): number => {
  const found = nodes.find(n => Math.hypot(n.x - p[0], n.y - p[1]) < SNAP);
  if (found) { if (kind !== 'junction') { found.kind = kind; found.label = label; } return found.id; }
  const node: Node = { id: nodes.length, x: p[0], y: p[1], label, kind };
  nodes.push(node);
  return node.id;
 };

 const usable = data.paths.filter(p => p.kind !== 'irrigation'); // the OD32 tank tie-in is normally closed
 const junctions = usable.flatMap(p => [p.points[0], p.points[p.points.length - 1]]);
 const pipes: Pipe[] = [];
 for (const path of usable) {
  const pts = path.kind === 'main' || path.kind === 'link' ? splitAtJunctions(path.points, junctions) : path.points;
  // A polyline becomes one pipe per segment; the CAD length is shared out in proportion to segment length
  // so the total still matches the measured quantity exactly.
  const drawn = pts.slice(1).reduce((s, p, i) => s + dist(pts[i], p), 0);
  pts.slice(1).forEach((p, i) => {
   const seg = dist(pts[i], p);
   if (seg < 1e-6) return;
   pipes.push({ id: `${path.id}#${i}`, name: path.name, from: nodeAt(pts[i]), to: nodeAt(p), length: path.length * seg / drawn, od: path.od, kind: path.kind });
  });
 }
 // Demand nodes sit at the free end of each service and hydrant branch.
 const villas: number[] = [];
 const hydrants: { name: string; node: number }[] = [];
 for (const path of usable) {
  const end = path.points[path.points.length - 1];
  if (path.kind === 'service') villas.push(nodeAt(end, path.name, 'villa'));
  if (path.kind === 'hydrant') {
   const asset = data.assets.filter(a => a.kind === 'hydrant').sort((a, b) => dist(a.point, end) - dist(b.point, end))[0];
   hydrants.push({ name: asset?.name ?? path.name, node: nodeAt(end, asset?.name ?? path.name, 'hydrant') });
  }
 }
 // The bulk meter WM-01 marks the supply. The nearest node to it is the inlet.
 const bulk = data.assets.find(a => a.kind === 'bulk');
 let source = 0;
 if (bulk) {
  source = nodes.reduce((best, n) => Math.hypot(n.x - bulk.point[0], n.y - bulk.point[1]) < Math.hypot(nodes[best].x - bulk.point[0], nodes[best].y - bulk.point[1]) ? n.id : best, 0);
  nodes[source].kind = 'source'; nodes[source].label = bulk.name;
 }
 return { nodes, pipes, source, hydrants, villas };
}

/** Adjacency list: for each node, the pipes touching it. */
export function adjacency(net: Network): number[][] {
 const adj: number[][] = net.nodes.map(() => []);
 net.pipes.forEach((p, i) => { adj[p.from].push(i); adj[p.to].push(i); });
 return adj;
}

/** Shortest path (by length) from the source to every node. Used for the surge "equivalent pipe" and for profiles. */
export function distancesFromSource(net: Network): { dist: number[]; prev: number[] } {
 const n = net.nodes.length;
 const dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false);
 const adj = adjacency(net);
 dist[net.source] = 0;
 for (let k = 0; k < n; k++) {
  let u = -1;
  for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
  if (u < 0 || dist[u] === Infinity) break;
  done[u] = true;
  for (const pi of adj[u]) {
   const p = net.pipes[pi], v = p.from === u ? p.to : p.from;
   if (dist[u] + p.length < dist[v]) { dist[v] = dist[u] + p.length; prev[v] = pi; }
  }
 }
 return { dist, prev };
}
