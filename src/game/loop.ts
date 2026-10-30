import { PHYS_DT } from './constants.ts';

export function startLoop(
  update: (dt: number) => void,
  render: (alpha: number) => void,
  onFrame: (delta: number) => void,
) {
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  let paused = false;
  let minFrame = 0;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    if (!paused && now - last < minFrame - 1) return;
    let delta = (now - last) / 1000;
    last = now;
    if (paused) return;
    onFrame(delta);
    if (delta > 0.1) delta = 0.1;
    acc += delta;
    while (acc >= PHYS_DT) { update(PHYS_DT); acc -= PHYS_DT; }
    render(acc / PHYS_DT);
  }
  raf = requestAnimationFrame(frame);

  return {
    stop() { cancelAnimationFrame(raf); },
    setPaused(p: boolean) { paused = p; if (!p) last = performance.now(); },
    /** Cap the frame rate; 0 follows the display. */
    setMaxFps(fps: number) { minFrame = fps ? 1000 / fps : 0; },
  };
}
