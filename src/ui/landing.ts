import { makeBullSprite } from '../game/render.ts';

export function createLanding(root: HTMLElement, onStart: () => void) {
  const el = document.createElement('div');
  el.className = 'landing';
  el.innerHTML = `
    <div class="landing-inner">
      <canvas class="landing-bull" width="128" height="128" aria-hidden="true"></canvas>
      <h1 class="landing-logo">STOCHAST<span class="logo-tick">ICK</span></h1>
      <p class="landing-tag">Flappy bird on real stock candles.</p>
      <p class="landing-sub">Pick a stock. Its actual price history becomes the level — every candle a real day on Dalal Street. <span class="up">Survive the chart.</span></p>
      <button class="btn btn-primary landing-cta">Pick a stock ▸</button>
      <p class="landing-hint">tap to flap · dodge the candles · outlive the crash</p>
    </div>
    <p class="landing-foot">54 NSE stocks &amp; indices · 4 timeframes · data via Yahoo Finance · not financial advice</p>
  `;
  root.appendChild(el);

  const bullCanvas = el.querySelector<HTMLCanvasElement>('.landing-bull')!;
  bullCanvas.getContext('2d')!.drawImage(makeBullSprite(), 0, 0, 128, 128);
  el.querySelector<HTMLButtonElement>('.landing-cta')!.onclick = onStart;

  return {
    show() { el.style.display = 'flex'; },
    hide() { el.style.display = 'none'; },
  };
}
