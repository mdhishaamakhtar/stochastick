import { PHYS_DT } from './constants.ts';

export function startLoop(update: (dt: number) => void, render: (alpha: number) => void) {
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  let paused = false;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    let delta = (now - last) / 1000;
    last = now;
    if (paused) return;
    if (delta > 0.1) delta = 0.1;
    acc += delta;
    while (acc >= PHYS_DT) { update(PHYS_DT); acc -= PHYS_DT; }
    render(acc / PHYS_DT);
  }
  raf = requestAnimationFrame(frame);

  return {
    stop() { cancelAnimationFrame(raf); },
    setPaused(p: boolean) { paused = p; if (!p) last = performance.now(); },
  };
}
