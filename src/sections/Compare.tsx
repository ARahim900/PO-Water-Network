import { useRef, useState, type KeyboardEvent } from 'react';
import { Eye, Anchor, Thermometer, CloudRain, LifeBuoy, Wind, Wrench } from 'lucide-react';
import { OptionCard, Verdict, Source, Slider, Kpi, Banner } from '../ui';
import { fmt, type Analysis } from '../engine/model.ts';
import { CHANNEL } from '../engine/environment.ts';
import { BAR_TO_M } from '../engine/steady.ts';
import type { Inputs } from '../engine/assumptions.ts';

type FactorId = 'leak' | 'surge' | 'thermal' | 'rain' | 'float' | 'sand' | 'repair';
const factors: { id: FactorId; label: string; question: string; icon: typeof Eye }[] = [
 { id: 'leak', label: 'Leak discovery', question: 'How long does a quiet leak run before anyone knows?', icon: Eye },
 { id: 'surge', label: 'Surge restraint', question: 'Who resists the thrust when the pressure changes?', icon: Anchor },
 { id: 'thermal', label: 'Heat and movement', question: 'How much does the pipe move and derate in the Omani heat?', icon: Thermometer },
 { id: 'rain', label: 'Rainfall', question: 'What happens to the channel in a storm?', icon: CloudRain },
 { id: 'float', label: 'Flotation', question: 'Does a PE pipe float in a flooded channel?', icon: LifeBuoy },
 { id: 'sand', label: 'Sand and silt', question: 'Where does wind-blown sand end up?', icon: Wind },
 { id: 'repair', label: 'Repair access', question: 'How is a burst fixed, and with what?', icon: Wrench },
];

