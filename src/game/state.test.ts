import { describe, it, expect } from 'vitest';
import { createGame, tapGame, stepGame } from './state.ts';
import { buildLevel } from './level.ts';
import type { Candle } from '../data/types.ts';
import { PHYS_DT, SCROLL_SPEED, BIRD_X, OBSTACLE_HALF_W } from './constants.ts';

const candles: Candle[] = Array.from({ length: 50 }, (_, i) => ({
  t: 1700000000 + i * 86400, o: 100, h: 101, l: 99, c: 100,
}));

describe('game state', () => {
  it('starts ready; first tap starts playing and flaps', () => {
    const g = createGame(buildLevel(candles));
    expect(g.phase).toBe('ready');
    tapGame(g);
    expect(g.phase).toBe('playing');
    expect(g.bird.vy).toBeLessThan(0);
  });

  it('does not advance while ready', () => {
    const g = createGame(buildLevel(candles));
    stepGame(g, PHYS_DT);
    expect(g.scrollX).toBe(0);
  });

  it('scrolls at SCROLL_SPEED while playing', () => {
    const g = createGame(buildLevel(candles));
    tapGame(g);
    stepGame(g, PHYS_DT);
    expect(g.scrollX).toBeCloseTo(SCROLL_SPEED * PHYS_DT);
  });

  it('dies without input (gravity into the floor)', () => {
    const g = createGame(buildLevel(candles));
    tapGame(g);
    for (let i = 0; i < 1200 && g.phase === 'playing'; i++) stepGame(g, PHYS_DT);
    expect(g.phase).toBe('dead');
  });

  it('scores when passing an obstacle (bird held in gap by direct y control)', () => {
    const obstacles = buildLevel(candles);
    const g = createGame(obstacles);
    tapGame(g);
    for (let i = 0; i < 2400 && g.score === 0 && g.phase === 'playing'; i++) {
      g.bird.y = obstacles[g.nextObstacle]?.gapCenter ?? 400;
      g.bird.vy = 0;
      stepGame(g, PHYS_DT);
    }
    expect(g.score).toBeGreaterThanOrEqual(1);
    expect(g.phase).toBe('playing');
  });

  it('just-passed candle stays deadly (trailing-edge clip kills)', () => {
    const obstacles = buildLevel(candles);
    const g = createGame(obstacles);
    const ob = obstacles[1]!;
    // Bird center 5 units past the obstacle's right edge: already scored
    // (nextObstacle advanced past it), but still within BIRD_R of the
    // pillar's trailing face.
    g.phase = 'playing';
    g.nextObstacle = 2;
    g.score = 2;
    g.scrollX = ob.x + OBSTACLE_HALF_W + 5 - BIRD_X;
    g.bird.y = ob.gapCenter - ob.gapHalf - 5; // inside top pillar's y-range
    g.bird.vy = 0;
    stepGame(g, PHYS_DT);
    expect(g.phase).toBe('dead');
    expect(g.deadAt).toBe(ob);
  });
});
