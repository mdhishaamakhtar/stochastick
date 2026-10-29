import { describe, it, expect } from 'vitest';
import { buildLevel } from './level.ts';
import type { Candle } from '../data/types.ts';
import { readFileSync } from 'node:fs';
import { decodeCandles } from '../data/codec.ts';
import {
  WORLD_H, GAP_MARGIN, GAP_HALF_MAX, GAP_HALF_MIN, GAP_SHOCK,
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

  it('a rally lifts the gap and holds it high without pinning to the edge', () => {
    const obs = buildLevel(mk(Array.from({ length: 200 }, (_, i) => 100 * 1.01 ** i)));
    const flat = buildLevel(mk(Array(200).fill(500)))[150]!.gapCenter;
    for (const i of [60, 120, 180]) {
      expect(obs[i]!.gapCenter).toBeLessThan(flat - 100);
      expect(obs[i]!.gapCenter).toBeGreaterThan(GAP_MARGIN + 10); // high, but off the edge
    }
  });

  it('a crash sends the gap toward the ground', () => {
    const obs = buildLevel(mk(Array.from({ length: 120 }, (_, i) => 1000 * 0.98 ** i)));
    expect(obs[100]!.gapCenter).toBeGreaterThan(WORLD_H / 2 + 100);
  });

  it('is scale-invariant: the same shape at any price level makes the same level', () => {
    const shape = Array.from({ length: 150 }, (_, i) => 1 + 0.1 * Math.sin(i / 7) + i * 0.002);
    const a = buildLevel(mk(shape.map((v) => v * 100)));
    const b = buildLevel(mk(shape.map((v) => v * 70000)));
    a.forEach((ob, i) => expect(ob.gapCenter).toBeCloseTo(b[i]!.gapCenter, 6));
  });

  it('noise in a quiet market stays small next to a real move', () => {
    const quiet = buildLevel(mk(Array.from({ length: 200 }, (_, i) => 500 + (i % 2 ? 0.5 : -0.5))));
    const steps = quiet.slice(30).map((ob, i) => Math.abs(ob.gapCenter - quiet[29 + i]!.gapCenter));
    expect(Math.max(...steps)).toBeLessThan(60);
  });

  it('shock candles squeeze the gap', () => {
    const candles = mk(Array(200).fill(500));
    candles[150] = { ...candles[150]!, h: 540, l: 470 };
    const obs = buildLevel(candles);
    expect(obs[150]!.gapHalf).toBeLessThan(obs[149]!.gapHalf);
    expect(obs[150]!.gapHalf).toBeGreaterThanOrEqual(GAP_HALF_MIN);
  });

  it('gaps tighten with progress and spacing is uniform', () => {
    const obs = buildLevel(mk(Array(200).fill(500)));
    expect(obs[0]!.gapHalf).toBe(GAP_HALF_MAX);
    expect(obs[GAP_TIGHTEN_CANDLES]!.gapHalf).toBe(GAP_HALF_MIN + GAP_SHOCK);
    expect(obs[1]!.x - obs[0]!.x).toBe(OBSTACLE_SPACING);
  });

  it('every shipped chart is playable', () => {
    const files = JSON.parse(readFileSync('public/data/manifest.json', 'utf8')).stocks
      .flatMap((s: { symbol: string; tfs: Record<string, unknown> }) =>
        Object.keys(s.tfs).map((tf) => `${s.symbol.replace(/[^A-Za-z0-9]/g, '')}_${tf}`));
    const broken: string[] = [];
    for (const f of files) {
      const b = readFileSync(`public/data/${f}.bin`);
      const obs = buildLevel(decodeCandles(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer));
      const ok = obs.every((ob, i) =>
        ob.gapCenter - ob.gapHalf >= 0 && ob.gapCenter + ob.gapHalf <= WORLD_H &&
        ob.gapHalf >= GAP_HALF_MIN && ob.gapHalf <= GAP_HALF_MAX &&
        (i === 0 || Math.abs(ob.gapCenter - obs[i - 1]!.gapCenter) <= MAX_CENTER_STEP + 1e-9));
      if (!ok) broken.push(f);
    }
    expect(broken).toEqual([]);
  }, 30000);

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
