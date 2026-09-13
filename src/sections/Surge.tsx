import { useEffect, useMemo, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import LineChart from '../charts/LineChart';
import { Kpi, Banner, Slider, Segmented, OptionCard, Source, Verdict } from '../ui';
import { fmt, type Analysis } from '../engine/model.ts';
import { MATERIALS, simulateMoc } from '../engine/surge.ts';
import { BAR_TO_M } from '../engine/steady.ts';
import type { Inputs } from '../engine/assumptions.ts';

interface Props { a: Analysis; inputs: Inputs; set: <K extends keyof Inputs>(k: K, v: Inputs[K]) => void; fireHydrant: string; setFireHydrant: (h: string) => void; }
export default function Surge({ a, inputs, set, fireHydrant, setFireHydrant }: Props) {
 const [event, setEvent] = useState<'valve' | 'pump'>('valve');
 const [playing, setPlaying] = useState(false);
 const [cursor, setCursor] = useState(0);
 const row = a.hydrants.find(h => h.name === (fireHydrant || a.fireHydrant)) ?? a.hydrants[0];
 const duration = event === 'valve' ? inputs.closureSeconds : inputs.rundownSeconds;
 const moc = useMemo(() => simulateMoc({
  length: row.pathLength, a: a.waveSpeed, inner: a.inner, sourceHead: inputs.inletBar * BAR_TO_M, flow: inputs.hydrantLps / 1000,
  frictionHead: Math.max(0, (inputs.inletBar - row.residualAtDuty) * BAR_TO_M), event, duration, tEnd: Math.max(10, duration * 2 + 6),
 }), [row, a.waveSpeed, a.inner, inputs.inletBar, inputs.hydrantLps, event, duration]);
 const tEnd = moc.t[moc.t.length - 1];
 useEffect(() => { // a moving cursor lets the presenter narrate the trace; it advances in real time
  if (!playing) return;
  let raf = 0; const start = performance.now(), from = cursor >= tEnd ? 0 : cursor;
  const tick = (now: number) => { const t = from + (now - start) / 1000; if (t >= tEnd) { setCursor(tEnd); setPlaying(false); return; } setCursor(t); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
 }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps
 const toBar = (h: number[]) => h.map(v => v / BAR_TO_M);
 const maxBar = moc.hMax / BAR_TO_M, minBar = moc.hMin / BAR_TO_M;
 const pn = a.material.pn;
 const idx = moc.t.findIndex(t => t >= cursor); const at = idx < 0 ? moc.t.length - 1 : idx;
 return <div className="space-y-6 px-4 py-6 md:px-8">
  <div>
   <p className="eyebrow text-muted">Shared by both options</p>
   <h2 className="mt-1 text-2xl md:text-3xl">Water hammer</h2>
   <p className="mt-2 max-w-3xl">When flow stops suddenly, the moving water's momentum becomes a pressure wave that runs back up the pipe at the wave speed and reflects off the inlet. The pipe wall's stiffness sets that wave speed: PE is soft, so the wave is slow and the surge is gentle; iron is stiff, so the same event would be three times worse. This page runs a method-of-characteristics simulation along the path from WM-01 to the chosen hydrant.</p>
  </div>
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
   <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3">
     <Segmented label="Event" value={event} onChange={setEvent} options={[{ id: 'valve', label: 'Valve or hydrant closed' }, { id: 'pump', label: 'Pump trip (if ever pumped)' }]} />
     <label className="flex items-center gap-2 text-[14px]">Path to<select className="rounded-[5px] border border-line bg-white p-2" value={row.name} onChange={e => setFireHydrant(e.target.value)}>{a.hydrants.map(h => <option key={h.name} value={h.name}>{h.name} · {fmt(h.pathLength, 0)} m</option>)}</select></label>
     <div className="ml-auto flex gap-2"><button className="control" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={18} /> : <Play size={18} />}{playing ? 'Pause' : 'Play'}</button><button className="control" onClick={() => { setPlaying(false); setCursor(0); }} aria-label="Reset"><RotateCcw size={18} /></button></div>
    </div>
    <div className="card">
     <LineChart xLabel="Time (s)" yLabel="Pressure (bar)" cursorX={cursor} series={[
      { name: `At ${row.name}`, x: moc.t, y: toBar(moc.hEnd), colour: '#4E4456' },
      { name: 'Mid-path', x: moc.t, y: toBar(moc.hMid), colour: '#3B7ED2', dash: '5 4' },
     ]} reference={[{ value: pn, label: `${a.material.name.split(' (')[0]} rating PN${pn}` }, { value: inputs.inletBar, label: 'Static inlet', colour: '#6B7280' }, { value: -1, label: 'Vapour limit', colour: '#D67A7A' }]} />
     <p className="mt-2 text-[14px]">At t = {fmt(cursor, 1)} s: <strong>{fmt(moc.hEnd[at] / BAR_TO_M)} bar</strong> at {row.name}. {event === 'valve' ? `Closure over ${duration} s${duration < a.criticalSeconds ? ' — faster than the critical time, so the full Joukowsky rise appears' : ' — slower than the critical time, so the reflected wave relieves part of the rise'}.` : `Pump head collapses over ${duration} s; the non-return valve shuts when flow tries to reverse.`}</p>
    </div>
   </div>
   <div className="space-y-3">
    <div className="card space-y-4">
     <label className="block text-[14px]"><span className="font-medium text-purple">Pipe material (SOW: PE100-RC SDR11)</span><select className="mt-1 w-full rounded-[5px] border border-line bg-white p-2" value={inputs.materialIndex} onChange={e => set('materialIndex', Number(e.target.value))}>{MATERIALS.map((m, i) => <option key={m.name} value={i}>{m.name}</option>)}</select></label>
     {event === 'valve' ? <Slider label="Closure time" value={inputs.closureSeconds} unit="s" min={0.2} max={20} step={0.2} onChange={v => set('closureSeconds', v)} status="assumed" /> : <Slider label="Pump run-down" value={inputs.rundownSeconds} unit="s" min={0.5} max={20} step={0.5} onChange={v => set('rundownSeconds', v)} status="assumed" />}
    </div>
    <Kpi label="Wave speed" value={fmt(a.waveSpeed, 0)} unit="m/s" note={a.material.name.split(' (')[0]} />
    <Kpi label="Joukowsky rise, hydrant stopped instantly" value={fmt(a.joukowskyBar, 1)} unit="bar" note={`${fmt(a.fireVelocity)} m/s at ${inputs.hydrantLps} L/s`} />
    <Kpi label="Critical time 2L/a" value={fmt(a.criticalSeconds, 2)} unit="s" note={`${fmt(row.pathLength, 0)} m to ${row.name}`} />
    <Kpi label="Peak / trough in this run" value={`${fmt(maxBar, 1)} / ${fmt(minBar, 1)}`} unit="bar" note={moc.vapour ? 'Reached the vapour limit — a cavity would form' : `Rating PN${pn}${maxBar > pn ? ' exceeded' : ''}`} tone={maxBar > pn || moc.vapour ? 'bad' : maxBar > 0.8 * pn ? 'warn' : 'good'} />
   </div>
  </div>
  <Banner><strong>Identical for both options — the wave does not know whether the pipe is buried.</strong> Wave speed, surge magnitude and timing come from the pipe and the water alone. What differs is what happens to the force the surge produces.</Banner>
  <div className="grid gap-4 md:grid-cols-2">
   <OptionCard n={1} title="Soil takes the thrust">
    <p>A buried PE main is gripped along its whole length by compacted bedding and backfill. The unbalanced force at a bend or tee ({fmt(a.thrust90N / 1000, 1)} kN at 90°, {fmt(a.thrust45N / 1000, 1)} kN at 45°, static {inputs.inletBar} bar) is spread into the ground; fused PE joints carry the axial load and no thrust block is needed for restrained systems.</p>
    <Verdict favours={1} text="no anchors, no calculation" />
    <Source>MB-PW-Z5-SOW Rev 8 §4 (selected bedding and surround); PE fully fused joints are end-load resistant.</Source>
   </OptionCard>
   <OptionCard n={2} title="Anchors must take the thrust">
    <p>On 500 mm supports in an air-filled channel the same force has nowhere to go unless it is designed for. Every bend, tee and the 33 crown tappings need guides and anchors "with calculated forces"; the drawing forbids restraining the main through villa services or channel walls, and forbids passing thrust into chamber walls without a structural design. Surge adds {fmt(a.joukowskyBar, 1)} bar to the {inputs.inletBar} bar static case for the anchor calculation.</p>
    <Verdict favours={1} text="94 special supports, each an engineered item" />
    <Source>MB-PW-DET-Z5-003 Rev 1 sheets 3 and 5.</Source>
   </OptionCard>
  </div>
 </div>;
}
