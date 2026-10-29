<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { app } from '../lib/app.svelte.ts';
  import { TIMEFRAMES, type StockMeta, type Timeframe } from '../data/manifest.ts';
  import { fmtPct, fmtPrice, linePath } from '../lib/format.ts';
  import { getBest } from '../lib/storage.ts';
  import Icon from './Icon.svelte';

  let { onpick, onback }: { onpick: (s: StockMeta, tf: Timeframe) => void; onback: () => void } = $props();

  const TF_SHORT: Record<Timeframe, string> = { '15m': '15m', '1h': '1h', '1d': 'Daily', '1wk': 'Weekly' };
  const TF_NOTE: Record<Timeframe, string> = {
    '15m': 'Last 60 days, 15-minute candles',
    '1h': 'Last 2 years, hourly candles',
    '1d': 'Last 5 years, daily candles',
    '1wk': 'Last 10 years, weekly candles',
  };

  let tf = $state<Timeframe>(app.tf);
  let query = $state('');

  const stocks = $derived(app.manifest?.stocks ?? []);
  const visible = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return stocks.filter((s) => s.tfs[tf] && (!q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)));
  });
  // best scores for this timeframe, read once rather than per row per keystroke
  const bests = $derived(new Map(stocks.map((s) => [s.symbol, getBest(s.symbol, tf)])));
  const groups = $derived([
    { title: 'Indices', items: visible.filter((s) => s.index) },
    { title: 'Nifty 50 stocks', items: visible.filter((s) => !s.index) },
  ].filter((g) => g.items.length));

  function random() {
    const pool = stocks.filter((s) => s.tfs[tf]);
    const s = pool[Math.floor(Math.random() * pool.length)];
    if (s) onpick(s, tf);
  }
</script>

