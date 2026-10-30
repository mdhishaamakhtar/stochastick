import { loadCandles } from '../data/load.ts';
import type { StockMeta, Timeframe } from '../data/manifest.ts';
import type { Candle } from '../data/types.ts';
import { PHYS_DT } from '../game/constants.ts';
import { buildLevel, type Obstacle } from '../game/level.ts';
import { createGame, stepGame, tapGame, type GameState } from '../game/state.ts';
import { startLoop } from '../game/loop.ts';
import { shouldFlap } from '../game/autopilot.ts';
import * as audio from '../game/audio.ts';
import { Sky } from '../render/sky.ts';
import { Scene } from '../render/scene.ts';
import { computeView, sunY, type View } from '../render/view.ts';
import type { Fighter } from '../render/fighters.ts';
import { app } from './app.svelte.ts';
import { downsample, fmtDate } from './format.ts';
import { onReducedMotionChange, prefersReducedMotion } from './motion.ts';
import { getBest, setBest } from './storage.ts';

const DEMO_SYMBOL = 'NIFTY50';
const DEMO_TF: Timeframe = '1d';

/**
 * Owns the canvases and the clock. In demo mode an autopilot flies a random
 * stretch of NIFTY 50 behind the landing page and picker; in play mode the
 * player flies the chosen chart. Writes what the UI needs into `app`.
 */
export class Engine {
  private sky: Sky;
  private scene: Scene;
  private view!: View;
  private game: GameState | null = null;
  private level: Obstacle[] = [];
  private candles: Candle[] = [];
  private mode: 'demo' | 'play' = 'demo';
  private demoCandles: Candle[] = [];
  private demoRestart = 0;
  private flapCooldown = 0;
  private deathTimer = 0;
  private time = 0;
  private sun = 0.55;
  private suspended = false;
  /** reduced motion: the demo is a still frame, so the clock stays stopped */
  private demoHeld = false;
  private loop: ReturnType<typeof startLoop>;
  private shownScore = -1;
  private shownCandle = -1;

