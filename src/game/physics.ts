import { GRAVITY, FLAP_VY, MAX_FALL, WORLD_H } from './constants.ts';

export interface Bird { y: number; vy: number; rot: number }

export function createBird(): Bird {
  return { y: WORLD_H / 2, vy: 0, rot: 0 };
}

export function flap(b: Bird): void {
  b.vy = FLAP_VY;
}

export function stepBird(b: Bird, dt: number): void {
  b.vy = Math.min(b.vy + GRAVITY * dt, MAX_FALL);
  b.y += b.vy * dt;
  const target = b.vy < 0 ? -0.45 : Math.min(1.25, (b.vy / MAX_FALL) * 1.25);
  b.rot += (target - b.rot) * Math.min(1, dt * 12);
}
