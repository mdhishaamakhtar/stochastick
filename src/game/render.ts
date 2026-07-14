import type { GameState } from './state.ts';
import type { Obstacle } from './level.ts';
import { WORLD_H, BIRD_X, BIRD_R, OBSTACLE_HALF_W, PHYS_DT } from './constants.ts';

const BG = '#0a0b13';
const GRID = '#232739';
const GREEN = '#22d68e';
const GREEN_DIM = '#0e3626';
const RED = '#ff5964';
const RED_DIM = '#3c1a22';
const SMOKE = '#dfe7f2';
const WHITE = '#f0f2f9';

export type Fighter = 'bull' | 'bear';

const GRID_SPACING = 160; // vertical time-gridline spacing, world units
const PARALLAX = 0.5;

const POOL_SIZE = 64;
const PARTICLE_GRAVITY = 900;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; ttl: number;
  size: number;
  color: string;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale = 1;
  private bull: HTMLCanvasElement;
  private bear: HTMLCanvasElement;
  private avatar: HTMLCanvasElement;
  private scorePop: HTMLCanvasElement;

  private pool: Particle[] = [];
  private flapT = 0;
  private deathFlash = 0;
  private popT = 0; // remaining life of the "+1" pop
  private popY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.bull = makeBullSprite(2);
    this.bear = makeBearSprite(2);
    this.avatar = this.bull;
    this.scorePop = makeScorePopSprite();
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, ttl: 1, size: 4, color: SMOKE });
    }
  }

  resize(cssW: number, cssH: number): void {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.scale = (cssH / WORLD_H) * dpr;
  }

  setFighter(f: Fighter): void {
    this.avatar = f === 'bear' ? this.bear : this.bull;
  }

  /** Paint the idle backdrop over whatever frame is left on the canvas
   *  (called when leaving the game screen so no stale frame lingers). */
  clear(): void {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Advance effect timers/particles. Called from the fixed-step update. */
  tick(dt: number): void {
    if (this.flapT > 0) this.flapT -= dt;
    if (this.deathFlash > 0) this.deathFlash -= dt * 2.2;
    if (this.popT > 0) { this.popT -= dt; this.popY -= 55 * dt; }
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += PARTICLE_GRAVITY * dt;
    }
  }

  onFlap(y: number): void {
    this.flapT = 0.18;
    this.spawn(3, BIRD_X - 16, y + 10, -90, 40, 60, 90, 0.35, 3, SMOKE);
  }

  onScore(y: number): void {
    this.popT = 0.7;
    this.popY = y - 34;
  }

  onDeath(y: number): void {
    this.deathFlash = 0.55;
    this.spawn(10, BIRD_X, y, 0, 0, 260, 200, 0.75, 6, RED);
    this.spawn(9, BIRD_X, y, 0, 0, 220, 180, 0.7, 5, GREEN);
    this.spawn(7, BIRD_X, y, 0, 0, 180, 160, 0.6, 4, WHITE);
  }

  private spawn(
    n: number, x: number, y: number,
    vxBase: number, vyBase: number, vxSpread: number, vySpread: number,
    ttl: number, size: number, color: string,
  ): void {
    let spawned = 0;
    for (const p of this.pool) {
      if (spawned >= n) break;
      if (p.life > 0) continue;
      p.x = x;
      p.y = y;
      p.vx = vxBase + (Math.random() - 0.5) * 2 * vxSpread;
      p.vy = vyBase - Math.random() * vySpread;
      p.ttl = ttl * (0.6 + Math.random() * 0.4);
      p.life = p.ttl;
      p.size = size * (0.6 + Math.random() * 0.8);
      p.color = color;
      spawned++;
    }
  }

  draw(g: GameState, alpha: number): void {
    const { ctx } = this;
    const s = this.scale;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // horizontal price gridlines (device space)
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 8; i++) {
      const y = (H / 8) * i;
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    ctx.setTransform(s, 0, 0, s, 0, 0);
    const viewW = W / s;
    const scroll = g.scrollX;

    // vertical time gridlines, parallax-scrolled for depth
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    for (let x = -((scroll * PARALLAX) % GRID_SPACING); x < viewW; x += GRID_SPACING) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_H);
    }
    ctx.lineWidth = 1 / s;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // obstacles in view
    for (const ob of g.obstacles) {
      const x = ob.x - scroll;
      if (x < -OBSTACLE_HALF_W * 2) continue;
      if (x > viewW + OBSTACLE_HALF_W * 2) break;
      drawCandlePair(ctx, ob, x);
    }

    // particles
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.ttl);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // "+1" score pop
    if (this.popT > 0) {
      ctx.globalAlpha = Math.min(1, this.popT / 0.4);
      ctx.drawImage(this.scorePop, BIRD_X + 26, this.popY, 40, 20);
      ctx.globalAlpha = 1;
    }

    // bird (interpolate y one physics step for smoothness; squash on flap)
    const by = g.bird.y + g.bird.vy * (alpha * PHYS_DT);
    const squash = this.flapT > 0 ? this.flapT / 0.18 : 0;
    ctx.save();
    ctx.translate(BIRD_X, by);
    ctx.rotate(g.bird.rot);
    ctx.scale(1 + squash * 0.1, 1 - squash * 0.12);
    ctx.drawImage(this.avatar, -BIRD_R * 1.4, -BIRD_R * 1.4, BIRD_R * 2.8, BIRD_R * 2.8);
    ctx.restore();

    // death flash vignette
    if (this.deathFlash > 0) {
      ctx.globalAlpha = Math.min(0.45, this.deathFlash);
      ctx.fillStyle = RED;
      ctx.fillRect(0, 0, viewW, WORLD_H);
      ctx.globalAlpha = 1;
    }
  }
}

