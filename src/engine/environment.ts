/**
 * The physics that separates the two installations: rain in the channel, a pipe that can float,
 * a pipe that grows in the heat, and a leak that is or is not seen.
 * Every formula is first-principles and the inputs are listed in assumptions.ts with their status.
 */
import { G } from './surge.ts';

// ---- Rainfall in the covered channel ------------------------------------------------------------
export interface ChannelGeometry { width: number; depth: number; length: number; slope: number; manningN: number; pipeOd: number; pipeClear: number; }
/** MB-PW-DET-Z5-003 Rev 1: 600 × 450 clear, 150 mm clear beneath the pipe, 0.5 % minimum fall, 731.30 m gross. */
export const CHANNEL: ChannelGeometry = { width: 0.6, depth: 0.45, length: 731.30, slope: 0.005, manningN: 0.013, pipeOd: 0.110, pipeClear: 0.15 };

/** Rational-method inflow: Q = C·i·A, with i in mm/h and A in m² → m³/s. */
export const runoffInflow = (coefficient: number, intensityMmPerHour: number, areaM2: number) => coefficient * (intensityMmPerHour / 1000 / 3600) * areaM2;

/** Manning capacity of a rectangular channel flowing at depth d (m³/s). */
export function manningFlow(ch: ChannelGeometry, d: number): number {
 if (d <= 0) return 0;
 const area = ch.width * d, wetted = ch.width + 2 * d, radius = area / wetted;
 return (1 / ch.manningN) * area * Math.pow(radius, 2 / 3) * Math.sqrt(ch.slope);
}
/** The flow depth (m) that carries Q — bisection on Manning. Returns depth capped at the channel depth. */
export function depthForFlow(ch: ChannelGeometry, q: number): number {
 let lo = 0, hi = ch.depth;
 if (manningFlow(ch, hi) < q) return hi;
 for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (manningFlow(ch, mid) < q) lo = mid; else hi = mid; }
 return hi;
}
export interface RainResult {
 inflow: number;          // m³/s into the channel
 depthIfDraining: number; // m, if the fall and outlet exist
 pipeInvert: number;      // m above channel floor
 submergedIfDraining: boolean;
 storage: number;         // m³ the channel can hold before the covers (minus the pipe)
 minutesToFillNoOutlet: number; // if there is no outlet at all
 minutesToPipeNoOutlet: number; // time until water reaches the pipe with no outlet
}
export function rainInChannel(ch: ChannelGeometry, coefficient: number, intensity: number, catchmentM2: number): RainResult {
 const inflow = runoffInflow(coefficient, intensity, catchmentM2);
 const depthIfDraining = depthForFlow(ch, inflow);
 const pipeArea = Math.PI * ch.pipeOd * ch.pipeOd / 4;
 const storage = (ch.width * ch.depth - pipeArea) * ch.length;
 const toPipe = ch.width * ch.pipeClear * ch.length;
 return {
  inflow, depthIfDraining, pipeInvert: ch.pipeClear,
  submergedIfDraining: depthIfDraining > ch.pipeClear,
  storage,
  minutesToFillNoOutlet: inflow > 0 ? storage / inflow / 60 : Infinity,
  minutesToPipeNoOutlet: inflow > 0 ? toPipe / inflow / 60 : Infinity,
 };
}

// ---- Buoyancy of a PE pipe in a flooded channel -------------------------------------------------
/** Net upward force per metre (N/m, positive = floats) for an empty and a water-filled pipe. PE100 ≈ 955 kg/m³. */
export function buoyancy(od: number, wall: number, pipeDensity = 955, waterDensity = 998) {
 const inner = od - 2 * wall;
 const wallArea = Math.PI / 4 * (od * od - inner * inner), boreArea = Math.PI / 4 * inner * inner, outerArea = Math.PI / 4 * od * od;
 const pipeWeight = pipeDensity * wallArea * G, contents = waterDensity * boreArea * G, displaced = waterDensity * outerArea * G;
 return { empty: displaced - pipeWeight, full: displaced - pipeWeight - contents, pipeWeight, displaced };
}

// ---- Thermal movement and pressure derating -----------------------------------------------------
/** Free expansion (m) of a straight PE run: ΔL = α·L·ΔT, α ≈ 0.18 mm/m/°C for PE100. */
export const thermalExpansion = (length: number, deltaT: number, alpha = 0.18e-3) => alpha * length * deltaT;
/** PE100 pressure derating with temperature (ISO 4427 / PPI, generic): factor on PN at 20 °C. Linear between points. */
export function peDeratingFactor(tempC: number): number {
 const table: [number, number][] = [[20, 1.0], [30, 0.87], [40, 0.74], [50, 0.62]];
 if (tempC <= 20) return 1;
 for (let i = 1; i < table.length; i++) if (tempC <= table[i][0]) { const [t0, f0] = table[i - 1], [t1, f1] = table[i]; return f0 + (f1 - f0) * (tempC - t0) / (t1 - t0); }
 return table[table.length - 1][1];
}

// ---- Leak visibility ----------------------------------------------------------------------------
/** Orifice leak: Q = Cd·A·sqrt(2·g·H). A 2 mm hole at 3 bar is roughly 0.3 L/s — this is why buried leaks matter. */
export function leakFlow(holeDiameterMm: number, headM: number, cd = 0.6): number {
 const a = Math.PI / 4 * Math.pow(holeDiameterMm / 1000, 2);
 return cd * a * Math.sqrt(2 * G * Math.max(headM, 0));
}
/** Volume lost before the leak is found: flow × detection delay. */
export const leakVolume = (flowM3s: number, days: number) => flowM3s * days * 86400;
