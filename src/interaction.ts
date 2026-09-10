import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export interface ComponentItem { id: string; title: string; water: boolean; }
export interface Flight { start: number; from: THREE.Vector3; to: THREE.Vector3; targetFrom: THREE.Vector3; targetTo: THREE.Vector3; }
export function component(parent: THREE.Group, id: string, title: string, water = false): THREE.Group {
 const group = new THREE.Group();group.name = id;group.userData.component = {id,title,water};parent.add(group);return group;
}
export function components(model: THREE.Group): ComponentItem[] {
 const result: ComponentItem[] = [];model.traverse(o=>{if(o.userData.component)result.push(o.userData.component as ComponentItem);});return result;
}
export function findComponent(object: THREE.Object3D): string | null {
 let current: THREE.Object3D | null = object;
 while(current){if(current.userData.component)return (current.userData.component as ComponentItem).id;current=current.parent;}return null;
}
export function startFlight(camera: THREE.PerspectiveCamera, controls: OrbitControls, target: THREE.Vector3, distance: number, top = false): Flight {
 const adjusted = distance * Math.max(1,1.2/camera.aspect);
 return {start:performance.now(),from:camera.position.clone(),targetFrom:controls.target.clone(),targetTo:target,to:target.clone().add(top?new THREE.Vector3(0,adjusted*1.4,.001):new THREE.Vector3(adjusted*.65,adjusted*.8,adjusted))};
}
export function boundsFlight(camera:THREE.PerspectiveCamera,controls:OrbitControls,bounds:THREE.Box3,top=false):Flight {
 const target=bounds.getCenter(new THREE.Vector3());
 const direction=(top?new THREE.Vector3(0,1,.001):camera.aspect<1.1?new THREE.Vector3(1,.95,.38):new THREE.Vector3(.8,.8,1)).normalize();
 const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
 const up=new THREE.Vector3().crossVectors(direction,right);
 const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanH=tanV*camera.aspect;
 let distance=.5;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const point=new THREE.Vector3(x,y,z).sub(target),depth=point.dot(direction);
  distance=Math.max(distance,depth+Math.abs(point.dot(right))/(tanH*.86),depth+Math.abs(point.dot(up))/(tanV*.86));
 }
 return {start:performance.now(),from:camera.position.clone(),to:target.clone().addScaledVector(direction,distance),targetFrom:controls.target.clone(),targetTo:target};
}
export function componentFlight(camera: THREE.PerspectiveCamera, controls: OrbitControls, object: THREE.Object3D): Flight {
 return boundsFlight(camera,controls,new THREE.Box3().setFromObject(object));
}
export function advanceFlight(flight: Flight, camera: THREE.PerspectiveCamera, controls: OrbitControls, reduced: boolean): boolean {
 const t = reduced ? 1 : Math.min(1,(performance.now()-flight.start)/1500);const ease=t*t*t*(t*(t*6-15)+10);
 camera.position.lerpVectors(flight.from,flight.to,ease);camera.position.y+=Math.sin(Math.PI*t)*flight.from.distanceTo(flight.to)*.12;
 controls.target.lerpVectors(flight.targetFrom,flight.targetTo,ease);return t < 1;
}
