import { useEffect, useRef, useState } from 'react';
import { X, RotateCcw, Copy } from 'lucide-react';
import { register, defaults, statusLabel, type Inputs, type Status } from './engine/assumptions.ts';
import { MATERIALS } from './engine/surge.ts';
import { StatusChip } from './ui';

interface Props { open: boolean; onClose: () => void; inputs: Inputs; set: <K extends keyof Inputs>(k: K, v: Inputs[K]) => void; reset: () => void; }
const order: Status[] = ['missing', 'assumed', 'verified'];
/** Every input, grouped by how much we trust it. Missing data first, because that is what management can help with. */
export default function AssumptionsDrawer({ open, onClose, inputs, set, reset }: Props) {
 const panel = useRef<HTMLDivElement>(null);
 const [note, setNote] = useState('');
 useEffect(() => {
  if (!open) return;
  const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
  window.addEventListener('keydown', key);
  panel.current?.querySelector<HTMLElement>('button')?.focus();
  return () => window.removeEventListener('keydown', key);
 }, [open, onClose]);
 const copy = async () => {
  const text = register.map(r => `${r.label}: ${r.key === 'materialIndex' ? MATERIALS[inputs.materialIndex].name : `${inputs[r.key]} ${r.unit}`.trim()} [${statusLabel[r.status]}] — ${r.source}`).join('\n');
  try { await navigator.clipboard.writeText(text); setNote('Copied — paste it into the board paper.'); } catch { setNote('Copy blocked by the browser.'); }
  window.setTimeout(() => setNote(''), 4000);
 };
 if (!open) return null;
 return <div className="fixed inset-0 z-[2147483000] flex justify-end bg-black/30" onClick={onClose}>
  <div ref={panel} role="dialog" aria-modal="true" aria-label="Assumptions register" className="flex h-full w-full max-w-[520px] flex-col bg-white shadow-xl" onClick={e => e.stopPropagation()}>
   <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-4"><div><h2 className="text-lg">Assumptions register</h2><p className="text-[12.25px] text-muted">Every number the model uses, with its source. Change any of them; the whole app follows.</p></div><button className="control min-w-11 px-2" onClick={onClose} aria-label="Close"><X size={20} /></button></div>
   <div className="flex gap-2 border-b border-line px-5 py-3"><button className="control flex-1" onClick={reset}><RotateCcw size={16} />Reset all</button><button className="control flex-1" onClick={copy}><Copy size={16} />Copy as text</button></div>
   {note && <p aria-live="polite" className="px-5 pt-2 text-[13px] text-purple">{note}</p>}
   <div className="flex-1 overflow-y-auto px-5 py-4">
    {order.map(status => <section key={status} className="mb-6"><h3 className="mb-2 flex items-center gap-2 text-base"><StatusChip status={status} /><span className="text-muted text-[13px] font-normal">{status === 'verified' ? 'from a controlled document' : status === 'assumed' ? 'engineering default — confirm' : 'the project has not produced this yet'}</span></h3>
     <div className="space-y-4">{register.filter(r => r.status === status).map(r => <div key={r.key} className="rounded-[7px] border border-line p-3">
      {r.key === 'materialIndex'
       ? <label className="block text-[14px]"><span className="font-medium text-purple">{r.label}</span><select className="mt-1 w-full rounded-[5px] border border-line bg-white p-2" value={inputs.materialIndex} onChange={e => set('materialIndex', Number(e.target.value))}>{MATERIALS.map((m, i) => <option key={m.name} value={i}>{m.name}</option>)}</select></label>
       : <label className="block text-[14px]"><span className="flex justify-between gap-2"><span className="font-medium text-purple">{r.label}</span><span className="tabular-nums">{inputs[r.key]} {r.unit}</span></span><div className="mt-1 flex items-center gap-2"><input type="range" className="flex-1" min={r.min} max={r.max} step={r.step} value={inputs[r.key]} onChange={e => set(r.key, Number(e.target.value))} /><input type="number" className="w-20 rounded-[5px] border border-line p-1 text-right" min={r.min} max={r.max} step={r.step} value={inputs[r.key]} onChange={e => set(r.key, Number(e.target.value))} aria-label={`${r.label} value`} /></div></label>}
      <p className="mt-2 text-[12.25px] text-muted">{r.source}{inputs[r.key] !== defaults[r.key] && <span className="ml-1 font-semibold text-purple">· changed from {r.key === 'materialIndex' ? MATERIALS[defaults.materialIndex].name : `${defaults[r.key]} ${r.unit}`}</span>}</p>
     </div>)}</div></section>)}
   </div>
  </div>
 </div>;
}
