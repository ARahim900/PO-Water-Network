import * as THREE from 'three';
import data from './networkData.json';
import { box, label, pipe, purple, sage } from './geometry';
import { component } from './interaction';
import { applyFlow, planFlow } from './waterAnimation';
import type { ModelSettings } from './types';
export function buildNetwork(settings: ModelSettings): THREE.Group {
 const group = new THREE.Group(); group.name = 'Zone Five plan-derived visual model';
 if (settings.showBase) {
  const vertices = data.background.flatMap(s => [s[0], -1.8, -s[1], s[2], -1.8, -s[3]]);
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  group.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#6B7280', transparent: true, opacity: 0.3 })));
 }
 for (const path of data.paths) {
  const active = settings.selectedPath === 'all' || settings.selectedPath === path.name;
  const colour = !active ? '#6B7280' : '#0A0A0A';
  const depth = settings.option === 'buried' ? -1.055 : -0.245;
  const route = component(group,path.id,path.name,true), shell = new THREE.Group();route.add(shell);
  const points=path.points.map(p => new THREE.Vector3(p[0], depth, -p[1]));
  pipe(shell,points,path.kind === 'service' ? .30 : .48,colour);
  if(active)planFlow(shell,route,points,path.kind==='service'?.23:.38,depth,14);
 }
 if (settings.option === 'channel') for (const [index,path] of data.channels.entries()) {
  const enclosureGroup=component(group,`enclosure-${index}`,`Channel enclosure ${index+1}`);
  for (let i = 1; i < path.points.length; i++) {
   const a = new THREE.Vector3(path.points[i-1][0], 0, -path.points[i-1][1]);
   const b = new THREE.Vector3(path.points[i][0], 0, -path.points[i][1]);
   const enclosure = box(enclosureGroup, [1.5, 0.5, a.distanceTo(b)], a.clone().add(b).multiplyScalar(0.5).toArray(), '#6B7280', 0.32);
   enclosure.rotation.y = Math.atan2(b.x-a.x, b.z-a.z);
  }
 }
 if (settings.showAssets) addAssets(group);
 for (const p of data.labels) label(group, p.name, [p.point[0], 1.2, -p.point[1]], 4);
 for (const path of data.paths.filter(p => p.kind === 'main')) {
  const point = path.points[Math.floor(path.points.length/2)]; label(group, path.name, [point[0]+9, 5, -point[1]], 5);
 }
 label(group, 'N', [-112, 1, -179], 6);
 pipe(group, [new THREE.Vector3(-112, 0, -155),new THREE.Vector3(-112,0,-173)], 0.3);
 applyFlow(group, settings.flow);
 return group;
}
function addAssets(group: THREE.Group): void {
 for (const asset of data.assets) {
  const p = asset.point;const assetGroup=component(group,`asset-${asset.name}`,asset.name,asset.kind==='meter'||asset.kind==='bulk');
  if (asset.kind === 'meter') { box(assetGroup, [1.2,1.2,1.2], [p[0],0.4,-p[1]], sage); continue; }
  box(assetGroup, [1.6,1.6,1.6], [p[0],0.8,-p[1]], asset.kind === 'hydrant' ? '#6B7280' : purple);
  if (asset.kind === 'bulk' || asset.kind === 'boundary') label(group, asset.name.split(' ')[0], [p[0]+4,4,-p[1]], 5);
 }
}
