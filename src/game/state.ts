import { createBird, flap, stepBird, type Bird } from './physics.ts';
import { hitsBounds, hitsObstacle, passedObstacle } from './collision.ts';
import type { Obstacle } from './level.ts';
import { SCROLL_SPEED } from './constants.ts';

export type Phase = 'ready' | 'playing' | 'dead';

export interface GameState {
  phase: Phase;
  bird: Bird;
  scrollX: number;
  score: number;
  nextObstacle: number;
  obstacles: Obstacle[];
  deadAt: Obstacle | null;
}

export function createGame(obstacles: Obstacle[]): GameState {
  return { phase: 'ready', bird: createBird(), scrollX: 0, score: 0, nextObstacle: 0, obstacles, deadAt: null };
}

export function tapGame(g: GameState): void {
  if (g.phase === 'ready') { g.phase = 'playing'; flap(g.bird); }
  else if (g.phase === 'playing') flap(g.bird);
}

export function stepGame(g: GameState, dt: number): void {
  if (g.phase !== 'playing') return;
  g.scrollX += SCROLL_SPEED * dt;
  stepBird(g.bird, dt);

  const next = g.obstacles[g.nextObstacle];
  if (next && passedObstacle(g.scrollX, next)) {
    g.score++;
    g.nextObstacle++;
  }
  if (g.nextObstacle >= g.obstacles.length) { g.phase = 'dead'; return; }

  if (hitsBounds(g.bird.y)) { g.phase = 'dead'; g.deadAt = g.obstacles[g.nextObstacle] ?? null; return; }
  for (let i = g.nextObstacle; i < Math.min(g.nextObstacle + 3, g.obstacles.length); i++) {
    const ob = g.obstacles[i]!;
    if (hitsObstacle(g.bird.y, g.scrollX, ob)) { g.phase = 'dead'; g.deadAt = ob; return; }
  }
}
