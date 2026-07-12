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
  el.innerHTML = `
    <div class="picker-head">
      <h1 class="logo">STOCHASTICK</h1>
      <p class="tagline">Flappy bird on real stock candles. Survive the chart.</p>
      <input class="search" type="search" placeholder="Search stocks…" autocomplete="off" />
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
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = 60 * dpr; canvas.height = 24 * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const up = (spark[spark.length - 1] ?? 0) >= (spark[0] ?? 0);
    ctx.strokeStyle = up ? '#22c58b' : '#f0505a';
    ctx.lineWidth = 1.5;
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
      row.onclick = () => { hide(); onPick(s, tf); };
      list.appendChild(row);
    }
  }

  search.oninput = renderList;
  renderTfs();
  renderList();

  function show() { el.style.display = 'flex'; renderList(); }
  function hide() { el.style.display = 'none'; }
  return { show, hide };
}
