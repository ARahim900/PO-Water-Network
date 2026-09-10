import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { box, pipe, label, purple } from './geometry';
import { annotate } from './annotations';
import { component } from './interaction';
import { fibreMaterial, pipeBlack } from './surfaceMaterials';
import { texturedBox } from './detailScene';
import { planFlow, setFlow } from './waterAnimation';
import type { ModelSettings } from './types';
const v=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
// One scene unit is one metre, matching the section detail. The legs, bend radius and chamber are indicative:
// the CAD plan gives routes and lengths but no chamber positions, bend radii or valve types yet.
const LEG=4.5, BEND=.5, CHAMBER_X=-2.5, TAP_A=-3.6, TAP_B=-3.3, DARK='#3a3a3a';
/** Main centreline: along +x, round a 90° long-radius bend, then away along −z. The pipe, the water and the
 *  housing are all laid along this one polyline so they cannot drift apart. */
function centreline(y:number):THREE.Vector3[]{
 const pts=[v(-LEG,y,0),v(-BEND,y,0)];
 for(let i=1;i<=8;i++){const t=Math.PI/2*(1-i/8);pts.push(v(-BEND+BEND*Math.cos(t),y,-BEND+BEND*Math.sin(t)));}
 pts.push(v(0,y,-LEG));return pts;
}
export function buildRun(s:ModelSettings):THREE.Group {
 const g=new THREE.Group();g.name=`${s.option} illustrative pipe run`;
 const channel=s.option==='channel',y=channel?-.245:-1.055,opened=s.opened||s.flow;
 if(channel)runChannel(g,y);else runBurial(g,y);
 const main=component(g,'main','OD110 water main',true),shell=new THREE.Group();main.add(shell);
 const line=centreline(y);pipe(shell,line,.055,pipeBlack);planFlow(shell,main,line,.043,y,44);
 label(main,'OD110',[-1.5,y+.07,-.03],.09);
 annotate(g,'main','OD110 water main',[-1.4,y,0]);
 annotate(g,'elbow','90° bend · long radius, indicative',[-BEND*.35,y,-BEND*.35]);
 chamber(g,y);
 takeoff(g,'service-a','Villa take-off 1',v(TAP_A,y,0),v(0,0,1));
 takeoff(g,'service-b','Villa take-off 2',v(0,y,TAP_B),v(1,0,0));
 const covers=g.getObjectByName('movable-covers');if(covers)covers.position.y=opened?.72:0;
 for(const name of ['front-walkway-cut','front-frame-cut']){const cut=g.getObjectByName(name);if(cut)cut.visible=!opened;}
 setFlow(g,s.flow);return g;
}
/** Isolation valve in a chamber, front wall cut away so the valve stays visible. Cover slab at walkway level. */
function chamber(g:THREE.Group,y:number):void {
 const c=component(g,'chamber','Valve chamber · indicative');
 const floor=y-.35,h=-floor;
 texturedBox(c,[.9,.08,.9],[CHAMBER_X,floor-.04,0],'concrete');
 texturedBox(c,[.9,h,.1],[CHAMBER_X,floor+h/2,-.4],'concrete');
 for(const dx of [-.4,.4])texturedBox(c,[.1,h,.7],[CHAMBER_X+dx,floor+h/2,-.05],'concrete');
 const cover=box(c,[.96,.06,.96],[CHAMBER_X,.03,0],'#5b5b5b');cover.name='chamber-cover';
 box(c,[.12,.012,.03],[CHAMBER_X,.066,.25],'#0A0A0A');
 const valve=component(g,'valve','Isolation valve · indicative',true);
 box(valve,[.24,.24,.24],[CHAMBER_X,y,0],DARK);
 for(const dx of [-.19,.19]){const flange=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.04,20),new THREE.MeshStandardMaterial({color:DARK,roughness:.6}));flange.rotation.z=Math.PI/2;flange.position.set(CHAMBER_X+dx,y,0);valve.add(flange);}
 pipe(valve,[v(CHAMBER_X,y+.12,0),v(CHAMBER_X,-.14,0)],.015,DARK);
 const wheel=new THREE.Mesh(new THREE.TorusGeometry(.085,.012,8,24),new THREE.MeshStandardMaterial({color:'#6B7280',roughness:.5}));wheel.rotation.x=Math.PI/2;wheel.position.set(CHAMBER_X,-.14,0);valve.add(wheel);
 annotate(g,'valve','Isolation valve',[CHAMBER_X,y+.16,.05]);annotate(g,'chamber','Valve chamber',[CHAMBER_X+.46,-.15,.46]);
}
/** A fused tapping on the main and a straight OD25 service to a retained meter, heading out on the cut-away side. */
function takeoff(g:THREE.Group,id:string,title:string,at:THREE.Vector3,dir:THREE.Vector3):void {
 const fitting=component(g,`${id}-fitting`,`${title} · top-mounted fused tee / side outlet`,true);
 const saddle=new THREE.Mesh(new THREE.CylinderGeometry(.064,.064,.14,24,1,true,0,Math.PI),new THREE.MeshStandardMaterial({color:pipeBlack,roughness:.78,side:THREE.DoubleSide}));
 saddle.rotation.z=Math.PI/2;fitting.add(saddle);
 pipe(fitting,[v(0,.055,0),v(0,.17,0)],.027,pipeBlack);
 pipe(fitting,[v(0,.17,0),v(0,.185,0)],.034,pipeBlack);
 pipe(fitting,[v(0,.12,0),v(0,.12,.085)],.018,pipeBlack);
 fitting.rotation.y=Math.atan2(dir.x,dir.z);fitting.position.copy(at);
 const service=component(g,id,`${title} · OD25 service`,true),shell=new THREE.Group();service.add(shell);
 const start=v(at.x,at.y+.12,at.z),route=[start.clone().addScaledVector(dir,.085),start.clone().addScaledVector(dir,1.12)];
 pipe(shell,route,.0125,pipeBlack);planFlow(shell,service,route,.010,at.y+.12,10);
 const meterAt=start.clone().addScaledVector(dir,1.14);
 box(component(g,`${id}-meter`,`${title} · retained meter`,true),[.17,.13,.2],[meterAt.x,meterAt.y,meterAt.z],'#E5E7EB');
 annotate(g,id,`${title} · OD25 service`,[start.x+dir.x*.55,start.y,start.z+dir.z*.55]);
}
/** Buried option: the far half of the trench is shown along each leg, layer by layer, so the pipe stays visible
 *  from the front. Layer offsets match the section detail. */
