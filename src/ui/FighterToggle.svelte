<script lang="ts">
  import type { Fighter } from '../render/fighters.ts';
  import { paintFighter } from './paint.ts';

  let { value, onchange }: { value: Fighter; onchange: (f: Fighter) => void } = $props();
  const options: Array<{ id: Fighter; name: string; line: string }> = [
    { id: 'bull', name: 'Bull', line: 'Charges the rally' },
    { id: 'bear', name: 'Bear', line: 'Outlives the crash' },
  ];
</script>

<div class="track" role="radiogroup" aria-label="Choose your fighter">
  {#each options as o (o.id)}
    <button
      type="button"
      role="radio"
      aria-checked={value === o.id}
      class:on={value === o.id}
      onclick={() => onchange(o.id)}
    >
      <canvas use:paintFighter={o.id} aria-hidden="true"></canvas>
      <span class="text">
        <span class="name">{o.name}</span>
        <span class="line">{o.line}</span>
      </span>
    </button>
  {/each}
</div>

<style>
  button {
    display: flex; align-items: center; gap: 10px;
    min-height: 64px; padding: 8px 10px;
    text-align: left;
    transition: background-color 200ms var(--ease), box-shadow 200ms var(--ease);
  }
  button:hover { background: var(--glass-hover); }
  button.on {
    background: rgba(255, 238, 226, 0.15);
    box-shadow: inset 0 0 0 1px rgba(255, 226, 210, 0.22), 0 6px 18px rgba(12, 4, 20, 0.25);
  }
  canvas {
    width: 46px; height: 46px; flex: none;
    transition: transform 260ms var(--ease), opacity 200ms var(--ease), filter 200ms var(--ease);
    opacity: 0.55; filter: saturate(0.6);
  }
  button.on canvas { opacity: 1; filter: none; transform: rotate(-6deg) scale(1.06); }
  .text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .name { font-weight: 700; font-size: 16px; color: var(--cream-2); }
  button.on .name { color: var(--cream); }
  .line { font-size: 12.5px; line-height: 1.3; color: var(--cream-3); text-wrap: balance; }
</style>