function drawCandlePair(ctx: CanvasRenderingContext2D, ob: Obstacle, x: number): void {
  const body = ob.bull ? GREEN : RED;
  const dim = ob.bull ? GREEN_DIM : RED_DIM;
  const topEnd = ob.gapCenter - ob.gapHalf;
  const botStart = ob.gapCenter + ob.gapHalf;
  const wick = 26; // cosmetic wick length at the gap-facing end
  const w = OBSTACLE_HALF_W * 2;

  // bottom pillar: body from floor up, wick pointing into the gap.
  // Skip entirely when the gap reaches the floor — a pillar with no body
  // must not leave orphaned wicks/outlines behind.
  if (botStart < WORLD_H - 2) {
    ctx.fillStyle = dim;
    ctx.fillRect(x - OBSTACLE_HALF_W, botStart, w, WORLD_H - botStart);
    ctx.fillStyle = body;
    ctx.fillRect(x - OBSTACLE_HALF_W, botStart, w, 6); // rim
    ctx.fillRect(x - 3, botStart - wick, 6, wick); // wick
    ctx.strokeStyle = body;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - OBSTACLE_HALF_W + 1, botStart + 1, w - 2, WORLD_H - botStart - 2);
  }

  // top pillar (inverted) — same guard when the gap reaches the ceiling
  if (topEnd > 2) {
    ctx.fillStyle = dim;
    ctx.fillRect(x - OBSTACLE_HALF_W, 0, w, topEnd);
    ctx.fillStyle = body;
    ctx.fillRect(x - OBSTACLE_HALF_W, Math.max(0, topEnd - 6), w, Math.min(6, topEnd));
    ctx.fillRect(x - 3, topEnd, 6, wick);
    ctx.strokeStyle = body;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - OBSTACLE_HALF_W + 1, 1, w - 2, topEnd - 2);
  }
}

