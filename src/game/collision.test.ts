import { describe, it, expect } from 'vitest';
import { hitsObstacle, hitsGround, passedObstacle } from './collision.ts';
import type { Obstacle } from './level.ts';
import { BIRD_X, BIRD_R, WORLD_H, OBSTACLE_HALF_W } from './constants.ts';

const ob: Obstacle = {
  x: 700, gapCenter: 400, gapHalf: 100, index: 0, bull: true, norm: 0.5,
  candle: { t: 0, o: 1, h: 2, l: 0.5, c: 1.5 },
};

describe('collision', () => {
  it('no hit when bird is centered in the gap at the obstacle', () => {
    expect(hitsObstacle(400, 700 - BIRD_X, ob)).toBe(false);
  });

  it('hits the top pillar when above the gap', () => {
    expect(hitsObstacle(280, 700 - BIRD_X, ob)).toBe(true);
  });

  it('hits the bottom pillar when below the gap', () => {
    expect(hitsObstacle(520, 700 - BIRD_X, ob)).toBe(true);
  });

  it('no hit when horizontally far from the obstacle', () => {
    expect(hitsObstacle(100, 0, ob)).toBe(false);
  });

  it('only the ground kills; the sky above is open', () => {
    expect(hitsGround(WORLD_H - BIRD_R + 1)).toBe(true);
    expect(hitsGround(400)).toBe(false);
    expect(hitsGround(-200)).toBe(false);
  });

  it('top candles extend upward forever', () => {
    expect(hitsObstacle(-500, 700 - BIRD_X, ob)).toBe(true);
  });

  it('passedObstacle flips exactly after trailing edge', () => {
    const edge = 700 + OBSTACLE_HALF_W - BIRD_X;
    expect(passedObstacle(edge - 1, ob)).toBe(false);
    expect(passedObstacle(edge + 1, ob)).toBe(true);
  });
});
