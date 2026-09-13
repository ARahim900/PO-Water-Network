import assert from 'node:assert/strict';
import test from 'node:test';
import { CHANNEL, manningFlow, depthForFlow, rainInChannel, buoyancy, thermalExpansion, peDeratingFactor, leakFlow, leakVolume } from '../src/engine/environment.ts';

test('Manning: the 600 mm channel at 0.5 % carries tens of litres per second before the pipe is reached', () => {
 const q = manningFlow(CHANNEL, CHANNEL.pipeClear);
 assert.ok(q > 0.03 && q < 0.15, `${(q * 1000).toFixed(1)} L/s at pipe invert`);
 assert.ok(Math.abs(depthForFlow(CHANNEL, q) - CHANNEL.pipeClear) < 1e-4);
});

test('rain: 30 mm/h onto the cover width alone is a small inflow; with no outlet the channel still fills', () => {
 const r = rainInChannel(CHANNEL, 0.9, 30, 0.6 * CHANNEL.length);
 assert.ok(r.inflow > 0.002 && r.inflow < 0.01, `${(r.inflow * 1000).toFixed(2)} L/s`);
 assert.ok(!r.submergedIfDraining, 'a draining channel stays below the pipe');
 assert.ok(r.minutesToPipeNoOutlet > 60 && Number.isFinite(r.minutesToFillNoOutlet));
});

test('buoyancy: an empty OD110 SDR11 PE pipe floats hard; even full it is still marginally buoyant', () => {
 const b = buoyancy(0.11, 0.01);
 assert.ok(b.empty > 55 && b.empty < 70, `empty ${b.empty.toFixed(1)} N/m`);
 assert.ok(b.full > 0 && b.full < 5, `full ${b.full.toFixed(2)} N/m`);
});

test('thermal: 280 m of PE over 25 °C grows by more than a metre; PE100 loses a quarter of its rating at 40 °C', () => {
 assert.ok(thermalExpansion(280.38, 25) > 1.2);
 assert.ok(Math.abs(peDeratingFactor(40) - 0.74) < 1e-9 && peDeratingFactor(20) === 1 && Math.abs(peDeratingFactor(35) - 0.805) < 1e-9);
});

test('leak: a 2 mm hole at 3 bar loses about 0.046 L/s, i.e. roughly 4 m³ a day', () => {
 const q = leakFlow(2, 30.6);
 assert.ok(q > 0.00004 && q < 0.00005, `${(q * 1000).toFixed(3)} L/s`);
 assert.ok(Math.abs(leakVolume(q, 1) - 4) < 0.3, `${leakVolume(q, 1).toFixed(2)} m³/day`);
 assert.ok(Math.abs(leakVolume(q, 1) - q * 86400) < 1e-9);
});
