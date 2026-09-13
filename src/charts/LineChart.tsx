import { useId, useState } from 'react';
/** A small SVG line chart: one y-axis, up to three series, an optional horizontal reference line, hover crosshair. */
export interface Series { name: string; x: number[]; y: number[]; colour: string; dash?: string; }
interface Props { series: Series[]; xLabel: string; yLabel: string; reference?: { value: number; label: string; colour?: string }[]; cursorX?: number; height?: number; }
const W = 720, PAD = { l: 52, r: 16, t: 16, b: 40 };
export default function LineChart({ series, xLabel, yLabel, reference = [], cursorX, height = 300 }: Props) {
 const id = useId();
 const [hover, setHover] = useState<number | null>(null);
 const xs = series.flatMap(s => s.x), ys = series.flatMap(s => s.y).concat(reference.map(r => r.value));
 const x0 = Math.min(...xs), x1 = Math.max(...xs);
 const yMin = Math.min(...ys), yMax = Math.max(...ys), pad = (yMax - yMin || 1) * 0.08;
 const y0 = yMin - pad, y1 = yMax + pad;
 const sx = (x: number) => PAD.l + (x - x0) / (x1 - x0 || 1) * (W - PAD.l - PAD.r);
 const sy = (y: number) => height - PAD.b - (y - y0) / (y1 - y0 || 1) * (height - PAD.t - PAD.b);
 const ticks = (lo: number, hi: number, n: number) => { const step = niceStep((hi - lo) / n); const out: number[] = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6)); return out; };
 const hx = hover === null ? null : x0 + (hover / W) * 0 + (hover - PAD.l) / (W - PAD.l - PAD.r) * (x1 - x0);
 const nearest = (s: Series, x: number) => { let best = 0; for (let i = 1; i < s.x.length; i++) if (Math.abs(s.x[i] - x) < Math.abs(s.x[best] - x)) best = i; return best; };
 return <figure className="m-0">
  <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-labelledby={`${id}-t`} onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); setHover((e.clientX - r.left) / r.width * W); }} onMouseLeave={() => setHover(null)}>
   <title id={`${id}-t`}>{yLabel} against {xLabel}</title>
   {ticks(y0, y1, 5).map(v => <g key={v}><line x1={PAD.l} x2={W - PAD.r} y1={sy(v)} y2={sy(v)} stroke="#E5E7EB" /><text x={PAD.l - 8} y={sy(v) + 4} textAnchor="end" fontSize="11" fill="#6B7280">{v}</text></g>)}
   {ticks(x0, x1, 6).map(v => <text key={v} x={sx(v)} y={height - PAD.b + 16} textAnchor="middle" fontSize="11" fill="#6B7280">{v}</text>)}
   <text x={(PAD.l + W - PAD.r) / 2} y={height - 6} textAnchor="middle" fontSize="12" fill="#454545">{xLabel}</text>
   <text transform={`translate(14 ${(PAD.t + height - PAD.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="#454545">{yLabel}</text>
   {reference.map(r => <g key={r.label}><line x1={PAD.l} x2={W - PAD.r} y1={sy(r.value)} y2={sy(r.value)} stroke={r.colour ?? '#D67A7A'} strokeWidth="1.5" strokeDasharray="6 4" /><text x={W - PAD.r} y={sy(r.value) - 5} textAnchor="end" fontSize="11" fill={r.colour ?? '#D67A7A'}>{r.label}</text></g>)}
   {series.map(s => <path key={s.name} d={s.x.map((x, i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(s.y[i]).toFixed(1)}`).join(' ')} fill="none" stroke={s.colour} strokeWidth="2" strokeDasharray={s.dash} strokeLinejoin="round" />)}
   {labelPositions(series.map(s => sy(s.y[s.y.length - 1]) - 6)).map((y, i) => { const s = series[i]; return <text key={`${s.name}-l`} x={sx(s.x[s.x.length - 1]) - 4} y={y} textAnchor="end" fontSize="11" fontWeight="600" fill={s.colour} paintOrder="stroke" stroke="#fff" strokeWidth="3">{s.name}</text>; })}
   {cursorX !== undefined && <line x1={sx(cursorX)} x2={sx(cursorX)} y1={PAD.t} y2={height - PAD.b} stroke="#4E4456" strokeWidth="1.5" />}
   {hx !== null && hx >= x0 && hx <= x1 && <g pointerEvents="none">
    <line x1={sx(hx)} x2={sx(hx)} y1={PAD.t} y2={height - PAD.b} stroke="#9CA3AF" strokeDasharray="3 3" />
    {series.map(s => { const i = nearest(s, hx); return <circle key={s.name} cx={sx(s.x[i])} cy={sy(s.y[i])} r="4" fill={s.colour} stroke="#fff" strokeWidth="2" />; })}
    <g transform={`translate(${Math.min(sx(hx) + 10, W - 170)} ${PAD.t + 6})`}>
     <rect width="160" height={16 + series.length * 16} rx="5" fill="rgba(15,23,42,0.85)" />
     <text x="8" y="14" fontSize="11" fill="#fff">{xLabel}: {hx.toFixed(2)}</text>
     {series.map((s, k) => { const i = nearest(s, hx); return <text key={s.name} x="8" y={30 + k * 16} fontSize="11" fill="#fff">{s.name}: {s.y[i].toFixed(1)}</text>; })}
    </g>
   </g>}
  </svg>
  <figcaption className="mt-1 flex flex-wrap gap-4 text-[12.25px] text-muted">{series.map(s => <span key={s.name} className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-5" style={{ background: s.colour }} />{s.name}</span>)}{reference.map(r => <span key={r.label} className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 border-t border-dashed" style={{ borderColor: r.colour ?? '#D67A7A' }} />{r.label}</span>)}</figcaption>
 </figure>;
}
/** Direct labels at the line ends; when two would overlap they are pushed apart by at least one line height. */
function labelPositions(ys: number[], gap = 13): number[] {
 const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
 for (let k = 1; k < order.length; k++) if (order[k].y - order[k - 1].y < gap) order[k].y = order[k - 1].y + gap;
 const out = ys.slice(); order.forEach(o => { out[o.i] = o.y; }); return out;
}
function niceStep(raw: number) { const p = Math.pow(10, Math.floor(Math.log10(raw || 1))); const m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
