<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/app.svelte.ts';
  import { fmtPrice } from '../lib/format.ts';
  import type { Fighter } from '../render/fighters.ts';
  import FighterToggle from './FighterToggle.svelte';
  import Icon from './Icon.svelte';

  let { onplay, onfighter, onmute }: {
    onplay: () => void;
    onfighter: (f: Fighter) => void;
    onmute: () => void;
  } = $props();

  const count = $derived(app.manifest?.stocks.length ?? 54);
</script>

<main class="landing" out:fade={{ duration: 180 }}>
  <button class="icon-btn mute" type="button" aria-label={app.muted ? 'Turn sound on' : 'Mute sound'} onclick={onmute}>
    <Icon name={app.muted ? 'muted' : 'sound'} />
  </button>

  <section class="hero" in:fly={{ y: 16, duration: 900, easing: cubicOut }}>
    <h1>Stochastick</h1>
    <p>Flappy Bird, flown through real Indian stock charts. Every candle is a real trading day.</p>
  </section>

  <section class="panel glass" in:fly={{ y: 28, duration: 900, delay: 120, easing: cubicOut }}>
    <div class="now">
      <span class="live" aria-hidden="true"></span>
      <span class="data">{app.demo.name || 'NIFTY 50'}</span>
      <span class="data dim">{app.demo.date}</span>
      {#if app.demo.price}
        <span class="data px" class:up={app.demo.up} class:down={!app.demo.up}>{fmtPrice(app.demo.price, true)}</span>
      {/if}
    </div>
    <FighterToggle value={app.fighter} onchange={onfighter} />
    <button class="btn-primary" type="button" onclick={onplay}>Pick a chart</button>
    <p class="foot">{count} NSE stocks &amp; indices · 4 timeframes · Data from Yahoo Finance · Not investment advice</p>
  </section>
</main>

<style>
  .landing {
    position: fixed; inset: 0;
    display: grid;
    grid-template-rows: 1fr auto;
    padding: max(var(--pad), env(safe-area-inset-top)) var(--gutter) max(var(--pad), env(safe-area-inset-bottom));
    pointer-events: none;
  }
  .landing > * { pointer-events: auto; }
  .mute { position: absolute; top: max(var(--pad), env(safe-area-inset-top)); right: var(--gutter); }

  .hero { align-self: start; text-align: center; padding-top: clamp(40px, 9vh, 96px); pointer-events: none; }
  h1 {
    font-family: var(--font-display); font-weight: 400;
    font-size: clamp(56px, 15.5vw, 136px); line-height: 0.95; letter-spacing: -0.035em;
    color: var(--cream);
    text-shadow: 0 2px 30px rgba(20, 8, 30, 0.3);
  }
  .hero p {
    margin: 16px auto 0; max-width: 30ch;
    font-size: clamp(16px, 1.4vw, 19px); line-height: 1.45; font-weight: 500;
    color: var(--cream-2);
    text-shadow: 0 1px 14px rgba(20, 8, 30, 0.45);
    text-wrap: balance;
  }

  .panel { justify-self: center; }
  .panel .btn-primary { width: 100%; }
  .now { display: flex; align-items: center; gap: 8px; padding: 0 4px; font-size: 12px; min-width: 0; }
  .now .dim { color: var(--cream-3); }
  .now .px { margin-left: auto; }
  .live {
    width: 7px; height: 7px; border-radius: 50%; background: var(--rim); flex: none;
    box-shadow: 0 0 0 3px rgba(255, 178, 140, 0.18);
    animation: live 2.4s var(--ease) infinite;
  }
  @keyframes live { 50% { box-shadow: 0 0 0 6px rgba(255, 178, 140, 0); } }

  .foot {
    text-align: center; padding: 0 4px;
    font-size: 11.5px; line-height: 1.5; color: var(--cream-3);
    text-wrap: balance;
  }

  @media (min-width: 900px) {
    .hero { padding-top: 10vh; }
  }
</style>
