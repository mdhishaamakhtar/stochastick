/**
 * Tiny synthesized SFX engine — WebAudio only, zero assets.
 * All sounds are short envelope-shaped oscillator sweeps, volume-capped low.
 */

const KEY = 'stochastick.muted';

let ctx: AudioContext | null = null;
let muted = (() => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
})();

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch { /* private mode */ }
  return muted;
}

/** Create/resume the AudioContext. Must be called from a user gesture. */
export function unlock(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { ctx = null; }
}

function tone(
  type: OscillatorType,
  f0: number, f1: number,
  dur: number, vol: number,
  delay = 0,
): void {
  if (muted || !ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Wing beat: soft downward whoosh. */
export function sfxFlap(): void {
  tone('triangle', 340, 160, 0.09, 0.1);
}

/** Candle cleared: bright little coin blip. */
export function sfxScore(): void {
  tone('square', 740, 740, 0.05, 0.05);
  tone('square', 1180, 1180, 0.07, 0.05, 0.05);
}

/** Rekt: falling buzz with a thud underneath. */
export function sfxDeath(): void {
  tone('sawtooth', 260, 48, 0.4, 0.14);
  tone('sine', 110, 40, 0.35, 0.18);
}

/** New best: rising three-note arpeggio. */
export function sfxBest(): void {
  tone('triangle', 523, 523, 0.09, 0.08);
  tone('triangle', 659, 659, 0.09, 0.08, 0.09);
  tone('triangle', 1047, 1047, 0.16, 0.08, 0.18);
}

/** Round begins. */
export function sfxStart(): void {
  tone('triangle', 440, 700, 0.1, 0.07);
}