export function makeBullSprite(res = 1): HTMLCanvasElement {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size * res;
  const ctx = c.getContext('2d')!;
  ctx.scale(res, res);
  const m = size / 2;
  const HIDE = '#b05f35'; // main coat — chestnut
  const HIDE_DARK = '#733a1c'; // shading / muzzle
  const OUTLINE = '#1d0f06';
  const HORN = '#f2ead8';
  const HORN_DARK = '#c9bda1';

  // --- horns: filled tapered blades sweeping up and FORWARD (fight stance)
  const horn = (sx: number) => {
    ctx.save();
    if (sx < 0) { ctx.translate(size, 0); ctx.scale(-1, 1); }
    ctx.fillStyle = HORN;
    ctx.beginPath();
    ctx.moveTo(m - 30, m - 14); // thick base at the temple
    ctx.quadraticCurveTo(m - 52, m - 26, m - 50, m - 48);
    ctx.quadraticCurveTo(m - 49, m - 60, m - 38, m - 64); // sharp tip
    ctx.quadraticCurveTo(m - 42, m - 52, m - 36, m - 40); // inner edge back down
    ctx.quadraticCurveTo(m - 30, m - 28, m - 16, m - 24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // shading streak on the horn
    ctx.strokeStyle = HORN_DARK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(m - 27, m - 20);
    ctx.quadraticCurveTo(m - 44, m - 32, m - 43, m - 50);
    ctx.stroke();
    ctx.restore();
  };
  horn(1);
  horn(-1);

  // --- ears: pinned back and low (aggression)
  ctx.fillStyle = HIDE_DARK;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(m - 38, m + 2, 12, 6, -0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(m + 38, m + 2, 12, 6, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // --- head: chiseled — wide brow ridge, hard cheekbones, strong jaw
  ctx.fillStyle = HIDE;
  ctx.beginPath();
  ctx.moveTo(m - 30, m - 26); // left temple
  ctx.quadraticCurveTo(m, m - 38, m + 30, m - 26); // heavy flat crown
  ctx.lineTo(m + 34, m - 4); // hard right cheekbone
  ctx.quadraticCurveTo(m + 32, m + 24, m + 14, m + 40); // jaw slope
  ctx.quadraticCurveTo(m, m + 46, m - 14, m + 40); // chin
  ctx.quadraticCurveTo(m - 32, m + 24, m - 34, m - 4); // left jaw up
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  ctx.stroke();

  // --- forelock: rough triangular tuft slammed down the forehead
  ctx.fillStyle = HIDE_DARK;
  ctx.beginPath();
  ctx.moveTo(m - 16, m - 34);
  ctx.quadraticCurveTo(m, m - 42, m + 16, m - 34);
  ctx.quadraticCurveTo(m + 8, m - 26, m, m - 27);
  ctx.quadraticCurveTo(m - 8, m - 26, m - 16, m - 34);
  ctx.closePath();
  ctx.fill();

  // --- brow ridge: one heavy dark V — the fierce line
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(m - 26, m - 20);
  ctx.lineTo(m - 6, m - 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(m + 26, m - 20);
  ctx.lineTo(m + 6, m - 10);
  ctx.stroke();

  // --- eyes: narrowed slits glaring from under the brow
  const eye = (sx: number) => {
    ctx.save();
    if (sx < 0) { ctx.translate(size, 0); ctx.scale(-1, 1); }
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.moveTo(m - 24, m - 8);
    ctx.quadraticCurveTo(m - 15, m - 12, m - 7, m - 5);
    ctx.quadraticCurveTo(m - 15, m - 1, m - 24, m - 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#07090f';
    ctx.beginPath();
    ctx.arc(m - 13, m - 6.5, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  eye(1);
  eye(-1);

  // --- muzzle: broad and heavy, flared nostrils, hard mouth
  ctx.fillStyle = HIDE_DARK;
  ctx.beginPath();
  ctx.ellipse(m, m + 25, 25, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // nostrils: big angled flares
  ctx.fillStyle = '#160a03';
  ctx.beginPath();
  ctx.ellipse(m - 12, m + 23, 5, 7, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(m + 12, m + 23, 5, 7, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // mouth: flat grim line
  ctx.strokeStyle = '#160a03';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(m - 7, m + 37);
  ctx.lineTo(m + 7, m + 37);
  ctx.stroke();

  // --- snort steam: two small puffs off the nostrils
  ctx.fillStyle = 'rgba(230, 237, 247, 0.7)';
  ctx.beginPath();
  ctx.arc(m - 26, m + 30, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(m + 26, m + 30, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(230, 237, 247, 0.4)';
  ctx.beginPath();
  ctx.arc(m - 32, m + 34, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(m + 32, m + 34, 2, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

export function makeBearSprite(res = 1): HTMLCanvasElement {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size * res;
  const ctx = c.getContext('2d')!;
  ctx.scale(res, res);
  const m = size / 2;
  const COAT = '#6f6157'; // grizzled taupe
  const COAT_DARK = '#463b33';
  const MUZZLE = '#a8937f';
  const OUTLINE = '#171009';

  // --- ears: round, set wide and high
  const ear = (sx: number) => {
    ctx.save();
    if (sx < 0) { ctx.translate(size, 0); ctx.scale(-1, 1); }
    ctx.fillStyle = COAT;
    ctx.beginPath();
    ctx.arc(m - 30, m - 32, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = COAT_DARK;
    ctx.beginPath();
    ctx.arc(m - 29, m - 31, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  ear(1);
  ear(-1);

  // --- head: broad and heavy, wide cheeks, blunt jaw
  ctx.fillStyle = COAT;
  ctx.beginPath();
  ctx.moveTo(m - 34, m - 22);
  ctx.quadraticCurveTo(m, m - 40, m + 34, m - 22); // heavy crown
  ctx.quadraticCurveTo(m + 44, m + 6, m + 30, m + 32); // right cheek
  ctx.quadraticCurveTo(m + 16, m + 46, m, m + 46); // jaw
  ctx.quadraticCurveTo(m - 16, m + 46, m - 30, m + 32);
  ctx.quadraticCurveTo(m - 44, m + 6, m - 34, m - 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  ctx.stroke();

  // --- fur ruff: rough tuft on the forehead
  ctx.fillStyle = COAT_DARK;
  ctx.beginPath();
  ctx.moveTo(m - 14, m - 32);
  ctx.quadraticCurveTo(m, m - 40, m + 14, m - 32);
  ctx.quadraticCurveTo(m + 6, m - 25, m, m - 26);
  ctx.quadraticCurveTo(m - 6, m - 25, m - 14, m - 32);
  ctx.closePath();
  ctx.fill();

  // --- brow: heavy dark V, same fierce line as the bull
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(m - 26, m - 18);
  ctx.lineTo(m - 6, m - 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(m + 26, m - 18);
  ctx.lineTo(m + 6, m - 8);
  ctx.stroke();

  // --- eyes: narrowed slits glaring from under the brow
  const eye = (sx: number) => {
    ctx.save();
    if (sx < 0) { ctx.translate(size, 0); ctx.scale(-1, 1); }
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.moveTo(m - 24, m - 6);
    ctx.quadraticCurveTo(m - 15, m - 10, m - 7, m - 3);
    ctx.quadraticCurveTo(m - 15, m + 1, m - 24, m - 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0a0b13';
    ctx.beginPath();
    ctx.arc(m - 13, m - 4.5, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  eye(1);
  eye(-1);

  // --- muzzle: lighter patch with a big bear nose and a snarl
  ctx.fillStyle = MUZZLE;
  ctx.beginPath();
  ctx.ellipse(m, m + 26, 22, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // nose: wide rounded triangle
  ctx.fillStyle = '#171009';
  ctx.beginPath();
  ctx.moveTo(m - 9, m + 18);
  ctx.lineTo(m + 9, m + 18);
  ctx.quadraticCurveTo(m + 7, m + 27, m, m + 28);
  ctx.quadraticCurveTo(m - 7, m + 27, m - 9, m + 18);
  ctx.closePath();
  ctx.fill();
  // snarl: grim mouth with two bared fangs
  ctx.strokeStyle = '#171009';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(m - 10, m + 36);
  ctx.lineTo(m + 10, m + 36);
  ctx.stroke();
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.moveTo(m - 9, m + 36);
  ctx.lineTo(m - 5, m + 36);
  ctx.lineTo(m - 7, m + 42);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(m + 5, m + 36);
  ctx.lineTo(m + 9, m + 36);
  ctx.lineTo(m + 7, m + 42);
  ctx.closePath();
  ctx.fill();

  return c;
}

function makeScorePopSprite(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 80;
  c.height = 40;
  const ctx = c.getContext('2d')!;
  ctx.font = 'bold 30px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = GREEN;
  ctx.fillText('+1', 40, 21);
  return c;
}