interface Props { a: Analysis; inputs: Inputs; set: <K extends keyof Inputs>(k: K, v: Inputs[K]) => void; }
export default function Compare({ a, inputs, set }: Props) {
 const [active, setActive] = useState<FactorId>('leak');
 const list = useRef<HTMLDivElement>(null);
 // Left/Right move between factor buttons while one has focus; the event is stopped so the page tabs do not also move.
 const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.preventDefault(); e.stopPropagation();
  const i = factors.findIndex(f => f.id === active), n = (i + (e.key === 'ArrowRight' ? 1 : -1) + factors.length) % factors.length;
  setActive(factors[n].id);
  list.current?.querySelectorAll<HTMLButtonElement>('button')[n]?.focus();
 };
 const f = factors.find(x => x.id === active)!;
 return <div className="space-y-6 px-4 py-6 md:px-8">
  <div>
   <p className="eyebrow text-muted">Where the options genuinely differ</p>
   <h2 className="mt-1 text-2xl md:text-3xl">Compare, factor by factor</h2>
   <p className="mt-2 max-w-3xl">Each button is one physical difference between burying the pipe and putting it in a channel. Every number is live from the assumptions register.</p>
  </div>
  <div ref={list} role="tablist" aria-label="Differentiating factors" onKeyDown={onKey} className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
   {factors.map(x => <button key={x.id} role="tab" type="button" aria-selected={active === x.id} tabIndex={active === x.id ? 0 : -1} className="factor" onClick={() => setActive(x.id)}><span className="flex items-center gap-2 font-semibold text-purple"><x.icon size={18} />{x.label}</span></button>)}
  </div>
  <div role="tabpanel" className="space-y-4">
   <h3 className="text-xl">{f.question}</h3>
   {active === 'leak' && <>
    <div className="grid gap-4 md:grid-cols-2">
     <OptionCard n={1} title="Found by arithmetic">
      <p>A buried leak is silent unless it surfaces. It is found when the bulk meter and the 33 villa meters are reconciled and the imbalance is chased with step tests. A {inputs.leakHoleMm} mm equivalent leak at {inputs.inletBar} bar passes <strong>{fmt(a.leakLps, 3)} L/s</strong> — about {fmt(a.leakLps * 86.4, 1)} m³ a day. Over {inputs.buriedDetectDays} days that is <strong>{fmt(a.leakBuriedM3, 0)} m³</strong>.</p>
      <Verdict favours={2} text="depends on the monitoring routine" />
     </OptionCard>
     <OptionCard n={2} title="Found by looking">
      <p>The same leak wets the channel floor and runs to the drain, where an inspection walk or a drain outfall shows it. Over {inputs.channelDetectDays} days that is <strong>{fmt(a.leakChannelM3, 0)} m³</strong>. The channel still does not <em>prevent</em> the leak, and a crack under the pipe support may drip unseen for a while.</p>
      <Verdict favours={2} text="visible, if someone walks the route" />
     </OptionCard>
    </div>
    <div className="card grid gap-4 md:grid-cols-3"><Slider label="Equivalent leak hole" value={inputs.leakHoleMm} unit="mm" min={0.5} max={6} step={0.5} onChange={v => set('leakHoleMm', v)} status="assumed" /><Slider label="Buried: days to find" value={inputs.buriedDetectDays} unit="days" min={1} max={365} step={1} onChange={v => set('buriedDetectDays', v)} status="assumed" /><Slider label="Channel: days to find" value={inputs.channelDetectDays} unit="days" min={0.5} max={60} step={0.5} onChange={v => set('channelDetectDays', v)} status="assumed" /></div>
    <Banner>The honest reading: the channel buys <strong>time</strong>, not prevention. Option 1 can close most of that gap with the water-balance routine already required (monthly reconciliation, night-flow step tests through GV-A1/GV-B1, tracer wire for locating). The new PE100-RC pipe, not the channel, is what stops the 65 % loss.</Banner>
    <Source>MB-PW-REQ-001 p.4 ("it does not itself prevent or automatically detect leaks") and p.5 (employer-run performance review); MB-PW-Z5-SOW Rev 8 §3.3 (sectional valves for step testing).</Source>
   </>}
   {active === 'surge' && <>
    <div className="grid gap-3 sm:grid-cols-3"><Kpi label="Thrust at a 90° bend" value={fmt(a.thrust90N / 1000, 1)} unit="kN" note={`Static ${inputs.inletBar} bar, OD110`} /><Kpi label="Thrust at a 45° bend" value={fmt(a.thrust45N / 1000, 1)} unit="kN" /><Kpi label="Surge adds" value={fmt(a.joukowskyBar, 1)} unit="bar" note="Hydrant slammed shut — see Water hammer" /></div>
    <div className="grid gap-4 md:grid-cols-2">
     <OptionCard n={1} title="Restrained by the ground"><p>Compacted bedding and backfill grip the pipe along its full length. Fused PE joints are end-load resistant, so the thrust at bends and tees is carried in the pipe wall and spread into the soil. No anchors, no thrust blocks, nothing to inspect.</p><Verdict favours={1} text="inherent, no engineered items" /></OptionCard>
     <OptionCard n={2} title="Restrained by design"><p>On supports in air the pipe is free to move. The drawing requires guides and anchors "with calculated forces", forbids restraint through villa services, channel walls or chamber walls without a structural design, and prices 94 special supports. Each is a design item, a procurement item and a maintenance item.</p><Verdict favours={1} text="94 engineered restraints" /></OptionCard>
    </div>
    <Source>MB-PW-DET-Z5-003 Rev 1 sheets 3, 5 and 7; MB-PW-REQ-001 p.4 ("do not assume a pipe in an air-filled channel behaves like buried pipe").</Source>
   </>}
   {active === 'thermal' && <>
    <div className="grid gap-4 md:grid-cols-2">
     <OptionCard n={1} title="Ground temperature, damped"><p>At 1,000 mm cover the soil barely notices the day. With a {inputs.buriedDeltaT} °C seasonal swing the longest main ({fmt(a.longestMain, 0)} m) changes length by <strong>{fmt(a.expansionBuried * 1000, 0)} mm</strong>, and soil friction absorbs it as slight stress. PE100 keeps its full PN16 rating at ground temperature.</p><Verdict favours={1} text="stable, self-restrained" /></OptionCard>
     <OptionCard n={2} title="An oven with a lid"><p>An air-filled concrete channel under Omani sun cycles daily. With a {inputs.channelDeltaT} °C swing the same main wants to move <strong>{fmt(a.expansionChannel * 1000, 0)} mm</strong> — {fmt(a.expansionChannel, 2)} m — which the guides, anchors and every villa tapping must accommodate. At a {inputs.channelPipeTempC} °C pipe wall PE100 is derated to <strong>{fmt(a.derating * 100, 0)} %</strong>: PN{a.material.pn} becomes about <strong>PN{fmt(a.deratedPn, 1)}</strong>. Warm standing water also loses chlorine faster.</p><Verdict favours={1} text="movement and derating to design for" /></OptionCard>
    </div>
    <div className="card grid gap-4 md:grid-cols-3"><Slider label="Buried temperature swing" value={inputs.buriedDeltaT} unit="°C" min={0} max={15} step={1} onChange={v => set('buriedDeltaT', v)} status="assumed" /><Slider label="Channel temperature swing" value={inputs.channelDeltaT} unit="°C" min={0} max={40} step={1} onChange={v => set('channelDeltaT', v)} status="assumed" /><Slider label="Channel pipe-wall design temperature" value={inputs.channelPipeTempC} unit="°C" min={20} max={50} step={1} onChange={v => set('channelPipeTempC', v)} status="assumed" /></div>
    <Source>PE100 expansion coefficient ≈ 0.18 mm/m/°C; derating per ISO 4427 / PPI generic tables (manufacturer figures govern). MB-PW-DET-Z5-003 Rev 1 sheet 3 (design pipe-wall temperature required).</Source>
   </>}
   {active === 'rain' && <>
    <div className="grid gap-3 sm:grid-cols-4"><Kpi label="Inflow to channel" value={fmt(a.rain.inflow * 1000, 1)} unit="L/s" note={`${inputs.rainMmPerHour} mm/h on ${fmt(a.catchmentM2, 0)} m²`} /><Kpi label="Flow depth if it drains" value={fmt(a.rain.depthIfDraining * 1000, 0)} unit="mm" note={`Pipe invert at ${fmt(a.rain.pipeInvert * 1000, 0)} mm · ${inputs.channelSlopePct} % fall`} tone={a.rain.submergedIfDraining ? 'bad' : 'good'} /><Kpi label="Water reaches the pipe (no outlet)" value={Number.isFinite(a.rain.minutesToPipeNoOutlet) ? fmt(a.rain.minutesToPipeNoOutlet, 0) : '—'} unit="min" tone="warn" /><Kpi label="Channel full (no outlet)" value={Number.isFinite(a.rain.minutesToFillNoOutlet) ? fmt(a.rain.minutesToFillNoOutlet / 60, 1) : '—'} unit="h" note={`${fmt(a.rain.storage, 0)} m³ of storage`} /></div>
    <div className="grid gap-4 md:grid-cols-2">
     <OptionCard n={1} title="Indifferent"><p>Rain falls on paving and goes where the estate's drainage already takes it. A buried PE main with 1,000 mm cover neither sees the storm nor cares. There is no new drainage asset, no outfall to agree, no silt to clear.</p><Verdict favours={1} text="no new drainage system" /></OptionCard>
     <OptionCard n={2} title="A 731 m drain that must work"><p>The channel is a linear sump. With the {inputs.channelSlopePct} % fall and Manning's roughness for concrete, {fmt(a.rain.inflow * 1000, 1)} L/s runs {fmt(a.rain.depthIfDraining * 1000, 0)} mm deep <em>if</em> an accepted outfall exists at every low point. Today there is no surveyed fall, no outfall and no rainfall design value — and pumps are not permitted. With covers seated and no outlet, water touches the pipe after {fmt(a.rain.minutesToPipeNoOutlet, 0)} minutes.</p><Verdict favours={1} text="drainage design does not exist yet" /></OptionCard>
    </div>
    <div className="card grid gap-4 md:grid-cols-3"><Slider label="Rainfall intensity" value={inputs.rainMmPerHour} unit="mm/h" min={5} max={120} step={5} onChange={v => set('rainMmPerHour', v)} status="missing" /><Slider label="Paved width draining in (beyond the 0.6 m cover)" value={inputs.catchmentWidthM} unit="m" min={0} max={4} step={0.25} onChange={v => set('catchmentWidthM', v)} status="missing" /><Slider label="Channel floor fall" value={inputs.channelSlopePct} unit="%" min={0.1} max={2} step={0.1} onChange={v => { set('channelSlopePct', v); }} status="assumed" /></div>
    <Source>Rational method Q = C·i·A and Manning n = 0.013 on the {CHANNEL.width * 1000} × {CHANNEL.depth * 1000} mm section; MB-PW-DET-Z5-003 Rev 1 sheet 6 (0.5 % minimum fall, no pumps, rainfall inputs listed as required design information). Rainfall intensity must be verified against Muscat Municipality IDF data before any drainage design.</Source>
   </>}
   {active === 'float' && <>
    <div className="grid gap-3 sm:grid-cols-3"><Kpi label="Uplift, pipe empty" value={fmt(a.buoyancy.empty, 0)} unit="N/m" note="≈ the weight of a 6.5 kg block, every metre" tone="bad" /><Kpi label="Uplift, pipe full of water" value={fmt(a.buoyancy.full, 1)} unit="N/m" note="PE is lighter than water even when full" tone="warn" /><Kpi label="Pipe self-weight" value={fmt(a.buoyancy.pipeWeight, 0)} unit="N/m" /></div>
    <div className="grid gap-4 md:grid-cols-2">
     <OptionCard n={1} title="Held down by 1,000 mm of backfill"><p>A metre of compacted fill weighs roughly 18 kN per square metre. Uplift is not a design case for a buried walkway main.</p><Verdict favours={1} text="not a design case" /></OptionCard>
     <OptionCard n={2} title="Floats unless strapped"><p>PE100 has a density of about 955 kg/m³, so an OD110 SDR11 pipe is buoyant even when full of water, and strongly buoyant when drained for a repair. If the channel floods — a blocked drain in a storm, or the leak the channel exists to collect — an unstrapped pipe lifts off its 500 mm supports and loads every tapping and wall seal. Every support therefore needs a hold-down, not just a cradle.</p><Verdict favours={1} text="1,469 supports need hold-downs" /></OptionCard>
    </div>
    <Source>Archimedes; PE100 density 930–960 kg/m³ (ISO 4427). Support quantities from MB-PW-DET-Z5-003 Rev 1 sheet 7.</Source>
   </>}
   {active === 'sand' && <>
    <div className="grid gap-4 md:grid-cols-2">
     <OptionCard n={1} title="Nothing to fill"><p>Wind-blown sand and dust settle on paving and are swept as they are today. The pipe is below all of it.</p><Verdict favours={1} text="no new cleaning regime" /></OptionCard>
     <OptionCard n={2} title="A 731 m trap"><p>Composite covers in metal frames are not sealed. Fine sand enters at every joint, collects around the 1,469 supports and at the silt traps at each low point, and each storm washes it into the drain the channel depends on. The drawing already calls for silt collection at surveyed low points and "cleaning" in the maintenance trial. That is a recurring task with a cost nobody has yet estimated.</p><Verdict favours={1} text="recurring cleaning, drain blockage risk" /></OptionCard>
    </div>
    <Source>MB-PW-DET-Z5-003 Rev 1 sheets 6 and 8; MB-PW-Z5-SOW Rev 8 §4 (channel excluded for "access, drainage, contamination and cost risks").</Source>
   </>}
   {active === 'repair' && <>
    <div className="grid gap-4 md:grid-cols-2">
     <OptionCard n={1} title="Locate, excavate, fuse, reinstate"><p>A repair means finding the pipe (tracer wire, GPS as-built), opening a 600 mm trench in paving, a fused slide-over repair, then reinstating to match. A day or two of disruption on one walkway, with proven methods and any contractor.</p><Verdict favours={0} text="slower, but certain" /></OptionCard>
     <OptionCard n={2} title="Lift covers — if the tools fit"><p>The 600 × 450 clear section leaves 245 mm each side of a bare pipe and less beside a fitting. Electrofusion clamps, scrapers, cutters and a slide-over coupler have to work inside that, with the pipe temporarily supported. The drawing makes a full-size maintenance trial a condition before bulk procurement precisely because this has not been demonstrated. If it works, repairs are quicker and cleaner; if it does not, the channel walls come out.</p><Verdict favours={0} text="quicker only if the trial passes" /></OptionCard>
    </div>
    <Banner>This is the one factor that could favour Option 2 — and it is conditional on a trial that has not happened. Management should treat "easier repair" as unproven until the trial report exists.</Banner>
    <Source>MB-PW-DET-Z5-003 Rev 1 sheets 1 and 8; MB-PW-Z5-SOW Rev 8 §4 (tracer wire, warning tape, 600 mm trench pricing width). Static head used in the leak figures: {fmt(inputs.inletBar * BAR_TO_M, 1)} m.</Source>
   </>}
  </div>
 </div>;
}
