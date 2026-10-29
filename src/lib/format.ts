import type { Timeframe } from '../data/manifest.ts';

const IST = 'Asia/Kolkata';
const dayFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: IST });
const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: IST });

export const isIntraday = (tf: Timeframe): boolean => tf === '15m' || tf === '1h';

export function fmtDate(t: number, tf: Timeframe): string {
  const d = new Date(t * 1000);
  return isIntraday(tf) ? `${dayFmt.format(d)}, ${timeFmt.format(d)}` : dayFmt.format(d);
}

/** Rupees for stocks; indices are quoted in points, so no currency sign. */
export function fmtPrice(p: number, index = false): string {
  const n = p.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return index ? n : `₹${n}`;
}

export function fmtPct(p: number): string {
  const s = Math.abs(p).toFixed(Math.abs(p) >= 10 ? 1 : 2);
  return `${p >= 0 ? '+' : '−'}${s}%`;
}

/** Bucket-average a series down to `n` points, normalized to 0..1. */
export function downsample(values: number[], n: number): number[] {
  if (!values.length) return [];
  const out: number[] = [];
  const k = values.length / Math.min(n, values.length);
  for (let i = 0; i < values.length; i += k) {
    const a = Math.floor(i), b = Math.max(a + 1, Math.floor(i + k));
    let sum = 0;
    for (let j = a; j < b && j < values.length; j++) sum += values[j]!;
    out.push(sum / (Math.min(b, values.length) - a));
  }
  const lo = Math.min(...out), hi = Math.max(...out);
  return out.map((v) => (hi > lo ? (v - lo) / (hi - lo) : 0.5));
}

/** SVG path for a 0..1 series inside a w×h box (y up). */
export function linePath(series: number[], w: number, h: number, pad = 2): string {
  if (series.length < 2) return '';
  return series
    .map((v, i) => `${i ? 'L' : 'M'}${((i / (series.length - 1)) * w).toFixed(1)} ${(pad + (1 - v) * (h - pad * 2)).toFixed(1)}`)
    .join('');
}
