import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { tappingAngle, tappingGeometry, outletSweepRadius } from '../src/tappingGeometry.ts';

test('upper-quadrant tapping retains the main, seal and meter levels in both installation options',()=>{
 for(const level of [-.245,-1.055]){
  const g=tappingGeometry(level);
  assert.equal(tappingAngle,Math.PI/4);
  assert.ok(Math.abs(g.neckStart.distanceTo(new THREE.Vector3(0,level,0))-.055)<1e-10);
  assert.ok(g.neckStart.y>level&&g.neckStart.z>0);
  assert.ok(g.route.at(-1)!.distanceTo(new THREE.Vector3(0,level+.12,1.12))<1e-10);
  const end=g.sweep.at(-1)!;
  assert.ok(end.z<.34-.045/2-.0125,'Sweep ends before the unchanged wall seal');
  assert.ok(Math.abs(end.y-(level+.12))<1e-10);
  assert.ok(g.route.every(p=>p.x===0&&p.y+.0125<0),'Service stays in its existing inspection slot and below ground');
 }
});

test('formed outlet is a continuous circular sweep tangent to neck and villa service',()=>{
 const g=tappingGeometry(-.245);
 assert.ok(g.route[0].distanceTo(g.neckEnd)<1e-10);
 const first=g.sweep[1].clone().sub(g.sweep[0]).normalize();
 const last=g.sweep.at(-1)!.clone().sub(g.sweep.at(-2)!).normalize();
 assert.ok(first.dot(g.normal)>.9999);
 assert.ok(last.dot(new THREE.Vector3(0,0,1))>.9999);
 const centre=new THREE.Vector3(0,g.neckEnd.y-outletSweepRadius*Math.sin(tappingAngle),g.neckEnd.z+outletSweepRadius*Math.cos(tappingAngle));
 assert.ok(g.sweep.every(p=>Math.abs(p.distanceTo(centre)-outletSweepRadius)<1e-10));
});
