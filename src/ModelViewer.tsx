import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildNetwork } from './networkScene';
import { buildDetail } from './detailScene';
import { disposeGroup } from './geometry';
import data from './networkData.json';
import AnnotationOverlay from './AnnotationOverlay';
import {projectAnnotations,type LabelFrame} from './annotations';
import { components, componentFlight, findComponent, startFlight, advanceFlight, type ComponentItem, type Flight } from './interaction';
import { animateWater, animateRain, applyFlow } from './waterAnimation';
import type { CameraAction, ModelSettings } from './types';
/** Height reserved under a narrow-screen model for the numbered label list, sized for its worst case of three
 *  rows so it clears the camera bar. Fixed on purpose: deriving it from the label count would resize the canvas,
 *  reproject the labels and risk the two chasing each other. */
const COMPACT_LABELS = 216;
interface ViewerProps { settings: ModelSettings; cameraAction: CameraAction; exportSerial: number; onComponentSelect: (water: boolean, reveal: boolean) => void; }
interface Engine { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; controls: OrbitControls; model: THREE.Group; flight: Flight | null; }
function resetCamera(engine: Engine, settings: ModelSettings, top = false): void {
 const network = settings.view === 'network';
 const target = new THREE.Vector3(0, network ? 0 : -0.3, 0);
 let distance = network ? 290 : 3.1;
 const selected = data.paths.find(p => p.name === settings.selectedPath);
 if(network && selected) {
  const bounds = new THREE.Box3().setFromPoints(selected.points.map(p => new THREE.Vector3(p[0],0,-p[1])));
  bounds.getCenter(target); distance = Math.max(12,bounds.getSize(new THREE.Vector3()).length()*0.95);
 }
 engine.flight=startFlight(engine.camera,engine.controls,target,distance,top);
 engine.camera.near = network ? 0.05 : 0.005; engine.camera.far = 3000; engine.camera.updateProjectionMatrix();
 engine.controls.minDistance = network ? 2 : 0.5; engine.controls.maxDistance = network ? 1000 : 14; engine.controls.update();
}
async function exportModel(engine: Engine, settings: ModelSettings): Promise<void> {
 const exporter = new GLTFExporter();
 engine.model.userData = { ...engine.model.userData, status: 'Concept only; not for construction or hydraulic analysis', planarCrs: 'EPSG:32640', sourceOrigin: data.origin, note: settings.view === 'network' ? 'Route widths and symbols enlarged for visibility. Vertical positions illustrative.' : 'Generic detail; fitting, structural and bedding dimensions not approved.' };
 const staticSettings={...settings,flow:false};
 const exportRoot=settings.view==='network'?buildNetwork(staticSettings):buildDetail(staticSettings);
 exportRoot.userData.note='Static geometry export. Flyover, shader cutaways and water animations are available in the interactive HTML.';
 const sprites: THREE.Sprite[] = [];
 exportRoot.traverse(object => { if(object instanceof THREE.Sprite) sprites.push(object); });
 for(const sprite of sprites) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sprite.scale.x,sprite.scale.y),new THREE.MeshBasicMaterial({map:sprite.material.map,transparent:true,side:THREE.DoubleSide}));
  mesh.position.copy(sprite.position);mesh.quaternion.copy(engine.camera.quaternion);sprite.parent?.add(mesh);sprite.removeFromParent();sprite.material.dispose();
 }
 let output: ArrayBuffer | { [key: string]: unknown };
 try { output = await exporter.parseAsync(exportRoot, { binary: true, onlyVisible: true }); }
 finally { disposeGroup(exportRoot); }
 if (!(output instanceof ArrayBuffer)) throw new Error('The 3D export did not produce a binary model.');
 const url = URL.createObjectURL(new Blob([output],{type:'model/gltf-binary'}));
 const a = document.createElement('a'); a.href=url; a.download=`Zone-5-${settings.option}-${settings.view}-CONCEPT.glb`;a.click();
 window.setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export default function ModelViewer({ settings, cameraAction, exportSerial, onComponentSelect }: ViewerProps) {
 const host = useRef<HTMLDivElement>(null); const engine = useRef<Engine|null>(null); const current = useRef(settings);
 const [labels,setLabels] = useState<LabelFrame>({width:0,height:0,points:[]});
 const [items,setItems]=useState<ComponentItem[]>([]);const [selected,setSelected]=useState('');
 const selectedRef=useRef('');const selectionCallback=useRef(onComponentSelect);selectionCallback.current=onComponentSelect;
 const selectRef=useRef<(id:string)=>void>(()=>{});
 const clock=useRef(0);const lastLabels=useRef('');
 const [error,setError] = useState(''); const [exporting,setExporting] = useState(false);
 current.current=settings;
 useEffect(()=> {
  const container=host.current; if(!container) return;
  let renderer: THREE.WebGLRenderer;
  try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});}
  catch(e) {setError(e instanceof Error?e.message:'WebGL could not start.');return;}
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.localClippingEnabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)); renderer.setClearColor('#F7F8F9');
  renderer.domElement.setAttribute('aria-label','Interactive 3D model. Use the adjacent view and camera buttons, or drag to rotate and scroll to zoom.');
  renderer.domElement.setAttribute('role','img'); container.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,0.01,3000);
  scene.add(new THREE.HemisphereLight('#FFFFFF','#6B7280',1.8));
  const light=new THREE.DirectionalLight('#FFFFFF',1.2);light.position.set(4,7,5);light.name='sunlight';light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:25});light.shadow.normalBias=.005;scene.add(light);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*0.92;
  engine.current={scene,camera,renderer,controls,model:new THREE.Group(),flight:null}; resetCamera(engine.current,current.current);
  let framed=false;
  const resize=new ResizeObserver(()=>{
   const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;
   renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
   // Only frame the model on the first measurement. Later resizes — a rotated tablet, the mobile browser bar,
   // a meeting-room display — keep whatever the reviewer is currently looking at.
   if(!framed&&engine.current){framed=true;resetCamera(engine.current,current.current);}
  });resize.observe(container);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const cancelFlight=()=>{if(engine.current)engine.current.flight=null;};controls.addEventListener('start',cancelFlight);
  let pointerStart=new THREE.Vector2();
  const pointerDown=(event:PointerEvent)=>{pointerStart.set(event.clientX,event.clientY);};
  const pointerUp=(event:PointerEvent)=>{
   if(pointerStart.distanceTo(new THREE.Vector2(event.clientX,event.clientY))>6||!engine.current)return;
   const rect=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();
   ray.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
   for(const hit of ray.intersectObject(engine.current.model,true)){
    let visible=true;let node:THREE.Object3D|null=hit.object;while(node){if(!node.visible)visible=false;node=node.parent;}
    const id=findComponent(hit.object);if(visible&&id){selectRef.current(id);break;}
   }
  };
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);
  let frame=0,lastTime=performance.now(),counter=0,waterTime=0;
  const render=()=>{
   frame=requestAnimationFrame(render);const now=performance.now(),dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
   const model=engine.current?.model;
   if(model){
    const config=current.current;const covers=model.getObjectByName('movable-covers');
    if(covers){
     if(config.animation==='playing'&&!reduced.matches){clock.current+=dt;covers.position.y=.72*(1-Math.cos(clock.current*Math.PI/4))/2;}
     else if(config.animation==='off'||reduced.matches){const target=((config.view==='tapping'?config.step>0:config.opened)||config.flow)?.72:0;covers.position.y=reduced.matches?target:covers.position.y+(target-covers.position.y)*(1-Math.exp(-4*dt));}
    }
    if(covers)model.getObjectByName('main')?.traverse(o=>{if(o instanceof THREE.Sprite)o.visible=covers.position.y>.18;});
    const frontFrame=model.getObjectByName('front-frame-cut');if(frontFrame&&covers)frontFrame.visible=covers.position.y<.05;
    const front=model.getObjectByName('front-walkway-cut');if(front&&covers)front.visible=covers.position.y<.05;
    if(!config.flowPaused&&!reduced.matches)waterTime+=dt;
    animateWater(model,waterTime);animateRain(model,waterTime);
    const e=engine.current;if(e?.flight&&!advanceFlight(e.flight,camera,controls,reduced.matches))e.flight=null;
    renderer.domElement.dataset.camera=camera.position.toArray().map(n=>n.toFixed(3)).join(',');
    renderer.domElement.dataset.flowTime=waterTime.toFixed(3);
    model.updateMatrixWorld(true);
    if(counter++%4===0){const next=projectAnnotations(model,camera,container.clientWidth,container.clientHeight);const key=JSON.stringify(next);if(key!==lastLabels.current){lastLabels.current=key;setLabels(next);}}
   }
   controls.update();renderer.render(scene,camera);
  };render();
  const contextLost=(event: Event)=>{event.preventDefault();setError('The graphics context was interrupted. Reload the viewer to restore it.');};
  renderer.domElement.addEventListener('webglcontextlost',contextLost);
  return ()=>{cancelAnimationFrame(frame);resize.disconnect();controls.removeEventListener('start',cancelFlight);controls.dispose();renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);if(engine.current)disposeGroup(engine.current.model);renderer.dispose();renderer.domElement.removeEventListener('webglcontextlost',contextLost);renderer.domElement.remove();engine.current=null;};
 },[]);
 useEffect(()=> {
  const e=engine.current;if(!e)return;
  const oldCover=e.model.getObjectByName('movable-covers')?.position.y;
  e.scene.remove(e.model);disposeGroup(e.model);
  try {e.model=settings.view==='network'?buildNetwork(settings):buildDetail(settings);e.scene.add(e.model);const sun=e.scene.getObjectByName('sunlight');if(sun instanceof THREE.DirectionalLight)sun.castShadow=settings.view!=='network';e.model.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=settings.view!=='network';o.receiveShadow=true;}});setItems(components(e.model));setError('');const focused=e.model.getObjectByName(selectedRef.current);if(focused)e.flight=componentFlight(e.camera,e.controls,focused);else if(selectedRef.current){selectedRef.current='';setSelected('');resetCamera(e,current.current);}const cover=e.model.getObjectByName('movable-covers');if(cover)cover.position.y=oldCover??0;}
  catch(err){setError(err instanceof Error?err.message:'The model could not be generated.');}
 },[settings.option,settings.view,settings.opened,settings.weather,settings.step,settings.showBase,settings.showAssets,settings.selectedPath]);
 // The cutaway is added and removed in place. Rebuilding the whole model for it stalled the 46-route layout.
 useEffect(()=>{const e=engine.current;if(e)applyFlow(e.model,settings.flow);},[settings.flow]);
 useEffect(()=>{if(settings.animation==='off')clock.current=0;if(settings.animation==='playing'&&clock.current===0){const height=engine.current?.model.getObjectByName('movable-covers')?.position.y??0;clock.current=Math.acos(1-Math.min(1,height/.72)*2)*4/Math.PI;}},[settings.animation]);
 useEffect(()=>{selectedRef.current='';setSelected('');if(engine.current)resetCamera(engine.current,current.current);},[settings.view,settings.option,settings.selectedPath]);
 useEffect(()=> {
  const e=engine.current;if(!e)return;const kind=cameraAction.kind;
  if(kind==='home'||kind==='top'){resetCamera(e,current.current,kind==='top');return;}
  const delta=e.camera.position.clone().sub(e.controls.target);
  if(kind==='in'||kind==='out')delta.multiplyScalar(kind==='in'?0.8:1.25);
  else delta.applyAxisAngle(new THREE.Vector3(0,1,0),kind==='left'?Math.PI/8:-Math.PI/8);
  e.flight={start:performance.now(),from:e.camera.position.clone(),to:e.controls.target.clone().add(delta),targetFrom:e.controls.target.clone(),targetTo:e.controls.target.clone()};
 },[cameraAction]);
 useEffect(()=> {
  if(!exportSerial||!engine.current)return;
  setExporting(true);void exportModel(engine.current,current.current).catch(err=>{console.error('Model export failed',err);setError('Model export failed. Please reload and try again.');}).finally(()=>setExporting(false));
 },[exportSerial]);
 const select=(rawId:string)=>{
  const id=rawId==='cover'?'movable-covers':rawId==='flex'?'service':rawId;const e=engine.current;if(!e)return;
  const object=e.model.getObjectByName(id);if(!object)return;
  selectedRef.current=id;setSelected(id);const item=items.find(item=>item.id===id);
  const reveal=current.current.view!=='network'&&!id.startsWith('cover-panel-')&&!['paving','movable-covers','frame','rain-drops'].includes(id);
  selectionCallback.current((item?.water??false)&&!id.startsWith('rain'),reveal);
  e.flight=componentFlight(e.camera,e.controls,object);
 };selectRef.current=select;
 return <div className="relative h-full min-h-[410px] w-full">
  <div ref={host} className="absolute inset-0 touch-none" style={{bottom:settings.view!=='network'&&labels.width>0&&labels.width<600?COMPACT_LABELS:0}}/>
  {settings.view!=='network'&&<AnnotationOverlay frame={labels} onSelect={select}/>}
  <div className="absolute inset-x-3 top-20 z-10 sm:top-16 flex flex-wrap items-center gap-2 rounded-[5px] border border-line bg-white p-2">
   <label htmlFor="component-focus" className="font-medium text-purple">Fly to</label>
   <select id="component-focus" value={selected} onChange={event=>select(event.target.value)} className="min-w-0 flex-1 rounded-[5px] border border-line bg-white p-2"><option value="">Select a component…</option>{items.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select>
  </div>
  <div className="sr-only" role="status">{selected?`Viewing ${items.find(item=>item.id===selected)?.title??selected}`:'Select a component for a camera flyover.'}</div>
  {error&&<div role="alert" className="absolute inset-x-4 top-4 panel p-4 text-purple">{error}</div>}
  {exporting&&<div role="status" className="absolute bottom-4 left-4 panel p-3">Preparing 3D download…</div>}
 </div>;
}
