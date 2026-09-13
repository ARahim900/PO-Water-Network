import type { ReactNode } from 'react';
import type { Status } from './engine/assumptions.ts';
import { statusLabel } from './engine/assumptions.ts';

/** A headline number. `tone` colours the value when the figure is a pass/fail against a limit. */
export function Kpi({ label, value, unit, note, tone }: { label: string; value: string; unit?: string; note?: string; tone?: 'good' | 'bad' | 'warn' }) {
 const colour = tone === 'bad' ? 'text-[#8a1515]' : tone === 'warn' ? 'text-[#7a5200]' : tone === 'good' ? 'text-[#0d5c38]' : '';
 return <div className="kpi"><div className="label">{label}</div><div className={`value ${colour}`}>{value}{unit && <span className="ml-1 text-base font-medium text-muted">{unit}</span>}</div>{note && <div className="mt-1 text-[12.25px] text-muted">{note}</div>}</div>;
}
export function StatusChip({ status }: { status: Status }) { return <span className={`chip chip-${status}`}>{statusLabel[status]}</span>; }
export function Verdict({ favours, text }: { favours: 1 | 2 | 0; text: string }) {
 return <span className={`chip ${favours === 0 ? 'chip-neutral' : 'chip-good'}`}>{favours === 0 ? 'Conditional' : `Favours Option ${favours}`} · {text}</span>;
}
export function Source({ children }: { children: ReactNode }) { return <p className="mt-2 text-[12.25px] text-muted">Source: {children}</p>; }
export function Banner({ children }: { children: ReactNode }) { return <div className="rounded-[10.5px] border border-teal bg-teal-light px-4 py-3 text-purple">{children}</div>; }

/** Labelled slider with the live value beside it. Sliders are the presenter's main control, so they stay large. */
export function Slider({ label, value, unit, min, max, step, onChange, status }: { label: string; value: number; unit?: string; min: number; max: number; step: number; onChange: (v: number) => void; status?: Status }) {
 return <label className="block">
  <span className="flex items-center justify-between gap-2 text-[14px]"><span className="font-medium text-purple">{label}{status && <span className="ml-2"><StatusChip status={status} /></span>}</span><span className="tabular-nums">{value}{unit ? ` ${unit}` : ''}</span></span>
  <input type="range" className="range mt-1" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
 </label>;
}
export function OptionCard({ n, title, children }: { n: 1 | 2; title: string; children: ReactNode }) {
 return <div className={`option-card option-${n}`}><div className="eyebrow" style={{ color: 'var(--option)' }}>Option {n}</div><h3 className="mt-1 text-lg">{title}</h3><div className="mt-3 space-y-2">{children}</div></div>;
}
export function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
 return <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-[7px] border border-line bg-white p-1">{options.map(o => <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)} className={`rounded-[5px] px-3 py-1.5 text-[14px] font-medium ${value === o.id ? 'bg-purple text-white' : 'text-purple hover:bg-paper'}`}>{o.label}</button>)}</div>;
}
