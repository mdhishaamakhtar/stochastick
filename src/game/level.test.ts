import { describe, it, expect } from 'vitest';
import { buildLevel } from './level.ts';
import type { Candle } from '../data/types.ts';
import {
  WORLD_H, GAP_MARGIN, GAP_HALF_MAX, GAP_HALF_MIN,
  MAX_CENTER_STEP, OBSTACLE_SPACING, GAP_TIGHTEN_CANDLES,
} from './constants.ts';

function mk(closes: number[]): Candle[] {
  return closes.map((c, i) => ({ t: 1700000000 + i * 86400, o: c * 0.99, h: c * 1.01, l: c * 0.98, c }));
}

function playable(obs: ReturnType<typeof buildLevel>) {
  for (let i = 0; i < obs.length; i++) {
    const ob = obs[i]!;
    expect(ob.gapCenter - ob.gapHalf).toBeGreaterThanOrEqual(0);
    expect(ob.gapCenter + ob.gapHalf).toBeLessThanOrEqual(WORLD_H);
    expect(ob.gapHalf).toBeGreaterThanOrEqual(GAP_HALF_MIN);
    expect(ob.gapHalf).toBeLessThanOrEqual(GAP_HALF_MAX);
    if (i > 0) expect(Math.abs(ob.gapCenter - obs[i - 1]!.gapCenter)).toBeLessThanOrEqual(MAX_CENTER_STEP + 1e-9);
  }
}

describe('buildLevel', () => {
  it('is playable for a violent crash series', () => {
    const closes = Array.from({ length: 300 }, (_, i) => 1000 * Math.exp(-i * 0.05) + (i % 7) * 3);
    playable(buildLevel(mk(closes)));
  });

  it('is playable for a dead-flat series', () => {
    playable(buildLevel(mk(Array(200).fill(500))));
  });

  it('is playable for alternating extreme spikes', () => {
    playable(buildLevel(mk(Array.from({ length: 200 }, (_, i) => (i % 2 ? 10 : 1000)))));
  });

  it('trend direction moves the gap: rally pushes gaps up (smaller y)', () => {
    const obs = buildLevel(mk(Array.from({ length: 100 }, (_, i) => 100 + i * 10)));
    const late = obs[80]!.gapCenter;
    const flat = buildLevel(mk(Array(100).fill(500)))[80]!.gapCenter;
    expect(late).toBeLessThan(flat);
  });

  it('gaps tighten with progress and spacing is uniform', () => {
    const obs = buildLevel(mk(Array(200).fill(500)));
    expect(obs[0]!.gapHalf).toBe(GAP_HALF_MAX);
    expect(obs[GAP_TIGHTEN_CANDLES]!.gapHalf).toBe(GAP_HALF_MIN);
    expect(obs[1]!.x - obs[0]!.x).toBe(OBSTACLE_SPACING);
  });

  it('marks bull/bear candles', () => {
    const candles: Candle[] = [
      { t: 1, o: 10, h: 12, l: 9, c: 11 },
      { t: 2, o: 11, h: 12, l: 9, c: 10 },
    ];
    const obs = buildLevel(candles);
    expect(obs[0]!.bull).toBe(true);
    expect(obs[1]!.bull).toBe(false);
  });
});
