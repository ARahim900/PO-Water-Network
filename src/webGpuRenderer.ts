import * as THREE from 'three';
import { ClippingGroup, WebGPURenderer } from 'three/webgpu';
import { drawingRatio, type GraphicsRenderer } from './graphicsRenderer';

export async function createWebGpuRenderer(touch: boolean): Promise<GraphicsRenderer> {
 if (!navigator.gpu) throw new Error('WebGPU is unavailable in this browser.');
 const adapter=await navigator.gpu.requestAdapter();
 if(!adapter)throw new Error('The browser refused a WebGPU graphics adapter.');
 const canvas = document.createElement('canvas');
 const context=canvas.getContext('webgpu');
 if(!context)throw new Error('The browser refused a WebGPU canvas.');
 const device=await adapter.requestDevice({requiredFeatures:[...adapter.features] as GPUFeatureName[]});
 const renderer = new WebGPURenderer({ canvas, context, device, alpha: false, antialias: !touch });
 let disposed = false;
 let initialized=false;
 let failed = false;
 const graphicsError = (event: GPUUncapturedErrorEvent) => {
  if (disposed || failed) return;
  failed = true;
  console.error('WebGPU validation failed', event.error.message);
  canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
 };
 device.addEventListener('uncapturederror',graphicsError);
 try {
  await renderer.init();initialized=true;
  renderer.setClearColor('#F7F8F9', 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = false;
  renderer.onDeviceLost = info => {
   if (disposed) return;
   console.warn('Graphics device lost', info.message);
   canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  };
  const clipping = new WeakMap<THREE.Mesh, ClippingGroup>();
  return {
   domElement: canvas, mode: 'webgpu', webgl: null,
   resize(width, height) {
    renderer.setPixelRatio(drawingRatio(width, height, touch));
    renderer.setSize(width, height);
   },
   render(scene, camera) {
    syncClipping(scene, clipping);
    renderer.render(scene, camera);
   },
   dispose() { disposed = true; renderer.dispose();device.removeEventListener('uncapturederror',graphicsError); device.destroy(); canvas.remove(); canvas.width = canvas.height = 1; },
  };
 } catch (error) {
  disposed = true;if(initialized)renderer.dispose();device.removeEventListener('uncapturederror',graphicsError);device.destroy();canvas.remove();throw error;
 }
}

function syncClipping(scene: THREE.Scene, groups: WeakMap<THREE.Mesh, ClippingGroup>): void {
 const meshes: THREE.Mesh[] = [];
 scene.traverse(object => { if (object instanceof THREE.Mesh) meshes.push(object); });
 for (const mesh of meshes) {
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const planes = material.clippingPlanes ?? [];
  let group = groups.get(mesh);
  if (!group && planes.length && mesh.parent) {
   // WebGPU applies cutaways to groups instead of WebGL's material clipping planes.
   group = new ClippingGroup();
   mesh.parent.add(group);group.add(mesh);groups.set(mesh, group);
  }
  if (group) { group.clippingPlanes = planes;group.enabled = planes.length > 0; }
 }
}
