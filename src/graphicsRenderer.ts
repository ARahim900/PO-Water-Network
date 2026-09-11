import * as THREE from 'three';
import { createWebGpuRenderer } from './webGpuRenderer';

export interface GraphicsRenderer {
 domElement: HTMLCanvasElement;
 mode: 'webgl' | 'webgpu';
 webgl: THREE.WebGLRenderer | null;
 resize: (width: number, height: number) => void;
 render: (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void;
 dispose: () => void;
}

export async function createGraphicsRenderer(attempt: number, touch: boolean): Promise<GraphicsRenderer> {
 if (attempt === 1) return createWebGpuRenderer(touch);
 const canvas = document.createElement('canvas');
 let context: WebGL2RenderingContext | null = null;
 let creationError = '';
 const reportFailure = (event: Event) => { if (event instanceof WebGLContextEvent) creationError = event.statusMessage; };
 canvas.addEventListener('webglcontextcreationerror', reportFailure);
 try {
  context = canvas.getContext('webgl2', {
   antialias: !touch && attempt === 0, alpha: false, stencil: false,
   powerPreference: 'default', preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: false,
  });
  if (!context) throw new Error(creationError || 'The browser did not provide a WebGL 2 context.');
  const webgl = new THREE.WebGLRenderer({ canvas, context });
  webgl.localClippingEnabled = true;
  webgl.toneMapping = THREE.ACESFilmicToneMapping;
  webgl.toneMappingExposure = 1.1;
  webgl.setClearColor('#F7F8F9');
  webgl.shadowMap.enabled = !touch && attempt === 0;
  webgl.shadowMap.type = THREE.PCFSoftShadowMap;
  return {
   domElement: canvas, mode: 'webgl', webgl,
   resize(width, height) {
    webgl.setPixelRatio(drawingRatio(width, height, touch || attempt > 0));
    webgl.setSize(width, height);
   },
   render: (scene, camera) => webgl.render(scene, camera),
   dispose() {
    webgl.dispose();webgl.forceContextLoss();canvas.remove();canvas.width = canvas.height = 1;
   },
  };
 } catch (error) {
  context?.getExtension('WEBGL_lose_context')?.loseContext();
  canvas.width = canvas.height = 1;
  throw error;
 } finally { canvas.removeEventListener('webglcontextcreationerror', reportFailure); }
}

export function drawingRatio(width: number, height: number, compact: boolean): number {
 return Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2,
  Math.sqrt((compact ? 1_200_000 : 3_000_000) / (width * height)), 4096 / width, 4096 / height);
}
