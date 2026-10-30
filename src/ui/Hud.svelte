<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/app.svelte.ts';
  import { fmtPrice, linePath } from '../lib/format.ts';
  import { TF_LABELS, tierFor } from '../data/manifest.ts';
  import type { Fighter } from '../render/fighters.ts';
  import Icon from './Icon.svelte';
  import FighterChip from './FighterChip.svelte';

  // Buttons drop focus after a click so Space keeps meaning "flap", never
  // re-activating whichever control was clicked last.
  let { onback, onmute, onfighter }: {
    onback: () => void;
    onmute: () => void;
    onfighter: (f: Fighter) => void;
  } = $props();

  const W = 300, H = 30;
  let chartW = $state(W);
  const tier = $derived(tierFor(app.stock, app.tf));
  const path = $derived(linePath(app.chart, W, H, 3));
  const head = $derived.by(() => {
    const n = app.chart.length;
    if (!n) return { x: 0, y: H / 2 };
    const i = Math.min(n - 1, Math.round(app.progress * (n - 1)));
    return { x: (i / Math.max(1, n - 1)) * W, y: 3 + (1 - app.chart[i]!) * (H - 6) };
  });
</script>

<div class="hud" transition:fade={{ duration: 200 }}>
  <div class="top">
    <button class="icon-btn" type="button" aria-label="Back to charts" onclick={(e) => { e.currentTarget.blur(); onback(); }}><Icon name="back" /></button>
    <div class="scoreblock" class:gone={app.death}>
      {#key app.score}<span class="score">{app.score}</span>{/key}
      <span class="label data">{app.stock?.symbol ?? ''} · {TF_LABELS[app.tf]}{tier ? ` · ${tier}` : ''}</span>
    </div>
    <button class="icon-btn" type="button" aria-label={app.muted ? 'Turn sound on' : 'Mute sound'} onclick={(e) => { e.currentTarget.blur(); onmute(); }}>
      <Icon name={app.muted ? 'muted' : 'sound'} />
    </button>
  </div>

  {#if (app.phase === 'ready' || app.paused) && !app.death}
    <div class="ready" transition:fly={{ y: 8, duration: 300, easing: cubicOut }}>
      <p class="prompt"><span class="touch">Tap to fly</span><span class="mouse">Click or press Space to fly</span></p>
      <!-- the fighter can be swapped before a run, never mid-flight -->
      {#if !app.paused}<FighterChip value={app.fighter} onchange={onfighter} />{/if}
    </div>
  {/if}

  <div class="strip panel glass" class:gone={app.death}>
    <div class="row">
      <span class="data date">{app.date}</span>
      <span class="data px" class:up={app.up} class:down={!app.up}>{app.price ? fmtPrice(app.price, app.stock?.index) : ''}</span>
    </div>
    <div class="chart" bind:clientWidth={chartW}>
    <svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <clipPath id="flown"><rect x="0" y="-4" width={head.x} height={H + 8} /></clipPath>
      </defs>
      <path d={path} class="ahead" />
      <path d={path} class="flown" clip-path="url(#flown)" />
    </svg>
    <span class="head" style="translate: {(head.x / W) * chartW}px {head.y}px"></span>
    </div>
  </div>
</div>

<style>
  /* above the death card's scrim, so back, sound and fighter stay reachable;
     the score and chart step aside because the card repeats them */
  /* Blur over a canvas that changes every frame is the most expensive thing
     a phone can do, so the HUD trades frost for denser plum during play. */
  .hud { position: fixed; inset: 0; pointer-events: none; z-index: 2; --frost: none; --glass: rgba(28, 12, 40, 0.66); }
  .hud button { pointer-events: auto; }
  .top {
    position: absolute; left: var(--gutter); right: var(--gutter); top: max(var(--pad), env(safe-area-inset-top));
    display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  }
  /* Pinned to the screen's centre, independent of how many buttons sit on
     either side. The label sits below the 44px button row, so it can run wide. */
  .scoreblock {
    position: absolute; left: 50%; top: 2px; transform: translateX(-50%);
    width: max-content; max-width: 100%;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    pointer-events: none;
  }
  .scoreblock, .strip { transition: opacity 200ms var(--ease); }
  .gone { opacity: 0; }
  .score {
    font-family: var(--font-display); font-size: clamp(72px, 9vw, 104px); line-height: 0.9; letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    color: var(--cream);
    text-shadow: 0 3px 28px rgba(20, 8, 30, 0.4);
    animation: bump 260ms var(--ease);
  }
  @keyframes bump { from { transform: scale(1.12); } }
  .label {
    font-size: 11.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--cream-2);
    text-shadow: 0 1px 12px rgba(20, 8, 30, 0.6);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
  }

  .ready {
    position: absolute; left: 50%; bottom: calc(max(var(--pad), env(safe-area-inset-bottom)) + 104px);
    transform: translateX(-50%);
    display: flex; align-items: center; gap: 8px;
  }
  .prompt {
    height: var(--h-icon); display: flex; align-items: center;
    padding: 0 20px; border-radius: calc(var(--h-icon) / 2);
    background: var(--glass);
    -webkit-backdrop-filter: var(--frost); backdrop-filter: var(--frost);
    border: 1px solid var(--line);
    font-weight: 600; font-size: 16px; white-space: nowrap;
    animation: breathe 2.2s ease-in-out infinite;
  }
  @keyframes breathe { 50% { border-color: rgba(255, 178, 140, 0.55); } }
  .mouse { display: none; }
  @media (hover: hover) and (pointer: fine) { .touch { display: none; } .mouse { display: inline; } }

  .strip {
    position: absolute; left: 50%; transform: translateX(-50%);
    bottom: max(var(--pad), env(safe-area-inset-bottom));
    width: min(var(--w-panel), calc(100% - 2 * var(--gutter)));
    gap: 8px; box-shadow: none;
  }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-size: 12.5px; padding: 0 4px; }
  .date { color: var(--cream-2); }
  .chart { position: relative; }
  svg { width: 100%; height: 30px; display: block; overflow: visible; }
  path { fill: none; stroke-width: 1.5; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
  .ahead { stroke: rgba(255, 238, 226, 0.25); }
  .flown { stroke: var(--cream); }
  .head {
    position: absolute; width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; border-radius: 50%; left: 0; top: 0;
    background: var(--cream);
    box-shadow: 0 0 0 4px rgba(255, 178, 140, 0.28), 0 2px 8px rgba(12, 4, 20, 0.4);
    transition: translate 220ms var(--ease);
  }
</style>
