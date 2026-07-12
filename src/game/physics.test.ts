import { describe, it, expect } from 'vitest';
import { createBird, flap, stepBird } from './physics.ts';
import { GRAVITY, FLAP_VY, MAX_FALL, PHYS_DT, WORLD_H } from './constants.ts';

describe('bird physics', () => {
  it('starts centered and still', () => {
    const b = createBird();
    expect(b.y).toBe(WORLD_H / 2);
    expect(b.vy).toBe(0);
  });

  it('accelerates downward under gravity', () => {
    const b = createBird();
    stepBird(b, PHYS_DT);
    expect(b.vy).toBeCloseTo(GRAVITY * PHYS_DT);
    expect(b.y).toBeGreaterThan(WORLD_H / 2);
  });

  it('flap sets a fixed upward impulse', () => {
    const b = createBird();
    b.vy = 500;
    flap(b);
    expect(b.vy).toBe(FLAP_VY);
  });

  it('falls no faster than terminal velocity', () => {
    const b = createBird();
    for (let i = 0; i < 600; i++) stepBird(b, PHYS_DT);
    expect(b.vy).toBe(MAX_FALL);
  });

  it('rotates nose-up after flap and nose-down in freefall', () => {
    const b = createBird();
    flap(b);
    stepBird(b, PHYS_DT);
    expect(b.rot).toBeLessThan(0);
    for (let i = 0; i < 600; i++) stepBird(b, PHYS_DT);
    expect(b.rot).toBeGreaterThan(0.8);
  });
});