function runBurial(g:THREE.Group,y:number):void {
 const layers:[string,string,number,number,Parameters<typeof texturedBox>[3]][]=[
  ['bedding','Sand / granular bedding',.12,-.145,'sand'],['surround','Fine granular surround',.25,.04,'sand'],
  ['backfill','Compacted backfill',.73,.525,'backfill'],['subbase','Pavement sub-base',.13,.955,'concrete'],['paving','Brown / grey hexagonal paving',.035,1.0375,'paving']];
 for(const [id,title,thick,dy,kind] of layers){
  const layer=component(g,id,title);const full=id==='bedding';
  const a=LEG-BEND;                                                                    // straight part of each leg
  texturedBox(layer,[a,thick,full?.6:.3],[-(LEG+BEND)/2,y+dy,full?0:-.15],kind);      // leg A, far half (−z)
  texturedBox(layer,[full?.6:.3,thick,a],[full?0:-.15,y+dy,-(LEG+BEND)/2],kind);      // leg B, far half (−x)
  if(full){texturedBox(layer,[BEND+.15,thick,BEND+.15],[-.175,y+dy,-.175],kind);continue;}     // corner, butting both legs
  texturedBox(layer,[.35,thick,.15],[-.325,y+dy,-.225],kind);                         // corner, behind the bend
  texturedBox(layer,[.15,thick,.2],[-.225,y+dy,-.4],kind);
 }
 annotate(g,'paving','Brown / grey hexagonal paving',[-1,y+1.05,-.15]);annotate(g,'backfill','Compacted backfill',[-3.3,y+.5,-.3]);
}
/** Channel option: floor, back wall, low front kerb and walkway along each leg, joined at the corner, with lift-off
 *  cover panels — the same names the section uses, so the cover animation and front cut-aways work here too. */
