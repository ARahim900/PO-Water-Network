import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { disposeGroup } from '../src/geometry.ts';

test('view cleanup preserves the geometry shared by new labels and arrows', () => {
 const oldModel = new THREE.Group();
 const sprite = new THREE.Sprite();
 const arrow = new THREE.ArrowHelper();
 oldModel.add(sprite, arrow);
 let sharedDisposals = 0;
 const onDispose = () => { sharedDisposals++; };
 const shared = [sprite.geometry, arrow.line.geometry, arrow.cone.geometry];
 for (const geometry of shared) geometry.addEventListener('dispose', onDispose);
 try {
  disposeGroup(oldModel);
  assert.equal(sharedDisposals, 0);
  assert.equal(new THREE.Sprite().geometry, sprite.geometry);
  assert.equal(new THREE.ArrowHelper().line.geometry, arrow.line.geometry);
 } finally {
  for (const geometry of shared) geometry.removeEventListener('dispose', onDispose);
 }
});

test('view cleanup releases owned geometry, materials and textures exactly once', () => {
 const model = new THREE.Group();
 const geometry = new THREE.BoxGeometry();
 const texture = new THREE.Texture();
 const material = new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture });
 const counts = { geometry: 0, material: 0, texture: 0 };
 geometry.addEventListener('dispose', () => { counts.geometry++; });
 material.addEventListener('dispose', () => { counts.material++; });
 texture.addEventListener('dispose', () => { counts.texture++; });
 model.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
 disposeGroup(model);
 assert.deepEqual(counts, { geometry: 1, material: 1, texture: 1 });
});

test('view cleanup releases the per-instance buffers used by water tracers', () => {
 const model = new THREE.Group();
 const tracers = new THREE.InstancedMesh(new THREE.SphereGeometry(), new THREE.MeshBasicMaterial(), 4);
 let disposals = 0;
 tracers.addEventListener('dispose', () => { disposals++; });
 model.add(tracers);
 disposeGroup(model);
 assert.equal(disposals, 1);
});
