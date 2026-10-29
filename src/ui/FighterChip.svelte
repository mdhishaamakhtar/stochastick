<script lang="ts">
  import type { Fighter } from '../render/fighters.ts';
  import Icon from './Icon.svelte';
  import { paintFighter } from './paint.ts';

  /** A small round swap button showing the current fighter. */
  let { value, onchange }: { value: Fighter; onchange: (f: Fighter) => void } = $props();
  const other = $derived<Fighter>(value === 'bull' ? 'bear' : 'bull');
</script>

<button class="chip" type="button" aria-label="Fly as the {other} instead" title="Switch to {other}"
  onclick={(e) => { e.currentTarget.blur(); onchange(other); }}>
  <canvas use:paintFighter={value} aria-hidden="true"></canvas>
  <span class="swap" aria-hidden="true"><Icon name="shuffle" size={9} /></span>
</button>

<style>
  .chip {
    position: relative; flex: none;
    width: 36px; height: 36px; border-radius: 50%;
    display: grid; place-items: center;
    background: rgba(28, 12, 40, 0.5);
    -webkit-backdrop-filter: var(--frost); backdrop-filter: var(--frost);
    border: 1px solid var(--line);
    pointer-events: auto;
    transition: border-color 160ms var(--ease), transform 120ms var(--ease);
  }
  .chip:hover { border-color: var(--line-2); }
  .chip:active { transform: scale(0.94); }
  canvas { width: 24px; height: 24px; }
  .swap {
    position: absolute; right: -3px; bottom: -3px; width: 15px; height: 15px; border-radius: 50%;
    display: grid; place-items: center; background: var(--cream); color: #2a1236;
  }
</style>
