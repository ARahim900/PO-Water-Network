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
export function componentFlight(camera: THREE.PerspectiveCamera, controls: OrbitControls, object: THREE.Object3D): Flight {
 const bounds = new THREE.Box3().setFromObject(object);const target = bounds.getCenter(new THREE.Vector3());
 const size = bounds.getSize(new THREE.Vector3());return startFlight(camera,controls,target,Math.max(.65,size.length()*.95));
}
export function advanceFlight(flight: Flight, camera: THREE.PerspectiveCamera, controls: OrbitControls, reduced: boolean): boolean {
 const t = reduced ? 1 : Math.min(1,(performance.now()-flight.start)/1500);const ease=t*t*t*(t*(t*6-15)+10);
 camera.position.lerpVectors(flight.from,flight.to,ease);camera.position.y+=Math.sin(Math.PI*t)*flight.from.distanceTo(flight.to)*.12;
 controls.target.lerpVectors(flight.targetFrom,flight.targetTo,ease);return t < 1;
}
