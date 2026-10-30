import type { GameState } from '../game/state.ts';
import type { Obstacle } from '../game/level.ts';
import {
  BIRD_X, OBSTACLE_HALF_W, PHYS_DT, SCROLL_SPEED, FOG_NEAR, FOG_FAR, WORLD_H, GRAVITY,
} from '../game/constants.ts';
import { prefersReducedMotion } from '../lib/motion.ts';
import { renderFighter, type Fighter } from './fighters.ts';
import type { View } from './view.ts';

const JADE = '#8ff0c4';
const CORAL = '#ff9d8f';
const CREAM = '#fff3e6';
const HEAD_W = 58; // fighter head width, world units

interface Mote { x: number; y: number; vx: number; vy: number; life: number; ttl: number; r: number; color: string }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const rgba = (r: number, g: number, b: number, a: number) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;

function glowSprite(color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return c;
}

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  maxDpr = 2;
  private v!: View;
  private fighter: Fighter = 'bull';
  private sprite: HTMLCanvasElement | null = null;
  private heights: number[] = [];
  private glow = { jade: glowSprite('rgba(143,240,196,0.75)'), coral: glowSprite('rgba(255,157,143,0.75)'), cream: glowSprite('rgba(255,236,220,0.8)') };

  private motes: Mote[] = Array.from({ length: 96 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, ttl: 1, r: 2, color: CREAM }));
  private flapT = 0;
  private flashT = 0;
  private shakeT = 0;
  private fall: { y: number; vy: number; rot: number; vr: number } | null = null;
  // Built once per size in local coordinates and placed with translate(),
  // so drawing a candle allocates nothing per frame.
  private bodyGrad: Record<'left' | 'right', CanvasGradient> | null = null;
  private bandGrad: Record<'up' | 'down', CanvasGradient> | null = null;
  private fogFar: CanvasGradient | null = null;
  private fogNear: CanvasGradient | null = null;
  private groundFill: CanvasGradient | null = null;
  private groundGlow: CanvasGradient | null = null;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  resize(v: View): void {
    this.v = v;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    this.canvas.width = Math.round(v.w * this.dpr);
    this.canvas.height = Math.round(v.h * this.dpr);
    this.sprite = null;
    const w = OBSTACLE_HALF_W * 2 * v.scale;
    const body = (lit: 'left' | 'right') => {
      const g = this.ctx.createLinearGradient(0, 0, w, 0);
      const [a, b, c] = lit === 'left' ? ['#4d2160', '#2e1239', '#1b0a25'] : ['#1b0a25', '#2e1239', '#4d2160'];
      g.addColorStop(0, a); g.addColorStop(0.45, b); g.addColorStop(1, c);
      return g;
    };
    const band = (r: number, g2: number, b: number) => {
      const g = this.ctx.createLinearGradient(0, 0, 0, 1);
      g.addColorStop(0, rgba(r, g2, b, 0.3));
      g.addColorStop(1, rgba(r, g2, b, 0));
      return g;
    };
    this.bodyGrad = { left: body('left'), right: body('right') };
    this.bandGrad = { up: band(143, 240, 196), down: band(255, 157, 143) };
    const fog = (top: number, bottom: number) => {
      const g = this.ctx.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, 'rgba(255,214,196,0)');
      g.addColorStop(0.55, 'rgba(255,214,196,1)');
      g.addColorStop(1, 'rgba(255,214,196,0)');
      return g;
    };
    this.fogFar = fog(v.ground - 300 * v.scale, v.ground - 30 * v.scale);
    this.fogNear = fog(v.ground - 120 * v.scale, v.ground + 4);
    this.groundFill = this.ctx.createLinearGradient(0, v.ground, 0, v.h);
    this.groundFill.addColorStop(0, '#22102f');
    this.groundFill.addColorStop(1, '#0d0616');
    this.groundGlow = this.ctx.createRadialGradient(v.sunX, v.ground, 0, v.sunX, v.ground, v.w * 0.5);
    this.groundGlow.addColorStop(0, 'rgba(255,186,150,1)');
    this.groundGlow.addColorStop(1, 'rgba(255,186,150,0)');
  }

  setFighter(f: Fighter): void {
    this.fighter = f;
    this.sprite = null;
  }

  /** The distant skyline is the level's own price history. */
  setLevel(obstacles: Obstacle[]): void {
    const closes = obstacles.map((o) => o.candle.c);
    const lo = Math.min(...closes), hi = Math.max(...closes);
    this.heights = closes.map((c) => (hi > lo ? (c - lo) / (hi - lo) : 0.5));
    this.fall = null;
  }

  reset(): void {
    this.fall = null;
    this.flashT = 0;
    this.shakeT = 0;
    for (const m of this.motes) m.life = 0;
  }

  tick(dt: number): void {
    if (this.flapT > 0) this.flapT -= dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.shakeT > 0) this.shakeT -= dt;
    for (const m of this.motes) {
      if (m.life <= 0) continue;
      m.life -= dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.vy += 260 * dt;
      m.vx *= 1 - dt * 1.5;
    }
    const f = this.fall;
    if (f) {
      f.vy = Math.min(f.vy + GRAVITY * 0.9 * dt, 1400);
      f.y += f.vy * dt;
      f.rot += f.vr * dt;
      const floor = WORLD_H - 22;
      if (f.y > floor) { f.y = floor; f.vy *= -0.28; f.vr *= 0.5; if (Math.abs(f.vy) < 60) f.vy = 0; }
    }
  }

  onFlap(birdY: number): void {
    this.flapT = 0.16;
    const s = this.v.scale;
    const x = (BIRD_X - 22) * s, y = this.v.offY + (birdY + 10) * s;
    this.spawn(3, x, y, -70 * s, 30 * s, 40 * s, 50 * s, 0.5, 1.6 * s + 0.6, CREAM);
  }

  onDeath(birdY: number, rot: number): void {
    const still = prefersReducedMotion();
    this.fall = { y: birdY, vy: -380, rot, vr: still ? 0 : 7 };
    if (still) return; // no shake, flash or burst: the drop and the card carry it
    this.flashT = 0.32;
    this.shakeT = 0.32;
    const s = this.v.scale;
    const x = BIRD_X * s, y = this.v.offY + birdY * s;
    this.spawn(12, x, y, 0, -60 * s, 220 * s, 220 * s, 0.9, 2.4 * s + 0.6, CREAM);
    this.spawn(8, x, y, 0, -60 * s, 200 * s, 200 * s, 0.8, 2.2 * s + 0.6, CORAL);
    this.spawn(6, x, y, 0, -60 * s, 180 * s, 180 * s, 0.7, 2 * s + 0.6, JADE);
  }

  private spawn(n: number, x: number, y: number, vx: number, vy: number, sx: number, sy: number, ttl: number, r: number, color: string): void {
    let k = 0;
    for (const m of this.motes) {
      if (k >= n) break;
      if (m.life > 0) continue;
      m.x = x; m.y = y;
      m.vx = vx + (Math.random() - 0.5) * 2 * sx;
      m.vy = vy + (Math.random() - 0.5) * 2 * sy;
      m.ttl = m.life = ttl * (0.6 + Math.random() * 0.4);
      m.r = r * (0.6 + Math.random() * 0.8);
      m.color = color;
      k++;
    }
  }

  draw(g: GameState, alpha: number, time: number, sun: number): void {
    const { ctx, v } = this;
    const s = v.scale;
    const scroll = g.scrollX + (g.phase === 'playing' ? SCROLL_SPEED * alpha * PHYS_DT : 0);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, v.w, v.h);
    if (this.shakeT > 0) {
      const a = (this.shakeT / 0.32) * 7;
      ctx.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
    }

    this.drawSkyline(scroll, sun);
    this.drawObstacles(g.obstacles, scroll, sun);
    this.drawPriceLine(g, scroll);
    this.drawMotes();
    this.drawFighter(g, alpha, time);
    this.drawGround(sun);

    if (this.flashT > 0) {
      ctx.fillStyle = `rgba(255,232,214,${(this.flashT / 0.32) * 0.35})`;
      ctx.fillRect(-20, -20, v.w + 40, v.h + 40);
    }
  }

  private drawSkyline(scroll: number, sun: number): void {
    const { ctx, v, heights } = this;
    const s = v.scale;
    const n = heights.length;
    if (!n) return;
    // Irregular, like a real skyline: each tower's width, spacing and height
    // jitter from a hash of its index, so the layer never reads as a fence.
    const hash = (j: number) => {
      const x = Math.sin(j * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    const layer = (par: number, sp: number, w: number, base: number, amp: number, stride: number, offset: number, color: string) => {
      const shift = scroll * s * par;
      const j0 = Math.floor(shift / sp) - 1;
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, 1.5 * s);
      ctx.beginPath();
      for (let j = j0; j < j0 + v.w / sp + 3; j++) {
        const r = hash(j + offset * 1000);
        const hn = heights[((j * stride + offset) % n + n) % n]!;
        const x = j * sp - shift + (r - 0.5) * sp * 0.5;
        const tw = w * (0.7 + r * 0.7);
        const hgt = (base + amp * (0.35 * hn + 0.65 * hash(j * 3 + offset))) * s;
        ctx.rect(x, v.ground - hgt, tw, hgt + 2);
        if (r > 0.35) {
          ctx.moveTo(x + tw / 2, v.ground - hgt);
          ctx.lineTo(x + tw / 2, v.ground - hgt - (6 + 10 * r) * s);
        }
      }
      ctx.fill();
      ctx.stroke();
    };
    const fog = (gr: CanvasGradient, top: number, bottom: number, a: number) => {
      ctx.globalAlpha = a;
      ctx.fillStyle = gr;
      ctx.fillRect(0, top, v.w, bottom - top);
      ctx.globalAlpha = 1;
    };
    const far = rgba(lerp(126, 172, sun), lerp(50, 72, sun), lerp(104, 122, sun), 0.6);
    const mid = rgba(lerp(66, 94, sun), lerp(26, 35, sun), lerp(70, 87, sun), 1);
    layer(0.14, 22 * s + 6, 11 * s + 2, 70, 230, 2, 0, far);
    fog(this.fogFar!, v.ground - 300 * s, v.ground - 30 * s, 0.24 + 0.1 * sun);
    layer(0.34, 46 * s + 10, 22 * s + 3, 30, 150, 3, 7, mid);
    fog(this.fogNear!, v.ground - 120 * s, v.ground + 4, 0.16 + 0.08 * sun);
  }

  private drawObstacles(obstacles: Obstacle[], scroll: number, sun: number): void {
    const { ctx, v } = this;
    const s = v.scale;
    const w = OBSTACLE_HALF_W * 2 * s;
    const rimColor = `rgba(255,178,140,${0.5 + 0.35 * sun})`;
    const top = -v.offY / s - 40; // world y of the screen top (with shake margin)
    for (const ob of obstacles) {
      const wx = ob.x - scroll;
      if (wx < -OBSTACLE_HALF_W * 2) continue;
      if (wx > FOG_FAR + OBSTACLE_HALF_W) break;
      const fade = 1 - smooth(FOG_NEAR, FOG_FAR, wx);
      if (fade <= 0) continue;
      ctx.globalAlpha = fade;

      const x0 = (wx - OBSTACLE_HALF_W) * s;
      const topEnd = v.offY + (ob.gapCenter - ob.gapHalf) * s;
      const botStart = v.offY + (ob.gapCenter + ob.gapHalf) * s;
      const r = 5 * s;
      const yTop = v.offY + top * s;
      // Light comes from the sun's side. Crossfade across a band around the
      // sun so the bright edge glides from one side to the other as a pillar
      // passes, instead of flipping in a single frame.
      const toSun = (v.sunX - (x0 + w / 2)) / (v.sunR * 2.5); // >0: sun is to the right
      const right = Math.min(1, Math.max(0, 0.5 + toSun * 0.5));
      ctx.save();
      ctx.translate(x0, 0);
      ctx.beginPath();
      ctx.roundRect(0, yTop, w, topEnd - yTop, [0, 0, r, r]);
      ctx.roundRect(0, botStart, w, v.ground - botStart + 2, [r, r, 0, 0]);
      ctx.fillStyle = this.bodyGrad!.left;
      ctx.fill();
      ctx.globalAlpha = fade * right;
      ctx.fillStyle = this.bodyGrad!.right;
      ctx.fill();
      ctx.restore();

      const rw = Math.max(1.25, 1.6 * s);
      ctx.fillStyle = rimColor;
      for (let side = 0; side < 2; side++) {
        const a = side ? 1 - right : right;
        if (a <= 0.01) continue;
        const edge = side ? x0 : x0 + w - rw;
        ctx.globalAlpha = fade * a;
        ctx.fillRect(edge, yTop, rw, topEnd - yTop - r);
        ctx.fillRect(edge, botStart + r, rw, v.ground - botStart - r);
      }
      ctx.globalAlpha = fade;

      this.drawCandle(ob, x0, w, topEnd, botStart);
      ctx.globalAlpha = 1;
    }
  }

  /** The gap-facing ends carry the real candle: body length from |close − open|,
   *  wick from the true high and low, tinted by direction. */
  private drawCandle(ob: Obstacle, x0: number, w: number, topEnd: number, botStart: number): void {
    const { ctx, v } = this;
    const s = v.scale;
    const { o, h, l, c } = ob.candle;
    const range = Math.max(h - l, 1e-9);
    const body = Math.abs(c - o) / range;
    const upper = (h - Math.max(o, c)) / range;
    const lower = (Math.min(o, c) - l) / range;
    const bandGrad = this.bandGrad![ob.bull ? 'up' : 'down'];
    const solid = ob.bull ? JADE : CORAL;
    const band = (10 + 64 * body) * s;
    const cap = Math.max(3, 4.5 * s);
    const maxWick = ob.gapHalf * 0.5 * s;
    const cx = x0 + w / 2;
    const ww = Math.max(2, 3 * s);
    const glow = ob.bull ? this.glow.jade : this.glow.coral;
    const gs = 34 * s;

    // top pillar's end: body band rising away from the gap, lower wick hanging into it
    // the band gradient runs 0→1, so scale it to this candle's body length
    ctx.save();
    ctx.translate(x0, topEnd);
    ctx.scale(1, -band);
    ctx.fillStyle = bandGrad;
    ctx.fillRect(0, 0, w, 1);
    ctx.restore();
    ctx.fillStyle = solid;
    ctx.fillRect(x0, topEnd - cap, w, cap);
    const lw = lower * maxWick;
    if (lw > 1) {
      ctx.fillRect(cx - ww / 2, topEnd, ww, lw);
      ctx.drawImage(glow, cx - gs / 2, topEnd + lw - gs / 2, gs, gs);
    }

    // bottom pillar's end
    ctx.save();
    ctx.translate(x0, botStart);
    ctx.scale(1, band);
    ctx.fillStyle = bandGrad;
    ctx.fillRect(0, 0, w, 1);
    ctx.restore();
    ctx.fillStyle = solid;
    ctx.fillRect(x0, botStart, w, cap);
    const uw = upper * maxWick;
    if (uw > 1) {
      ctx.fillRect(cx - ww / 2, botStart - uw, ww, uw);
      ctx.drawImage(glow, cx - gs / 2, botStart - uw - gs / 2, gs, gs);
    }
  }

  /** The close-to-close line threading every gap: the chart you are flying. */
  private drawPriceLine(g: GameState, scroll: number): void {
    const { ctx, v } = this;
    const s = v.scale;
    const birdX = BIRD_X * s;
    const first = Math.max(0, g.nextObstacle - 8);
    let end = first;
    while (end < g.obstacles.length && g.obstacles[end]!.x - scroll <= FOG_FAR) end++;
    if (end - first < 2) return;
    const trace = () => {
      ctx.beginPath();
      for (let i = first; i < end; i++) {
        const ob = g.obstacles[i]!;
        const x = (ob.x - scroll) * s, y = v.offY + ob.gapCenter * s;
        if (i === first) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    };

    ctx.save();
    ctx.lineWidth = Math.max(1, 1.4 * s);
    ctx.lineJoin = 'round';
    ctx.setLineDash([2 * s + 1, 6 * s + 2]);
    ctx.strokeStyle = 'rgba(255,243,230,0.32)';
    trace();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.rect(-10, 0, birdX + 10, v.h);
    ctx.clip();
    ctx.lineWidth = Math.max(1.25, 1.8 * s);
    ctx.strokeStyle = 'rgba(255,243,230,0.85)';
    trace();
    ctx.stroke();
    ctx.restore();

    const r = Math.max(1.6, 2.4 * s);
    for (let i = first; i < end; i++) {
      const ob = g.obstacles[i]!;
      const x = (ob.x - scroll) * s, y = v.offY + ob.gapCenter * s;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (x < birdX) { ctx.fillStyle = CREAM; ctx.fill(); }
      else { ctx.strokeStyle = 'rgba(255,243,230,0.45)'; ctx.lineWidth = 1; ctx.stroke(); }
    }
  }

  private drawMotes(): void {
    const { ctx } = this;
    for (const m of this.motes) {
      if (m.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, m.life / m.ttl);
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawFighter(g: GameState, alpha: number, time: number): void {
    const { ctx, v } = this;
    const s = v.scale;
    const headPx = HEAD_W * s;
    if (!this.sprite) this.sprite = renderFighter(this.fighter, headPx * this.dpr);
    const sp = this.sprite;
    const sw = (headPx * 136) / 128, sh = sw; // sprite carries a 4-unit rim pad per side

    let y: number, rot: number;
    if (this.fall) { y = this.fall.y; rot = this.fall.rot; }
    else {
      y = g.bird.y + (g.phase === 'playing' ? g.bird.vy * alpha * PHYS_DT : 0);
      if (g.phase === 'ready') y += Math.sin(time * 3) * 7;
      rot = g.bird.rot * 0.55;
    }
    const x = BIRD_X * s;
    const py = v.offY + y * s;

    if (!this.fall && g.phase === 'playing' && g.bird.vy < 0) {
      ctx.strokeStyle = 'rgba(255,243,230,0.45)';
      ctx.lineWidth = Math.max(1, 1.4 * s);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 30 * s, py - 4 * s); ctx.lineTo(x - 50 * s, py - 1 * s);
      ctx.moveTo(x - 32 * s, py + 9 * s); ctx.lineTo(x - 56 * s, py + 12 * s);
      ctx.stroke();
    }

    const sq = this.flapT > 0 ? this.flapT / 0.16 : 0;
    ctx.save();
    ctx.translate(x, py);
    ctx.rotate(rot);
    ctx.scale(1 - sq * 0.08, 1 + sq * 0.1);
    ctx.drawImage(sp, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();
  }

  private drawGround(sun: number): void {
    const { ctx, v } = this;
    if (v.ground >= v.h - 0.5) return;
    ctx.fillStyle = this.groundFill!;
    ctx.fillRect(-20, v.ground, v.w + 40, v.h - v.ground + 20);
    ctx.globalAlpha = 0.16 + 0.12 * sun;
    ctx.fillStyle = this.groundGlow!;
    ctx.fillRect(0, v.ground, v.w, Math.min(v.h - v.ground, 120));
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(255,178,140,${0.28 + 0.2 * sun})`;
    ctx.fillRect(0, v.ground, v.w, 1);
  }
}
