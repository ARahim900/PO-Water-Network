import * as THREE from 'three';
export const purple = '#4E4456';
export const sage = '#A4C5BB';
export function material(colour: string, opacity = 1): THREE.MeshStandardMaterial {
 return new THREE.MeshStandardMaterial({ color: colour, roughness: 0.78, transparent: opacity < 1, opacity, depthWrite: opacity === 1, side: THREE.DoubleSide });
}
export function box(group: THREE.Group, size: number[], at: number[], colour: string, opacity = 1): THREE.Mesh {
 const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material(colour, opacity));
 mesh.position.set(at[0], at[1], at[2]); group.add(mesh); return mesh;
}
export function pipe(group: THREE.Group, points: THREE.Vector3[], radius: number, colour = '#0A0A0A'): void {
 for (let i = 1; i < points.length; i++) {
  const a = points[i - 1], b = points[i], delta = b.clone().sub(a);
  if (delta.length() < 0.00001) continue;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 12), material(colour));
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); group.add(mesh);
 }
}
export function line(group: THREE.Group, points: THREE.Vector3[], colour = purple): void {
 const mesh = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: colour })); group.add(mesh);
}
export function label(group: THREE.Group, text: string, at: number[], height = 0.16): void {
 const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); if (!ctx) return;
 canvas.width = Math.max(256, text.length * 24); canvas.height = 64;
 ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
 ctx.strokeStyle = '#E5E7EB'; ctx.strokeRect(1, 1, canvas.width - 2, 62);
 ctx.fillStyle = '#6B9AC4'; ctx.font = '500 36px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, canvas.width / 2, 33);
 const texture = new THREE.CanvasTexture(canvas);
 const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, toneMapped: false }));
 sprite.position.set(at[0], at[1], at[2]); sprite.scale.set(height * canvas.width / 64, height, 1); sprite.renderOrder = 10; group.add(sprite);
}
export function arrow(group: THREE.Group, start: number[], end: number[], colour = sage, size = 0.07): void {
 const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end), dir = b.clone().sub(a);
 group.add(new THREE.ArrowHelper(dir.clone().normalize(), a, dir.length(), colour, size, size * 0.55));
}
export function disposeGroup(group: THREE.Group): void {
 group.traverse(object => {
  if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
   if ('geometry' in object) object.geometry.dispose();
   const materials = Array.isArray(object.material) ? object.material : [object.material];
   for (const m of materials) { if ('map' in m && m.map instanceof THREE.Texture) m.map.dispose(); if ('bumpMap' in m && m.bumpMap instanceof THREE.Texture && (!('map' in m) || m.bumpMap !== m.map)) m.bumpMap.dispose(); m.dispose(); }
  }
 });
}
