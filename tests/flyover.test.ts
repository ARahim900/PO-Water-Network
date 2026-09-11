import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { advanceFlight, componentFlight, type Flight } from '../src/interaction.ts';

test('selection framing ignores oversized labels and hidden geometry',()=>{
 const camera=new THREE.PerspectiveCamera(45,.6,.01,100);camera.position.set(0,3,5);
 const controls=new OrbitControls(camera),group=new THREE.Group();group.name='fitting';
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(.14,.12,.16),new THREE.MeshBasicMaterial());group.add(mesh);
 const before=componentFlight(camera,controls,group);
 const sprite=new THREE.Sprite();sprite.scale.set(100,100,1);sprite.position.x=20;group.add(sprite);
 const hidden=mesh.clone();hidden.position.set(40,20,40);hidden.visible=false;group.add(hidden);
 const after=componentFlight(camera,controls,group);
 assert.ok(before.to.distanceTo(after.to)<1e-10);
 assert.ok(before.targetTo.distanceTo(after.targetTo)<1e-10);
 camera.position.copy(after.to);camera.lookAt(after.targetTo);camera.updateMatrixWorld(true);
 for(const x of [-.07,.07])for(const y of [-.06,.06])for(const z of [-.08,.08]){
  const projected=new THREE.Vector3(x,y,z).project(camera);
  assert.ok(Math.abs(projected.x)<.86&&Math.abs(projected.y)<.86);
 }
 mesh.geometry.dispose();mesh.material.dispose();sprite.material.dispose();
});

test('flyover eases into exact endpoints and keeps distance during an opposite-side transition',()=>{
 const camera=new THREE.PerspectiveCamera(),controls=new OrbitControls(camera);
 const flight:Flight={start:100,duration:1800,orbit:true,from:new THREE.Vector3(0,1,3),to:new THREE.Vector3(0,1,-3),targetFrom:new THREE.Vector3(0,0,2),targetTo:new THREE.Vector3(0,0,-2)};
 advanceFlight(flight,camera,controls,false,100);assert.deepEqual(camera.position.toArray(),flight.from.toArray());
 advanceFlight(flight,camera,controls,false,101);assert.ok(camera.position.distanceTo(flight.from)<1e-5);
 advanceFlight(flight,camera,controls,false,1000);assert.ok(camera.position.distanceTo(controls.target)>2,'Avoid cutting across the centre of the model');
 assert.equal(advanceFlight(flight,camera,controls,false,1900),false);assert.deepEqual(camera.position.toArray(),flight.to.toArray());
 advanceFlight(flight,camera,controls,true,100);assert.deepEqual(camera.position.toArray(),flight.to.toArray());
});
