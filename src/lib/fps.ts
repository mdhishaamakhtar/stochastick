/** Opt-in readout (`?fps`) for measuring frame rate on a real device. */
export class FpsMeter {
  private el = document.body.appendChild(document.createElement('output'));
  private frames: number[] = [];
  private elapsed = 0;

  constructor() {
    this.el.className = 'fps data';
  }

  sample(ms: number, quality: number): void {
    this.frames.push(ms);
    this.elapsed += ms;
    if (this.elapsed < 1000) return;
    const sorted = this.frames.sort((a, b) => a - b);
    const worst = sorted[Math.floor(sorted.length * 0.99)]!;
    const late = sorted.filter((f) => f > 24).length;
    this.el.textContent = `${Math.round(sorted.length / (this.elapsed / 1000))} fps · p99 ${worst.toFixed(1)}ms · late ${late} · Q${quality}`;
    this.frames = [];
    this.elapsed = 0;
  }
}
