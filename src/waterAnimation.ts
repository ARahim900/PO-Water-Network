import * as THREE from 'three';
import { disposeGroup, pipe } from './geometry';
import { waterBlue } from './surfaceMaterials';
interface Stream { points: THREE.Vector3[]; lengths: number[]; total: number; radius: number; particles: THREE.InstancedMesh; }
interface FlowPlan { parent: THREE.Group; points: THREE.Vector3[]; radius: number; count: number; level: number; }
const streams = new WeakMap<THREE.Object3D,Stream>();
/** Record what the water cutaway would look like without building it. applyFlow adds or removes it later,
 *  so toggling the cutaway no longer forces the whole model to be rebuilt. */
export function planFlow(shell: THREE.Group, parent: THREE.Group, points: THREE.Vector3[], radius: number, level: number, count = 22): void {
 shell.userData.flowPlan = {parent,points,radius,count,level} as FlowPlan;
}
export function applyFlow(model: THREE.Group, on: boolean): void {
 const shells: THREE.Group[] = [];
 model.traverse(o=>{if(o.userData.flowPlan)shells.push(o as THREE.Group);});
 for(const shell of shells){
  const plan=shell.userData.flowPlan as FlowPlan;
  const existing=plan.parent.children.find(c=>c.name==='flow-water');
  if(on===!!existing)continue;
  if(on){clipPipeForWater(shell,plan.level);addWater(plan.parent,plan.points,plan.radius,plan.count);}
  else {
   shell.traverse(o=>{if(o instanceof THREE.Mesh){const m=o.material as THREE.MeshStandardMaterial;m.clippingPlanes=null;m.needsUpdate=true;}});
   if(existing){existing.removeFromParent();disposeGroup(existing as THREE.Group);}
  }
 }
}
export function addWater(parent: THREE.Group, points: THREE.Vector3[], radius: number, count = 22): void {
 const water = new THREE.Group();water.name='flow-water';parent.add(water);
 pipe(water,points,radius,waterBlue);
 water.traverse(o=>{if(o instanceof THREE.Mesh){const m=o.material as THREE.MeshStandardMaterial;m.roughness=.18;m.metalness=.16;}});
 const geometry=new THREE.SphereGeometry(radius*.19,6,4);
 const particles=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({color:'#d5efff'}),count);particles.name='water-tracers';water.add(particles);
 const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+points[i].distanceTo(points[i-1]));
 streams.set(water,{points,lengths,total:lengths[lengths.length-1],radius,particles});
}
export function animateWater(model: THREE.Group, time: number): void {
 const matrix=new THREE.Matrix4(),position=new THREE.Vector3();
 model.traverse(object=>{
  const stream=streams.get(object);if(!stream)return;
  for(let i=0;i<stream.particles.count;i++){
   const distance=((i/stream.particles.count+time*.09)%1)*stream.total;
   let segment=1;while(segment<stream.lengths.length-1&&stream.lengths[segment]<distance)segment++;
   const span=stream.lengths[segment]-stream.lengths[segment-1];
   position.lerpVectors(stream.points[segment-1],stream.points[segment],span?(distance-stream.lengths[segment-1])/span:0);
   position.y+=stream.radius*.97;matrix.makeTranslation(position.x,position.y,position.z);stream.particles.setMatrixAt(i,matrix);
  }
  stream.particles.instanceMatrix.needsUpdate=true;
 });
}
export function clipPipeForWater(group: THREE.Group, level: number): void {
 group.traverse(object=>{if(object instanceof THREE.Mesh){const material=object.material as THREE.MeshStandardMaterial;material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),level)];material.clipShadows=true;}});
}
export function animateRain(model: THREE.Group, time: number): void {
 const rain=model.getObjectByName('rain-drops');if(!rain)return;
 const covers=model.getObjectByName('movable-covers');const surface=covers?covers.position.y:0;
 rain.children.forEach((drop,i)=>{const phase=(time*.75+i*.137)%1;drop.position.y=surface+(1-phase*phase)*.8;});
 const splashes=model.getObjectByName('rain-splashes');
 splashes?.children.forEach((ring,i)=>{const phase=(time*1.5+i*.137)%1;ring.position.y=surface+.005;ring.scale.setScalar(.3+phase*2);(ring as THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>).material.opacity=(1-phase)*.55;});
}
