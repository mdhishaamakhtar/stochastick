import { describe, expect, it } from 'vitest';
import { FrameBudget } from './quality.ts';

const run = (b: FrameBudget, frame: (i: number) => number, frames: number) => {
  let over = false;
  for (let i = 0; i < frames; i++) over = b.sample(frame(i)) || over;
  return over;
};

describe('FrameBudget', () => {
  it('stays quiet at a steady 60 fps', () => expect(run(new FrameBudget(), () => 16.7, 600)).toBe(false));
  it('tolerates a few missed frames', () => expect(run(new FrameBudget(), (i) => (i % 20 ? 16.7 : 33), 600)).toBe(false));
  it('trips when 1 frame in 10 is late', () => expect(run(new FrameBudget(), (i) => (i % 10 ? 16.7 : 33), 60)).toBe(true));
  it('needs a full window', () => expect(run(new FrameBudget(), () => 33, 59)).toBe(false));
  it('ignores hitches', () => expect(run(new FrameBudget(), () => 400, 600)).toBe(false));
});