  constructor(skyCanvas: HTMLCanvasElement, sceneCanvas: HTMLCanvasElement) {
    this.sky = new Sky(skyCanvas);
    this.scene = new Scene(sceneCanvas);
    this.scene.setFighter(app.fighter);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.loop = startLoop((dt) => this.update(dt), (a) => this.render(a));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.loop.setPaused(true);
        if (this.mode === 'play' && this.game?.phase === 'playing') this.suspended = true;
      } else if (!this.suspended) {
        this.loop.setPaused(this.demoHeld);
      } else {
        app.paused = true; // shows the "tap to fly" prompt; the run is still live
        this.render(0);
      }
    });
    onReducedMotionChange(() => {
      if (this.mode === 'demo' && this.demoCandles.length) void this.startDemo();
    });
  }

  resize(): void {
    this.view = computeView(window.innerWidth, window.innerHeight);
    this.sky.resize(this.view.w, this.view.h);
    this.scene.resize(this.view);
    if (this.game) this.render(0);
  }

  setFighter(f: Fighter): void {
    this.scene.setFighter(f);
    if (this.demoHeld) this.render(0);
  }

  // ---- demo ---------------------------------------------------------------

  async startDemo(): Promise<void> {
    this.mode = 'demo';
    if (!this.demoCandles.length) {
      const candles = await loadCandles(DEMO_SYMBOL, DEMO_TF);
      if (this.mode !== 'demo') return; // a real game started while this loaded
      this.demoCandles = candles;
    }
    this.suspended = false;
    this.demoHeld = prefersReducedMotion();
    this.loop.setPaused(this.demoHeld);
    const n = this.demoCandles.length;
    const start = Math.floor(Math.random() * Math.max(1, n - 260));
    this.useLevel(this.demoCandles.slice(start));
    this.game = createGame(this.level);
    tapGame(this.game);
    const name = app.manifest?.stocks.find((s) => s.symbol === DEMO_SYMBOL)?.name ?? 'NIFTY 50';
    app.demo.name = name;
    this.shownCandle = -1;
    if (this.demoHeld) this.holdDemo();
  }

  /** Fly a few seconds unseen so candles fill the frame, then show that one frame. */
  private holdDemo(): void {
    for (let i = 0; i < 480 && this.game?.phase === 'playing'; i++) this.update(PHYS_DT);
    this.render(0);
  }

  // ---- play ---------------------------------------------------------------

  /** Fetch a chart without touching game state, so the caller can still
   *  decide not to play it (the player may have navigated away meanwhile). */
  load(stock: StockMeta, tf: Timeframe): Promise<Candle[]> {
    return loadCandles(stock.symbol, tf);
  }

  play(stock: StockMeta, tf: Timeframe, candles: Candle[]): void {
    this.candles = candles;
    app.stock = stock;
    app.tf = tf;
    app.chart = downsample(candles.map((c) => c.c), 180);
    this.resumePlay();
  }

  /** Re-enter the last loaded chart (also used by the browser's Forward button). */
  resumePlay(): boolean {
    if (!this.candles.length) return false;
    this.mode = 'play';
    this.useLevel(this.candles);
    this.restart();
    return true;
  }

  restart(): void {
    if (this.mode !== 'play') return;
    this.game = createGame(this.level);
    this.scene.reset();
    this.suspended = false;
    this.demoHeld = false;
    app.paused = false;
    this.loop.setPaused(false);
    this.deathTimer = 0;
    this.shownScore = -1;
    this.shownCandle = -1;
    app.death = null;
    app.phase = 'ready';
    app.score = 0;
    app.best = app.stock ? getBest(app.stock.symbol, app.tf) : 0;
    this.syncCandle(0);
    audio.sfxStart();
  }

  tap(): void {
    const g = this.game;
    if (this.mode !== 'play' || !g || g.phase === 'dead') return;
    audio.unlock();
    if (this.suspended) {
      this.suspended = false;
      app.paused = false;
      this.loop.setPaused(false);
    }
    tapGame(g);
    app.phase = g.phase;
    this.scene.onFlap(g.bird.y);
    audio.sfxFlap();
  }

  private useLevel(candles: Candle[]): void {
    this.level = buildLevel(candles);
    this.scene.setLevel(this.level);
    this.scene.reset();
  }

  // ---- loop ---------------------------------------------------------------

  private update(dt: number): void {
    this.time += dt;
    this.scene.tick(dt);
    const g = this.game;
    if (!g) return;

    if (this.mode === 'demo') {
      this.flapCooldown -= dt;
      if (g.phase === 'playing' && this.flapCooldown <= 0 && shouldFlap(g)) {
        tapGame(g);
        this.scene.onFlap(g.bird.y);
        this.flapCooldown = 0.16;
      }
    }

    const before = g.phase;
    stepGame(g, dt);
    const ob = g.obstacles[Math.min(g.nextObstacle, g.obstacles.length - 1)];
    if (ob) this.sun += (0.12 + 0.82 * ob.norm - this.sun) * Math.min(1, dt * 0.9);

    if (before === 'playing' && g.phase === 'dead') {
      if (g.deadAt) this.scene.onDeath(g.bird.y, g.bird.rot);
      if (this.mode === 'play') {
        audio.sfxDeath();
        this.deathTimer = 0.75;
        app.phase = 'dead';
      } else {
        this.demoRestart = 1.4;
      }
    }

    if (this.mode === 'demo') {
      if (g.nextObstacle !== this.shownCandle) {
        this.shownCandle = g.nextObstacle;
        const c = g.obstacles[Math.min(g.nextObstacle, g.obstacles.length - 1)]?.candle;
        if (c) { app.demo.date = fmtDate(c.t, DEMO_TF); app.demo.price = c.c; app.demo.up = c.c >= c.o; }
      }
      if (g.phase === 'dead') {
        this.demoRestart -= dt;
        if (this.demoRestart <= 0) void this.startDemo();
      }
      return;
    }

    if (g.score !== this.shownScore) {
      if (this.shownScore >= 0 && g.phase === 'playing') audio.sfxScore(g.score);
      this.shownScore = g.score;
      app.score = g.score;
    }
    if (g.nextObstacle !== this.shownCandle) this.syncCandle(g.nextObstacle);

    if (this.deathTimer > 0) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.finish(g);
    }
  }

  private syncCandle(i: number): void {
    const g = this.game;
    if (!g) return;
    this.shownCandle = i;
    const ob = g.obstacles[Math.min(i, g.obstacles.length - 1)];
    if (!ob) return;
    app.date = fmtDate(ob.candle.t, app.tf);
    app.price = ob.candle.c;
    app.up = ob.bull;
    app.progress = Math.min(1, i / Math.max(1, g.obstacles.length - 1));
  }

  private finish(g: GameState): void {
    const stock = app.stock;
    if (!stock) return;
    const prevBest = getBest(stock.symbol, app.tf);
    setBest(stock.symbol, app.tf, g.score);
    const survivedAll = g.deadAt === null;
    const end = g.deadAt ?? g.obstacles[g.obstacles.length - 1]!;
    const first = g.obstacles[0]!;
    const isNewBest = g.score > prevBest && g.score > 0;
    if (isNewBest || survivedAll) audio.sfxBest();
    app.best = Math.max(prevBest, g.score);
    app.date = fmtDate(end.candle.t, app.tf);
    app.price = end.candle.c;
    app.up = end.bull;
    // Frame the run, not the whole history: what you flew, plus a glimpse of
    // what came next, so even a short run reads as a line on the card.
    const shown = Math.min(this.candles.length, end.index + Math.max(12, Math.round(end.index * 0.5)) + 1);
    const chart = downsample(this.candles.slice(0, shown).map((c) => c.c), 140);
    app.death = {
      score: g.score,
      best: app.best,
      isNewBest,
      survivedAll,
      date: fmtDate(end.candle.t, app.tf),
      price: end.candle.c,
      startDate: fmtDate(first.candle.t, app.tf),
      startPrice: first.candle.c,
      changePct: (end.candle.c / first.candle.c - 1) * 100,
      chart,
      at: end.index / Math.max(1, shown - 1),
      up: end.candle.c >= first.candle.c,
      shownAt: performance.now(),
    };
  }

  private render(alpha: number): void {
    const g = this.game;
    const v = this.view;
    const drift = g ? g.scrollX * 0.00012 : 0;
    // ambient motion only: stars, clouds and the idle bob hold still
    const time = prefersReducedMotion() ? 0 : this.time;
    this.sky.render(time, this.sun, v.ground, drift, v.sunX, sunY(v, this.sun), v.sunR);
    if (g) this.scene.draw(g, alpha, time, this.sun);
  }
}
