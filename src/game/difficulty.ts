import { shouldFlap } from './autopilot.ts';
import { PHYS_DT } from './constants.ts';
import type { Obstacle } from './level.ts';
import { createGame, stepGame, tapGame } from './state.ts';

const FLIGHTS = 24;
const HORIZON = 150; // candles: about as far as a good run gets
const FLAP_GAP = 0.16; // seconds, the fastest the pilot can tap
const AIM_ERROR = 34; // world units either side of the pilot's target

/** Small seeded generator, so a chart always scores the same. */
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Candles an imperfect pilot survives on one flight, up to HORIZON. */
function fly(obstacles: Obstacle[], seed: number): number {
  const random = rng(seed);
  const g = createGame(obstacles);
  tapGame(g);
  let aim = 0;
  let cooldown = 0;
  while (g.phase === 'playing' && g.score < obstacles.length) {
    cooldown -= PHYS_DT;
    const target = { ...g, bird: { ...g.bird, y: g.bird.y + aim } };
    if (cooldown <= 0 && shouldFlap(target)) {
      tapGame(g);
      cooldown = FLAP_GAP;
      aim = (random() * 2 - 1) * AIM_ERROR;
    }
    stepGame(g, PHYS_DT);
  }
  return g.score;
}

/** How far a noisy pilot gets on average, as a share of HORIZON: lower is harder. */
export function survival(level: Obstacle[]): number {
  const opening = level.slice(0, HORIZON);
  let total = 0;
  for (let seed = 1; seed <= FLIGHTS; seed++) total += fly(opening, seed);
  return total / FLIGHTS / opening.length;
}

/** 0 (easiest) to 99 (hardest) for each chart, ranked against all the others. */
export function rankDifficulty(survivals: number[]): number[] {
  const order = survivals.map((_, i) => i).sort((a, b) => survivals[b]! - survivals[a]! || a - b);
  const ranks = new Array<number>(survivals.length).fill(0);
  order.forEach((chart, place) => { ranks[chart] = Math.floor((place / survivals.length) * 100); });
  return ranks;
}
