import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { box, pipe, label, purple } from './geometry';
import { annotate } from './annotations';
import { component } from './interaction';
import { surfaceMaterial, fibreMaterial, pipeBlack, waterBlue } from './surfaceMaterials';
import { planFlow, setFlow } from './waterAnimation';
import type { ModelSettings } from './types';
const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
export function texturedBox(g:THREE.Group,size:number[],at:number[],kind:Parameters<typeof surfaceMaterial>[0]):THREE.Mesh {
 const mesh=box(g,size,at,'#FFFFFF');(mesh.material as THREE.Material).dispose();
 const top=surfaceMaterial(kind,size[0],size[2]);
 if(kind==='paving'){
  const end=surfaceMaterial(kind,size[2],size[1]),side=surfaceMaterial(kind,size[0],size[1]);
  mesh.material=[end,end,top,top,side,side];
 }else mesh.material=top;
 return mesh;
}
export function buildDetail(s:ModelSettings):THREE.Group {
 const g=new THREE.Group();g.name=`${s.option} illustrative installation detail`;
 const channel=s.option==='channel',centre=channel?-.245:-1.055;
 const opened=(s.view==='tapping'?s.step>0:s.opened)||s.flow;
 if(channel){walkway(g);buildChannel(g,opened);}else buildBurial(g);
 const main=component(g,'main','OD110 water main',true),shell=new THREE.Group();main.add(shell);
 const points=[v(-1.55,centre,0),v(1.55,centre,0)];pipe(shell,points,.055,pipeBlack);
 label(main,'OD110',[-.85,centre+.066,-.025],.080);
 planFlow(shell,main,points,.043,centre);
 annotate(g,'main','OD110 water main',[-.9,centre,0]);
 if(s.view==='tapping'&&(!channel||opened))buildTapping(g,centre,s.step,channel);
 if(s.view==='weather')buildWeather(g,s);
 for(const name of ['front-walkway-cut','front-frame-cut']){const cut=g.getObjectByName(name);if(cut)cut.visible=!opened;}
 setFlow(g,s.flow);return g;
}
function walkway(g:THREE.Group):void {
 const paving=component(g,'paving','Interlocking walkway paving');
 texturedBox(paving,[3.5,.10,.6],[0,-.05,-.69],'paving');
 const front=new THREE.Group();front.name='front-walkway-cut';paving.add(front);
 texturedBox(front,[3.5,.10,.6],[0,-.05,.69],'paving');
 annotate(g,'paving','Interlocking walkway',[1.25,0,-.72]);
}
function buildChannel(g:THREE.Group,opened:boolean):void {
 const structure=component(g,'channel','Concrete channel / floor');
 texturedBox(structure,[3.2,.08,.76],[0,-.49,0],'concrete');
 texturedBox(structure,[3.2,.45,.08],[0,-.225,-.34],'concrete');
 texturedBox(structure,[3.2,.10,.08],[0,-.40,.34],'concrete');
 const frame=component(g,'frame','Cover perimeter frame');
 for(const side of [-1,1]){const edge=box(frame,[3.24,.045,.035],[0,-.0225,side*.3675],purple);if(side===1)edge.name='front-frame-cut';}
 const covers=component(g,'movable-covers','Green fibre cover panels');
 for(let i=0;i<5;i++){
  const x=-1.28+i*.64;const coverPanel=component(covers,`cover-panel-${i+1}`,`Cover panel ${i+1} · indicative`);
  const panel=new THREE.Mesh(new RoundedBoxGeometry(.627,.045,.70,3,.006),fibreMaterial());panel.position.set(x,-.0225,0);coverPanel.add(panel);
  for(const z of [-.25,.25]){
   box(coverPanel,[.07,.004,.024],[x,.001,z],'#0A0A0A');
   pipe(coverPanel,[v(x-.024,.003,z),v(x+.024,.003,z)],.003,'#6B7280');
  }
 }
 covers.position.y=opened?.72:0;
 const supports=component(g,'support','Pipe supports · indicative');
 for(let i=0;i<7;i++){const x=-1.5+i*.5;box(supports,[.065,.15,.18],[x,-.375,0],'#454545');
  const saddle=new THREE.Mesh(new THREE.TorusGeometry(.061,.008,8,20,Math.PI),new THREE.MeshStandardMaterial({color:'#454545'}));saddle.rotation.y=Math.PI/2;saddle.rotation.x=Math.PI;saddle.position.set(x,-.245,0);supports.add(saddle);
 }
 annotate(g,'cover','Green fibre cover panels',[.6,0,0],'movable-covers');annotate(g,'frame','Metal perimeter frame',[1.3,0,.365]);
 annotate(g,'support','Pipe supports',[.5,-.36,0]);annotate(g,'channel','Concrete channel',[-.75,-.44,.34]);
}
function buildBurial(g:THREE.Group):void {
 const layers:[string,string,number[],number[],Parameters<typeof surfaceMaterial>[0]][]=[
  ['bedding','Sand / granular bedding',[3.2,.12,.6],[0,-1.20,0],'sand'],
  ['surround','Fine granular surround',[3.2,.25,.3],[0,-1.015,-.15],'sand'],
  ['backfill','Compacted backfill',[3.2,.73,.3],[0,-.53,-.15],'backfill'],
  ['subbase','Pavement sub-base',[3.2,.13,.3],[0,-.10,-.15],'concrete'],
  ['paving','Interlocking walkway paving',[3.2,.035,.3],[0,-.0175,-.15],'paving']];
 for(const [id,title,size,at,kind] of layers){texturedBox(component(g,id,title),size,at,kind);annotate(g,id,title,[id==='bedding'?-.8:.9,at[1],id==='bedding'?.2:0]);}
}
function buildTapping(g:THREE.Group,y:number,step:number,channel:boolean):void {
 if(step<2)return;
 const fitting=component(g,'fitting','Fused tapping fitting',true);
 box(fitting,[.14,.045,.13],[0,y+.062,0],pipeBlack);pipe(fitting,[v(0,y+.06,0),v(0,y+.17,0)],.027,pipeBlack);
 annotate(g,'fitting','Fused tapping fitting',[0,y+.15,0]);
 if(step<3)return;
 const service=component(g,'service','OD25 villa service / movement loop',true),shell=new THREE.Group();service.add(shell);
 const points=channel?[v(0,y+.12,0),v(.07,y+.12,.12),v(-.04,y+.12,.25),v(0,y+.12,.40),v(0,y+.12,1.12)]:[v(0,y+.12,0),v(0,y+.12,1.12)];
 const curve=new THREE.CatmullRomCurve3(points),route=curve.getPoints(60);pipe(shell,route,.0125,pipeBlack);
 label(service,'OD25',[0,y+.145,.80],.065);
 planFlow(shell,service,route,.010,y+.12,12);
 if(channel){box(component(g,'seal','Flexible wall seal'),[.09,.09,.045],[0,y+.12,.34],'#454545');annotate(g,'flex','S-curve · movement relief',[.025,y+.12,.17]);annotate(g,'seal','Flexible wall seal',[0,y+.12,.34]);}
 const meter=component(g,'meter','Retained villa meter',true);box(meter,[.17,.13,.2],[0,y+.12,1.14],'#E5E7EB');
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
