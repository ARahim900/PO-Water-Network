import { arrangeLabels, type LabelFrame } from './annotations';
export default function AnnotationOverlay({frame,onSelect}:{frame:LabelFrame;onSelect:(id:string)=>void}) {
 const compact=frame.width<768;const labels=arrangeLabels(frame);
 if(!labels.length)return null;
 return <div className="pointer-events-none absolute inset-0 z-[5]" aria-label="Automatic model labels">
  {!compact&&<svg className="absolute inset-0 h-full w-full" aria-hidden="true">{labels.map((p)=>{
   const lx=p.side?p.lx:p.lx+153;
   return <g key={p.id}><path d={`M ${lx} ${p.ly+19} L ${p.x} ${p.y}`} stroke="#4E4456" strokeWidth="1.25" fill="none"/><circle cx={p.x} cy={p.y} r="4" fill="#4E4456" stroke="#FFFFFF" strokeWidth="1.5"/></g>;
  })}</svg>}
  {!compact&&labels.map((p,i)=><button key={p.id} onClick={()=>onSelect(p.id)} data-model-label className="pointer-events-auto absolute flex min-h-11 w-[153px] items-center gap-2 rounded-[5px] border border-line bg-white p-2 text-[14px] leading-tight text-purple" style={{left:p.lx,top:p.ly}}><span className="font-bold">{i+1}</span><span>{p.title}</span></button>)}
  {compact&&labels.map((p,i)=><button key={p.id} aria-label={p.title} title={p.title} onClick={()=>onSelect(p.id)} className="pointer-events-auto absolute flex h-11 w-11 items-center justify-center rounded-full border border-white bg-purple text-base font-semibold text-white" style={{left:Math.max(0,Math.min(frame.width-44,p.x-22)),top:Math.max(0,Math.min(frame.height-44,p.y-22))}}>{i+1}</button>)}
 </div>;
}
