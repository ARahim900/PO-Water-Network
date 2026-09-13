import { useState } from 'react';
import { Flame } from 'lucide-react';
import PlanMap from '../charts/PlanMap';
import Bars from '../charts/Bars';
import { Kpi, Banner, Slider, Segmented, Source } from '../ui';
import { fmt, type Analysis } from '../engine/model.ts';
import type { Inputs } from '../engine/assumptions.ts';

interface Props { a: Analysis; inputs: Inputs; set: <K extends keyof Inputs>(k: K, v: Inputs[K]) => void; fireHydrant: string; setFireHydrant: (h: string) => void; }
export default function Hydraulics({ a, inputs, set, fireHydrant, setFireHydrant }: Props) {
 const [scenario, setScenario] = useState<'domestic' | 'fire'>('domestic');
 const result = scenario === 'domestic' ? a.domestic : a.fire;
 const villaBars = a.network.villas.map(v => ({ label: a.network.nodes[v].label.replace('Villa ', ''), value: result.pressure[v], note: `${fmt(a.pathLength[v], 0)} m from WM-01` }));
 const fireNode = a.hydrants.find(h => h.name === a.fireHydrant)?.node;
 return <div className="space-y-6 px-4 py-6 md:px-8">
  <div>
   <p className="eyebrow text-muted">Shared by both options</p>
   <h2 className="mt-1 text-2xl md:text-3xl">Steady-state hydraulics</h2>
   <p className="mt-2 max-w-3xl">The network is solved as a loop (Main C → A → connector → D → connector → B) with Hazen–Williams losses, the same method as EPANET. Inputs follow the SOW screening basis; every one can be changed in Assumptions. Elevations are all zero until a survey exists, so pressure equals head.</p>
  </div>
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
   <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3">
     <Segmented label="Demand case" value={scenario} onChange={setScenario} options={[{ id: 'domestic', label: 'Maximum-day domestic' }, { id: 'fire', label: 'Hydrant + domestic' }]} />
     {scenario === 'fire' && <label className="flex items-center gap-2 text-[14px]"><Flame size={16} />Hydrant<select className="rounded-[5px] border border-line bg-white p-2" value={fireHydrant || a.fireHydrant} onChange={e => setFireHydrant(e.target.value)}>{a.hydrants.map(h => <option key={h.name} value={h.name}>{h.name} · {fmt(h.pathLength, 0)} m</option>)}</select></label>}
    </div>
    <PlanMap net={a.network} result={result} lowBar={inputs.residualBar} highlight={scenario === 'fire' ? fireNode : undefined} />
    <p className="text-[12.25px] text-muted">Hover any villa or hydrant for its pressure; hover a pipe for flow and velocity. Red ring = below the {inputs.residualBar} bar target. Purple = OD110, green = OD25 services.</p>
   </div>
   <div className="space-y-3">
    <div className="card space-y-4">
     <Slider label="Inlet pressure at WM-01" value={inputs.inletBar} unit="bar" min={2} max={4.5} step={0.1} onChange={v => set('inletBar', v)} status="assumed" />
     <div className="flex gap-2"><button className="control flex-1" onClick={() => set('inletBar', 3.0)}>3.0 screening</button><button className="control flex-1" onClick={() => set('inletBar', 3.5)}>3.5 sensitivity</button></div>
     <Slider label="Maximum-day domestic demand" value={inputs.domesticLps} unit="L/s" min={1} max={12} step={0.5} onChange={v => set('domesticLps', v)} status="assumed" />
     <Slider label="Hydrant duty" value={inputs.hydrantLps} unit="L/s" min={10} max={30} step={0.25} onChange={v => set('hydrantLps', v)} status="verified" />
    </div>
    <Kpi label="Weakest villa, max day" value={fmt(a.domesticMinBar)} unit="bar" note={`${a.domesticMinVilla} · target ${inputs.residualBar} bar`} tone={a.domesticMinBar >= inputs.residualBar ? 'good' : 'bad'} />
    <Kpi label={`Residual at ${a.fireHydrant} with hydrant + domestic`} value={fmt(a.fireResidualBar)} unit="bar" note="Concurrent case the SOW says must be modelled" tone={a.fireResidualBar >= inputs.residualBar ? 'good' : a.fireResidualBar > 0.5 ? 'warn' : 'bad'} />
    <Kpi label="Highest velocity, max day" value={fmt(a.domesticMaxVelocity)} unit="m/s" note="Pilot SoW limit 1.5 m/s distribution" tone={a.domesticMaxVelocity <= 1.5 ? 'good' : 'warn'} />
   </div>
  </div>
  <div className="card">
   <h3>Pressure at every villa — {scenario === 'domestic' ? 'maximum-day domestic' : `${a.fireHydrant} running with domestic demand`}</h3>
   <Bars bars={villaBars} unit="bar" threshold={{ value: inputs.residualBar, label: `${inputs.residualBar} bar target` }} max={Math.max(inputs.inletBar, 3.5)} />
   <p className="text-[12.25px] text-muted">Villas 1–33 in plan order. Hover a bar for its distance from WM-01.</p>
  </div>
  <div className="card overflow-x-auto">
   <h3>Hydrant capacity — this model beside the SOW screening table</h3>
   <p className="mt-1 max-w-3xl">Fire-only case, {inputs.residualBar} bar residual. The SOW used a single remote-path coefficient; this model solves the full loop, so it reads a few per cent higher. Agreement within 4 % at every hydrant is the cross-check that the geometry and design basis were read correctly.</p>
   <table className="table mt-3 min-w-[640px]"><thead><tr><th>Hydrant</th><th>Path from WM-01</th><th>Capacity at {inputs.residualBar} bar — model</th><th>SOW Rev 8</th><th>Residual at {inputs.hydrantLps} L/s — model</th><th>SOW Rev 8</th><th>Assessment</th></tr></thead>
   <tbody>{a.hydrants.map(h => <tr key={h.name}><td className="font-semibold text-purple">{h.name}</td><td>{fmt(h.pathLength, 1)} m</td><td>{fmt(h.capacityLps)} L/s</td><td className="text-muted">{h.sowCapacity === null ? '—' : `${fmt(h.sowCapacity)} L/s`}</td><td>{fmt(h.residualAtDuty)} bar</td><td className="text-muted">{h.sowResidual === null ? '—' : `${fmt(h.sowResidual)} bar`}</td><td><span className={`chip ${h.residualAtDuty >= inputs.residualBar ? 'chip-good' : 'chip-bad'}`}>{h.residualAtDuty >= inputs.residualBar ? 'Meets duty in fire-only screen' : 'Duty not demonstrated'}</span></td></tr>)}</tbody></table>
   <Source>MB-PW-Z5-SOW Rev 8 §6 (18.75 L/s at 1.5 bar; C = 150; 25 % minor-loss reserve; meter loss and elevation excluded). Both documents and this model are screening values, not a calibrated result.</Source>
  </div>
  <Banner><strong>Identical for Option 1 and Option 2.</strong> The channel changes nothing on this page: same internal diameter, same length, same roughness, same route. If anyone presents different pressures for the two options, ask what changed in the pipe.</Banner>
 </div>;
}
