import { describe, it, expect } from 'vitest';
import { encodeCandles, decodeCandles } from './codec.ts';
import type { Candle } from './types.ts';

const sample: Candle[] = [
  { t: 1700000000, o: 2500.5, h: 2510.05, l: 2490.0, c: 2505.25 },
  { t: 1700086400, o: 2505.25, h: 2555.1, l: 2500.0, c: 2550.0 },
  { t: 1700172800, o: 2550.0, h: 2550.0, l: 2401.15, c: 2410.6 },
];

describe('candle codec', () => {
  it('round-trips candles exactly (paise precision)', () => {
    expect(decodeCandles(encodeCandles(sample))).toEqual(sample);
  });

  it('round-trips empty array', () => {
    expect(decodeCandles(encodeCandles([]))).toEqual([]);
  });

  it('throws on bad magic', () => {
    const buf = new ArrayBuffer(16);
    expect(() => decodeCandles(buf)).toThrow(/magic/i);
  });
});
