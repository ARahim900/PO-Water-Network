import * as THREE from 'three';
import { SVGRenderer } from 'three/addons/renderers/SVGRenderer.js';

export interface GraphicsRenderer {
 domElement: HTMLElement;
 webgl: THREE.WebGLRenderer | null;
 resize: (width: number, height: number) => void;
 render: (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void;
 dispose: () => void;
}

export function createGraphicsRenderer(attempt: number, touch: boolean): GraphicsRenderer {
 if (attempt >= 2) return createCompatibilityRenderer();
 const canvas = document.createElement('canvas');
 let context: WebGL2RenderingContext | null = null;
 try {
  context = canvas.getContext('webgl2', {
   antialias: !touch && attempt === 0, alpha: false, stencil: false,
   powerPreference: attempt === 0 ? 'low-power' : 'default',
   preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: false,
  });
  if (!context) throw new Error('The browser did not provide a WebGL 2 context.');
  const webgl = new THREE.WebGLRenderer({ canvas, context });
  webgl.localClippingEnabled = true;
  webgl.toneMapping = THREE.ACESFilmicToneMapping;
  webgl.toneMappingExposure = 1.1;
  webgl.setClearColor('#F7F8F9');
  webgl.shadowMap.enabled = !touch && attempt === 0;
  webgl.shadowMap.type = THREE.PCFSoftShadowMap;
  return {
   domElement: canvas, webgl,
   resize(width, height) {
    // Bound the actual drawing buffer, including expanded views on high-density iPads.
    const ratio = Math.min(window.devicePixelRatio || 1, touch || attempt > 0 ? 1 : 2,
     Math.sqrt((touch ? 1_200_000 : 3_000_000) / (width * height)), 4096 / width, 4096 / height);
    webgl.setPixelRatio(ratio);
    webgl.setSize(width, height);
   },
   render: (scene, camera) => webgl.render(scene, camera),
   dispose() {
    webgl.dispose();
    webgl.forceContextLoss();
    canvas.remove();
    canvas.width = canvas.height = 1;
   },
  };
 } catch (error) {
  context?.getExtension('WEBGL_lose_context')?.loseContext();
  canvas.width = canvas.height = 1;
  throw error;
 }
}

function createCompatibilityRenderer(): GraphicsRenderer {
 const svg = new SVGRenderer();
 svg.setPrecision(2);
 svg.setClearColor(new THREE.Color('#F7F8F9'), 1);
 const host = document.createElement('div');
 host.style.width = host.style.height = '100%';
 host.appendChild(svg.domElement);
 const colours = new WeakMap<THREE.Texture, THREE.Color>();
 const labelImages = new WeakMap<THREE.Texture, string>();
 return {
  domElement: host, webgl: null,
  resize: (width, height) => svg.setSize(width, height),
  render(scene, camera) {
   const sprites: THREE.Sprite[] = [];
   const materials = new Map<THREE.MeshStandardMaterial, THREE.Color>();
   scene.traverseVisible(object => {
    // SVG cannot render sprite textures or material maps. Keep the same geometry and
    // sample surface colours; HTML annotations still provide selectable detail labels.
    if (object instanceof THREE.Sprite) { sprites.push(object); object.visible = false; }
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
     if (!(material instanceof THREE.MeshStandardMaterial) || !material.map || materials.has(material)) continue;
     const texture = material.map;
     let colour = colours.get(texture);
     const source: unknown = texture.image;
     if (!colour && source instanceof HTMLCanvasElement) {
      const context = source.getContext('2d');
      if (context) {
       const pixel = context.getImageData(Math.floor(source.width / 2), Math.floor(source.height / 2), 1, 1).data;
       colour = new THREE.Color().setRGB(pixel[0] / 255, pixel[1] / 255, pixel[2] / 255, THREE.SRGBColorSpace);
       colours.set(texture, colour);
      }
     }
     if (colour) { materials.set(material, material.color.clone()); material.color.copy(colour); }
    }
   });
   try {
    svg.render(scene, camera);
    renderLabels(svg, sprites, camera, labelImages);
   }
   finally {
    for (const sprite of sprites) sprite.visible = true;
    for (const [material, colour] of materials) material.color.copy(colour);
   }
  },
  dispose() { svg.clear(); host.remove(); },
 };
}

function renderLabels(svg: SVGRenderer, sprites: THREE.Sprite[], camera: THREE.PerspectiveCamera, images: WeakMap<THREE.Texture, string>): void {
 const size = svg.getSize();
 for (const sprite of sprites) {
  const texture = sprite.material.map;
  const source: unknown = texture?.image;
  if (!texture || !(source instanceof HTMLCanvasElement)) continue;
  const world = sprite.getWorldPosition(new THREE.Vector3());
  const point = world.clone().project(camera);
  if (point.z < -1 || point.z > 1) continue;
  let url = images.get(texture);
  if (!url) { url = source.toDataURL(); images.set(texture, url); }
  const scale = sprite.getWorldScale(new THREE.Vector3());
  const distance = -world.applyMatrix4(camera.matrixWorldInverse).z;
  const pixels = size.height / (2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  label.setAttribute('href', url);
  label.setAttribute('x', String(point.x * size.width / 2 - scale.x * pixels / 2));
  label.setAttribute('y', String(-point.y * size.height / 2 - scale.y * pixels / 2));
  label.setAttribute('width', String(scale.x * pixels));
  label.setAttribute('height', String(scale.y * pixels));
  svg.domElement.appendChild(label);
 }
}
