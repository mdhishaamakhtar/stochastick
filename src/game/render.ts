import type { GameState } from './state.ts';
import type { Obstacle } from './level.ts';
import { WORLD_H, BIRD_X, BIRD_R, OBSTACLE_HALF_W, PHYS_DT } from './constants.ts';

const BG = '#0b0e14';
const GRID = '#1e2635';
const GREEN = '#22c58b';
const GREEN_DIM = '#12362b';
const RED = '#f0505a';
const RED_DIM = '#3d1f28';
const GOLD = '#f5b83d';
const WHITE = '#e6edf7';

const GRID_SPACING = 160; // vertical time-gridline spacing, world units
const PARALLAX = 0.5;
const HAZARD_BAND = 14; // world units of red fade at the kill edges

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
  private scorePop: HTMLCanvasElement;
  private bgGrad: CanvasGradient | null = null;

  private pool: Particle[] = [];
  private flapT = 0;
  private deathFlash = 0;
  private popT = 0; // remaining life of the "+1" pop
  private popY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.bull = makeBullSprite();
    this.scorePop = makeScorePopSprite();
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, ttl: 1, size: 4, color: GOLD });
    }
  }

  resize(cssW: number, cssH: number): void {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.scale = (cssH / WORLD_H) * dpr;
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grad.addColorStop(0, '#0e1220');
    grad.addColorStop(0.5, BG);
    grad.addColorStop(1, '#090b10');
    this.bgGrad = grad;
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
    this.spawn(3, BIRD_X - 16, y + 10, -90, 40, 60, 90, 0.35, 3, GOLD);
  }

  onScore(y: number): void {
    this.popT = 0.7;
    this.popY = y - 34;
  }

  onDeath(y: number): void {
    this.deathFlash = 0.55;
    this.spawn(10, BIRD_X, y, 0, 0, 260, 200, 0.75, 6, RED);
    this.spawn(9, BIRD_X, y, 0, 0, 220, 180, 0.7, 5, GOLD);
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
    ctx.fillStyle = this.bgGrad ?? BG;
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

    // kill-zone edges: thin red hazard bands top and bottom
    ctx.fillStyle = RED;
    ctx.globalAlpha = 0.08;
    ctx.fillRect(0, 0, viewW, HAZARD_BAND);
    ctx.fillRect(0, WORLD_H - HAZARD_BAND, viewW, HAZARD_BAND);
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, 0, viewW, 2);
    ctx.fillRect(0, WORLD_H - 2, viewW, 2);
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
    ctx.drawImage(this.bull, -BIRD_R * 1.4, -BIRD_R * 1.4, BIRD_R * 2.8, BIRD_R * 2.8);
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

  // bottom pillar: body from floor up, wick pointing into the gap
  ctx.fillStyle = dim;
  ctx.fillRect(x - OBSTACLE_HALF_W, botStart, w, WORLD_H - botStart);
  ctx.fillStyle = body;
  ctx.fillRect(x - OBSTACLE_HALF_W, botStart, w, 6); // rim
  ctx.fillRect(x - 3, botStart - wick, 6, wick); // wick
  ctx.strokeStyle = body;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - OBSTACLE_HALF_W + 1, botStart + 1, w - 2, WORLD_H - botStart - 2);

  // top pillar (inverted)
  ctx.fillStyle = dim;
  ctx.fillRect(x - OBSTACLE_HALF_W, 0, w, topEnd);
  ctx.fillStyle = body;
  ctx.fillRect(x - OBSTACLE_HALF_W, topEnd - 6, w, 6);
  ctx.fillRect(x - 3, topEnd, 6, wick);
  ctx.strokeStyle = body;
  ctx.strokeRect(x - OBSTACLE_HALF_W + 1, 1, w - 2, topEnd - 2);
}

function makeBullSprite(): HTMLCanvasElement {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const m = size / 2;
  const HIDE = '#e0a832'; // main coat
  const HIDE_DARK = '#a8741c'; // shading / muzzle
  const HORN = '#f2ead8';

  // --- horns: thick crescents sweeping up-out from the temples
  ctx.strokeStyle = HORN;
  ctx.lineCap = 'round';
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(m - 20, m - 22);
  ctx.quadraticCurveTo(m - 42, m - 34, m - 38, m - 56);
  ctx.moveTo(m + 20, m - 22);
  ctx.quadraticCurveTo(m + 42, m - 34, m + 38, m - 56);
  ctx.stroke();
  // horn tips (taper)
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(m - 38, m - 54);
  ctx.lineTo(m - 34, m - 62);
  ctx.moveTo(m + 38, m - 54);
  ctx.lineTo(m + 34, m - 62);
  ctx.stroke();

  // --- ears: small drooped ovals below/outside the horns
  ctx.fillStyle = HIDE_DARK;
  ctx.beginPath();
  ctx.ellipse(m - 34, m - 8, 11, 7, -0.5, 0, Math.PI * 2);
  ctx.ellipse(m + 34, m - 8, 11, 7, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // --- head: broad forehead tapering into the jaw
  ctx.fillStyle = HIDE;
  ctx.beginPath();
  ctx.moveTo(m - 28, m - 30);
  ctx.quadraticCurveTo(m, m - 44, m + 28, m - 30); // crown
  ctx.quadraticCurveTo(m + 40, m - 12, m + 30, m + 16); // right cheek
  ctx.quadraticCurveTo(m + 18, m + 40, m, m + 42); // chin
  ctx.quadraticCurveTo(m - 18, m + 40, m - 30, m + 16); // left cheek
  ctx.quadraticCurveTo(m - 40, m - 12, m - 28, m - 30);
  ctx.fill();

  // --- forelock tuft between the horns
  ctx.fillStyle = HIDE_DARK;
  ctx.beginPath();
  ctx.ellipse(m, m - 34, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- muzzle: big lighter-band lower half with nostrils
  ctx.fillStyle = HIDE_DARK;
  ctx.beginPath();
  ctx.ellipse(m, m + 22, 26, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  // nostrils: angled dark slits (separate paths — no connector line)
  ctx.fillStyle = '#2b1f0d';
  ctx.beginPath();
  ctx.ellipse(m - 11, m + 21, 4, 6, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(m + 11, m + 21, 4, 6, 0.35, 0, Math.PI * 2);
  ctx.fill();
  // mouth line
  ctx.strokeStyle = '#2b1f0d';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(m - 6, m + 33);
  ctx.quadraticCurveTo(m, m + 36, m + 6, m + 33);
  ctx.stroke();

  // --- eyes: determined — dark pupils under angled brows (separate paths)
  ctx.fillStyle = '#0b0e14';
  ctx.beginPath();
  ctx.arc(m - 14, m - 6, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(m + 14, m - 6, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.arc(m - 12.5, m - 8, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(m + 15.5, m - 8, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // brows: angled in toward the nose (charging face)
  ctx.strokeStyle = HIDE_DARK;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(m - 22, m - 18);
  ctx.lineTo(m - 8, m - 13);
  ctx.moveTo(m + 22, m - 18);
  ctx.lineTo(m + 8, m - 13);
  ctx.stroke();

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
