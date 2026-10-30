/** Rendering tiers, best first. The game only ever steps down within a session. */
export const QUALITY = [
  { scene: 2, sky: 1.25, frost: true },
  { scene: 1.5, sky: 1, frost: true },
  { scene: 1, sky: 0.75, frost: false },
] as const;

const WINDOW = 60; // frames
const LATE_MS = 24; // a missed vsync at 60 Hz
const MAX_LATE = 6; // 10% of the window
const HITCH_MS = 100; // a tab switch, not a slow GPU

/** Counts missed frames; `sample` is true when a full window dropped too many. */
export class FrameBudget {
  private late = 0;
  private n = 0;

  sample(ms: number): boolean {
    if (ms > HITCH_MS) return false;
    if (ms > LATE_MS) this.late++;
    if (++this.n < WINDOW) return false;
    const over = this.late >= MAX_LATE;
    this.late = this.n = 0;
    return over;
  }
}
