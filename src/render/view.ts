import { WORLD_H, VIEW_MIN } from '../game/constants.ts';

/** How the 800-unit-tall world maps onto the screen. */
export interface View {
  w: number; // CSS px
  h: number;
  scale: number; // CSS px per world unit
  offY: number; // CSS px of world y = 0
  ground: number; // CSS px of world y = WORLD_H (the horizon)
  sunX: number;
  sunR: number;
}

export function computeView(w: number, h: number): View {
  // Fit height, unless that would show less than VIEW_MIN of chart; then fit
  // width and let the spare height become sky above and ground below.
  const scale = Math.min(h / WORLD_H, w / VIEW_MIN);
  const extra = h - WORLD_H * scale;
  const offY = extra * 0.58;
  const ground = offY + WORLD_H * scale;
  const portrait = h > w;
  return {
    w, h, scale, offY, ground,
    sunX: w * (portrait ? 0.68 : 0.7),
    sunR: Math.max(30, Math.min(84, Math.min(w, h) * (portrait ? 0.105 : 0.085))),
  };
}

/** Sun centre height for a given sun level (0 = touching the skyline). */
export function sunY(v: View, sun: number): number {
  const span = v.ground * 0.62;
  return v.ground - v.sunR * 0.6 - sun * span;
}
