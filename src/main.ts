import './style.css';
import { loadManifest, loadCandles } from './data/load.ts';
import { TF_LABELS, type StockMeta, type Timeframe } from './data/manifest.ts';
import { buildLevel, type Obstacle } from './game/level.ts';
import { createGame, stepGame, tapGame, type GameState } from './game/state.ts';
import { startLoop } from './game/loop.ts';
import { Renderer } from './game/render.ts';
import * as audio from './game/audio.ts';
import { createPicker } from './ui/picker.ts';
import { createHud } from './ui/hud.ts';
import { createLanding } from './ui/landing.ts';
import { getBest, setBest } from './ui/storage.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const uiRoot = document.querySelector<HTMLElement>('#ui')!;
const renderer = new Renderer(canvas);

function fitCanvas() {
  renderer.resize(window.innerWidth, window.innerHeight);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

let toastTimer = 0;
function showToast(msg: string) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'alert');
  t.textContent = msg;
  uiRoot.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.remove(), 3500);
}

type Screen = 'landing' | 'picker' | 'game';

async function boot() {
  let manifest;
  try {
    manifest = await loadManifest();
  } catch {
    uiRoot.innerHTML = '<div class="death-overlay"><div class="death-card"><p>Failed to load market data.</p><button class="btn btn-primary" onclick="location.reload()">Retry</button></div></div>';
    return;
  }

  const hud = createHud(uiRoot);
  let game: GameState | null = null;
  let obstacles: Obstacle[] = [];
  let current: { stock: StockMeta; tf: Timeframe } | null = null;
  let scoreShown = -1;
  let candleShown = -1;
  let axisFmt: Intl.DateTimeFormat | null = null;

  function updateAxis(idx: number) {
    const ob = obstacles[Math.min(idx, obstacles.length - 1)];
    if (!ob || !axisFmt) return;
    hud.setDate(
      axisFmt.format(new Date(ob.candle.t * 1000)).toUpperCase(),
      `₹${ob.candle.c.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
    );
  }

  // ---- screen navigation (landing -> picker -> game), synced to browser history
  const HASH: Record<Screen, string> = { landing: '#', picker: '#stocks', game: '#play' };

  function applyScreen(s: Screen) {
    landing[s === 'landing' ? 'show' : 'hide']();
    if (s === 'picker') picker.show(); else picker.hide();
    if (s !== 'game') {
      game = null;
      hud.setIdle(true);
      hud.hideOverlays();
    }
  }

  function goTo(s: Screen) {
    applyScreen(s);
    history.pushState({ s }, '', HASH[s]);
  }

  window.addEventListener('popstate', (e) => {
    const s: Screen = (e.state?.s as Screen) ?? 'landing';
    if (s === 'game') {
      // forward-button back into the game: restart the round if a stock is loaded
      if (current) { applyScreen('game'); startRound(); }
      else { applyScreen('picker'); history.replaceState({ s: 'picker' }, '', HASH.picker); }
      return;
    }
    applyScreen(s);
  });

  const landing = createLanding(uiRoot, () => {
    audio.unlock();
    audio.sfxStart();
    goTo('picker');
  });

  const picker = createPicker(uiRoot, manifest, async (stock, tf) => {
    audio.unlock();
    try {
      const candles = await loadCandles(stock.symbol, tf);
      obstacles = buildLevel(candles);
      current = { stock, tf };
      const intraday = tf === '15m' || tf === '1h';
      axisFmt = new Intl.DateTimeFormat('en-IN', {
        day: '2-digit', month: 'short',
        ...(intraday ? { hour: '2-digit', minute: '2-digit', hour12: false } : { year: 'numeric' }),
      });
      hud.setStock(`${stock.symbol} · ${TF_LABELS[tf]}`);
      goTo('game');
      startRound();
    } catch {
      showToast(`Couldn't load ${stock.symbol} — check your connection and retry`);
      picker.show();
    }
  });

  history.replaceState({ s: 'landing' }, '', HASH.landing);
  applyScreen('landing');

  function startRound() {
    game = createGame(obstacles);
    scoreShown = -1;
    candleShown = -1;
    hud.setScore(0);
    updateAxis(0);
    hud.setIdle(false);
    hud.showReady();
    audio.sfxStart();
  }

  function onDeath(g: GameState) {
    if (!current) return;
    const { stock, tf } = current;
    const prevBest = getBest(stock.symbol, tf);
    setBest(stock.symbol, tf, g.score);
    const at = g.deadAt;
    const survivedAll = at === null;
    const isNewBest = g.score > prevBest && g.score > 0;
    const dateLabel = at
      ? new Date(at.candle.t * 1000).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short',
          year: 'numeric', ...(tf === '15m' || tf === '1h' ? { hour: '2-digit', minute: '2-digit' } : {}),
        })
      : '';
    audio.sfxDeath();
    if (isNewBest || survivedAll) audio.sfxBest();
    hud.showDeath({
      score: g.score,
      best: Math.max(prevBest, g.score),
      isNewBest,
      dateLabel,
      price: at ? at.candle.c : null,
      survivedAll,
    });
  }

  hud.onRestart(() => startRound());
  hud.onChangeStock(() => history.back());
  hud.onBack(() => history.back());
  hud.setMuted(audio.isMuted());
  hud.onMute(() => hud.setMuted(audio.toggleMute()));

  const loop = startLoop(
    (dt) => {
      renderer.tick(dt);
      if (!game) return;
      const before = game.phase;
      stepGame(game, dt);
      if (before === 'playing' && game.phase === 'dead') {
        if (game.deadAt !== null) renderer.onDeath(game.bird.y);
        onDeath(game);
      }
      if (game.score !== scoreShown) {
        if (scoreShown >= 0 && game.phase === 'playing') {
          renderer.onScore(game.bird.y);
          audio.sfxScore();
        }
        scoreShown = game.score;
        hud.setScore(scoreShown);
      }
      if (game.nextObstacle !== candleShown) {
        candleShown = game.nextObstacle;
        updateAxis(candleShown);
      }
    },
    (alpha) => { if (game) renderer.draw(game, alpha); },
  );

  // Tab-switch protection: pause on hidden; if mid-run, stay paused until the
  // player taps again (spec: no unfair deaths on resume).
  let suspended = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      loop.setPaused(true);
      if (game?.phase === 'playing') { suspended = true; hud.showReady(); }
    } else if (!suspended) {
      loop.setPaused(false);
    }
  });

  function tap() {
    if (!game || game.phase === 'dead') return;
    audio.unlock();
    if (suspended) {
      suspended = false;
      hud.hideOverlays();
      loop.setPaused(false);
      tapGame(game); // flap on resume so the bird doesn't just drop
      renderer.onFlap(game.bird.y);
      audio.sfxFlap();
      return;
    }
    if (game.phase === 'ready') hud.hideOverlays();
    tapGame(game);
    if (game.phase === 'playing') {
      renderer.onFlap(game.bird.y);
      audio.sfxFlap();
    }
  }
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); tap(); });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      tap();
    }
  });
}

boot();
