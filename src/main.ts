import './style.css';
import { loadManifest, loadCandles } from './data/load.ts';
import { TF_LABELS, type StockMeta, type Timeframe } from './data/manifest.ts';
import { buildLevel, type Obstacle } from './game/level.ts';
import { createGame, stepGame, tapGame, type GameState } from './game/state.ts';
import { startLoop } from './game/loop.ts';
import { Renderer } from './game/render.ts';
import { createPicker } from './ui/picker.ts';
import { createHud } from './ui/hud.ts';
import { getBest, setBest } from './ui/storage.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const uiRoot = document.querySelector<HTMLElement>('#ui')!;
const renderer = new Renderer(canvas);

function fitCanvas() {
  renderer.resize(window.innerWidth, window.innerHeight);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

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

  const picker = createPicker(uiRoot, manifest, async (stock, tf) => {
    try {
      const candles = await loadCandles(stock.symbol, tf);
      obstacles = buildLevel(candles);
      current = { stock, tf };
      hud.setStock(`${stock.symbol} · ${TF_LABELS[tf]}`);
      startRound();
    } catch {
      picker.show();
    }
  });

  function startRound() {
    game = createGame(obstacles);
    scoreShown = -1;
    hud.setScore(0);
    hud.showReady();
  }

  function onDeath(g: GameState) {
    if (!current) return;
    const { stock, tf } = current;
    const prevBest = getBest(stock.symbol, tf);
    setBest(stock.symbol, tf, g.score);
    const at = g.deadAt;
    const survivedAll = at === null;
    const dateLabel = at
      ? new Date(at.candle.t * 1000).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short',
          year: 'numeric', ...(tf === '15m' || tf === '1h' ? { hour: '2-digit', minute: '2-digit' } : {}),
        })
      : '';
    hud.showDeath({
      score: g.score,
      best: Math.max(prevBest, g.score),
      isNewBest: g.score > prevBest && g.score > 0,
      dateLabel,
      price: at ? at.candle.c : null,
      survivedAll,
    });
  }

  hud.onRestart(() => startRound());
  hud.onChangeStock(() => { game = null; hud.hideOverlays(); picker.show(); });

  const loop = startLoop(
    (dt) => {
      if (!game) return;
      const before = game.phase;
      stepGame(game, dt);
      if (before === 'playing' && game.phase === 'dead') onDeath(game);
      if (game.score !== scoreShown) { scoreShown = game.score; hud.setScore(scoreShown); }
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
    if (suspended) {
      suspended = false;
      hud.hideOverlays();
      loop.setPaused(false);
      tapGame(game); // flap on resume so the bird doesn't just drop
      return;
    }
    if (game.phase === 'ready') hud.hideOverlays();
    tapGame(game);
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
