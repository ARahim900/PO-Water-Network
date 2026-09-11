import * as THREE from 'three';
export interface Annotation { id: string; title: string; position: number[]; object?: string; }
export interface ProjectedAnnotation { id: string; title: string; x: number; y: number; }
export interface LabelFrame { width: number; height: number; points: ProjectedAnnotation[]; }
export function annotate(group: THREE.Group, id: string, title: string, position: number[], object?: string): void {
 const notes = (group.userData.annotations ?? []) as Annotation[];
 notes.push({id,title,position,object});group.userData.annotations=notes;
}
export function projectAnnotations(group: THREE.Group,camera: THREE.Camera,width:number,height:number): LabelFrame {
 const notes = (group.userData.annotations ?? []) as Annotation[];
 const points=notes.flatMap(note=>{
  const object=note.object?group.getObjectByName(note.object):group;
  let ancestor=object,cover:THREE.Object3D|undefined;
  while(ancestor){
   if(!ancestor.visible)return [];
   cover??=ancestor.children.find(child=>(child.userData.modelRole??child.name)==='movable-covers');
   ancestor=ancestor.parent??undefined;
  }
  const role=note.id.replace(/^side-\d+-/,'');
  if(cover?.visible&&cover.position.y<=.18&&!['cover','frame','paving','asphalt'].includes(role))return [];
  const point=new THREE.Vector3(...note.position);object?.localToWorld(point);point.project(camera);
  return [{id:note.id,title:role==='cover'&&cover&&cover.position.y<.02?`${note.title} · flush`:note.title,x:Math.round((point.x+1)*width/2),y:Math.round((1-point.y)*height/2),z:point.z}];
 }).filter(p=>p.z>=-1&&p.z<=1&&p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height);
 return {width,height,points};
}
export function arrangeLabels(frame:LabelFrame): (ProjectedAnnotation & {lx:number;ly:number;side:number})[] {
 const sorted=[...frame.points].sort((a,b)=>a.x-b.x||a.id.localeCompare(b.id));
 return [sorted.slice(0,Math.ceil(sorted.length/2)),sorted.slice(Math.ceil(sorted.length/2))].flatMap((items,side)=>{
  items.sort((a,b)=>a.y-b.y||a.id.localeCompare(b.id));
  return items.map((p,i)=>({...p,side,lx:side?frame.width-165:12,ly:155+(frame.height-280)*(i+0.5)/Math.max(1,items.length)}));
 });
}
