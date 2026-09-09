import { arrangeLabels, type LabelFrame } from './annotations';
export default function AnnotationOverlay({frame,onSelect}:{frame:LabelFrame;onSelect:(id:string)=>void}) {
 const compact=frame.width<600;const labels=arrangeLabels(frame).map((p)=>compact?{...p,ly:Math.max(65,p.ly-25)}:p);
 if(!labels.length)return null;
 return <div className="pointer-events-none absolute inset-0 z-[5]" aria-label="Automatic model labels">
  <svg className="absolute inset-0 h-full w-full" aria-hidden="true">{labels.map((p,i)=>{
   const lx=compact?(p.side?frame.width-24:24):(p.side?p.lx:p.lx+153);
   return <g key={p.id}><path d={`M ${lx} ${p.ly+19} L ${p.x} ${p.y}`} stroke="#4E4456" strokeWidth="1.25" fill="none"/><circle cx={p.x} cy={p.y} r="4" fill="#4E4456" stroke="#FFFFFF" strokeWidth="1.5"/>{compact&&<><circle cx={lx} cy={p.ly+19} r="13" fill="#4E4456"/><text x={lx} y={p.ly+24} textAnchor="middle" fill="#FFFFFF" fontSize="14">{i+1}</text></>}</g>;
  })}</svg>
  {!compact&&labels.map((p,i)=><button key={p.id} onClick={()=>onSelect(p.id)} data-model-label className="pointer-events-auto absolute flex min-h-10 w-[153px] items-center gap-2 rounded-[5px] border border-line bg-white p-2 text-[14px] leading-tight text-purple" style={{left:p.lx,top:p.ly}}><span className="font-bold">{i+1}</span><span>{p.title}</span></button>)}
  {compact&&<div className="absolute inset-x-2 grid grid-cols-2 gap-x-2 gap-y-1 rounded-[5px] bg-white p-2 text-[14px] leading-tight" style={{top:frame.height+8}}>{labels.map((p,i)=><button className="pointer-events-auto min-h-9 text-left" key={p.id} onClick={()=>onSelect(p.id)}>{i+1}. {p.title}</button>)}</div>}
 </div>;
}
