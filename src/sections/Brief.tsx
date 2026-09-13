import { Droplets, Ruler, Flame, House } from 'lucide-react';
import { Kpi, OptionCard, Banner, Source } from '../ui';
import { fmt, type Analysis } from '../engine/model.ts';

export default function Brief({ a }: { a: Analysis }) {
 return <div className="space-y-6 px-4 py-6 md:px-8">
  <div>
   <p className="eyebrow text-muted">Why we are here</p>
   <h2 className="mt-1 text-2xl md:text-3xl">Zone 5 is losing most of its water. The new network fixes that; the question is how to install it.</h2>
   <p className="mt-3 max-w-3xl">The Zone 5 potable network has been losing about 65 % of its supply for over a year. A leak campaign fixed 14 leaks in Zone 5 alone and the loss stayed at 65 %, because the failures are long cracks in aged HDPE rather than joints. The replacement is two new OD110 mains along both walkways with a service to every villa on its own side. Both options use exactly the same pipe on exactly the same route. They differ only in <strong>where the pipe sits</strong>: in a conventional trench, or inside a covered concrete channel.</p>
   <Source>SoW Zone 5 Pilot Rev 8 (23 Apr 2026) §1; MB-PW-Z5-SOW Rev 8 (25 Aug 2026) §2; MB-PW-REQ-001 (31 Aug 2026) p.4.</Source>
  </div>
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
   <Kpi label="Non-revenue water" value="≈ 65" unit="%" note="For over a year, after 14 repairs" />
   <Kpi label="Villas served" value="33" note="Each from the main on its own side" />
   <Kpi label="New OD110 main" value="785.81" unit="m" note="CAD-measured, both options" />
   <Kpi label="Hydrants retained" value="5" note="FH-01, 03, 04, 06, 07" />
  </div>
  <div className="grid gap-4 md:grid-cols-2">
   <OptionCard n={1} title="Buried in the walkway">
    <p>Conventional trench, 1,000 mm cover in walkways, selected bedding, tracer wire and warning tape. This is the basis of the issued Scope of Work and the five prices received.</p>
    <ul className="list-disc space-y-1 pl-5"><li>Nothing to maintain between the 12 chambers</li><li>Repairs need excavation and reinstatement</li><li>A leak shows up in the monthly water balance, not on the ground</li></ul>
    <Source>MB-PW-Z5-SOW Rev 8 §4; MB-PW-Z5-DWG-003 section A.</Source>
   </OptionCard>
   <OptionCard n={2} title="Inside a covered concrete channel">
    <p>A 600 × 450 mm clear channel along 731.30 m of the route with removable composite covers (B125 on walkways, D400 where vehicles overrun), pipe on 500 mm supports with 150 mm clear beneath, gravity drainage to surveyed low points.</p>
    <ul className="list-disc space-y-1 pl-5"><li>Leaks visible on inspection; covers lift for repair</li><li>1,469 supports, 14 end walls, drains and covers to maintain</li><li>No bidder has priced it; drainage and bulkheads are provisional</li></ul>
    <Source>MB-PW-DET-Z5-003 Rev 1 (13 Sep 2026) sheets 1–7; Clarification No. 2 (26 Aug 2026).</Source>
   </OptionCard>
  </div>
  <Banner><strong>Same pipe, same water, same hydraulics.</strong> With the SOW screening basis the model gives {fmt(a.domesticMinBar)} bar at the weakest villa on a maximum day, {fmt(a.fireResidualBar)} bar at {a.fireHydrant} with a hydrant running, and a worst-case surge of {fmt(a.joukowskyBar, 1)} bar — <em>for both options</em>. The decision is not a hydraulic one. It is about maintenance, drainage, thermal behaviour, leak visibility and cost certainty, which is what the Compare section is for.</Banner>
  <div className="grid gap-4 md:grid-cols-2">
   <div className="card"><h3 className="flex items-center gap-2"><Droplets size={18} />What this tool establishes</h3><ul className="mt-2 list-disc space-y-1 pl-5"><li>Pressures, velocities and hydrant capacity from the CAD geometry and the SOW design basis, cross-checked against the SOW's own screening table</li><li>Water-hammer magnitude and timing for the specified pipe, and what would change with another material</li><li>Rainfall, flotation, thermal and leak-visibility physics that genuinely separate the two installations</li><li>A weighted scorecard management can re-weight in the room</li></ul></div>
   <div className="card"><h3 className="flex items-center gap-2"><Ruler size={18} />What it does not</h3><ul className="mt-2 list-disc space-y-1 pl-5"><li>Replace the calibrated model the Contractor must submit (no surveyed levels, meter losses or witnessed pressure exist yet)</li><li>Predict a saving in OMR — Option 2 has no price</li><li>Show a difference in pressure or surge between the options, because there is none</li><li>Authorise construction: every figure is a review-stage screening value</li></ul></div>
  </div>
  <div className="card"><h3 className="flex items-center gap-2"><House size={18} />Presenting</h3><p className="mt-2">Use the tabs above or the <kbd className="rounded border border-line bg-paper px-1">←</kbd> <kbd className="rounded border border-line bg-paper px-1">→</kbd> keys to move between sections. In <strong>Compare</strong>, each differentiating factor is a button. <strong>Assumptions</strong> (top right) lists every input with its source; change one and every number on every page updates. <Flame size={14} className="inline" /> marks a fire case.</p></div>
 </div>;
}
