import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export interface ComponentItem { id: string; title: string; water: boolean; }
export interface Flight { start: number; from: THREE.Vector3; to: THREE.Vector3; targetFrom: THREE.Vector3; targetTo: THREE.Vector3; duration?:number; orbit?:boolean; }
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
export function boundsFlight(camera:THREE.PerspectiveCamera,controls:OrbitControls,bounds:THREE.Box3,top=false,points?:THREE.Vector3[],orientation?:THREE.Quaternion,closeup=false):Flight {
 const target=bounds.getCenter(new THREE.Vector3());
 const direction=(top?new THREE.Vector3(0,1,.001):closeup?new THREE.Vector3(.45,1.9,.65):camera.aspect<1.1?new THREE.Vector3(1,.95,.38):new THREE.Vector3(.45,1.15,1)).normalize();
 if(orientation)direction.applyQuaternion(orientation);
 const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
 const up=new THREE.Vector3().crossVectors(direction,right);
 const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanH=tanV*camera.aspect;
 let distance=.5;
 const corners=points??[bounds.min.x,bounds.max.x].flatMap(x=>[bounds.min.y,bounds.max.y].flatMap(y=>[bounds.min.z,bounds.max.z].map(z=>new THREE.Vector3(x,y,z))));
 for(const corner of corners){
  const point=corner.clone().sub(target),depth=point.dot(direction);
  distance=Math.max(distance,depth+Math.abs(point.dot(right))/(tanH*.86),depth+Math.abs(point.dot(up))/(tanV*.86));
 }
 return {start:performance.now(),from:camera.position.clone(),to:target.clone().addScaledVector(direction,distance),targetFrom:controls.target.clone(),targetTo:target};
}
export function componentFlight(camera: THREE.PerspectiveCamera, controls: OrbitControls, object: THREE.Object3D): Flight {
 object.updateWorldMatrix(true,true);
 let row:THREE.Object3D|null=object;
 while(row&&row.userData.modelRole!=='row')row=row.parent;
 const points=visibleMeshCorners(object);
 const bounds=points.length?new THREE.Box3().setFromPoints(points):new THREE.Box3().setFromObject(object);
 const role=String(object.userData.modelRole??object.name);
 const closeup=['service','fitting','meter','seal'].includes(role);
 if(closeup)bounds.expandByScalar(.035);
 const flight=boundsFlight(camera,controls,bounds,false,undefined,row?.getWorldQuaternion(new THREE.Quaternion()),closeup);
 flight.orbit=true;
 flight.duration=THREE.MathUtils.clamp(1200+Math.log1p(flight.from.distanceTo(flight.to))*260,1400,2400);
 return flight;
}
export function advanceFlight(flight: Flight, camera: THREE.PerspectiveCamera, controls: OrbitControls, reduced: boolean,now=performance.now()): boolean {
 const t = reduced ? 1 : THREE.MathUtils.clamp((now-flight.start)/(flight.duration??1500),0,1);const ease=t*t*t*(t*(t*6-15)+10);
 controls.target.lerpVectors(flight.targetFrom,flight.targetTo,ease);
 if(flight.orbit&&t>0&&t<1){
  const from=new THREE.Spherical().setFromVector3(flight.from.clone().sub(flight.targetFrom));
  const to=new THREE.Spherical().setFromVector3(flight.to.clone().sub(flight.targetTo));
  const thetaDelta=Math.atan2(Math.sin(to.theta-from.theta),Math.cos(to.theta-from.theta));
  const radius=Math.exp(THREE.MathUtils.lerp(Math.log(Math.max(.01,from.radius)),Math.log(Math.max(.01,to.radius)),ease));
  // Pull back only when moving between nearby close-ups, so the camera does not cut through the model.
  const clearance=Math.max(0,flight.targetFrom.distanceTo(flight.targetTo)*.65-Math.max(from.radius,to.radius));
  const spherical=new THREE.Spherical(radius+clearance*Math.sin(Math.PI*ease)**2,THREE.MathUtils.lerp(from.phi,to.phi,ease),from.theta+thetaDelta*ease);
  camera.position.setFromSpherical(spherical).add(controls.target);
 }else camera.position.lerpVectors(flight.from,flight.to,ease);
 return t < 1;
}

function visibleMeshCorners(model:THREE.Object3D):THREE.Vector3[] {
 const points:THREE.Vector3[]=[];
 model.traverseVisible(object=>{
  if(!(object instanceof THREE.Mesh)||object instanceof THREE.InstancedMesh||object.parent?.name==='flow-water')return;
  object.geometry.computeBoundingBox();const bounds=object.geometry.boundingBox;if(!bounds)return;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(new THREE.Vector3(x,y,z).applyMatrix4(object.matrixWorld));
 });
 return points;
}

export function modelFlight(camera:THREE.PerspectiveCamera,controls:OrbitControls,model:THREE.Group,top=false):Flight {
 model.updateMatrixWorld(true);const points=visibleMeshCorners(model);
 const bounds=points.length?new THREE.Box3().setFromPoints(points):new THREE.Box3().setFromObject(model);
 return boundsFlight(camera,controls,bounds,top,points.length?points:undefined);
}
