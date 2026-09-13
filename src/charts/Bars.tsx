import { useState } from 'react';
/** Horizontal or vertical bars with a threshold line and per-bar hover. Values are labelled directly on hover only. */
interface Bar { label: string; value: number; colour?: string; note?: string; }
interface Props { bars: Bar[]; unit: string; threshold?: { value: number; label: string }; max?: number; height?: number; }
export default function Bars({ bars, unit, threshold, max, height = 220 }: Props) {
 const [hover, setHover] = useState<number | null>(null);
 const W = 720, PAD = { l: 40, r: 12, t: 12, b: 34 };
 const top = max ?? Math.max(...bars.map(b => b.value), threshold?.value ?? 0) * 1.1;
 const slot = (W - PAD.l - PAD.r) / bars.length, bw = Math.max(4, slot - 2);
 const sy = (v: number) => height - PAD.b - v / top * (height - PAD.t - PAD.b);
 return <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label={`${bars.length} values in ${unit}`} onMouseLeave={() => setHover(null)}>
  {[0, 0.25, 0.5, 0.75, 1].map(f => <g key={f}><line x1={PAD.l} x2={W - PAD.r} y1={sy(f * top)} y2={sy(f * top)} stroke="#E5E7EB" /><text x={PAD.l - 6} y={sy(f * top) + 4} textAnchor="end" fontSize="11" fill="#6B7280">{(f * top).toFixed(1)}</text></g>)}
  {bars.map((b, i) => <g key={b.label} onMouseEnter={() => setHover(i)}>
   <rect x={PAD.l + i * slot + 1} y={PAD.t} width={bw} height={height - PAD.t - PAD.b} fill="transparent" />
   <rect x={PAD.l + i * slot + 1} y={sy(b.value)} width={bw} height={Math.max(0, height - PAD.b - sy(b.value))} rx="3" fill={b.colour ?? '#4E4456'} opacity={hover === null || hover === i ? 1 : 0.45} />
   {bars.length <= 12 && <text x={PAD.l + i * slot + 1 + bw / 2} y={height - PAD.b + 14} textAnchor="middle" fontSize="10.5" fill="#454545">{b.label}</text>}
  </g>)}
  {threshold && <g><line x1={PAD.l} x2={W - PAD.r} y1={sy(threshold.value)} y2={sy(threshold.value)} stroke="#D67A7A" strokeWidth="1.5" strokeDasharray="6 4" /><text x={W - PAD.r} y={sy(threshold.value) - 5} textAnchor="end" fontSize="11" fill="#D67A7A">{threshold.label}</text></g>}
  {hover !== null && <g pointerEvents="none" transform={`translate(${Math.min(PAD.l + hover * slot + bw + 6, W - 190)} ${PAD.t})`}>
   <rect width="180" height={bars[hover].note ? 36 : 22} rx="5" fill="rgba(15,23,42,0.85)" />
   <text x="8" y="15" fontSize="11" fill="#fff">{bars[hover].label}: {bars[hover].value.toFixed(2)} {unit}</text>
   {bars[hover].note && <text x="8" y="30" fontSize="10.5" fill="#E5E7EB">{bars[hover].note}</text>}
  </g>}
 </svg>;
}
