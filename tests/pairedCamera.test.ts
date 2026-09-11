import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { componentFlight } from '../src/interaction.ts';

test('component focus uses the rebuilt opposite row world position and approaches its villa side',()=>{
 const row=new THREE.Group();row.userData.modelRole='row';row.position.set(.6,0,-1.6);row.rotation.y=Math.PI;
 const service=new THREE.Mesh(new THREE.BoxGeometry(.025,.025,1),new THREE.MeshBasicMaterial());service.position.set(1.7,-.125,.6);row.add(service);
 const camera=new THREE.PerspectiveCamera(45,1.8,.01,100);const controls=new OrbitControls(camera);
 const flight=componentFlight(camera,controls,service);
 assert.ok(flight.targetTo.distanceTo(new THREE.Vector3(-1.1,-.125,-2.2))<1e-6);
 assert.ok(flight.to.z<flight.targetTo.z,'Camera must approach the outward villa side');
 assert.ok(flight.to.y>flight.targetTo.y,'Camera must look down into the service slot');
 service.geometry.dispose();service.material.dispose();
});
