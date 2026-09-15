import { useEffect, useRef, useState } from 'react';
import { Tags } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createGraphicsRenderer, type GraphicsRenderer } from './graphicsRenderer';
import { buildNetwork } from './networkScene';
import { buildDetail } from './detailScene';
import { buildRun } from './runScene';
import { modelObjects } from './streetScene';
import { disposeGroup } from './geometry';
import data from './networkData.json';
import AnnotationOverlay from './AnnotationOverlay';
import {projectAnnotations,type LabelFrame} from './annotations';
import { components, componentFlight, boundsFlight, modelFlight, findComponent, startFlight, advanceFlight, type ComponentItem, type Flight } from './interaction';
import { animateWater, animateRain, setFlow } from './waterAnimation';
import { networkTourStops, type NetworkTour } from './networkTour';
import type { CameraAction, ModelSettings } from './types';
interface ViewerProps { settings: ModelSettings; cameraAction: CameraAction; exportSerial: number; onComponentSelect: (water: boolean, reveal: boolean) => void; }
interface Engine { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: GraphicsRenderer; controls: OrbitControls; model: THREE.Group; flight: Flight | null; }
function resetCamera(engine: Engine, settings: ModelSettings, top = false): void {
 const network = settings.view === 'network';
 const target = new THREE.Vector3(0, network ? 0 : -0.3, 0);
 let distance = network ? 290 : 3.1;
 const selected = network?data.paths.find(p => p.name === settings.selectedPath):undefined;
 if(network && selected) {
  const bounds = new THREE.Box3().setFromPoints(selected.points.map(p => new THREE.Vector3(p[0],0,-p[1])));
  bounds.getCenter(target); distance = Math.max(12,bounds.getSize(new THREE.Vector3()).length()*0.95);
 }
 engine.flight=engine.model.children.length&&!selected?(network?boundsFlight(engine.camera,engine.controls,new THREE.Box3().setFromObject(engine.model),top):modelFlight(engine.camera,engine.controls,engine.model,top)):startFlight(engine.camera,engine.controls,target,distance,top);
 engine.camera.near = network ? 0.05 : 0.005; engine.camera.far = 3000; engine.camera.updateProjectionMatrix();
 engine.controls.minDistance = network ? 2 : 0.5; engine.controls.maxDistance = network ? 1000 : settings.view === 'weather' ? 14 : 60; engine.controls.update();
}
async function exportModel(engine: Engine, settings: ModelSettings): Promise<void> {
 const exporter = new GLTFExporter();
 engine.model.userData = { ...engine.model.userData, status: 'Concept only; not for construction or hydraulic analysis', planarCrs: 'EPSG:32640', sourceOrigin: data.origin, note: settings.view === 'network' ? 'Route widths and symbols enlarged for visibility. Vertical positions illustrative.' : 'Generic detail; fitting, structural and bedding dimensions not approved.' };
 const staticSettings={...settings,flow:false};
 const exportRoot=settings.view==='network'?buildNetwork(staticSettings):settings.view==='run'?buildRun(staticSettings):buildDetail(staticSettings);
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
 const [showLabels,setShowLabels]=useState(false);
 const labelVisibility=useRef(showLabels);labelVisibility.current=showLabels;
 const [labels,setLabels] = useState<LabelFrame>({width:0,height:0,points:[]});
 const [items,setItems]=useState<ComponentItem[]>([]);const [selected,setSelected]=useState('');
 const selectedRef=useRef('');const selectionCallback=useRef(onComponentSelect);selectionCallback.current=onComponentSelect;
 const selectRef=useRef<(id:string)=>void>(()=>{});
 const clock=useRef(0);const lastLabels=useRef('');
 const [error,setError] = useState(''); const [exporting,setExporting] = useState(false);
 const [graphicsAttempt,setGraphicsAttempt]=useState(0);
 const [graphicsRun,setGraphicsRun]=useState(0);
 const recoveryCount=useRef(0);
 const [graphicsStatus,setGraphicsStatus]=useState('');
 const [graphics,setGraphics]=useState<GraphicsRenderer|null>(null);
 const [graphicsFailure,setGraphicsFailure]=useState(false);
 const [diagnostics,setDiagnostics]=useState<string[]>([]);
 const dirty=useRef(true);
 const tour=useRef<NetworkTour|null>(null);const [tourStatus,setTourStatus]=useState('');
 current.current=settings;
 useEffect(()=> {
  let cancelled=false,settled=false,retry=0;
  const touch=window.matchMedia('(any-pointer: coarse)').matches||navigator.maxTouchPoints>0;
  setGraphics(null);setGraphicsFailure(false);setError('');setGraphicsStatus('Starting 3D graphics…');
  if(graphicsAttempt===0)setDiagnostics([]);
  const fail=(error:unknown)=>{
   if(cancelled||settled)return;
   settled=true;window.clearTimeout(timeout);
   const message=error instanceof Error?error.message:String(error);
   console.warn('Graphics startup failed',message);
   setDiagnostics(previous=>[...previous,`${graphicsAttempt===1?'WebGPU':'WebGL 2'}: ${message}`]);
   if(graphicsAttempt>=2){setGraphicsFailure(true);setGraphicsStatus('');return;}
   retry=window.setTimeout(()=>setGraphicsAttempt(value=>value+1),750);
  };
  const timeout=window.setTimeout(()=>fail(new Error('Graphics startup timed out.')),10000);
  void createGraphicsRenderer(graphicsAttempt,touch).then(renderer=>{
   if(cancelled||settled){renderer.dispose();return;}
   settled=true;window.clearTimeout(timeout);setGraphics(renderer);setGraphicsStatus('');
  }).catch(fail);
  return()=>{cancelled=true;window.clearTimeout(retry);window.clearTimeout(timeout);};
 },[graphicsAttempt,graphicsRun]);
 useEffect(()=> {
  const container=host.current;const renderer=graphics;if(!container||!renderer)return;
  renderer.domElement.dataset.graphicsMode=renderer.mode;
  dirty.current=true;
  renderer.domElement.setAttribute('aria-label','Interactive 3D model. Use the adjacent view and camera buttons, or drag to rotate and scroll to zoom.');
  renderer.domElement.setAttribute('role','img'); container.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,0.01,3000);
  scene.add(new THREE.HemisphereLight('#FFFFFF','#6B7280',1.8));
  const light=new THREE.DirectionalLight('#FFFFFF',1.2);light.position.set(4,7,5);light.name='sunlight';light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:25});light.shadow.normalBias=.005;scene.add(light);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*0.92;
  engine.current={scene,camera,renderer,controls,model:new THREE.Group(),flight:null}; resetCamera(engine.current,current.current);
  let measured=false;
  const resize=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.resize(w,h);dirty.current=true;camera.aspect=w/h;camera.updateProjectionMatrix();if(!measured&&engine.current){measured=true;resetCamera(engine.current,current.current);const initial=engine.current.flight;if(initial){camera.position.copy(initial.to);controls.target.copy(initial.targetTo);engine.current.flight=null;controls.update();}}});resize.observe(container);
  let visible=true;const intersection=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;});intersection.observe(container);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const markDirty=()=>{dirty.current=true;};controls.addEventListener('change',markDirty);reduced.addEventListener('change',markDirty);
  const cancelFlight=()=>{if(engine.current)engine.current.flight=null;tour.current=null;setTourStatus('');};controls.addEventListener('start',cancelFlight);
  const pointerStart=new THREE.Vector2();const pointers=new Set<number>();let multiTouch=false;
  const pointerDown=(event:PointerEvent)=>{pointers.add(event.pointerId);if(pointers.size===1){pointerStart.set(event.clientX,event.clientY);multiTouch=false;}else multiTouch=true;};
  const pointerCancel=(event:PointerEvent)=>{pointers.delete(event.pointerId);multiTouch=true;};
  const pointerUp=(event:PointerEvent)=>{
   pointers.delete(event.pointerId);if(multiTouch)return;
   if(pointerStart.distanceTo(new THREE.Vector2(event.clientX,event.clientY))>6||!engine.current)return;
   const rect=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();
   ray.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
   for(const hit of ray.intersectObject(engine.current.model,true)){
    let visible=true;let node:THREE.Object3D|null=hit.object;while(node){if(!node.visible)visible=false;node=node.parent;}
    const id=findComponent(hit.object);if(visible&&id){selectRef.current(id);break;}
   }
  };
  renderer.domElement.addEventListener('pointercancel',pointerCancel);renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);
  let frame=0,lastTime=performance.now(),counter=0,waterTime=0,lastGpuPaint=0;
  let contextPaused=false,recoveryTimer=0;
  const drawingFailed=(error:unknown)=>{
   console.error('Model rendering failed',error);contextPaused=true;
   setDiagnostics(previous=>[...previous,error instanceof Error?error.message:String(error)]);
   setGraphicsStatus('');setGraphicsFailure(true);
  };
  const render=()=>{
   frame=requestAnimationFrame(render);const now=performance.now();
   if(!visible||document.hidden||contextPaused){lastTime=now;return;}

   if(renderer.mode==='webgpu'&&now-lastGpuPaint<1000/30)return;
   const dt=Math.min(.1,(now-lastTime)/1000);lastTime=now;
   const model=engine.current?.model;
   const config=current.current;
   const cover=modelObjects(model,'movable-covers')[0];
   const coverTarget=((config.view==='tapping'?config.step>0:config.opened)||config.flow)?.72:0;
   const movingCover=!!cover&&(config.animation==='off'||reduced.matches)&&Math.abs(cover.position.y-coverTarget)>.001;
   const animating=!reduced.matches&&(!!engine.current?.flight||!!tour.current||config.animation==='playing'||!config.flowPaused&&(config.flow||config.view==='weather'&&config.weather==='rain'));
   const moved=controls.update();
   if(!dirty.current&&!moved&&!animating&&!movingCover&&!engine.current?.flight){
    if(renderer.mode==='webgpu'){
     // Keep the WebGPU canvas presented without recomputing idle model animations.
     try{renderer.render(scene,camera);lastGpuPaint=now;}
     catch(error){drawingFailed(error);}
    }
    return;
   }
   if(model){
    const config=current.current;
    if(config.animation==='playing'&&!reduced.matches)clock.current+=dt;
    for(const covers of modelObjects(model,'movable-covers')){
     covers.visible=!config.flow;
     if(config.animation==='playing'&&!reduced.matches){covers.position.y=.72*(1-Math.cos(clock.current*Math.PI/4))/2;}
     else if(config.animation==='off'||reduced.matches){const target=((config.view==='tapping'?config.step>0:config.opened)||config.flow)?.72:0;covers.position.y=reduced.matches?target:covers.position.y+(target-covers.position.y)*(1-Math.exp(-4*dt));}
    }
    for(const lid of modelObjects(model,'chamber-cover'))lid.visible=!config.flow;
    for(const covers of modelObjects(model,'movable-covers')){
     const row=covers.parent??model;
     for(const main of modelObjects(row,'main'))main.traverse(o=>{if(o instanceof THREE.Sprite)o.visible=covers.position.y>.18;});
     for(const name of ['front-frame-cut','front-walkway-cut'])for(const cut of modelObjects(row,name))cut.visible=covers.position.y<.05;
    }
    if(!config.flowPaused&&!reduced.matches)waterTime+=dt;
    animateWater(model,waterTime);animateRain(model,waterTime);
    const e=engine.current;
    if(tour.current&&e){
     const active=tour.current;
     if(reduced.matches){tour.current=null;setTourStatus('');}
     else if(now>=active.nextAt){
      active.index++;
      const stop=active.stops[active.index];
      if(stop){e.flight={...boundsFlight(camera,controls,stop.bounds,stop.top),duration:2500};active.nextAt=now+4500;setTourStatus(`${active.index+1}/${active.stops.length} · ${stop.title}`);}
      else {tour.current=null;setTourStatus('');}
     }
    }
    if(e?.flight&&!advanceFlight(e.flight,camera,controls,reduced.matches))e.flight=null;
    renderer.domElement.dataset.camera=camera.position.toArray().map(n=>n.toFixed(3)).join(',');
    renderer.domElement.dataset.flowTime=waterTime.toFixed(3);
    model.updateMatrixWorld(true);
    if(labelVisibility.current&&(dirty.current||counter++%6===0)){const next=projectAnnotations(model,camera,container.clientWidth,container.clientHeight);const key=JSON.stringify(next);if(key!==lastLabels.current){lastLabels.current=key;setLabels(next);}}
   }
   controls.update();
   try {renderer.render(scene,camera);dirty.current=false;lastGpuPaint=now;}
   catch(error){drawingFailed(error);}
  };render();
  const contextLost=(event: Event)=>{
   event.preventDefault();contextPaused=true;
   setGraphicsStatus('Restoring graphics…');
   window.clearTimeout(recoveryTimer);
   recoveryTimer=window.setTimeout(()=>{
    recoveryCount.current++;
    if(recoveryCount.current>2){setGraphics(null);setGraphicsFailure(true);setGraphicsStatus('');return;}
    setGraphicsAttempt(value=>value<2?value+1:0);
   },2000);
  };
  const contextRestored=()=>{
   window.clearTimeout(recoveryTimer);contextPaused=false;
   renderer.webgl?.setClearColor('#F7F8F9');
   if(container.clientWidth&&container.clientHeight)renderer.resize(container.clientWidth,container.clientHeight);
   dirty.current=true;setGraphicsStatus('');
  };
  const resume=()=>{
   if(document.hidden)return;
   dirty.current=true;lastTime=performance.now();
   if(renderer.webgl?.getContext().isContextLost()&&!contextPaused)contextLost(new Event('webglcontextlost'));
  };
  renderer.domElement.addEventListener('webglcontextlost',contextLost);
  renderer.domElement.addEventListener('webglcontextrestored',contextRestored);
  document.addEventListener('visibilitychange',resume);window.addEventListener('pageshow',resume);
  return ()=>{
   cancelAnimationFrame(frame);window.clearTimeout(recoveryTimer);
   resize.disconnect();intersection.disconnect();
   document.removeEventListener('visibilitychange',resume);window.removeEventListener('pageshow',resume);
   reduced.removeEventListener('change',markDirty);controls.removeEventListener('change',markDirty);controls.removeEventListener('start',cancelFlight);controls.dispose();
   renderer.domElement.removeEventListener('pointercancel',pointerCancel);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);
   renderer.domElement.removeEventListener('webglcontextlost',contextLost);renderer.domElement.removeEventListener('webglcontextrestored',contextRestored);
   if(engine.current)disposeGroup(engine.current.model);
   light.shadow.dispose();renderer.dispose();engine.current=null;
  };
 },[graphics]);
 useEffect(()=> {
  const e=engine.current;if(!e)return;
  dirty.current=true;
  tour.current=null;setTourStatus('');
  const oldCover=modelObjects(e.model,'movable-covers')[0]?.position.y;
  e.scene.remove(e.model);disposeGroup(e.model);
  try {e.model=settings.view==='network'?buildNetwork(settings):settings.view==='run'?buildRun(settings):buildDetail(settings);e.scene.add(e.model);const sun=e.scene.getObjectByName('sunlight');if(sun instanceof THREE.DirectionalLight)sun.castShadow=settings.view!=='network';e.model.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=settings.view!=='network';o.receiveShadow=true;}});setItems(components(e.model));setError('');const focused=e.model.getObjectByName(selectedRef.current);if(focused)e.flight=componentFlight(e.camera,e.controls,focused);else if(selectedRef.current){selectedRef.current='';setSelected('');resetCamera(e,current.current);}for(const cover of modelObjects(e.model,'movable-covers'))cover.position.y=oldCover??0;}
  catch(err){console.error('Model generation failed',err);setGraphicsFailure(false);setError(err instanceof Error?err.message:'The model could not be generated.');}
 },[graphics,settings.option,settings.view,settings.opened,settings.weather,settings.step,settings.showBase,settings.showAssets,settings.selectedPath]);
 useEffect(()=>{dirty.current=true;if(engine.current)setFlow(engine.current.model,settings.flow);},[settings.flow,graphics]);
 useEffect(()=>{dirty.current=true;if(settings.view==='network')engine.current?.model.traverse(o=>{if(o instanceof THREE.Sprite)o.visible=showLabels;});},[showLabels,settings.view,settings.option,settings.selectedPath,settings.showBase,settings.showAssets,settings.flow,graphics]);
 useEffect(()=>{if(settings.animation==='off')clock.current=0;if(settings.animation==='playing'&&clock.current===0){const height=modelObjects(engine.current?.model,'movable-covers')[0]?.position.y??0;clock.current=Math.acos(1-Math.min(1,height/.72)*2)*4/Math.PI;}},[settings.animation]);
 useEffect(()=>{selectedRef.current='';setSelected('');if(engine.current)resetCamera(engine.current,current.current);},[settings.view,settings.option,settings.selectedPath]);
 useEffect(()=> {
  const e=engine.current;if(!e)return;const kind=cameraAction.kind;
  tour.current=null;setTourStatus('');
  if(kind==='home'||kind==='top'){resetCamera(e,current.current,kind==='top');return;}
  const delta=e.camera.position.clone().sub(e.controls.target);
  if(kind==='in'||kind==='out')delta.multiplyScalar(kind==='in'?0.8:1.25);
  else delta.applyAxisAngle(new THREE.Vector3(0,1,0),kind==='left'?Math.PI/8:-Math.PI/8);
  e.flight={start:performance.now(),from:e.camera.position.clone(),to:e.controls.target.clone().add(delta),targetFrom:e.controls.target.clone(),targetTo:e.controls.target.clone()};
 },[cameraAction]);
 useEffect(()=> {
  if(!exportSerial)return;
  if(!engine.current){setGraphicsFailure(false);setError('The model is still starting. Try the download again when it appears.');return;}
  setExporting(true);void exportModel(engine.current,current.current).catch(err=>{console.error('Model export failed',err);setGraphicsFailure(false);setError('Model export failed. Please reload and try again.');}).finally(()=>setExporting(false));
 },[exportSerial]);
 const select=(rawId:string)=>{
  const id=rawId.replace(/(^|-)cover$/,'$1movable-covers').replace(/(^|-)flex$/,'$1service');const e=engine.current;if(!e)return;
  const object=e.model.getObjectByName(id);if(!object)return;
  tour.current=null;setTourStatus('');selectedRef.current=id;setSelected(id);const item=items.find(item=>item.id===id);
  const role=String(object.userData.modelRole??object.name);
  const reveal=current.current.view!=='network'&&!role.startsWith('cover-panel-')&&!['paving','movable-covers','frame','rain-drops'].includes(role);
  selectionCallback.current((item?.water??false)&&!id.startsWith('rain'),reveal);
  e.flight=componentFlight(e.camera,e.controls,object);
 };selectRef.current=select;
 const overview=(play=false)=>{
  const e=engine.current;if(!e)return;
  if(play&&tour.current){tour.current=null;e.flight=null;setTourStatus('');return;}
  selectedRef.current='';setSelected('');tour.current=null;setTourStatus('');
  const stops=networkTourStops(e.model),first=stops[0];
  e.flight=boundsFlight(e.camera,e.controls,first.bounds);
  if(play&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){e.flight.duration=2500;tour.current={stops,index:0,nextAt:performance.now()+4500};setTourStatus(`1/${stops.length} · ${first.title}`);}
 };
 return <div className="model-viewer flex h-full min-h-0 w-full flex-col">
  <div className="viewer-component-picker flex shrink-0 items-center gap-2 border-b border-line bg-white p-2.5">
   <label htmlFor="component-focus" className="sr-only">Fly to component</label>
   <select id="component-focus" value={selected} onChange={event=>select(event.target.value)} className="component-select min-h-12 min-w-0 flex-1 rounded-[5px] border border-line bg-white px-3 text-[15px] font-medium text-purple"><option value="">Fly to a component…</option>{items.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select>
   <button className={`control min-w-11 px-2 ${showLabels?'selected':''}`} aria-label="Toggle model labels" aria-pressed={showLabels} title="Toggle model labels" onClick={()=>setShowLabels(v=>!v)}><Tags size={20}/></button>
  </div>
  {settings.view==='network'&&<div className="viewer-tour-controls flex shrink-0 items-center gap-2 border-b border-line bg-white px-2.5 py-2"><button className="control px-3" onClick={()=>overview()}>Full layout</button><button className={`control px-3 ${tourStatus?'selected':''}`} aria-pressed={!!tourStatus} onClick={()=>overview(true)}>{tourStatus?'Stop flyover':'Start full flyover'}</button></div>}
  <div className="relative min-h-0 flex-1">
   <div ref={host} className="absolute inset-0 touch-none"/>
   {tourStatus&&<p role="status" className="pointer-events-none absolute inset-x-2 top-2 rounded-[5px] bg-white px-3 py-1 text-[14px] text-purple">{tourStatus}</p>}
   {showLabels&&settings.view!=='network'&&<AnnotationOverlay frame={labels} onSelect={select}/>}
   {graphicsStatus&&<p role="status" className="absolute inset-x-2 bottom-2 rounded-[5px] border border-line bg-white p-3 text-[14px] text-purple">{graphicsStatus}</p>}
   {graphicsFailure&&<div role="alert" className="absolute inset-0 flex items-center justify-center overflow-auto bg-paper p-6"><div className="panel max-w-lg space-y-4 p-5"><h2 className="text-xl">3D graphics are unavailable</h2><p>If this page opened inside another app, open its link directly in Safari. If Safari also fails, check the graphics details below.</p><div className="flex flex-wrap gap-2"><a className="control" href={window.location.href} target="_blank" rel="noopener noreferrer">Open browser view</a><button className="control" onClick={()=>{recoveryCount.current=0;setGraphicsAttempt(0);setGraphicsRun(value=>value+1);}}>Retry 3D</button></div><details><summary>Graphics details</summary><ul className="mt-2 space-y-2 break-words text-[14px]">{diagnostics.map((message,index)=><li key={index}>{message}</li>)}</ul></details></div></div>}
   {error&&!graphicsFailure&&<div role="alert" className="absolute inset-x-4 top-4 panel p-4 text-purple">{error}</div>}
   {exporting&&<div role="status" className="absolute bottom-4 left-4 panel p-3">Preparing 3D download…</div>}
  </div>
  {settings.view==='tapping'&&settings.option==='channel'&&<p className="shrink-0 border-t border-line bg-white px-3 py-1 text-[14px] text-purple">45° upper-quadrant saddle · Formed sweep · Fitting and load checks pending</p>}
  <div className="sr-only" role="status">{selected?`Viewing ${items.find(item=>item.id===selected)?.title??selected}`:'Select a component for a camera flyover.'}</div>
 </div>;
}