<div class="scrim" transition:fade={{ duration: 220 }}></div>
<section class="sheet glass-strong" aria-label="Pick a chart" in:fly={{ y: 40, duration: 520, easing: cubicOut }} out:fly={{ y: 30, duration: 220 }}>
  <header>
    <button class="icon-btn" type="button" aria-label="Back" onclick={onback}><Icon name="back" /></button>
    <h2>Pick a chart</h2>
    <button class="btn-glass pill random" type="button" onclick={random}><Icon name="shuffle" size={18} />Surprise me</button>
  </header>

  <div class="controls">
    <label class="search">
      <Icon name="search" size={18} />
      <input type="search" placeholder="Search 54 stocks and indices" bind:value={query} autocomplete="off" spellcheck="false" aria-label="Search stocks" />
    </label>
    <div class="track tfs" role="radiogroup" aria-label="Timeframe">
      {#each TIMEFRAMES as t (t)}
        <button type="button" role="radio" aria-checked={tf === t} class:on={tf === t} onclick={() => (tf = t)}>{TF_SHORT[t]}</button>
      {/each}
    </div>
    <p class="note">{TF_NOTE[tf]}</p>
  </div>

  <div class="list">
    {#each groups as g (g.title)}
      <h3>{g.title}</h3>
      {#each g.items as s (s.symbol)}
        {@const best = bests.get(s.symbol) ?? 0}
        {@const up = (s.chg ?? 0) >= 0}
        <button type="button" class="row" class:loading={app.loading === s.symbol} disabled={!!app.loading} onclick={() => onpick(s, tf)}>
          <span class="id">
            <span class="symline"><span class="sym data">{s.symbol}</span>{#if best}<span class="best">Best {best}</span>{/if}</span>
            <span class="name">{s.name}</span>
          </span>
          <svg class="spark" viewBox="0 0 72 28" preserveAspectRatio="none" aria-hidden="true">
            <path d={linePath(s.spark.map((v) => v / 99), 72, 28, 3)} class:up class:down={!up} />
          </svg>
          <span class="quote">
            {#if s.last}<span class="data px">{fmtPrice(s.last, s.index)}</span>{/if}
            {#if s.chg !== undefined}<span class="data chg" class:up class:down={!up}>{fmtPct(s.chg)}</span>{/if}
          </span>
        </button>
      {/each}
    {:else}
      <p class="empty">Nothing matches “{query.trim()}”. Try a ticker like TCS or a name like Infosys.</p>
    {/each}
  </div>
</section>

<style>
  .scrim { position: fixed; inset: 0; background: linear-gradient(180deg, rgba(12, 6, 24, 0.1), rgba(12, 6, 24, 0.45)); }
  .sheet {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    top: max(12px, env(safe-area-inset-top));
    border-radius: var(--r-panel) var(--r-panel) 0 0;
    border-bottom: 0;
    display: flex; flex-direction: column;
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  header { display: flex; align-items: center; gap: var(--gap); padding: var(--pad) var(--pad) 0; }
  h2 { font-family: var(--font-display); font-weight: 400; font-size: 30px; letter-spacing: -0.02em; line-height: 1; flex: 1; }

  .controls { padding: var(--gap) var(--pad) 0; display: flex; flex-direction: column; gap: var(--gap); }
  .search {
    display: flex; align-items: center; gap: 10px; height: var(--h-control); padding: 0 14px;
    border-radius: var(--r-control); background: rgba(255, 238, 226, 0.07); border: 1px solid var(--line);
    color: var(--cream-3);
    transition: border-color 160ms var(--ease), background-color 160ms var(--ease);
  }
  .search:focus-within { border-color: rgba(255, 178, 140, 0.6); background: rgba(255, 238, 226, 0.1); }
  .search input { flex: 1; min-width: 0; background: none; border: 0; outline: none; font-size: 16px; color: var(--cream); caret-color: var(--rim); }
  .search input::placeholder { color: var(--cream-3); }
  .search input::-webkit-search-cancel-button { display: none; }

  .tfs button { height: calc(var(--h-control) - 8px); font-weight: 600; font-size: 14px; color: var(--cream-3); transition: background-color 160ms var(--ease), color 160ms var(--ease); }
  .tfs button:hover { color: var(--cream); }
  .tfs button.on { background: var(--cream); color: #2a1236; }
  .note { font-size: 12.5px; color: var(--cream-3); padding: 0 4px; margin-top: -4px; }

  .list { flex: 1; overflow-y: auto; padding: 4px calc(var(--pad) - 8px) max(var(--pad), env(safe-area-inset-bottom)); -webkit-overflow-scrolling: touch; }
  h3 { font-size: 12.5px; font-weight: 600; color: var(--cream-3); padding: 20px 8px 6px; }
  .row {
    width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) 64px 96px; align-items: center; gap: 12px;
    min-height: 64px; padding: 8px; border-radius: var(--r-control); text-align: left;
    transition: background-color 140ms var(--ease), opacity 160ms var(--ease);
  }
  .row:hover { background: var(--glass-hover); }
  .row:active { background: var(--glass-press); }
  .row:disabled { cursor: default; }
  .row:disabled:not(.loading) { opacity: 0.5; }
  .row.loading { background: var(--glass-press); }
  .row.loading .sym::after { content: ''; display: inline-block; width: 6px; height: 6px; margin-left: 8px; border-radius: 50%; background: var(--rim); vertical-align: middle; animation: pulse 0.8s ease-in-out infinite alternate; }
  @keyframes pulse { to { opacity: 0.2; } }
  .id { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .sym { font-weight: 600; font-size: 14px; color: var(--cream); }
  .name { font-size: 13px; color: var(--cream-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .symline { display: flex; align-items: baseline; gap: 8px; }
  .best { font-size: 12px; font-weight: 600; color: var(--rim); white-space: nowrap; }
  .spark { width: 64px; height: 28px; overflow: visible; }
  .spark path { fill: none; stroke-width: 1.6; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
  .spark path.up { stroke: var(--jade); }
  .spark path.down { stroke: var(--coral); }
  .quote { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
  .px { font-size: 13px; color: var(--cream); }
  .chg { font-size: 12px; }
  .empty { padding: 40px 16px; text-align: center; color: var(--cream-3); font-size: 15px; line-height: 1.5; }

  @media (max-width: 380px) {
    .random { width: var(--h-icon); padding: 0; font-size: 0; gap: 0; }
    .row { grid-template-columns: minmax(0, 1fr) 52px 88px; gap: 8px; }
    .spark { width: 52px; }
  }
  @media (min-width: 720px) {
    .sheet {
      left: 50%; right: auto; width: var(--w-sheet); transform: translateX(-50%);
      top: 6vh; bottom: 6vh; border-radius: var(--r-panel); border-bottom: 1px solid var(--line);
    }
  }
</style>
