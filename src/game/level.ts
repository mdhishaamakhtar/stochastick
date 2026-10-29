import type { Candle } from '../data/types.ts';
import {
  WORLD_H, GAP_MARGIN, GAP_HALF_MAX, GAP_HALF_MIN, GAP_SHOCK,
  MAX_CENTER_STEP, OBSTACLE_SPACING, GAP_TIGHTEN_CANDLES,
} from './constants.ts';

export interface Obstacle {
  x: number;
  gapCenter: number;
  gapHalf: number;
  candle: Candle;
  bull: boolean;
  index: number;
  /** how stretched price is vs its recent fair value, 0..1 (1 = far above) */
  norm: number;
}

const FIRST_X = 700;

// Fair value: an EMA the price oscillates around.
const EMA_N = 20;
// Typical move: Wilder's average true range, so gaps between candles count.
const ATR_N = 14;
// Distance from fair value, in ATRs, that carries the gap ~76% of the way to
// the edge (tanh(1)); bigger is calmer.
const Z_SCALE = 2.0;
// Each candle moves the height halfway to its new target: a two-candle
// glide that keeps the shape but drops single-bar chop.
const GLIDE = 0.5;
// A candle whose range is this many ATRs or more gets the full squeeze.
const SHOCK_FROM = 1.3;
const SHOCK_FULL = 2.6;

/**
 * Turn a price series into a level.
 *
 * Height is volatility-scaled distance from fair value:
 *   z = (close − EMA) / (Z_SCALE · ATR),  height ∝ tanh(z), glided over ~2 candles
 * so it is the same for a ₹100 stock and a 70,000-point index, a quiet tape
 * stays calm (noise is small next to its own ATR), a crash dives, and a
 * sustained rally climbs and holds high instead of pinning to the ceiling.
 *
 * Gap size tightens with progress, and squeezes on shock candles (true range
 * well above ATR): the market's most violent days are the hardest to fly.
 *
 * Safety: the gap always fits the world and never moves more than
 * MAX_CENTER_STEP between candles, which the flap physics can always cover.
 */
export function buildLevel(candles: Candle[]): Obstacle[] {
  const lo = GAP_MARGIN;
  const hi = WORLD_H - GAP_MARGIN;
  const mid = (lo + hi) / 2;
  const half = (hi - lo) / 2;
  const kEma = 2 / (EMA_N + 1);
  const out: Obstacle[] = [];
  let prevCenter = mid;
  let ema = candles[0]?.c ?? 0;
  let atr = 0;
  let u = 0;

  for (let i = 0; i < candles.length; i++) {
    const cd = candles[i]!;
    const prevClose = i ? candles[i - 1]!.c : cd.o;
    const tr = Math.max(cd.h - cd.l, Math.abs(cd.h - prevClose), Math.abs(cd.l - prevClose));
    // Wilder's smoothing, warmed up as a plain mean over the first ATR_N bars
    atr += (tr - atr) / Math.min(i + 1, ATR_N);

    // measured against fair value *before* this close moves it
    const z = atr > 0 ? (cd.c - ema) / (Z_SCALE * atr) : 0;
    ema += kEma * (cd.c - ema);
    u += GLIDE * (Math.tanh(z) - u);

    const shock = atr > 0 ? Math.min(1, Math.max(0, (tr / atr - SHOCK_FROM) / (SHOCK_FULL - SHOCK_FROM))) : 0;
    const ease = Math.min(1, i / GAP_TIGHTEN_CANDLES);
    const gapHalf = GAP_HALF_MAX - (GAP_HALF_MAX - GAP_HALF_MIN - GAP_SHOCK) * ease - GAP_SHOCK * shock;

    // Clamp into the band where this gap fits, then limit the step from the
    // previous centre. The band's edges sit at most GAP_HALF_MAX − GAP_MARGIN
    // (< MAX_CENTER_STEP) inside lo/hi and prevCenter is always within lo..hi,
    // so stepping toward an in-band target always lands in-band.
    const loI = Math.max(lo, gapHalf);
    const hiI = Math.min(hi, WORLD_H - gapHalf);
    let center = mid - u * half;
    center = Math.max(loI, Math.min(hiI, center));
    center = Math.max(prevCenter - MAX_CENTER_STEP, Math.min(prevCenter + MAX_CENTER_STEP, center));

    out.push({
      x: FIRST_X + i * OBSTACLE_SPACING,
      gapCenter: center, gapHalf, candle: cd, bull: cd.c >= cd.o, index: i,
      norm: (u + 1) / 2,
    });
    prevCenter = center;
  }
  return out;
}