function runChannel(g:THREE.Group,y:number):void {
 const structure=component(g,'channel','Concrete channel / floor'),a=LEG-.38;
 const frontWalk=new THREE.Group();frontWalk.name='front-walkway-cut';
 const paving=component(g,'paving','Brown / grey hexagonal paving');paving.add(frontWalk);
 const frame=component(g,'frame','Cover perimeter frame');const frontFrame=new THREE.Group();frontFrame.name='front-frame-cut';frame.add(frontFrame);
 const covers=component(g,'movable-covers','Green fibre cover panels');
 // leg A along x, leg B along z, then the corner square that joins them
 for(const leg of ['a','b'] as const){
  const along=(len:number,w:number,h:number,c:number,off:number,kind:'concrete'|'paving',parent:THREE.Group)=>texturedBox(parent,leg==='a'?[len,h,w]:[w,h,len],leg==='a'?[c,0,off]:[off,0,c],kind);
  const centre=-(LEG+.38)/2;
  const floor=along(a,.76,.08,centre,0,'concrete',structure);floor.position.y=y-.245;
  const back=along(a,.08,.45,centre,-.34,'concrete',structure);back.position.y=y+.02;
  const kerb=along(a,.08,.10,centre,.34,'concrete',structure);kerb.position.y=y-.155;
  const walkBack=along(a,.6,.10,centre,-.69,'paving',paving);walkBack.position.y=y+.195;
  const walkFront=along(a,.6,.10,centre,.69,'paving',frontWalk);walkFront.position.y=y+.195;
  for(const side of [-1,1])box(side===1?frontFrame:frame,leg==='a'?[LEG+.3675,.045,.035]:[.035,.045,LEG+.3675],leg==='a'?[-(LEG-.3675)/2,y+.2225,side*.3675]:[side*.3675,y+.2225,-(LEG-.3675)/2],purple);
  for(let i=0;;i++){
   const at=-LEG+.32+i*.64;if(at+.31>-.38)break;
   if(leg==='a'&&Math.abs(at-CHAMBER_X)<.6)continue;                                   // the chamber has its own cover
   coverPanel(covers,`cover-${leg}${i+1}`,leg==='a'?[at,y+.2225,0]:[0,y+.2225,at],leg==='a'?[.627,.70]:[.70,.627]);
  }
 }
 const corner=texturedBox(structure,[.76,.08,.76],[0,y-.245,0],'concrete');corner.name='corner-floor';
 texturedBox(structure,[.76,.45,.08],[0,y+.02,-.34],'concrete');texturedBox(structure,[.08,.45,.76],[-.34,y+.02,0],'concrete');
 texturedBox(paving,[.61,.10,.61],[-.685,y+.195,-.685],'paving');
 texturedBox(frontWalk,[1.37,.10,.61],[.305,y+.195,.69],'paving');texturedBox(frontWalk,[.61,.10,.76],[.69,y+.195,0],'paving');
 coverPanel(covers,'cover-corner',[0,y+.2225,0],[.72,.72]);
 annotate(g,'cover','Green fibre cover panels',[-1.2,y+.25,0],'movable-covers');annotate(g,'frame','Metal perimeter frame',[-1.9,y+.25,.365]);
 annotate(g,'paving','Brown / grey hexagonal paving',[-.9,y+.25,-.72]);annotate(g,'channel','Concrete channel',[-1.7,y-.2,.34]);
}
function coverPanel(covers:THREE.Group,id:string,at:number[],size:number[]):void {
 const panel=component(covers,id,`Cover panel · indicative`);
 const mesh=new THREE.Mesh(new RoundedBoxGeometry(size[0],.045,size[1],3,.006),fibreMaterial());mesh.position.set(at[0],at[1],at[2]);panel.add(mesh);
 const wideInZ=size[1]>size[0];                                                       // screws sit across the channel width
 for(const s of [-.25,.25]){const [x,z]=wideInZ?[at[0],at[2]+s]:[at[0]+s,at[2]];box(panel,[.07,.004,.024],[x,at[1]+.0235,z],'#0A0A0A');}
}
