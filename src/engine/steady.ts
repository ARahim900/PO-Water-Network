/**
 * Steady-state network solver — the same method EPANET uses in principle (Newton–Raphson on
 * nodal heads with Hazen–Williams pipe losses), written plainly for a small network.
 *
 * Unknowns: the head at every node except the source (whose head is fixed).
 * Equations: at every node, flow in − flow out − demand = 0.
 * Pipe law:  h = r·Q^1.852, so Q = (h/r)^0.54 — this is Hazen–Williams (SOW Rev 8 basis, C = 150).
 */
import type { Network } from './network.ts';

export interface SteadyInputs {
 sourceHead: number;      // m of water at the inlet node (3.0 bar ≈ 30.6 m)
 c: number;               // Hazen–Williams roughness coefficient
 minorLossFactor: number; // multiplies friction loss; 1.25 = the SOW "25 % reserved for minor losses"
 demands: Map<number, number>; // node → demand in m³/s
 idByOd: (od: number) => number; // internal diameter (m) for a pipe outer diameter (mm)
}
export interface SteadyResult {
 head: number[];          // m, per node
 pressure: number[];      // bar, per node (elevation is 0 everywhere until a survey exists)
 flow: number[];          // m³/s per pipe, positive from → to
 velocity: number[];      // m/s per pipe
 headloss: number[];      // m per pipe
 iterations: number;
 converged: boolean;
}

const HW_EXP = 1.852;
export const BAR_TO_M = 10.197; // 1 bar of water ≈ 10.197 m head

/** Hazen–Williams resistance r such that h = r·Q^1.852 with Q in m³/s, L and D in metres. */
export function hwResistance(length: number, diameter: number, c: number): number {
 return 10.67 * length / (Math.pow(c, HW_EXP) * Math.pow(diameter, 4.8704));
}

/** Gaussian elimination with partial pivoting — small dense systems only. */
function solveLinear(a: number[][], b: number[]): number[] {
 const n = b.length;
 for (let col = 0; col < n; col++) {
  let pivot = col;
  for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
  [a[col], a[pivot]] = [a[pivot], a[col]]; [b[col], b[pivot]] = [b[pivot], b[col]];
  const p = a[col][col];
  if (Math.abs(p) < 1e-14) continue; // isolated node — leave its head unchanged
  for (let r = col + 1; r < n; r++) {
   const f = a[r][col] / p;
   if (f === 0) continue;
   for (let k = col; k < n; k++) a[r][k] -= f * a[col][k];
   b[r] -= f * b[col];
  }
 }
 const x = new Array(n).fill(0);
 for (let r = n - 1; r >= 0; r--) {
  let s = b[r];
  for (let k = r + 1; k < n; k++) s -= a[r][k] * x[k];
  x[r] = Math.abs(a[r][r]) < 1e-14 ? 0 : s / a[r][r];
 }
 return x;
}

export function solveSteady(net: Network, input: SteadyInputs): SteadyResult {
 const n = net.nodes.length;
 const r = net.pipes.map(p => input.minorLossFactor * hwResistance(p.length, input.idByOd(p.od), input.c));
 const head = new Array(n).fill(input.sourceHead);
 const unknown = net.nodes.map(nd => nd.id).filter(id => id !== net.source);
 const index = new Map(unknown.map((id, i) => [id, i]));
 const flow = new Array(net.pipes.length).fill(0);
 const H_MIN = 1e-4; // below this head difference the pipe law is linearised, which keeps the Jacobian finite
 let iterations = 0, converged = false;
 for (; iterations < 60 && !converged; iterations++) {
  const m = unknown.length;
  const J = Array.from({ length: m }, () => new Array(m).fill(0));
  const F = new Array(m).fill(0);
  unknown.forEach((id, i) => { F[i] = -(input.demands.get(id) ?? 0); });
  net.pipes.forEach((p, k) => {
   const dh = head[p.from] - head[p.to];
   const small = Math.abs(dh) < H_MIN;
   const ah = small ? H_MIN : Math.abs(dh);
   const q = Math.pow(ah / r[k], 1 / HW_EXP);          // magnitude of flow at |dh| (or at the kink)
   // Below H_MIN the law is replaced by the secant through the kink, so flow and slope stay
   // continuous and the Jacobian never becomes infinite as a pipe's flow passes through zero.
   const g = small ? q / H_MIN : q / (HW_EXP * ah);     // dQ/dh — conductance
   flow[k] = small ? g * dh : Math.sign(dh) * q;
   const a = index.get(p.from), b = index.get(p.to);
   // flow leaves "from" and enters "to"
   if (a !== undefined) { F[a] -= flow[k]; J[a][a] += g; if (b !== undefined) J[a][b] -= g; }
   if (b !== undefined) { F[b] += flow[k]; J[b][b] += g; if (a !== undefined) J[b][a] -= g; }
  });
  // Newton step. J holds conductances (positive), and F = inflow − outflow − demand, so a node
  // with too little inflow (F < 0) must have its head lowered: J·ΔH = F. Damped so an early
  // wild step cannot throw the iteration.
  const dH = solveLinear(J, F.slice());
  const worst = Math.max(...dH.map(Math.abs));
  const scale = worst > 20 ? 20 / worst : 1;
  unknown.forEach((id, i) => { head[id] += scale * dH[i]; });
  converged = Math.max(...F.map(Math.abs)) < 1e-7 && worst < 1e-5;
 }
 const headloss = net.pipes.map(p => Math.abs(head[p.from] - head[p.to]));
 const velocity = net.pipes.map((p, k) => Math.abs(flow[k]) / (Math.PI * Math.pow(input.idByOd(p.od) / 2, 2)));
 return { head, pressure: head.map(h => h / BAR_TO_M), flow, velocity, headloss, iterations, converged };
}

/** Largest flow a hydrant can take while keeping the target residual — bisection on the demand. */
export function hydrantCapacity(net: Network, base: SteadyInputs, node: number, residualBar: number): { flow: number; residualAtDuty: number; duty: number } {
 const target = residualBar * BAR_TO_M;
 const withFlow = (q: number) => { const d = new Map(base.demands); d.set(node, (d.get(node) ?? 0) + q); return solveSteady(net, { ...base, demands: d }).head[node]; };
 let lo = 0, hi = 0.2; // 200 L/s is far beyond anything an OD110 main can pass
 for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (withFlow(mid) > target) lo = mid; else hi = mid; }
 const duty = 0.01875; // 18.75 L/s — SOW Rev 8 screening duty
 return { flow: lo, residualAtDuty: withFlow(duty) / BAR_TO_M, duty };
}
