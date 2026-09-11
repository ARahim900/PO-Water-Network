import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { box, pipe, label, purple } from './geometry';
import { annotate } from './annotations';
import { component } from './interaction';
import { surfaceMaterial, fibreMaterial, pipeBlack, waterBlue, pavingRepeat } from './surfaceMaterials';
import { planFlow, setFlow } from './waterAnimation';
import { houseConnection } from './houseConnection';
import { tappingAngle, tappingGeometry, sweptOutlet } from './tappingGeometry';
import { pairedStreet, scopeModel } from './streetScene';
import type { Annotation } from './annotations';
import type { ModelSettings } from './types';
const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
export function texturedBox(g:THREE.Group,size:number[],at:number[],kind:Parameters<typeof surfaceMaterial>[0]):THREE.Mesh {
 const mesh=box(g,size,at,'#FFFFFF');(mesh.material as THREE.Material).dispose();
 const top=surfaceMaterial(kind,size[0],size[2]);
 if(kind==='paving'){
  // Share a world-aligned tile grid across adjoining panels and service inspection slots.
  for(const texture of [top.map,top.bumpMap])texture?.offset.set((at[0]-size[0]/2)/pavingRepeat,-(at[2]+size[2]/2)/pavingRepeat);
  const end=surfaceMaterial('concrete',size[2],size[1]),side=surfaceMaterial('concrete',size[0],size[1]);
  mesh.material=[end,end,top,top,side,side];
 }else mesh.material=top;
 return mesh;
}
export function buildDetail(s:ModelSettings):THREE.Group {
 return s.view==='weather'?buildDetailSide(s):pairedStreet(index=>buildDetailSide(s,3.2,[0],index===1),3.2,s.option==='channel'?-.245:-1.055,s.flow);
}
export function buildDetailSide(s:ModelSettings,length=3.2,taps:number[]=[0],reverseMain=false):THREE.Group {
 const g=new THREE.Group();g.name=`${s.option} illustrative installation detail`;
 const channel=s.option==='channel',centre=channel?-.245:-1.055;
 const opened=(s.view==='tapping'?s.step>0:s.opened)||s.flow;
 const serviceCut=s.view==='tapping'&&s.step>=3;
 if(channel){walkway(g,serviceCut,length,taps);buildChannel(g,opened,length);}else buildBurial(g,serviceCut,length,taps);
 const main=component(g,'main','OD110 water main',true),shell=new THREE.Group();main.add(shell);
 const points=[v(-length/2+.05,centre,0),v(length/2-.05,centre,0)];if(reverseMain)points.reverse();pipe(shell,points,.055,pipeBlack);
 label(main,'OD110',[-.85,centre+.066,-.025],.080);
 planFlow(shell,main,points,.043,centre);
 annotate(g,'main','OD110 water main',[-.9,centre,0]);
 if(s.view==='tapping'&&(!channel||opened))for(const [index,x] of taps.entries()){
  const tapping=new THREE.Group();tapping.name='connection';buildTapping(tapping,centre,s.step,channel);
  scopeModel(tapping,`villa-${index+1}-`,`Villa ${index+1}`);tapping.position.x=x;g.add(tapping);
  g.userData.annotations=[...g.userData.annotations as Annotation[],...tapping.userData.annotations as Annotation[]];
 }
 if(s.view==='weather')buildWeather(g,s);
 for(const name of ['front-walkway-cut','front-frame-cut']){const cut=g.getObjectByName(name);if(cut)cut.visible=!opened;}
 const hiddenCovers=g.getObjectByName('movable-covers');if(hiddenCovers)hiddenCovers.visible=!s.flow;
 const lid=g.getObjectByName('chamber-cover');if(lid)lid.visible=!s.flow;
 setFlow(g,s.flow);return g;
}
function walkway(g:THREE.Group,serviceCut:boolean,length:number,taps:number[]):void {
 const asphalt=component(g,'asphalt','Asphalt road · opposite the villas');
 texturedBox(asphalt,[length+.3,.10,.6],[0,-.05,-.69],'asphalt');
 villaPaving(g,length+.3,.10,serviceCut,taps);
 annotate(g,'asphalt','Asphalt · road side',[1.25,0,-.72]);
}
function villaPaving(g:THREE.Group,length:number,height:number,serviceCut:boolean,taps:number[]):void {
 const paving=component(g,'paving','Rectangular interlock · villa side, dimensions unverified');
 const cuts=serviceCut?taps.flatMap(x=>[x-.11,x+.11]):[];
 const edges=[-length/2,...cuts,length/2],ranges:number[][]=[];
 for(let i=0;i<edges.length-1;i+=2)ranges.push([edges[i],edges[i+1]]);
 // The walkway reaches the house frontage; only the service inspection slot is cut away.
 for(const [start,end] of ranges)texturedBox(paving,[end-start,height,1.26],[(start+end)/2,-height/2,1.02],'paving');
 annotate(g,'paving','Interlock · villa side',[length/2-.25,0,1.32]);
}
function buildChannel(g:THREE.Group,opened:boolean,length:number):void {
 const structure=component(g,'channel','Concrete channel / floor');
 texturedBox(structure,[length,.08,.76],[0,-.49,0],'concrete');
 texturedBox(structure,[length,.45,.08],[0,-.225,-.34],'concrete');
 texturedBox(structure,[length,.10,.08],[0,-.40,.34],'concrete');
 const frame=component(g,'frame','Cover perimeter frame');
 for(const side of [-1,1]){const edge=box(frame,[length+.04,.045,.035],[0,-.0225,side*.3675],purple);if(side===1)edge.name='front-frame-cut';}
 const covers=component(g,'movable-covers','Green fibre cover panels');
 for(let i=0;i<Math.round(length/.64);i++){
  const x=-length/2+.32+i*.64;const coverPanel=component(covers,`cover-panel-${i+1}`,`Cover panel ${i+1} · indicative`);
  const panel=new THREE.Mesh(new RoundedBoxGeometry(.627,.045,.70,3,.006),fibreMaterial());panel.position.set(x,-.0225,0);coverPanel.add(panel);
  for(const z of [-.25,.25]){
   box(coverPanel,[.07,.004,.024],[x,.001,z],'#0A0A0A');
   pipe(coverPanel,[v(x-.024,.003,z),v(x+.024,.003,z)],.003,'#6B7280');
  }
 }
 covers.position.y=opened?.72:0;
 const supports=component(g,'support','Pipe supports · indicative');
 for(let i=0;i<=Math.floor((length-.2)/.5);i++){const x=-length/2+.1+i*.5;box(supports,[.065,.15,.18],[x,-.375,0],'#454545');
  const saddle=new THREE.Mesh(new THREE.TorusGeometry(.061,.008,8,20,Math.PI),new THREE.MeshStandardMaterial({color:'#454545'}));saddle.rotation.y=Math.PI/2;saddle.rotation.x=Math.PI;saddle.position.set(x,-.245,0);supports.add(saddle);
 }
 annotate(g,'cover','Green fibre cover panels',[.6,0,0],'movable-covers');annotate(g,'frame','Metal perimeter frame',[1.3,0,.365]);
 annotate(g,'support','Pipe supports',[.5,-.36,0]);annotate(g,'channel','Concrete channel',[-.75,-.44,.34]);
}
function buildBurial(g:THREE.Group,serviceCut:boolean,length:number,taps:number[]):void {
 villaPaving(g,length,.035,serviceCut,taps);
 const road=component(g,'asphalt','Asphalt road · opposite the villas');
 texturedBox(road,[length,.035,.69],[0,-.0175,-.645],'asphalt');
 annotate(g,'asphalt','Asphalt · road side',[1.1,0,-.65]);
 const layers:[string,string,number[],number[],Parameters<typeof surfaceMaterial>[0]][]=[
  ['bedding','Sand / granular bedding',[length,.12,.6],[0,-1.20,0],'sand'],
  ['surround','Fine granular surround',[length,.25,.3],[0,-1.015,-.15],'sand'],
  ['backfill','Compacted backfill',[length,.73,.3],[0,-.53,-.15],'backfill'],
  ['subbase','Pavement sub-base',[length,.13,.3],[0,-.10,-.15],'concrete'],
  ['road-edge','Asphalt road edge',[length,.035,.3],[0,-.0175,-.15],'asphalt']];
 for(const [id,title,size,at,kind] of layers){const layer=component(g,id,title);layer.userData.flowOccluder=id!=='bedding';texturedBox(layer,size,at,kind);annotate(g,id,title,[id==='bedding'?-.8:.9,at[1],id==='bedding'?.2:0],id);}
}
function buildTapping(g:THREE.Group,y:number,step:number,channel:boolean):void {
 if(step<2)return;
 const fitting=component(g,'fitting','Upper-quadrant electrofusion saddle · 45° from crown · indicative',true);
 const fittingShell=new THREE.Group();fitting.add(fittingShell);
 const fittingColour='#292D2F';
 const shape=new THREE.Shape(),start=Math.PI/2+tappingAngle-Math.PI/3,end=start+2*Math.PI/3;
 shape.absarc(0,0,.063,start,end,false);shape.absarc(0,0,.055,end,start,true);shape.closePath();
 const saddleGeometry=new THREE.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:false,curveSegments:32});saddleGeometry.rotateY(Math.PI/2);saddleGeometry.translate(-.07,0,0);
 const saddle=new THREE.Mesh(saddleGeometry,new THREE.MeshStandardMaterial({color:fittingColour,roughness:.45}));saddle.position.y=y;fittingShell.add(saddle);
 const geometry=tappingGeometry(y);
 pipe(fittingShell,[geometry.neckStart,geometry.neckEnd],.022,fittingColour);
 const socketStart=geometry.neckEnd.clone().addScaledVector(geometry.normal,-.025);
 pipe(fittingShell,[socketStart,geometry.neckEnd],.027,fittingColour);
 for(const x of [-.047,.047]){
  const terminal=geometry.normal.clone().multiplyScalar(.068).add(v(x,y,0));
  pipe(fittingShell,[terminal,terminal.clone().addScaledVector(geometry.normal,.014)],.005,fittingColour);
 }
 if(step>=3)planFlow(fittingShell,fitting,[v(0,y,0),geometry.neckEnd],.010,geometry.neckEnd.y,4);
 annotate(g,'fitting','Upper quadrant · 45° from crown',geometry.neckEnd.clone().add(v(0,.06,0)).toArray());
 if(step<3)return;
 const service=component(g,'service','OD25 PE100 service · formed gradual sweep · indicative',true),shell=new THREE.Group();service.add(shell);
 const route=geometry.route;
 shell.add(sweptOutlet(route,.0125,new THREE.MeshStandardMaterial({color:fittingColour,roughness:.45})));
 label(service,'OD25',[0,y+.145,.80],.065);
 planFlow(shell,service,route,.010,y+.12,12);
 if(channel){box(component(g,'seal','Flexible wall seal'),[.09,.09,.045],[0,y+.12,.34],'#454545');annotate(g,'seal','Flexible wall seal',[0,y+.12,.34]);}
 const meter=component(g,'meter','Retained villa meter',true),meterShell=new THREE.Group();meter.add(meterShell);
 box(meterShell,[.17,.13,.2],[0,y+.12,1.14],'#E5E7EB');
 label(meter,'Meter',[.16,y+.25,1.14],.10);
 planFlow(meterShell,meter,[v(0,y+.12,1.12),v(0,y+.12,1.24)],.010,y+.12,3);
 houseConnection(g,'villa','House',v(0,y+.12,0),v(0,0,1));
 annotate(g,'service','OD25 to retained meter',[0,y+.12,.95]);
 g.userData.annotations=(g.userData.annotations as {id:string}[]).filter(n=>!['frame','support','channel','subbase','backfill','bedding','surround'].includes(n.id));
}
function buildWeather(g:THREE.Group,s:ModelSettings):void {
 if(s.weather==='rain'){
  const rain=component(g,'rain-drops','Rainfall / surface impacts',true);const splashes=new THREE.Group();splashes.name='rain-splashes';g.add(splashes);
  for(let i=0;i<36;i++){
   const x=-1.4+(i%12)*.25,z=-.26+Math.floor(i/12)*.26;
   const drop=new THREE.Mesh(new THREE.CylinderGeometry(.002,.004,.055,5),new THREE.MeshBasicMaterial({color:waterBlue}));drop.position.set(x,.5,z);rain.add(drop);
   const ring=new THREE.Mesh(new THREE.RingGeometry(.012,.018,16),new THREE.MeshBasicMaterial({color:waterBlue,transparent:true,opacity:.4,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(x,.003,z);splashes.add(ring);
  }
  if(s.option==='channel'){
   const water=component(g,'rainwater','Illustrative collected rainwater',true);const mesh=box(water,[3.1,.012,.59],[0,-.437,0],waterBlue,.8);(mesh.material as THREE.MeshStandardMaterial).roughness=.15;
  }
 }
 if(s.weather==='sand'){
  const sand=component(g,'debris','Dust and sand deposits');
  for(let i=0;i<60;i++){const x=-1.5+(i%15)*.20,z=-.25+Math.floor(i/15)*.16;texturedBox(sand,[.025,.012,.018],[x,s.option==='channel'&&s.opened?-.438:.006,z],'sand');}
 }
}
