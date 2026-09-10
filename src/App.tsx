import { useEffect, useRef, useState } from 'react';
import { Box, Cable, CloudRain, Download, Layers, Maximize, Minimize, Pause, Play, Droplets, ChevronDown } from 'lucide-react';
import ModelViewer from './ModelViewer';
import EvidencePanel from './EvidencePanel';
import ViewDetails from './ViewDetails';
import ProjectReview from './ProjectReview';
import CameraControls from './CameraControls';
import type { CameraAction, ModelSettings, Option, View } from './types';
const views: {id:View;label:string;short:string;icon:typeof Box}[]=[{id:'network',label:'Zone Five layout',short:'Layout',icon:Layers},{id:'section',label:'Pipe installation',short:'Installation',icon:Box},{id:'tapping',label:'Villa tapping',short:'Tapping',icon:Cable},{id:'weather',label:'Rain & sand',short:'Weather',icon:CloudRain}];
const initial:ModelSettings={option:'channel',view:'section',opened:false,weather:'dry',step:0,showBase:true,showAssets:true,selectedPath:'all',animation:'off',flow:false,flowPaused:false};
export default function App() {
 const [settings,setSettings]=useState<ModelSettings>(initial);
 const [camera,setCamera]=useState<CameraAction>({kind:'home',serial:0});
 const [exportSerial,setExportSerial]=useState(0);
 const [expanded,setExpanded]=useState(false);
 const [detailsOpen,setDetailsOpen]=useState(false);
 const expandButton=useRef<HTMLButtonElement>(null);
 const frame=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!expanded)return;
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const keydown=(event:KeyboardEvent)=>{
   if(event.key==='Escape')setExpanded(false);
   if(event.key!=='Tab'||!frame.current)return;
   const nodes=Array.from(frame.current.querySelectorAll<HTMLElement>('button:not([disabled]),select')).filter(node=>node.getClientRects().length);
   const first=nodes[0],last=nodes[nodes.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  };
  window.addEventListener('keydown',keydown);expandButton.current?.focus();
  return()=>{document.body.style.overflow=overflow;window.removeEventListener('keydown',keydown);expandButton.current?.focus();};
 },[expanded]);
 const patch=(value:Partial<ModelSettings>)=>setSettings(s=>({...s,...value,...(('view' in value||'option' in value||'opened' in value)?{animation:'off' as const}:{})}));
 const move=(kind:CameraAction['kind'])=>setCamera(c=>({kind,serial:c.serial+1}));
 const selectView=(view:View)=>patch({view,step:view==='tapping'?Math.max(3,settings.step):settings.step});
 const coversOpen=settings.opened||settings.flow||settings.view==='tapping'&&settings.step>0;
 const toggleCovers=()=>patch({opened:!coversOpen,step:coversOpen?0:Math.max(3,settings.step),flow:false});
 const waterActive=settings.flow||settings.view==='weather'&&settings.weather==='rain';
 const pause=()=>patch({flowPaused:!settings.flowPaused,animation:settings.animation==='playing'?'paused':settings.animation});
 return <main className="mx-auto max-w-[1536px]">
  <header className="flex items-center justify-between gap-2 bg-purple px-4 py-3 text-white md:px-8"><span className="eyebrow">Muscat Bay</span><span className="text-[14px]">Zone Five · Concept review</span></header>
  <section className="flex items-center justify-between gap-3 px-4 py-3 md:px-8 md:py-5"><div><h1 className="text-xl md:text-3xl">Water network explorer</h1><p className="mt-1 hidden md:block">Inspect both installation options. Select a component to fly closer.</p></div><button aria-label="Download static 3D view" onClick={()=>setExportSerial(v=>v+1)} className="control"><Download size={20}/><span className="hidden sm:inline">3D export</span></button></section>
  <section className="grid gap-4 pb-5 md:px-8 xl:grid-cols-[minmax(0,1fr)_315px]">
   <div ref={frame} role={expanded?'dialog':undefined} aria-modal={expanded||undefined} aria-label={expanded?'Expanded 3D explorer':undefined} className={expanded?'explorer-expanded fixed inset-0 z-[2147483646] flex h-dvh min-h-0 flex-col bg-paper':'flex min-w-0 flex-col border-y border-line bg-paper md:rounded-[10.5px] md:border'}>
    <div className="viewer-options flex shrink-0 items-center gap-2 border-b border-line bg-white p-2">
     <div role="group" aria-label="Installation option" className="grid min-w-0 flex-1 grid-cols-2 gap-2">{(['buried','channel'] as Option[]).map((o,i)=><button key={o} aria-pressed={settings.option===o} aria-label={`Option ${i+1} · ${o==='buried'?'Buried pipeline':'Covered channel'}`} className={`control px-2 ${settings.option===o?'selected':''}`} onClick={()=>patch({option:o})}>{i+1} · {o==='buried'?'Buried':'Channel'}</button>)}</div>
     <button ref={expandButton} className="control min-w-11 px-2" onClick={()=>setExpanded(v=>!v)} aria-label={expanded?'Exit expanded view':'Expand model'} title={expanded?'Exit expanded view':'Expand model'}>{expanded?<Minimize size={20}/>:<Maximize size={20}/>}</button>
    </div>
    <nav aria-label="Model views" className="viewer-tabs grid shrink-0 grid-cols-4 border-b border-line bg-white">{views.map(({id,label,short,icon:Icon})=><button key={id} aria-label={label} aria-pressed={settings.view===id} onClick={()=>selectView(id)} className={`flex min-h-12 items-center justify-center gap-1 border-b-3 px-1 text-[14px] font-medium ${settings.view===id?'border-purple text-purple':'border-transparent text-ink'}`}><Icon className="hidden min-[380px]:block" size={17}/>{short}</button>)}</nav>
    <div className={expanded?'viewer-stage min-h-0 flex-1':'viewer-stage h-[max(420px,56svh)] min-h-0 md:h-[680px]'}><ModelViewer settings={settings} cameraAction={camera} exportSerial={exportSerial} onComponentSelect={(water,reveal)=>patch({animation:'paused',...water?{flow:true}:{},...reveal?{opened:true,step:Math.max(settings.step,3)}:{}})}/></div>
    <CameraControls move={move}/>
    <div className="viewer-actions flex shrink-0 flex-wrap gap-2 border-t border-line bg-white p-2">
     <button aria-pressed={settings.flow} className={`control flex-1 ${settings.flow?'selected':''}`} onClick={()=>patch({flow:!settings.flow})}><Droplets size={18}/>{settings.flow?'Hide flow':'Water flow'}</button>
     {settings.option==='channel'&&settings.view!=='network'&&<button className="control flex-1" onClick={toggleCovers}>{coversOpen?'Lower covers':'Lift covers'}</button>}
     {waterActive?<button className="control min-w-11 px-3" aria-label={settings.flowPaused?'Resume water motion':'Pause water motion'} onClick={pause}>{settings.flowPaused?<Play size={18}/>:<Pause size={18}/>}</button>:settings.option==='channel'&&settings.view!=='network'&&<button className="control min-w-11 px-3" aria-label={settings.animation==='playing'?'Pause cover animation':'Play cover animation'} onClick={()=>patch({animation:settings.animation==='playing'?'paused':'playing'})}>{settings.animation==='playing'?<Pause size={18}/>:<Play size={18}/>}</button>}
    </div>
    {expanded&&<p className="viewer-hint shrink-0 px-3 py-1 text-[14px] text-ink">Drag to rotate · Pinch to zoom · Concept only</p>}
   </div>
   <aside className="px-4 md:px-0">
    <button className="control w-full justify-between xl:hidden" aria-expanded={detailsOpen} aria-controls="view-details" onClick={()=>setDetailsOpen(v=>!v)}>View controls & notes<ChevronDown size={18} className={detailsOpen?'rotate-180':''}/></button>
    <div id="view-details" className={`${detailsOpen?'block':'hidden'} pt-4 xl:block xl:pt-0`}><ViewDetails settings={settings} patch={patch} move={move}/></div>
   </aside>
  </section>
  <details className="border-t border-line bg-white"><summary className="px-4 py-4 font-semibold text-purple md:px-8">Option comparison & project evidence</summary><ProjectReview/><EvidencePanel/></details>
  <footer className="flex flex-wrap justify-between gap-2 bg-purple px-4 py-3 text-[14px] text-white md:px-8"><span>Muscat Bay · Assets & Operations</span><span>Concept only · Not for construction</span></footer>
 </main>;
}
