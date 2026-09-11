import * as THREE from 'three';
import { box, pipe } from './geometry';
import { annotate } from './annotations';
import { component } from './interaction';
import { buildDetailSide, texturedBox } from './detailScene';
import { pairedStreet } from './streetScene';
import { planFlow, setFlow } from './waterAnimation';
import type { ModelSettings } from './types';
const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
const DARK='#3a3a3a';
export function buildRun(s:ModelSettings):THREE.Group {
 return pairedStreet(index=>{
  const row=buildDetailSide({...s,view:'tapping',step:3},6.4,[-1.7,1.7],index===1);
  const covers=row.getObjectByName('movable-covers');if(covers)covers.position.y=(s.opened||s.flow)?.72:0;
  chamber(row,s.option==='channel'?-.245:-1.055);
  const lid=row.getObjectByName('chamber-cover');if(lid)lid.visible=!s.flow;
  setFlow(row,s.flow);return row;
 },6.4,s.option==='channel'?-.245:-1.055,s.flow);
}
function chamber(g:THREE.Group,y:number):void {
 const c=component(g,'chamber','Valve chamber · indicative');
 const floor=y-.35,h=-floor;
 texturedBox(c,[.9,.08,.9],[0,floor-.04,0],'concrete');
 texturedBox(c,[.9,h,.1],[0,floor+h/2,-.4],'concrete');
 for(const dx of [-.4,.4])texturedBox(c,[.1,h,.3],[0+dx,floor+h/2,-.25],'concrete');
 const cover=box(c,[.96,.06,.96],[0,.03,0],'#5b5b5b');cover.name='chamber-cover';
 box(c,[.12,.012,.03],[0,.066,.25],'#0A0A0A');
 const valve=component(g,'valve','Isolation valve · indicative',true),valveShell=new THREE.Group();valve.add(valveShell);
 planFlow(valveShell,valve,[v(0-.21,y,0),v(0+.21,y,0)],.043,y,0);
 box(valveShell,[.24,.24,.24],[0,y,0],DARK);
 for(const dx of [-.19,.19]){const flange=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.04,20),new THREE.MeshStandardMaterial({color:DARK,roughness:.6}));flange.rotation.z=Math.PI/2;flange.position.set(0+dx,y,0);valveShell.add(flange);}
 pipe(valve,[v(0,y+.12,0),v(0,-.14,0)],.015,DARK);
 const wheel=new THREE.Mesh(new THREE.TorusGeometry(.085,.012,8,24),new THREE.MeshStandardMaterial({color:'#6B7280',roughness:.5}));wheel.rotation.x=Math.PI/2;wheel.position.set(0,-.14,0);valve.add(wheel);
 annotate(g,'valve','Isolation valve',[0,y+.16,.05]);annotate(g,'chamber','Valve chamber',[0+.46,-.15,.46]);
}
