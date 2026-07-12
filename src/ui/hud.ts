export interface DeathInfo {
  score: number;
  best: number;
  isNewBest: boolean;
  dateLabel: string;
  price: number | null;
  survivedAll: boolean;
}

export function createHud(root: HTMLElement) {
  const el = document.createElement('div');
  el.className = 'hud idle';
  el.innerHTML = `
    <div class="hud-top">
      <span class="hud-stock"></span>
      <span class="hud-score">0</span>
    </div>
    <span class="hud-date"><span class="dt"></span><span class="px"></span></span>
    <div class="ready-overlay hidden"><span class="ready-pulse">TAP TO FLAP<span class="ready-hint">TAP · CLICK · SPACE</span></span></div>
    <div class="death-overlay hidden">
      <div class="death-card">
        <p class="death-title"></p>
        <p class="death-score"></p>
        <p class="death-detail"></p>
        <p class="death-best"></p>
        <div class="death-buttons">
          <button class="btn btn-primary btn-retry">Retry</button>
          <button class="btn btn-change">Change stock</button>
        </div>
      </div>
    </div>
  `;
  root.appendChild(el);

  const q = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel)!;
  const score = q('.hud-score');
  const stockLabel = q('.hud-stock');
  const ready = q('.ready-overlay');
  const death = q('.death-overlay');
  let restartFn = () => {};
  let changeFn = () => {};
  q<HTMLButtonElement>('.btn-retry').onclick = (e) => { e.stopPropagation(); restartFn(); };
  q<HTMLButtonElement>('.btn-change').onclick = (e) => { e.stopPropagation(); changeFn(); };

  const dateDt = q('.hud-date .dt');
  const datePx = q('.hud-date .px');

  return {
    setScore(n: number) { score.textContent = String(n); },
    setStock(label: string) { stockLabel.textContent = label; },
    setDate(date: string, price: string) {
      dateDt.textContent = date;
      datePx.textContent = price;
    },
    setIdle(idle: boolean) { el.classList.toggle('idle', idle); },
    showReady() { ready.classList.remove('hidden'); death.classList.add('hidden'); },
    showDeath(info: DeathInfo) {
      q('.death-title').textContent = info.survivedAll
        ? 'You survived the entire chart!'
        : `Rekt on ${info.dateLabel}`;
      q('.death-score').textContent = String(info.score);
      q('.death-detail').textContent = info.price != null ? `Price there: ₹${info.price.toLocaleString('en-IN')}` : '';
      const bestEl = q('.death-best');
      bestEl.textContent = info.isNewBest ? '★ New best!' : `Best: ${info.best}`;
      bestEl.classList.toggle('new', info.isNewBest);
      death.classList.remove('hidden');
      ready.classList.add('hidden');
    },
    hideOverlays() { ready.classList.add('hidden'); death.classList.add('hidden'); },
    onRestart(fn: () => void) { restartFn = fn; },
    onChangeStock(fn: () => void) { changeFn = fn; },
  };
}
