import { useState } from 'react';
import type { Network } from '../engine/network.ts';
import type { SteadyResult } from '../engine/steady.ts';
/**
 * Plan of the network from the CAD coordinates, with every villa and hydrant coloured by pressure.
 * One hue, light → dark, so the eye reads "darker = more pressure" without a legend lookup.
 */
interface Props { net: Network; result: SteadyResult; lowBar: number; highlight?: number; }
const shade = (t: number) => `color-mix(in oklab, #DCEBF7 ${Math.round((1 - t) * 100)}%, #1F4E8C)`;
export default function PlanMap({ net, result, lowBar, highlight }: Props) {
 const [hover, setHover] = useState<number | null>(null);
 const xs = net.nodes.map(n => n.x), ys = net.nodes.map(n => n.y);
 const minX = Math.min(...xs) - 10, maxX = Math.max(...xs) + 10, minY = Math.min(...ys) - 10, maxY = Math.max(...ys) + 10;
 const W = 720, H = 420, s = Math.min((W - 20) / (maxX - minX), (H - 20) / (maxY - minY));
 const px = (x: number) => 10 + (x - minX) * s, py = (y: number) => H - 10 - (y - minY) * s; // north up
 const pMin = Math.min(...result.pressure), pMax = Math.max(...result.pressure);
 const t = (p: number) => pMax - pMin < 1e-6 ? 1 : (p - pMin) / (pMax - pMin);
 const demandNodes = net.nodes.filter(n => n.kind !== 'junction');
 return <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-[7px] bg-paper" role="img" aria-label="Plan of the Zone 5 network coloured by pressure" onMouseLeave={() => setHover(null)}>
  {net.pipes.map((p, i) => <line key={p.id} x1={px(net.nodes[p.from].x)} y1={py(net.nodes[p.from].y)} x2={px(net.nodes[p.to].x)} y2={py(net.nodes[p.to].y)} stroke={p.od === 110 ? '#4E4456' : '#84B59F'} strokeWidth={p.od === 110 ? 2.5 : 1.5} strokeLinecap="round"><title>{p.name} · {p.length.toFixed(1)} m · {(Math.abs(result.flow[i]) * 1000).toFixed(2)} L/s · {result.velocity[i].toFixed(2)} m/s</title></line>)}
  {demandNodes.map(n => { const p = result.pressure[n.id]; const isSrc = n.kind === 'source'; return <g key={n.id} onMouseEnter={() => setHover(n.id)}>
   <circle cx={px(n.x)} cy={py(n.y)} r={isSrc ? 8 : n.kind === 'hydrant' ? 7 : 5.5} fill={isSrc ? '#fff' : shade(t(p))} stroke={p < lowBar ? '#D67A7A' : highlight === n.id ? '#E8C064' : '#4E4456'} strokeWidth={p < lowBar || highlight === n.id ? 2.5 : 1} />
   {isSrc && <text x={px(n.x) + 11} y={py(n.y) + 4} fontSize="11" fontWeight="600" fill="#4E4456" paintOrder="stroke" stroke="#F7F8F9" strokeWidth="3">WM-01</text>}
   {n.kind === 'hydrant' && <text x={px(n.x) + 9} y={py(n.y) - 6} fontSize="10.5" fontWeight="600" fill="#4E4456" paintOrder="stroke" stroke="#F7F8F9" strokeWidth="3">{n.label}</text>}
  </g>; })}
  {hover !== null && (() => { const n = net.nodes[hover]; const x = Math.min(px(n.x) + 12, W - 172); return <g pointerEvents="none" transform={`translate(${x} ${Math.max(py(n.y) - 40, 4)})`}><rect width="164" height="34" rx="5" fill="rgba(15,23,42,0.85)" /><text x="8" y="14" fontSize="11" fill="#fff">{n.label || n.kind}</text><text x="8" y="28" fontSize="11" fill="#fff">{result.pressure[hover].toFixed(2)} bar · {result.head[hover].toFixed(1)} m head</text></g>; })()}
  <g transform={`translate(${W - 150} ${H - 30})`}><text x="0" y="-6" fontSize="10.5" fill="#6B7280">{pMin.toFixed(2)} bar</text><text x="140" y="-6" textAnchor="end" fontSize="10.5" fill="#6B7280">{pMax.toFixed(2)} bar</text>{Array.from({ length: 10 }, (_, i) => <rect key={i} x={i * 14} y="0" width="14" height="8" fill={shade(i / 9)} />)}</g>
 </svg>;
}
