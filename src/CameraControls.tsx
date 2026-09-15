import { Home, Minus, Plus, RotateCcw, RotateCw, Scan } from 'lucide-react';
import type { CameraAction } from './types';
const controls: {kind:CameraAction['kind'];label:string;icon:typeof Home}[]=[
 {kind:'home',label:'Reset or focus camera',icon:Home},{kind:'top',label:'Top view',icon:Scan},
 {kind:'left',label:'Rotate left',icon:RotateCcw},{kind:'right',label:'Rotate right',icon:RotateCw},
 {kind:'in',label:'Zoom in',icon:Plus},{kind:'out',label:'Zoom out',icon:Minus}];
export default function CameraControls({move}:{move:(kind:CameraAction['kind'])=>void}){
 return <div role="group" aria-label="Camera controls" className="camera-controls flex shrink-0 justify-center gap-1.5 border-t border-line bg-white px-2.5 py-2 max-md:justify-between">
  {controls.map(({kind,label,icon:Icon})=><button key={kind} className="control min-w-11 px-3 max-md:min-h-12 max-md:flex-1" aria-label={label} title={label} onClick={()=>move(kind)}><Icon size={21}/></button>)}
 </div>;
}
