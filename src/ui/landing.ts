import { makeBullSprite, makeBearSprite, type Fighter } from '../game/render.ts';

export function createLanding(root: HTMLElement, onStart: (fighter: Fighter) => void) {
  const el = document.createElement('div');
  el.className = 'landing';
  el.innerHTML = `
    <div class="landing-inner">
      <h1 class="landing-logo">STOCHAST<span class="logo-tick">ICK</span></h1>
      <p class="landing-tag">Flappy bird on real stock candles.</p>
      <p class="landing-sub">Pick a stock. Its actual price history becomes the level — every candle a real day on Dalal Street. <span class="up">Survive the chart.</span></p>
      <p class="landing-choose">Choose your fighter</p>
      <div class="fighter-row">
        <button class="fighter fighter-bull" data-fighter="bull">
          <canvas width="256" height="256" aria-hidden="true"></canvas>
          <span class="fighter-name">BULL</span>
          <span class="fighter-sub">rides the rally</span>
        </button>
        <button class="fighter fighter-bear" data-fighter="bear">
          <canvas width="256" height="256" aria-hidden="true"></canvas>
          <span class="fighter-name">BEAR</span>
          <span class="fighter-sub">outlives the crash</span>
        </button>
      </div>
      <p class="landing-hint">tap to flap · dodge the candles · outlive the crash</p>
    </div>
    <p class="landing-foot">54 NSE stocks &amp; indices · 4 timeframes · data via Yahoo Finance · not financial advice</p>
  `;
  root.appendChild(el);

  const sprites: Record<Fighter, HTMLCanvasElement> = {
    bull: makeBullSprite(2),
    bear: makeBearSprite(2),
  };
  for (const btn of el.querySelectorAll<HTMLButtonElement>('.fighter')) {
    const kind = btn.dataset.fighter as Fighter;
    btn.querySelector('canvas')!.getContext('2d')!.drawImage(sprites[kind], 0, 0, 256, 256);
    btn.onclick = () => onStart(kind);
  }

  return {
    show() { el.style.display = 'flex'; },
    hide() { el.style.display = 'none'; },
  };
}
