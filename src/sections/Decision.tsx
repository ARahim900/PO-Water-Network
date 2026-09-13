import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { criteria as preset, score, type Criterion } from '../engine/scoring.ts';
import { Banner, Source } from '../ui';
import { fmt } from '../engine/model.ts';
import ProjectReview from '../ProjectReview';
import EvidencePanel from '../EvidencePanel';

export default function Decision() {
 const [rows, setRows] = useState<Criterion[]>(preset.map(c => ({ ...c })));
 const update = (id: string, patch: Partial<Criterion>) => setRows(r => r.map(c => c.id === id ? { ...c, ...patch } : c));
 const s = score(rows);
 const lead = s.buried === s.channel ? 0 : s.buried > s.channel ? 1 : 2;
 return <div className="space-y-6 px-4 py-6 md:px-8">
  <div>
   <p className="eyebrow text-muted">Decision support</p>
   <h2 className="mt-1 text-2xl md:text-3xl">Scorecard — re-weight it in the room</h2>
   <p className="mt-2 max-w-3xl">Weights are management's call; the scores are the engineering view with the reason beside each. Move a weight and the totals follow. Nothing here is a cost, because Option 2 has not been priced.</p>
  </div>
  <div className="grid gap-3 sm:grid-cols-2">
   <div className="option-card option-1"><div className="eyebrow" style={{ color: 'var(--option)' }}>Option 1 · buried</div><div className="mt-1 text-3xl font-semibold text-purple">{fmt(s.buried)}<span className="text-base font-medium text-muted"> / 5</span></div><div className="mt-2 h-2 rounded bg-component"><div className="h-2 rounded" style={{ width: `${s.buried / 5 * 100}%`, background: 'var(--option)' }} /></div></div>
   <div className="option-card option-2"><div className="eyebrow" style={{ color: 'var(--option)' }}>Option 2 · covered channel</div><div className="mt-1 text-3xl font-semibold text-purple">{fmt(s.channel)}<span className="text-base font-medium text-muted"> / 5</span></div><div className="mt-2 h-2 rounded bg-component"><div className="h-2 rounded" style={{ width: `${s.channel / 5 * 100}%`, background: 'var(--option)' }} /></div></div>
  </div>
  <div className="card overflow-x-auto">
   <div className="flex items-center justify-between gap-2"><h3>Criteria</h3><button className="control" onClick={() => setRows(preset.map(c => ({ ...c })))}><RotateCcw size={16} />Reset to engineering view</button></div>
   <table className="table mt-3 min-w-[760px]"><thead><tr><th>Criterion</th><th>Weight 0–5</th><th>Option 1</th><th>Option 2</th><th>Why</th></tr></thead>
   <tbody>{rows.map(c => <tr key={c.id}>
    <td className="font-semibold text-purple">{c.label}</td>
    <td><input type="range" min={0} max={5} step={1} value={c.weight} aria-label={`Weight for ${c.label}`} onChange={e => update(c.id, { weight: Number(e.target.value) })} className="w-28 align-middle" /><span className="ml-2 tabular-nums">{c.weight}</span></td>
    <td><select value={c.buried} aria-label={`Option 1 score for ${c.label}`} onChange={e => update(c.id, { buried: Number(e.target.value) })} className="rounded-[5px] border border-line bg-white p-1">{[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}</select></td>
    <td><select value={c.channel} aria-label={`Option 2 score for ${c.label}`} onChange={e => update(c.id, { channel: Number(e.target.value) })} className="rounded-[5px] border border-line bg-white p-1">{[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}</select></td>
    <td className="max-w-[420px] text-[13px]">{c.why}</td>
   </tr>)}</tbody></table>
  </div>
  <Banner>{lead === 0 ? <strong>The weights as set give a tie.</strong> : <strong>With these weights, Option {lead} leads by {fmt(Math.abs(s.buried - s.channel))} points.</strong>} {lead === 2 ? 'If management prefers the channel, the conditions below become mandatory gates, not aspirations.' : 'The engineering view is the same: prefer burial for operational simplicity, and keep the leak-visibility benefit through the water-balance routine rather than a structure.'}</Banner>
  <div className="grid gap-4 md:grid-cols-2">
   <div className="card"><h3>Recommendation</h3><ol className="mt-2 list-decimal space-y-2 pl-5">
    <li><strong>Proceed with Option 1</strong> as tendered: five priced bids, an issued SOW, conventional methods any contractor can deliver.</li>
    <li><strong>Buy the leak-visibility benefit another way:</strong> monthly bulk-versus-villa reconciliation, night-flow step tests through GV-A1 and GV-B1, tracer wire and GPS as-built, and the closed-valve no-flow test at commissioning. All are already in the SOW.</li>
    <li><strong>Keep Option 2 alive only as a priced alternative</strong> until the full-size maintenance trial and a surveyed drainage design exist. Without both, it cannot be evaluated, let alone chosen.</li>
    <li><strong>Do not let the installation debate delay the pipe.</strong> The 65 % loss is the aged HDPE; the new PE100-RC main fixes it in either option.</li>
   </ol></div>
   <div className="card"><h3>Hold points before either option is built</h3><ul className="mt-2 list-disc space-y-2 pl-5">
    <li>Witnessed static and dynamic pressure/flow test at WM-01 (3.0 bar is a screening assumption, not a guarantee)</li>
    <li>Topographic and utility survey, trial pits, ground and pipe levels</li>
    <li>Confirmed fire duty and maximum-day demand; the Contractor's calibrated concurrent-demand model</li>
    <li>For Option 2 only: structural design, cover load-class approval, support and anchor forces, drainage design with an accepted outfall, and the maintenance trial report</li>
   </ul><Source>MB-PW-REQ-001 p.6 (construction release gates); MB-PW-Z5-SOW Rev 8 §3.1 and §6; MB-PW-DET-Z5-003 Rev 1 sheet 8.</Source></div>
  </div>
  <details className="panel"><summary className="px-5 py-4 font-semibold text-purple">Earlier comparison table and project evidence</summary><ProjectReview /><EvidencePanel /></details>
 </div>;
}
