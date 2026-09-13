/**
 * Water hammer (hydraulic transient) on an equivalent single pipeline.
 *
 * Three textbook results are used, all standard (Wylie & Streeter; PPI PE Handbook ch. 6):
 *   1. Wave speed  a = sqrt(K/ρ) / sqrt(1 + (K/E)·(D/e))   — how fast a pressure change travels in the pipe
 *   2. Joukowsky   ΔH = a·ΔV / g                             — the largest surge an instantaneous stop can make
 *   3. Method of characteristics (MOC)                       — the pressure trace over time for a real closure
 *
 * The MOC here treats the path from WM-01 to the chosen point as one straight pipe. That is deliberate:
 * it shows the mechanism clearly, and — because both options use the same pipe — the result is identical
 * for buried and channel installation. What differs is who resists the thrust, which is dealt with elsewhere.
 */
export const G = 9.81;
export const WATER = { density: 998, bulkModulus: 2.2e9 }; // kg/m³, Pa at ~20 °C

export interface PipeMaterial { name: string; modulus: number; pn: number; od: number; wall: number; }
/** Pressure pipe options. PE100 SDR11 PN16 is the SOW Rev 8 specification; the rest are for comparison. */
export const MATERIALS: PipeMaterial[] = [
 { name: 'PE100-RC SDR11 PN16 (SOW Rev 8)', modulus: 1.0e9, pn: 16, od: 0.110, wall: 0.010 },
 { name: 'PE100 SDR17 PN10', modulus: 1.0e9, pn: 10, od: 0.110, wall: 0.0066 },
 { name: 'uPVC PN16', modulus: 3.0e9, pn: 16, od: 0.110, wall: 0.0081 },
 { name: 'Ductile iron K9', modulus: 1.7e11, pn: 40, od: 0.118, wall: 0.006 },
];

export function waveSpeed(m: PipeMaterial, water = WATER): number {
 const inner = m.od - 2 * m.wall;
 return Math.sqrt(water.bulkModulus / water.density) / Math.sqrt(1 + (water.bulkModulus / m.modulus) * (inner / m.wall));
}
/** Joukowsky head rise (m) for a velocity change ΔV (m/s). */
export const joukowskyHead = (a: number, dV: number) => a * dV / G;
/** A closure faster than 2L/a behaves as instantaneous — the full Joukowsky rise appears. */
export const criticalTime = (length: number, a: number) => 2 * length / a;

export interface MocInputs {
 length: number;      // m, equivalent pipe from the source to the point of interest
 a: number;           // m/s wave speed
 inner: number;       // m internal diameter
 sourceHead: number;  // m, reservoir / inlet head
 flow: number;        // m³/s initial steady flow
 frictionHead: number;// m, steady friction loss along the pipe at that flow (from the network solve)
 event: 'valve' | 'pump';
 duration: number;    // s — valve closure time, or pump run-down time
 reaches?: number;    // pipe segments (default 24)
 tEnd?: number;       // s (default 12)
}
export interface MocResult {
 t: number[];         // s
 hEnd: number[];      // head at the downstream end (valve or demand point), m
 hMid: number[];      // head at mid-length, m
 hMax: number; hMin: number; vapour: boolean; // vapour = pressure fell to the cavitation limit somewhere
}

/**
 * MOC on a single pipe with a reservoir upstream. Downstream boundary:
 *   valve — an orifice closing over `duration` (τ falls from 1 to 0 with a smooth law);
 *   pump  — the demand is held and instead the upstream head runs down over `duration`
 *           with a non-return valve, which is the usual simplification of a pump trip.
 */
export function simulateMoc(input: MocInputs): MocResult {
 const N = input.reaches ?? 24, dx = input.length / N, dt = dx / input.a;
 const A = Math.PI * input.inner * input.inner / 4, B = input.a / (G * A);
 // Darcy friction factor back-calculated from the steady loss so the transient starts from the real gradient.
 const f = input.flow > 0 ? input.frictionHead * input.inner * 2 * G * A * A / (input.length * input.flow * input.flow) : 0.02;
 const R = f * dx / (2 * G * input.inner * A * A);
 const VAPOUR = -10; // m gauge — water cannot sustain less; a cavity would open
 const tEnd = input.tEnd ?? 12, steps = Math.ceil(tEnd / dt);
 let H = Array.from({ length: N + 1 }, (_, i) => input.sourceHead - input.frictionHead * i / N);
 let Q = new Array(N + 1).fill(input.flow);
 const H0end = H[N];
 const orifice = input.flow / Math.sqrt(Math.max(H0end, 1e-6)); // Q = Cv·τ·sqrt(H)
 const t: number[] = [], hEnd: number[] = [], hMid: number[] = [];
 let hMax = -Infinity, hMin = Infinity, vapour = false;
 for (let s = 0; s <= steps; s++) {
  const time = s * dt;
  t.push(time); hEnd.push(H[N]); hMid.push(H[Math.floor(N / 2)]);
  hMax = Math.max(hMax, ...H); hMin = Math.min(hMin, ...H);
  const Hn = new Array(N + 1).fill(0), Qn = new Array(N + 1).fill(0);
  // interior points: intersect the C+ line from i-1 and the C- line from i+1
  for (let i = 1; i < N; i++) {
   const cp = H[i - 1] + B * Q[i - 1] - R * Q[i - 1] * Math.abs(Q[i - 1]);
   const cm = H[i + 1] - B * Q[i + 1] + R * Q[i + 1] * Math.abs(Q[i + 1]);
   Hn[i] = (cp + cm) / 2; Qn[i] = (cp - cm) / (2 * B);
  }
  // upstream boundary
  const cmUp = H[1] - B * Q[1] + R * Q[1] * Math.abs(Q[1]);
  if (input.event === 'pump') {
   const run = Math.max(0, 1 - time / input.duration);
   const pumpHead = input.sourceHead * run * run;        // head falls with the square of speed
   const q = (pumpHead - cmUp) / B;
   if (q > 0) { Hn[0] = pumpHead; Qn[0] = q; } else { Qn[0] = 0; Hn[0] = cmUp; } // non-return valve shuts
  } else { Hn[0] = input.sourceHead; Qn[0] = (Hn[0] - cmUp) / B; }
  // downstream boundary
  const cp = H[N - 1] + B * Q[N - 1] - R * Q[N - 1] * Math.abs(Q[N - 1]);
  const tau = input.event === 'valve' ? Math.pow(Math.max(0, 1 - time / input.duration), 1.5) : 1;
  const cv = orifice * tau;
  if (cv <= 0) { Qn[N] = 0; Hn[N] = cp; }
  else { // solve cp − B·Q = (Q/cv)²  → Q² /cv² + B·Q − cp = 0
   const k = 1 / (cv * cv);
   const q = (-B + Math.sqrt(B * B + 4 * k * Math.max(cp, 0))) / (2 * k);
   Qn[N] = q; Hn[N] = cp - B * q;
  }
  for (let i = 0; i <= N; i++) if (Hn[i] < VAPOUR) { Hn[i] = VAPOUR; vapour = true; }
  H = Hn; Q = Qn;
 }
 return { t, hEnd, hMid, hMax, hMin, vapour };
}

/**
 * Unbalanced thrust at a bend when the pressure changes: F = ΔP·A·2·sin(θ/2) for the static part.
 * In a buried pipe the soil takes this; on supports in a channel an anchor must.
 */
export function bendThrust(pressureBar: number, od: number, angleDeg: number): number {
 const A = Math.PI * od * od / 4;
 return pressureBar * 1e5 * A * 2 * Math.sin((angleDeg * Math.PI / 180) / 2);
}
