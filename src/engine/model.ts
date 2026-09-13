/**
 * One place that turns the editable inputs into every number the sections display.
 * Sections never calculate; they read from the Analysis object. That keeps the arithmetic testable
 * and means a figure shown in two places can never disagree with itself.
 */
import plan from '../networkData.json';
import { buildNetwork, distancesFromSource, type Network } from './network.ts';
import { solveSteady, hydrantCapacity, BAR_TO_M, type SteadyResult } from './steady.ts';
import { MATERIALS, waveSpeed, joukowskyHead, criticalTime, bendThrust } from './surge.ts';
import { CHANNEL, rainInChannel, buoyancy, thermalExpansion, peDeratingFactor, leakFlow, leakVolume, type RainResult } from './environment.ts';
import type { Inputs } from './assumptions.ts';

export interface HydrantRow { name: string; node: number; pathLength: number; capacityLps: number; residualAtDuty: number; sowCapacity: number | null; sowResidual: number | null; }
export interface Analysis {
 network: Network;
 pathLength: number[];
 domestic: SteadyResult;            // maximum-day domestic demand, all villas
 domesticMinBar: number; domesticMinVilla: string; domesticMaxVelocity: number;
 fire: SteadyResult;                // duty hydrant + domestic together (the SOW concurrent case)
 fireHydrant: string; fireResidualBar: number;
 hydrants: HydrantRow[];
 material: typeof MATERIALS[number]; inner: number; waveSpeed: number;
 fireVelocity: number; joukowskyBar: number; criticalSeconds: number; remoteLength: number;
 thrust90N: number; thrust45N: number;
 rain: RainResult; catchmentM2: number;
 buoyancy: ReturnType<typeof buoyancy>;
 expansionBuried: number; expansionChannel: number; longestMain: number; derating: number; deratedPn: number;
 leakLps: number; leakBuriedM3: number; leakChannelM3: number;
}

/** SOW Rev 8 §6 screening table — reproduced so the app can show its own result beside the document's. */
const SOW_SCREEN: Record<string, [number, number]> = { 'FH-03': [22.25, 1.91], 'FH-04': [25.65, 2.16], 'FH-06': [19.68, 1.63], 'FH-01': [18.36, 1.44], 'FH-07': [16.73, 1.15] };

const network = buildNetwork(plan);
const { dist } = distancesFromSource(network);
const longestMain = Math.max(...plan.paths.filter(p => p.kind === 'main').map(p => p.length));

export function analyse(inp: Inputs, fireHydrantName?: string): Analysis {
 const material = MATERIALS[inp.materialIndex] ?? MATERIALS[0];
 const inner = material.od - 2 * material.wall;
 const idByOd = (od: number) => od === 110 ? inner : od === 25 ? 0.0204 : 0.0262; // SDR11 bores
 const base = { sourceHead: inp.inletBar * BAR_TO_M, c: inp.hazenC, minorLossFactor: inp.minorLossFactor, idByOd };
 const perVilla = inp.domesticLps / 1000 / network.villas.length;
 const domesticDemand = new Map(network.villas.map(v => [v, perVilla]));
 const domestic = solveSteady(network, { ...base, demands: domesticDemand });
 const villaP = network.villas.map(v => ({ v, p: domestic.pressure[v] })).sort((a, b) => a.p - b.p)[0];

 const hydrants: HydrantRow[] = network.hydrants.map(h => {
  const cap = hydrantCapacity(network, { ...base, demands: new Map() }, h.node, inp.residualBar);
  const sow = SOW_SCREEN[h.name];
  return { name: h.name, node: h.node, pathLength: dist[h.node], capacityLps: cap.flow * 1000, residualAtDuty: solveSteady(network, { ...base, demands: new Map([[h.node, inp.hydrantLps / 1000]]) }).pressure[h.node], sowCapacity: sow?.[0] ?? null, sowResidual: sow?.[1] ?? null };
 });
 const remote = hydrants.reduce((a, b) => b.pathLength > a.pathLength ? b : a);
 const fireRow = hydrants.find(h => h.name === fireHydrantName) ?? remote;
 const fireDemand = new Map(domesticDemand); fireDemand.set(fireRow.node, (fireDemand.get(fireRow.node) ?? 0) + inp.hydrantLps / 1000);
 const fire = solveSteady(network, { ...base, demands: fireDemand });

 const a = waveSpeed(material);
 const area = Math.PI * inner * inner / 4;
 const fireVelocity = inp.hydrantLps / 1000 / area;
 const remoteLength = fireRow.pathLength;
 const rain = rainInChannel(CHANNEL, inp.runoffCoefficient, inp.rainMmPerHour, (CHANNEL.width + inp.catchmentWidthM) * CHANNEL.length);
 const leak = leakFlow(inp.leakHoleMm, inp.inletBar * BAR_TO_M);
 return {
  network, pathLength: dist,
  domestic, domesticMinBar: villaP.p, domesticMinVilla: network.nodes[villaP.v].label, domesticMaxVelocity: Math.max(...domestic.velocity),
  fire, fireHydrant: fireRow.name, fireResidualBar: fire.pressure[fireRow.node],
  hydrants,
  material, inner, waveSpeed: a,
  fireVelocity, joukowskyBar: joukowskyHead(a, fireVelocity) / BAR_TO_M, criticalSeconds: criticalTime(remoteLength, a), remoteLength,
  thrust90N: bendThrust(inp.inletBar, material.od, 90), thrust45N: bendThrust(inp.inletBar, material.od, 45),
  rain, catchmentM2: (CHANNEL.width + inp.catchmentWidthM) * CHANNEL.length,
  buoyancy: buoyancy(material.od, material.wall),
  expansionBuried: thermalExpansion(longestMain, inp.buriedDeltaT), expansionChannel: thermalExpansion(longestMain, inp.channelDeltaT), longestMain,
  derating: peDeratingFactor(inp.channelPipeTempC), deratedPn: material.pn * peDeratingFactor(inp.channelPipeTempC),
  leakLps: leak * 1000, leakBuriedM3: leakVolume(leak, inp.buriedDetectDays), leakChannelM3: leakVolume(leak, inp.channelDetectDays),
 };
}

export const fmt = (n: number, d = 2) => Number.isFinite(n) ? n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
