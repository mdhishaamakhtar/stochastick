import { describe, expect, it } from 'vitest';
import type { Candle } from '../data/types.ts';
import { tierOf } from '../data/manifest.ts';
import { rankDifficulty, survival } from './difficulty.ts';
import { buildLevel } from './level.ts';

const series = (n: number, swing: (i: number) => number): Candle[] =>
  Array.from({ length: n }, (_, i) => {
    const c = 100 + swing(i);
    return { t: i, o: c, h: c + 1, l: c - 1, c };
  });

describe('survival', () => {
  const calm = buildLevel(series(200, (i) => Math.sin(i / 20)));
  const wild = buildLevel(series(200, (i) => (i % 8 < 4 ? 30 : -30)));

  it('always scores a chart the same', () => expect(survival(wild)).toBe(survival(wild)));
  it('rates a whipsaw harder than a calm tape', () => expect(survival(wild)).toBeLessThan(survival(calm)));
});

describe('rankDifficulty', () => {
  it('ranks the lowest survival hardest', () => expect(rankDifficulty([0.9, 0.2, 0.5, 0.7])).toEqual([0, 75, 50, 25]));
});

describe('tierOf', () => {
  it('splits the range into four tiers', () => {
    expect([0, 24, 25, 50, 75, 99].map(tierOf)).toEqual(['Easy', 'Easy', 'Medium', 'Hard', 'Brutal', 'Brutal']);
  });
});
