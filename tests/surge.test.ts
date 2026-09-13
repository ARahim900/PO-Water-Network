import assert from 'node:assert/strict';
import test from 'node:test';
import { MATERIALS, waveSpeed, joukowskyHead, criticalTime, simulateMoc, bendThrust } from '../src/engine/surge.ts';

test('PE100 SDR11 wave speed is a few hundred m/s; ductile iron is over 1000 m/s', () => {
 const pe = waveSpeed(MATERIALS[0]), di = waveSpeed(MATERIALS[3]);
 assert.ok(pe > 250 && pe < 450, `PE ${pe.toFixed(0)} m/s`);
 assert.ok(di > 1000 && di < 1400, `DI ${di.toFixed(0)} m/s`);
});

test('Joukowsky: stopping 1 m/s at 330 m/s raises head by about 34 m', () => {
 assert.ok(Math.abs(joukowskyHead(330, 1) - 33.6) < 0.5);
 assert.ok(Math.abs(criticalTime(400, 330) - 2.42) < 0.01);
});

test('MOC: a slow closure stays well below Joukowsky; an instant closure reaches it', () => {
 const base = { length: 400, a: 330, inner: 0.09, sourceHead: 30, flow: 0.01875, frictionHead: 5, event: 'valve' as const };
 const v0 = 0.01875 / (Math.PI * 0.045 * 0.045);
 const slow = simulateMoc({ ...base, duration: 20, tEnd: 25 });
 const fast = simulateMoc({ ...base, duration: 0.05, tEnd: 6 });
 const jk = joukowskyHead(330, v0);
 assert.ok(fast.hMax - 30 > 0.85 * jk, `fast rise ${(fast.hMax - 30).toFixed(1)} vs Joukowsky ${jk.toFixed(1)}`);
 assert.ok(slow.hMax - 30 < 0.35 * jk, `slow rise ${(slow.hMax - 30).toFixed(1)}`);
 assert.ok(Number.isFinite(fast.hMin) && fast.hEnd.length === fast.t.length);
});

test('MOC: pump trip drops the head and may reach the vapour limit on a long run', () => {
 const r = simulateMoc({ length: 400, a: 330, inner: 0.09, sourceHead: 30, flow: 0.01875, frictionHead: 5, event: 'pump', duration: 0.5, tEnd: 8 });
 assert.ok(r.hMin < 30, 'head falls after the trip');
 assert.ok(r.hMin >= -10, 'never below the vapour limit');
});

test('bend thrust at 90° and 3 bar on OD110 is roughly 4 kN', () => {
 assert.ok(Math.abs(bendThrust(3, 0.11, 90) - 4032) < 50);
});
