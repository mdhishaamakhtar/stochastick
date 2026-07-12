import type { Obstacle } from './level.ts';
import { BIRD_X, BIRD_R, WORLD_H, OBSTACLE_HALF_W } from './constants.ts';

function circleRect(cx: number, cy: number, r: number, x0: number, y0: number, x1: number, y1: number): boolean {
  const nx = Math.max(x0, Math.min(cx, x1));
  const ny = Math.max(y0, Math.min(cy, y1));
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function hitsObstacle(birdY: number, scrollX: number, ob: Obstacle): boolean {
  const bx = BIRD_X + scrollX;
  const x0 = ob.x - OBSTACLE_HALF_W, x1 = ob.x + OBSTACLE_HALF_W;
  return (
    circleRect(bx, birdY, BIRD_R, x0, 0, x1, ob.gapCenter - ob.gapHalf) ||
    circleRect(bx, birdY, BIRD_R, x0, ob.gapCenter + ob.gapHalf, x1, WORLD_H)
  );
}

export function hitsBounds(birdY: number): boolean {
  return birdY - BIRD_R <= 0 || birdY + BIRD_R >= WORLD_H;
}

export function passedObstacle(scrollX: number, ob: Obstacle): boolean {
  return BIRD_X + scrollX > ob.x + OBSTACLE_HALF_W;
}
