<script lang="ts">
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { Tween } from 'svelte/motion';
  import { onMount } from 'svelte';
  import type { DeathInfo } from '../lib/app.svelte.ts';
  import { fmtPct, fmtPrice, linePath } from '../lib/format.ts';
  import { prefersReducedMotion } from '../lib/motion.ts';
  import { canCopyImage } from '../render/postcard.ts';
  import type { Fighter } from '../render/fighters.ts';
  import Icon from './Icon.svelte';
  import FighterChip from './FighterChip.svelte';

  let { info, label, onretry, onstocks, onshare, oncopy, sharing, index = false, fighter, onfighter }: {
    info: DeathInfo;
    label: string;
    onretry: () => void;
    onstocks: () => void;
    onshare: () => void;
    oncopy: () => void;
    sharing: boolean;
    index?: boolean;
    fighter: Fighter;
    onfighter: (f: Fighter) => void;
  } = $props();

  const W = 300, H = 64;
  const copyable = canCopyImage();
  const shown = new Tween(0, { duration: prefersReducedMotion() ? 0 : 700, easing: cubicOut });
  let retry: HTMLButtonElement;
  onMount(() => {
    shown.target = info.score;
    retry.focus({ preventScroll: true });
  });

  const path = $derived(linePath(info.chart, W, H, 4));
  const at = $derived.by(() => {
    const n = info.chart.length;
    const i = Math.min(n - 1, Math.round(info.at * (n - 1)));
    return { x: (i / Math.max(1, n - 1)) * W, y: 4 + (1 - (info.chart[i] ?? 0.5)) * (H - 8) };
  });

  /** Blur-and-rise in: the card condenses out of the haze. */
  function condense(_: Element, { duration = 520 } = {}) {
    return {
      duration,
      css: (t: number) => {
        const e = cubicOut(t);
        return `opacity:${e};transform:translateY(${(1 - e) * 22}px) scale(${0.96 + 0.04 * e});filter:blur(${(1 - e) * 10}px)`;
      },
    };
  }
</script>

<div class="overlay" transition:fade={{ duration: 260 }}>
  <div class="card panel glass-strong" role="dialog" in:condense aria-labelledby="death-title">
    <div class="head">
      <h2 id="death-title">{info.title}</h2>
      <FighterChip value={fighter} onchange={onfighter} />
    </div>

    <div class="scoreline">
      <span class="score">{Math.round(shown.current)}</span>
      <span class="unit">{info.score === 1 ? 'candle' : 'candles'}<br />survived</span>
      {#if info.isNewBest}
        <span class="pill">New best</span>
      {:else}
        <span class="best data">Best {info.best}</span>
      {/if}
    </div>

    <div class="chart">
      <svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" aria-hidden="true">
        <defs><clipPath id="run"><rect x="-2" y="-4" width={at.x + 2} height={H + 8} /></clipPath></defs>
        <path d={path} class="after" />
        <path d={path} class="run" clip-path="url(#run)" />
      </svg>
      <span class="mark" class:up={info.up} class:down={!info.up} style="left: {(at.x / W) * 100}%; top: {(at.y / H) * 100}%"></span>
    </div>

    <p class="move data">
      {#if info.noRun}
        Never got past {fmtPrice(info.price, index)}
      {:else}
        {fmtPrice(info.startPrice, index)} → {fmtPrice(info.price, index)}
        <span class:up={info.up} class:down={!info.up}>{fmtPct(info.changePct)}</span>
      {/if}
    </p>
    <p class="span data"><span>{label}</span><span>{info.noRun ? info.date : `${info.startDate} – ${info.date}`}</span></p>

    <div class="actions">
      <button class="btn-primary" type="button" bind:this={retry} onclick={onretry}><Icon name="retry" size={18} />Fly again</button>
      <div class="row" class:three={copyable}>
        <button class="btn-glass" type="button" onclick={onshare} disabled={sharing}><Icon name="share" size={17} />{sharing ? 'Preparing…' : 'Share'}</button>
        {#if copyable}<button class="btn-glass" type="button" onclick={oncopy}><Icon name="copy" size={17} />Copy</button>{/if}
        <button class="btn-glass" type="button" onclick={onstocks}>Charts</button>
      </div>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0; display: grid; place-items: center; padding: var(--gutter);
    background: radial-gradient(120% 80% at 50% 60%, rgba(12, 6, 24, 0.15), rgba(12, 6, 24, 0.55));
  }
  .card { padding-top: 22px; }
  .card > :not(.actions) { margin-inline: 4px; }
  .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  h2 { font-family: var(--font-display); font-weight: 400; font-size: 27px; line-height: 1.1; letter-spacing: -0.015em; text-wrap: balance; }
  .scoreline { display: flex; align-items: center; gap: 12px; }
  .score { font-family: var(--font-display); font-size: 92px; line-height: 0.85; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
  .unit { font-size: 14px; line-height: 1.3; color: var(--cream-2); font-weight: 500; }
  .best { margin-left: auto; font-size: 13px; color: var(--cream-3); }
  .pill {
    margin-left: auto; padding: 7px 12px; border-radius: 999px;
    background: rgba(143, 240, 196, 0.14); border: 1px solid rgba(143, 240, 196, 0.4); color: var(--jade);
    font-weight: 700; font-size: 13px;
  }
  .chart { position: relative; padding: 4px 0; }
  svg { width: 100%; height: 64px; display: block; overflow: visible; }
  path { fill: none; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
  .after { stroke: rgba(255, 238, 226, 0.24); stroke-width: 1.4; stroke-dasharray: 2 5; }
  .run { stroke: var(--cream); stroke-width: 2; }
  .mark {
    position: absolute; width: 14px; height: 14px; margin: -3px 0 0 -7px; border-radius: 50%;
    border: 2px solid currentColor; background: var(--plum-900);
  }
  .move { font-size: 13px; color: var(--cream); display: flex; flex-wrap: wrap; gap: 4px 10px; }
  .span { font-size: 12px; color: var(--cream-3); margin-top: -8px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 12px; }
  .actions { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
  .actions .btn-primary { width: 100%; }
  .row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .row.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .row .btn-glass { padding: 0 10px; }
</style>
