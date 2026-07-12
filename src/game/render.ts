import type { GameState } from './state.ts';
import type { Obstacle } from './level.ts';
import { WORLD_H, BIRD_X, BIRD_R, OBSTACLE_HALF_W, PHYS_DT } from './constants.ts';

const BG = '#0b0e14';
const GRID = '#1e2635';
const GREEN = '#22c58b';
const GREEN_DIM = '#17303a';
const RED = '#f0505a';
const RED_DIM = '#3a2030';
const GOLD = '#f5b83d';
const GOLD_DARK = '#b8860b';
const WHITE = '#e6edf7';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale = 1;
  private bull: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.bull = makeBullSprite();
  }

  resize(cssW: number, cssH: number): void {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.scale = (cssH / WORLD_H) * dpr;
  }

  draw(g: GameState, alpha: number): void {
    const { ctx } = this;
    const s = this.scale;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // price gridlines
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

    // obstacles in view
    for (const ob of g.obstacles) {
      const x = ob.x - scroll;
      if (x < -OBSTACLE_HALF_W * 2) continue;
      if (x > viewW + OBSTACLE_HALF_W * 2) break;
      drawCandlePair(ctx, ob, x);
    }

    // bird (interpolate y one physics step for smoothness)
    const by = g.bird.y + g.bird.vy * (alpha * PHYS_DT);
    ctx.save();
    ctx.translate(BIRD_X, by);
    ctx.rotate(g.bird.rot);
    ctx.drawImage(this.bull, -BIRD_R * 1.4, -BIRD_R * 1.4, BIRD_R * 2.8, BIRD_R * 2.8);
    ctx.restore();
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

  // horns
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(m - 18, m - 26);
  ctx.quadraticCurveTo(m - 34, m - 52, m - 10, m - 54);
  ctx.moveTo(m + 26, m - 20);
  ctx.quadraticCurveTo(m + 24, m - 52, m + 46, m - 44);
  ctx.stroke();

  // body
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.ellipse(m, m, 44, 38, 0, 0, Math.PI * 2);
  ctx.fill();

  // snout
  ctx.fillStyle = GOLD_DARK;
  ctx.beginPath();
  ctx.ellipse(m + 26, m + 12, 18, 13, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2a10';
  ctx.beginPath();
  ctx.arc(m + 32, m + 12, 2.6, 0, Math.PI * 2);
  ctx.arc(m + 24, m + 15, 2.6, 0, Math.PI * 2);
  ctx.fill();

  // eye
  ctx.fillStyle = '#0b0e14';
  ctx.beginPath();
  ctx.arc(m + 14, m - 12, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.arc(m + 16, m - 14, 2, 0, Math.PI * 2);
  ctx.fill();

  // wing (little chart-arrow wing)
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(m - 30, m + 4);
  ctx.lineTo(m - 12, m - 8);
  ctx.lineTo(m - 2, m + 2);
  ctx.stroke();

  return c;
}
