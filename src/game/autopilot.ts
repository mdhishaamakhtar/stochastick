import type { GameState } from './state.ts';
import { FLAP_VY, GRAVITY } from './constants.ts';

// A flap lifts the bird FLAP_VY²/2g before it falls back, so flapping once it
// has sunk half that far below the target keeps it oscillating around it.
const SWING = (FLAP_VY * FLAP_VY) / (2 * GRAVITY) / 2;

/** The landing page's demo pilot: holds the bird around the next gap's centre. */
export function shouldFlap(g: GameState): boolean {
  const ob = g.obstacles[g.nextObstacle];
  if (!ob) return false;
  return g.bird.vy > 0 && g.bird.y > ob.gapCenter + SWING * 0.9;
}
