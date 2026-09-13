import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildNetwork, distancesFromSource } from '../src/engine/network.ts';
import { solveSteady, hydrantCapacity, hwResistance, BAR_TO_M } from '../src/engine/steady.ts';
import type { Network } from '../src/engine/network.ts';

const plan = JSON.parse(readFileSync(new URL('../src/networkData.json', import.meta.url), 'utf8'));
const id = (od: number) => od === 110 ? 0.090 : 0.0204; // SDR11 internal diameters, m

test('single pipe reproduces the Hazen–Williams head loss exactly', () => {
 const net: Network = { nodes: [{ id: 0, x: 0, y: 0, label: 'S', kind: 'source' }, { id: 1, x: 100, y: 0, label: 'D', kind: 'villa' }], pipes: [{ id: 'p', name: 'p', from: 0, to: 1, length: 100, od: 110, kind: 'main' }], source: 0, hydrants: [], villas: [1] };
 const q = 0.01;
 const r = solveSteady(net, { sourceHead: 30, c: 150, minorLossFactor: 1, demands: new Map([[1, q]]), idByOd: id });
 assert.ok(r.converged);
 assert.ok(Math.abs(r.head[0] - r.head[1] - hwResistance(100, 0.09, 150) * Math.pow(q, 1.852)) < 1e-6);
 assert.ok(Math.abs(r.flow[0] - q) < 1e-9);
});

test('two identical parallel pipes share the flow equally', () => {
 const net: Network = { nodes: [{ id: 0, x: 0, y: 0, label: 'S', kind: 'source' }, { id: 1, x: 100, y: 0, label: 'D', kind: 'villa' }], pipes: [{ id: 'a', name: 'a', from: 0, to: 1, length: 100, od: 110, kind: 'main' }, { id: 'b', name: 'b', from: 1, to: 0, length: 100, od: 110, kind: 'main' }], source: 0, hydrants: [], villas: [1] };
 const r = solveSteady(net, { sourceHead: 30, c: 150, minorLossFactor: 1, demands: new Map([[1, 0.02]]), idByOd: id });
 assert.ok(r.converged);
 assert.ok(Math.abs(r.flow[0] - 0.01) < 1e-8 && Math.abs(r.flow[1] + 0.01) < 1e-8);
});

test('the CAD plan builds one connected network with 33 villas, 5 hydrants and a WM-01 source', () => {
 const net = buildNetwork(plan);
 assert.equal(net.villas.length, 33);
 assert.equal(net.hydrants.length, 5);
 assert.equal(net.nodes[net.source].label, 'WM-01');
 const { dist } = distancesFromSource(net);
 assert.ok(dist.every(d => Number.isFinite(d)), 'every node is reachable from WM-01');
 const od110 = net.pipes.filter(p => p.od === 110).reduce((s, p) => s + p.length, 0);
 assert.ok(Math.abs(od110 - 785.81) < 0.01, `OD110 total preserved: ${od110.toFixed(2)}`);
});

test('the ring closes: Main D is fed from both connectors under domestic demand', () => {
 const net = buildNetwork(plan);
 const demands = new Map(net.villas.map(v => [v, 0.005 / 33]));
 const r = solveSteady(net, { sourceHead: 3 * BAR_TO_M, c: 150, minorLossFactor: 1.25, demands, idByOd: id });
 assert.ok(r.converged, `converged in ${r.iterations}`);
 const links = net.pipes.map((p, i) => ({ p, q: r.flow[i] })).filter(x => x.p.kind === 'link');
 assert.equal(links.length, 2);
 assert.ok(links.every(l => Math.abs(l.q) > 0), 'both ring connectors carry flow');
 assert.ok(r.pressure.every(p => p > 2.5 && p <= 3.0), 'domestic demand alone loses little head');
});

test('hydrant capacity at 1.5 bar residual is in the range of the SOW screening (16–26 L/s)', () => {
 const net = buildNetwork(plan);
 const base = { sourceHead: 3 * BAR_TO_M, c: 150, minorLossFactor: 1.25, demands: new Map<number, number>(), idByOd: id };
 for (const h of net.hydrants) {
  const cap = hydrantCapacity(net, base, h.node, 1.5);
  assert.ok(cap.flow > 0.014 && cap.flow < 0.040, `${h.name}: ${(cap.flow * 1000).toFixed(2)} L/s`);
 }
});
