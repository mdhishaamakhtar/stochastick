import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { shouldFlap } from './autopilot.ts';
import { buildLevel } from './level.ts';
import { createGame, stepGame, tapGame } from './state.ts';
import { decodeCandles } from '../data/codec.ts';
import { PHYS_DT } from './constants.ts';

function fly(closes: number[] | null, file?: string, seconds = 60): number {
  let candles;
  if (file) {
    const b = readFileSync(file);
    candles = decodeCandles(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  } else {
    candles = closes!.map((c, i) => ({ t: i, o: c, h: c * 1.01, l: c * 0.99, c }));
  }
  const g = createGame(buildLevel(candles));
  tapGame(g);
  let cd = 0;
  for (let i = 0; i < seconds / PHYS_DT && g.phase === 'playing'; i++) {
    cd -= PHYS_DT;
    if (cd <= 0 && shouldFlap(g)) { tapGame(g); cd = 0.16; }
    stepGame(g, PHYS_DT);
  }
  return g.score;
}

describe('demo autopilot', () => {
  it('flies a flat chart', () => {
    expect(fly(Array(300).fill(100))).toBeGreaterThan(40);
  });
  it('flies a real chart for a good while', () => {
    expect(fly(null, 'public/data/NIFTY50_1d.bin')).toBeGreaterThan(25);
  });
});
