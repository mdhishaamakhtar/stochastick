import type { Manifest, StockMeta, Timeframe } from '../data/manifest.ts';
import { TIMEFRAMES, TF_LABELS } from '../data/manifest.ts';
import { getBest } from './storage.ts';

export function createPicker(
  root: HTMLElement,
  manifest: Manifest,
  onPick: (stock: StockMeta, tf: Timeframe) => void,
) {
  const el = document.createElement('div');
  el.className = 'picker';
  const tickerItems = manifest.stocks
    .map((s) => {
      const up = (s.spark[s.spark.length - 1] ?? 0) >= (s.spark[0] ?? 0);
      return `${s.symbol} <span class="${up ? 'up' : 'down'}">${up ? '▲' : '▼'}</span>`;
    })
    .join('<span class="sep">·</span>');
  el.innerHTML = `
    <div class="ticker-tape" aria-hidden="true"><span class="ticker-track">${tickerItems}<span class="sep">·</span>${tickerItems}<span class="sep">·</span></span></div>
    <div class="picker-head">
      <h1 class="logo">
        <svg class="logo-mark" width="40" height="40" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <path d="M20 15 Q8 10 10 1.5 Q17 8 28 9.5 L28 15 Z" fill="#f2ead8"/>
          <path d="M32 11 L22 13 Q12 19 12 30 Q12 45 23 51 Q28 54 32 54 Z" fill="#22d68e"/>
          <circle cx="47" cy="11" r="7.5" fill="#ff5964"/>
          <circle cx="47" cy="11" r="3.2" fill="#0a0b13"/>
          <path d="M32 11 L42 13 Q52 19 52 30 Q52 45 41 51 Q36 54 32 54 Z" fill="#ff5964"/>
          <line x1="32" y1="10" x2="32" y2="55" stroke="#0a0b13" stroke-width="2.4"/>
          <path d="M16 24 L26 28.5" stroke="#0a0b13" stroke-width="3.4" stroke-linecap="round"/>
          <path d="M48 24 L38 28.5" stroke="#0a0b13" stroke-width="3.4" stroke-linecap="round"/>
          <circle cx="22.5" cy="32" r="2.7" fill="#0a0b13"/>
          <circle cx="41.5" cy="32" r="2.7" fill="#0a0b13"/>
          <ellipse cx="25" cy="45" rx="2.1" ry="3" transform="rotate(-16 25 45)" fill="#0a0b13"/>
          <ellipse cx="39" cy="45" rx="2.1" ry="3" transform="rotate(16 39 45)" fill="#0a0b13"/>
        </svg>
        <span>STOCHAST<span class="logo-tick">ICK</span></span>
      </h1>
      <p class="tagline">Flappy bird on real stock candles. <span class="up">Survive the chart.</span></p>
      <input class="search" type="search" placeholder="Search stocks…" autocomplete="off" aria-label="Search stocks" />
      <div class="tf-row"></div>
    </div>
    <div class="stock-list"></div>
  `;
  root.appendChild(el);

  const search = el.querySelector<HTMLInputElement>('.search')!;
  const tfRow = el.querySelector<HTMLElement>('.tf-row')!;
  const list = el.querySelector<HTMLElement>('.stock-list')!;
  let tf: Timeframe = '1d';

  for (const t of TIMEFRAMES) {
    const b = document.createElement('button');
    b.className = 'pill';
    b.textContent = TF_LABELS[t];
    b.dataset.tf = t;
    b.onclick = () => { tf = t; renderTfs(); renderList(); };
    tfRow.appendChild(b);
  }

  function renderTfs() {
    tfRow.querySelectorAll<HTMLButtonElement>('.pill').forEach((b) => {
      b.classList.toggle('active', b.dataset.tf === tf);
    });
  }

  function drawSpark(canvas: HTMLCanvasElement, spark: number[]) {
    const dpr = Math.min(devicePixelRatio || 1, 3);
    canvas.width = 60 * dpr; canvas.height = 24 * dpr;
    canvas.style.width = '60px'; canvas.style.height = '24px';
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const up = (spark[spark.length - 1] ?? 0) >= (spark[0] ?? 0);
    ctx.strokeStyle = up ? '#22d68e' : '#ff5964';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    spark.forEach((v, i) => {
      const x = (i / (spark.length - 1 || 1)) * 58 + 1;
      const y = 22 - (v / 99) * 20;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  function renderList() {
    const q = search.value.trim().toLowerCase();
    list.textContent = '';
    for (const s of manifest.stocks) {
      if (!s.tfs[tf]) continue;
      if (q && !s.symbol.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q)) continue;
      const best = getBest(s.symbol, tf);
      const row = document.createElement('button');
      row.className = 'stock-row';
      row.innerHTML = `
        <span class="stock-names"><span class="stock-sym">${s.symbol}</span><span class="stock-name">${s.name}</span></span>
        <canvas class="spark" width="60" height="24"></canvas>
        <span class="stock-best">${best > 0 ? `★ ${best}` : ''}</span>
      `;
      drawSpark(row.querySelector('canvas')!, s.spark);
      // Stay visible while candles load; main.ts hides the picker once the
      // new round is actually ready (prevents a stale-frame flash).
      row.onclick = () => { row.classList.add('loading'); onPick(s, tf); };
      list.appendChild(row);
    }
    if (!list.hasChildNodes()) {
      const empty = document.createElement('p');
      empty.className = 'picker-empty';
      empty.textContent = `No stocks match “${search.value.trim()}”`;
      list.appendChild(empty);
    }
  }

  search.oninput = renderList;
  renderTfs();
  renderList();

  function show() { el.style.display = 'flex'; renderList(); }
  function hide() { el.style.display = 'none'; }
  return { show, hide };
}
