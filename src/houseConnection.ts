import * as THREE from 'three';
import { box, label, pipe } from './geometry';
import { component } from './interaction';
import { planFlow } from './waterAnimation';
import { pipeBlack } from './surfaceMaterials';

const stucco='#D7CCBA', trim='#E5DCCB', metal='#454545', planting='#899583';

/** Photo-informed architecture, deliberately schematic: frontage, height and internal plumbing are not surveyed. */
export function houseConnection(parent:THREE.Group,id:string,title:string,at:THREE.Vector3,direction:THREE.Vector3):void {
 const destination=component(parent,`${id}-house`,`${title} · photo-informed villa, not to scale`,true);
 destination.position.set(at.x,0,at.z);
 destination.rotation.y=Math.atan2(direction.x,direction.z);
 villaBuilding(destination);
 entrance(destination);
 garden(destination);
 label(destination,title,[0,1.52,2.55],.12);
 const connection=component(destination,`${id}-delivery`,'Meter to villa boundary · illustrative connection',true);
 const shell=new THREE.Group();connection.add(shell);
 const route=[new THREE.Vector3(0,at.y,1.24),new THREE.Vector3(0,at.y,1.46),new THREE.Vector3(0,.12,1.46),new THREE.Vector3(0,.12,1.67)];
 pipe(shell,route,.0125,pipeBlack);
 planFlow(shell,connection,route,.010,.12,6);
}
function villaBuilding(g:THREE.Group):void {
 box(g,[1.02,1.2,.95],[0,.61,2.59],stucco);
 box(g,[.61,1.25,.12],[-.16,.635,2.075],trim);
 // Recessed dark openings and vertical side slots reflect the visible two-storey facades.
 for(const y of [.32,.88]){
  box(g,[.37,.34,.018],[-.16,y,2.008],metal);
  box(g,[.012,.34,.02],[-.16,y,1.996],stucco);
  box(g,[.065,.34,.018],[.36,y,2.105],metal);
  box(g,[.018,.34,.1],[.516,y,2.49],metal);
 }
 for(const y of [.32,.88])box(g,[.6,.36,.02],[0,y,3.072],metal);
 for(const x of [-.38,.38])box(g,[.07,1.24,.12],[x,.63,3.10],trim);
 box(g,[.82,.055,.20],[0,.63,3.13],trim);
 box(g,[.72,.17,.025],[0,.75,3.225],'#A4C5BB');
 for(const x of [-.43,.11])box(g,[.055,1.24,.08],[x,.63,1.99],stucco);
 box(g,[.6,.055,.085],[-.16,.59,1.99],stucco);
 box(g,[1.04,.05,.97],[0,1.235,2.59],trim);
 for(const x of [-.5,.5])box(g,[.045,.14,.95],[x,1.32,2.59],stucco);
 for(const z of [2.13,3.05])box(g,[1.04,.14,.045],[0,1.32,z],stucco);
 for(const x of [-.27,.06,.32]){
  box(g,[.2,.13,.23],[x,1.32,2.7],'#BDBBB5');
  box(g,[.14,.008,.14],[x,1.389,2.7],metal);
 }
}
function entrance(g:THREE.Group):void {
 box(g,[1.28,.025,1.49],[0,.0125,2.395],trim);
 for(const x of [-.62,.62])box(g,[.045,.38,1.49],[x,.21,2.395],stucco);
 for(const x of [-.395,.395])box(g,[.45,.38,.045],[x,.21,1.67],stucco);
 for(const x of [-.2,.2])box(g,[.055,.62,.065],[x,.33,1.72],trim);
 for(let i=0;i<8;i++)box(g,[.5,.035,.025],[0,.66,1.65+i*.057],metal);
 for(const x of [-.24,.24])box(g,[.025,.045,.48],[x,.64,1.86],metal);
}
function garden(g:THREE.Group):void {
 // Planting stays beside the entrance; the service inspection slot remains unobstructed.
 for(const x of [-.48,.48]){
  box(g,[.32,.055,.53],[x,.025,1.18],trim);
  box(g,[.28,.05,.49],[x,.065,1.18],planting);
  const trunk=new THREE.Vector3(x,.1,1.18);
  pipe(g,[trunk,new THREE.Vector3(x,.65,1.18)],.013,'#928573');
  const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.14,1),new THREE.MeshStandardMaterial({color:planting,roughness:1}));
  crown.position.set(x,.69,1.18);crown.scale.set(1,1.3,1);g.add(crown);
 }
}
