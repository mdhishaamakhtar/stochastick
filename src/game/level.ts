import type { Candle } from '../data/types.ts';
import {
  WORLD_H, GAP_MARGIN, GAP_HALF_MAX, GAP_HALF_MIN,
  MAX_CENTER_STEP, OBSTACLE_SPACING, GAP_TIGHTEN_CANDLES,
} from './constants.ts';

export interface Obstacle {
  x: number;
  gapCenter: number;
  gapHalf: number;
  candle: Candle;
  bull: boolean;
  index: number;
}

const FIRST_X = 700;
const WINDOW = 20;

export function buildLevel(candles: Candle[]): Obstacle[] {
  const lo = GAP_MARGIN;
  const hi = WORLD_H - GAP_MARGIN;
  const out: Obstacle[] = [];
  let prevCenter = WORLD_H / 2;
  for (let i = 0; i < candles.length; i++) {
    const cd = candles[i]!;
    let winMin = Infinity, winMax = -Infinity;
    for (let j = Math.max(0, i - WINDOW); j <= i; j++) {
      const c = candles[j]!.c;
      if (c < winMin) winMin = c;
      if (c > winMax) winMax = c;
    }
    const norm = winMax > winMin ? (cd.c - winMin) / (winMax - winMin) : 0.5;
    const ease = Math.min(1, i / GAP_TIGHTEN_CANDLES);
    const gapHalf = GAP_HALF_MAX - (GAP_HALF_MAX - GAP_HALF_MIN) * ease;
    // The gap must fit inside the world even when gapHalf exceeds GAP_MARGIN.
    // gapHalf is non-increasing, so this band only widens with i; prevCenter
    // always lies inside the current band, and step-clamping toward an
    // in-band target keeps the result both in-band and within MAX_CENTER_STEP.
    const loI = Math.max(lo, gapHalf);
    const hiI = Math.min(hi, WORLD_H - gapHalf);
    let center = lo + (1 - norm) * (hi - lo);
    center = Math.max(loI, Math.min(hiI, center));
    center = Math.max(prevCenter - MAX_CENTER_STEP, Math.min(prevCenter + MAX_CENTER_STEP, center));
    out.push({ x: FIRST_X + i * OBSTACLE_SPACING, gapCenter: center, gapHalf, candle: cd, bull: cd.c >= cd.o, index: i });
    prevCenter = center;
  }
  return out;
}
