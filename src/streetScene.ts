import * as THREE from 'three';
import { box, label, pipe } from './geometry';
import { surfaceMaterial, pipeBlack } from './surfaceMaterials';
import { annotate, type Annotation } from './annotations';
import { component, type ComponentItem } from './interaction';
import { planFlow, setFlow } from './waterAnimation';
import { rowOffset, rowStagger, streetSupplyRoutes } from './streetTopology';

const roleIndexes=new WeakMap<THREE.Object3D,Map<string,THREE.Object3D[]>>();
export function modelObjects(model:THREE.Object3D|undefined,role:string):THREE.Object3D[] {
 if(!model)return [];
 let index=roleIndexes.get(model);
 if(!index){index=new Map();model.traverse(object=>{const key=String(object.userData.modelRole??object.name);const items=index?.get(key)??[];items.push(object);index?.set(key,items);});roleIndexes.set(model,index);}
 return index.get(role)??[];
}
/** Preserve animation roles while giving every selectable component and annotation a unique identity. */
export function scopeModel(group:THREE.Group,prefix:string,title:string):void {
 group.traverse(object=>{
  if(object.name&&!['flow-water','water-tracers'].includes(object.name)){
   object.userData.modelRole??=object.name;object.name=prefix+object.name;
  }
  const item=object.userData.component as ComponentItem|undefined;
  if(item)object.userData.component={...item,id:prefix+item.id,title:`${title} · ${item.title}`};
 });
 const notes=(group.userData.annotations??[]) as Annotation[];
 group.userData.annotations=notes.map(note=>({...note,id:prefix+note.id,title:`${title} · ${note.title}`,object:note.object?prefix+note.object:group.name}));
}
/** Road width and stagger are display spacing only; no site survey dimension is implied. */
export function pairedStreet(factory:(index:number)=>THREE.Group,length:number,depth:number,flow:boolean):THREE.Group {
 const street=new THREE.Group();street.name='Main C supplying both villa-side pipelines';
 const stagger=rowStagger,offset=rowOffset;
 for(const [index,sign] of [1,-1].entries()){
  const side=factory(index);side.name='row';scopeModel(side,`side-${index+1}-`,`Side ${index+1}`);
  side.position.set(index===0?0:stagger,0,sign*offset);side.rotation.y=index===0?0:Math.PI;street.add(side);
  const notes=(street.userData.annotations??[]) as Annotation[];
  street.userData.annotations=[...notes,...side.userData.annotations as Annotation[]];
  label(street,`Main ${index===0?'A':'B'} · own-side villas`,[index===0?-length/2+.6:length/2+stagger-.6,.08,sign*1.37],.14);
 }
 // Join the two existing roadside strips without covering either pipe or adding a cross-road service.
 const road=box(street,[length+stagger+.3,.06,1.22],[stagger/2,-.03,0],'#454545');
 (road.material as THREE.Material).dispose();road.material=surfaceMaterial('asphalt',length+stagger+.3,1.22);
 road.name='central-asphalt-road';
 const routes=streetSupplyRoutes(length,depth);
 for(const [id,title,coordinates] of [
  ['common-main','Main C · common OD110 supply',routes.mainC],
  ['tee-a','Tee A · Main C to Main A',routes.teeA],
  ['tee-b','Tee B · Main C to Main B · sleeved stub',routes.teeB],
 ] as const){
  const route=component(street,id,title,true),shell=new THREE.Group();route.add(shell);
  const points=coordinates.map(point=>new THREE.Vector3(...point));pipe(shell,points,.055,pipeBlack);planFlow(shell,route,points,.043,depth,id==='common-main'?24:8);
  const middle=points[Math.floor(points.length/2)];annotate(street,id,title,middle.toArray());
 }
 const sleeve=component(street,'main-b-sleeve','Main B buried sleeve · level and diameter illustrative');
 const [b0,b1]=routes.teeB;const sleeveStart=new THREE.Vector3(b0[0]+.12,depth,b0[2]),sleeveEnd=new THREE.Vector3(b1[0]-.12,depth,b1[2]);
 const sleeveMesh=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,sleeveStart.distanceTo(sleeveEnd),16,1,true,0,Math.PI),new THREE.MeshStandardMaterial({color:'#6B7280',side:THREE.DoubleSide,roughness:.8}));
 sleeveMesh.rotation.z=-Math.PI/2;sleeveMesh.position.copy(sleeveStart).add(sleeveEnd).multiplyScalar(.5);sleeve.add(sleeveMesh);
 label(street,'Main C · common supply',[routes.mainC[0][0]-.9,.15,0],.18);
 label(street,'Tee A',[routes.teeA[0][0]-.25,.12,rowOffset+.4],.14);
 label(street,'Tee B · sleeved stub',[routes.teeB[0][0]-.25,.12,-rowOffset-.4],.14);
 setFlow(street,flow);
 return street;
}
