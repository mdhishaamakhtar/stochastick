/**
 * Synthesized SFX, WebAudio only. Soft by design: a breathy flap, a bell
 * that climbs a pentatonic scale as the score rises, a low thud on death.
 */
import { getMuted, setMuted } from '../lib/storage.ts';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let muted = getMuted();

export const isMuted = (): boolean => muted;
export function toggleMute(): boolean {
  muted = !muted;
  setMuted(muted);
  return muted;
}

/** Create/resume the context; must run inside a user gesture. */
export function unlock(): void {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    // iOS leaves the context 'interrupted', not 'suspended', after an app switch.
    if (ctx.state !== 'running') void ctx.resume().catch(() => {});
  } catch { ctx = null; }
}

const ready = (): boolean => !muted && !!ctx && ctx.state === 'running';

function bell(freq: number, at: number, vol: number, dur: number): void {
  const c = ctx!;
  for (const [mult, v] of [[1, vol], [2.01, vol * 0.25]] as const) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = freq * mult;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(v, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(master!);
    o.start(at);
    o.stop(at + dur + 0.05);
  }
}

export function sfxFlap(): void {
  if (!ready()) return;
  const c = ctx!, t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.9;
  f.frequency.setValueAtTime(1400, t);
  f.frequency.exponentialRampToValueAtTime(420, t + 0.12);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.14, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  src.connect(f).connect(g).connect(master!);
  src.start(t);
  src.stop(t + 0.16);
}

const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
export function sfxScore(score: number): void {
  if (!ready()) return;
  bell(SCALE[score % SCALE.length]!, ctx!.currentTime, 0.05, 0.45);
}

export function sfxDeath(): void {
  if (!ready()) return;
  const c = ctx!, t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(180, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.5);
  g.gain.setValueAtTime(0.32, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + 0.6);
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 600;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.25, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  src.connect(f).connect(ng).connect(master!);
  src.start(t);
  src.stop(t + 0.3);
}

export function sfxBest(): void {
  if (!ready()) return;
  const t = ctx!.currentTime + 0.25;
  [659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => bell(f, t + i * 0.09, 0.05, 0.6));
}

export function sfxStart(): void {
  if (!ready()) return;
  const t = ctx!.currentTime;
  bell(392, t, 0.04, 0.5);
  bell(587.33, t + 0.08, 0.04, 0.6);
}
