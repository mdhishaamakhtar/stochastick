<script lang="ts">
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { app, type Screen } from './lib/app.svelte.ts';
  import { Engine } from './lib/engine.ts';
  import { loadManifest } from './data/load.ts';
  import { TF_LABELS, type StockMeta, type Timeframe } from './data/manifest.ts';
  import { fmtPct, fmtPrice } from './lib/format.ts';
  import { setFighter } from './lib/storage.ts';
  import * as audio from './game/audio.ts';
  import { drawRunCard, shareCanvas, copyCanvas } from './render/postcard.ts';
  import type { Fighter } from './render/fighters.ts';
  import Landing from './ui/Landing.svelte';
  import Picker from './ui/Picker.svelte';
  import Hud from './ui/Hud.svelte';
  import DeathCard from './ui/DeathCard.svelte';

  let skyCanvas: HTMLCanvasElement;
  let sceneCanvas: HTMLCanvasElement;
  let engine: Engine;
  let toast = $state('');
  let sharing = $state(false);
  let toastTimer = 0;

  const HASH: Record<Screen, string> = { landing: '', picker: '#charts', game: '#fly' };

  function say(msg: string) {
    toast = msg;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (toast = ''), 3600);
  }

  function go(s: Screen) {
    app.screen = s;
    history.pushState({ s }, '', HASH[s] || location.pathname);
  }

  onMount(() => {
    engine = new Engine(skyCanvas, sceneCanvas);
    history.replaceState({ s: 'landing' }, '', location.pathname);
    loadManifest()
      .then((m) => { app.manifest = m; return engine.startDemo(); })
      .catch(() => { app.failed = true; });

    const onPop = (e: PopStateEvent) => {
      const s: Screen = e.state?.s ?? 'landing';
      if (s === 'game') {
        if (!engine.resumePlay()) { history.replaceState({ s: 'picker' }, '', HASH.picker); app.screen = 'picker'; return; }
        app.screen = 'game';
        return;
      }
      app.loading = null; // abandon any chart still loading
      if (app.screen === 'game') { app.death = null; void engine.startDemo(); }
      app.screen = s;
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  });

  async function pick(stock: StockMeta, tf: Timeframe) {
    audio.unlock();
    app.loading = stock.symbol;
    try {
      const candles = await engine.load(stock, tf);
      // only start if the player is still waiting on this exact chart
      if (app.screen !== 'picker' || app.loading !== stock.symbol) return;
      engine.play(stock, tf, candles);
      go('game');
    } catch {
      if (app.loading === stock.symbol) say(`Couldn't load ${stock.symbol}. Check your connection and try again.`);
    } finally {
      if (app.loading === stock.symbol) app.loading = null;
    }
  }

  function chooseFighter(f: Fighter) {
    app.fighter = f;
    setFighter(f);
    engine.setFighter(f);
  }

  function toggleMute() {
    audio.unlock();
    app.muted = audio.toggleMute();
  }

  function runCard() {
    const d = app.death!, stock = app.stock!;
    return drawRunCard({
      score: d.score,
      stock: stock.name,
      timeframe: TF_LABELS[app.tf],
      title: d.survivedAll ? 'Flew the whole chart' : `Rekt on ${d.date}`,
      move: `${fmtPrice(d.startPrice, stock.index)} → ${fmtPrice(d.price, stock.index)}  ${fmtPct(d.changePct)}`,
      up: d.up,
      chart: d.chart,
      at: d.at,
      fighter: app.fighter,
    });
  }

  function copy() {
    if (!app.death || !app.stock) return;
    // no await before the clipboard write: Safari requires it inside the click
    copyCanvas(runCard())
      .then(() => say('Run card copied. Paste it into any chat.'))
      .catch(() => say("Couldn't copy the image. Try Share instead."));
  }

  async function share() {
    const d = app.death;
    if (!d || !app.stock || sharing) return;
    sharing = true;
    try {
      const how = await shareCanvas(await runCard(), `stochastick-${app.stock.symbol.toLowerCase()}-${d.score}.png`);
      if (how === 'saved') say('Run card saved to your downloads.');
    } catch {
      say("Couldn't make the share card. Try again.");
    } finally {
      sharing = false;
    }
  }

  function onKey(e: KeyboardEvent) {
    if (app.screen !== 'game') return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.isContentEditable)) return;
    if (app.death) {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyR') {
        if (t?.tagName === 'BUTTON' && e.code !== 'KeyR') return; // let a focused button act
        e.preventDefault();
        engine.restart();
      }
      return;
    }
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      engine.tap();
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<canvas class="layer sky" bind:this={skyCanvas} aria-hidden="true"></canvas>
<canvas
  class="layer scene"
  bind:this={sceneCanvas}
  aria-label={app.screen === 'game' ? 'Game. Tap, click or press Space to fly.' : undefined}
  aria-hidden={app.screen !== 'game'}
  onpointerdown={(e) => { if (app.screen === 'game') { e.preventDefault(); engine.tap(); } }}
></canvas>

<div class="ui">
  {#if app.failed}
    <div class="failed panel glass-strong">
      <h2>The market data didn't load</h2>
      <p>Check your connection, then try again.</p>
      <button class="btn-primary" type="button" onclick={() => location.reload()}>Try again</button>
    </div>
  {:else if app.screen === 'landing'}
    <Landing onplay={() => go('picker')} onfighter={chooseFighter} onmute={toggleMute} />
  {:else if app.screen === 'picker'}
    <Picker onpick={pick} onback={() => history.back()} />
  {:else if app.screen === 'game'}
    <Hud onback={() => history.back()} onmute={toggleMute} onfighter={chooseFighter} />
    {#if app.death}
      <DeathCard info={app.death} {sharing} index={app.stock?.index} fighter={app.fighter} onfighter={chooseFighter} onretry={() => engine.restart()} onstocks={() => history.back()} onshare={share} oncopy={copy} />
    {/if}
  {/if}

  {#if toast}
    <p class="toast glass-strong" role="status" transition:fly={{ y: 12, duration: 240 }}>{toast}</p>
  {/if}
</div>

<style>
  .failed {
    position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: min(var(--w-panel), calc(100% - 2 * var(--gutter))); text-align: center;
  }
  .failed h2 { font-family: var(--font-display); font-weight: 400; font-size: 26px; }
  .failed p { color: var(--cream-2); margin-bottom: 8px; }
  .toast {
    position: fixed; left: 50%; bottom: max(24px, env(safe-area-inset-bottom)); transform: translateX(-50%);
    padding: 14px var(--pad); border-radius: var(--r-control); font-size: 14px; font-weight: 500;
    width: max-content; max-width: min(var(--w-panel), calc(100% - 2 * var(--gutter))); text-align: center;
  }
</style>
