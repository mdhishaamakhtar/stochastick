export type Fighter = 'bull' | 'bear';

// The original hand-drawn heads, kept exactly as they were.
const WHITE = '#fff1e2';
const INK = '#1c0f1f'; // plum outline, shared with the dusk scene

export function makeBullSprite(res = 1): HTMLCanvasElement {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size * res;
  const ctx = c.getContext('2d')!;
  ctx.scale(res, res);
  const m = size / 2;
  // Hide and horn are lifted from the dusk sky: apricot horizon light on
  // the coat, rose-plum shadow in the folds, cream horns.
  const HIDE = '#e3946c';
  const HIDE_DARK = '#a5536a';
  const OUTLINE = INK;
  const HORN = '#fff1e2';
  const HORN_DARK = '#e6c3b4';

  // --- horns: filled tapered blades sweeping up and FORWARD (fight stance)
  const horn = (sx: number) => {
    ctx.save();
    if (sx < 0) { ctx.translate(size, 0); ctx.scale(-1, 1); }
    ctx.fillStyle = HORN;
    ctx.beginPath();
    ctx.moveTo(m - 30, m - 14); // thick base at the temple
    ctx.quadraticCurveTo(m - 52, m - 26, m - 50, m - 48);
    ctx.quadraticCurveTo(m - 49, m - 60, m - 38, m - 64); // sharp tip
    ctx.quadraticCurveTo(m - 42, m - 52, m - 36, m - 40); // inner edge back down
    ctx.quadraticCurveTo(m - 30, m - 28, m - 16, m - 24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // shading streak on the horn
    ctx.strokeStyle = HORN_DARK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(m - 27, m - 20);
    ctx.quadraticCurveTo(m - 44, m - 32, m - 43, m - 50);
    ctx.stroke();
    ctx.restore();
  };
  horn(1);
  horn(-1);

  // --- ears: pinned back and low (aggression)
  ctx.fillStyle = HIDE_DARK;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(m - 38, m + 2, 12, 6, -0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(m + 38, m + 2, 12, 6, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // --- head: chiseled — wide brow ridge, hard cheekbones, strong jaw
  ctx.fillStyle = HIDE;
  ctx.beginPath();
  ctx.moveTo(m - 30, m - 26); // left temple
  ctx.quadraticCurveTo(m, m - 38, m + 30, m - 26); // heavy flat crown
  ctx.lineTo(m + 34, m - 4); // hard right cheekbone
  ctx.quadraticCurveTo(m + 32, m + 24, m + 14, m + 40); // jaw slope
  ctx.quadraticCurveTo(m, m + 46, m - 14, m + 40); // chin
  ctx.quadraticCurveTo(m - 32, m + 24, m - 34, m - 4); // left jaw up
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  ctx.stroke();

  // --- forelock: rough triangular tuft slammed down the forehead
  ctx.fillStyle = HIDE_DARK;
  ctx.beginPath();
  ctx.moveTo(m - 16, m - 34);
  ctx.quadraticCurveTo(m, m - 42, m + 16, m - 34);
  ctx.quadraticCurveTo(m + 8, m - 26, m, m - 27);
  ctx.quadraticCurveTo(m - 8, m - 26, m - 16, m - 34);
  ctx.closePath();
  ctx.fill();

  // --- brow ridge: one heavy dark V — the fierce line
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(m - 26, m - 20);
  ctx.lineTo(m - 6, m - 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(m + 26, m - 20);
  ctx.lineTo(m + 6, m - 10);
  ctx.stroke();

  // --- eyes: narrowed slits glaring from under the brow
  const eye = (sx: number) => {
    ctx.save();
    if (sx < 0) { ctx.translate(size, 0); ctx.scale(-1, 1); }
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.moveTo(m - 24, m - 8);
    ctx.quadraticCurveTo(m - 15, m - 12, m - 7, m - 5);
    ctx.quadraticCurveTo(m - 15, m - 1, m - 24, m - 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(m - 13, m - 6.5, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  eye(1);
  eye(-1);

  // --- muzzle: broad and heavy, flared nostrils, hard mouth
  ctx.fillStyle = HIDE_DARK;
  ctx.beginPath();
  ctx.ellipse(m, m + 25, 25, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // nostrils: big angled flares
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(m - 12, m + 23, 5, 7, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(m + 12, m + 23, 5, 7, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // mouth: flat grim line
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(m - 7, m + 37);
  ctx.lineTo(m + 7, m + 37);
  ctx.stroke();

  // --- snort steam: two small puffs off the nostrils
  ctx.fillStyle = 'rgba(255, 236, 222, 0.7)';
  ctx.beginPath();
  ctx.arc(m - 26, m + 30, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(m + 26, m + 30, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 236, 222, 0.4)';
  ctx.beginPath();
  ctx.arc(m - 32, m + 34, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(m + 32, m + 34, 2, 0, Math.PI * 2);
  ctx.fill();

  return c;
}

export function makeBearSprite(res = 1): HTMLCanvasElement {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size * res;
  const ctx = c.getContext('2d')!;
  ctx.scale(res, res);
  const m = size / 2;
  // The bear wears the upper sky: dusk lavender coat, deep violet shading,
  // and a peach muzzle catching the sunset.
  const COAT = '#8a6fa6';
  const COAT_DARK = '#54406f';
  const MUZZLE = '#f2c1a2';
  const OUTLINE = INK;

  // --- ears: round, set wide and high
  const ear = (sx: number) => {
    ctx.save();
    if (sx < 0) { ctx.translate(size, 0); ctx.scale(-1, 1); }
    ctx.fillStyle = COAT;
    ctx.beginPath();
    ctx.arc(m - 30, m - 32, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = COAT_DARK;
    ctx.beginPath();
    ctx.arc(m - 29, m - 31, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  ear(1);
  ear(-1);

  // --- head: broad and heavy, wide cheeks, blunt jaw
  ctx.fillStyle = COAT;
  ctx.beginPath();
  ctx.moveTo(m - 34, m - 22);
  ctx.quadraticCurveTo(m, m - 40, m + 34, m - 22); // heavy crown
  ctx.quadraticCurveTo(m + 44, m + 6, m + 30, m + 32); // right cheek
  ctx.quadraticCurveTo(m + 16, m + 46, m, m + 46); // jaw
  ctx.quadraticCurveTo(m - 16, m + 46, m - 30, m + 32);
  ctx.quadraticCurveTo(m - 44, m + 6, m - 34, m - 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3;
  ctx.stroke();

  // --- fur ruff: rough tuft on the forehead
  ctx.fillStyle = COAT_DARK;
  ctx.beginPath();
  ctx.moveTo(m - 14, m - 32);
  ctx.quadraticCurveTo(m, m - 40, m + 14, m - 32);
  ctx.quadraticCurveTo(m + 6, m - 25, m, m - 26);
  ctx.quadraticCurveTo(m - 6, m - 25, m - 14, m - 32);
  ctx.closePath();
  ctx.fill();

  // --- brow: heavy dark V, same fierce line as the bull
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(m - 26, m - 18);
  ctx.lineTo(m - 6, m - 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(m + 26, m - 18);
  ctx.lineTo(m + 6, m - 8);
  ctx.stroke();

  // --- eyes: narrowed slits glaring from under the brow
  const eye = (sx: number) => {
    ctx.save();
    if (sx < 0) { ctx.translate(size, 0); ctx.scale(-1, 1); }
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.moveTo(m - 24, m - 6);
    ctx.quadraticCurveTo(m - 15, m - 10, m - 7, m - 3);
    ctx.quadraticCurveTo(m - 15, m + 1, m - 24, m - 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(m - 13, m - 4.5, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  eye(1);
  eye(-1);

  // --- muzzle: lighter patch with a big bear nose and a snarl
  ctx.fillStyle = MUZZLE;
  ctx.beginPath();
  ctx.ellipse(m, m + 26, 22, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // nose: wide rounded triangle with a glint
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(m - 9, m + 17);
  ctx.lineTo(m + 9, m + 17);
  ctx.quadraticCurveTo(m + 7, m + 26, m, m + 27);
  ctx.quadraticCurveTo(m - 7, m + 26, m - 9, m + 17);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 236, 222, 0.55)';
  ctx.beginPath();
  ctx.ellipse(m - 3.5, m + 19.5, 2.6, 1.3, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(m, m + 27);
  ctx.lineTo(m, m + 30.5);
  ctx.stroke();

  // snarl: an open mouth curled under the nose, two upper fangs bared
  const mouth = new Path2D();
  mouth.moveTo(m - 12.5, m + 31.5);
  mouth.quadraticCurveTo(m, m + 28.5, m + 12.5, m + 31.5);
  mouth.quadraticCurveTo(m + 9, m + 40.5, m, m + 40.5);
  mouth.quadraticCurveTo(m - 9, m + 40.5, m - 12.5, m + 31.5);
  mouth.closePath();
  ctx.fillStyle = '#3a1420';
  ctx.fill(mouth);
  ctx.save();
  ctx.clip(mouth);
  ctx.fillStyle = '#e0786f';
  ctx.beginPath();
  ctx.ellipse(m, m + 40, 6.5, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const fang = (sx: number) => {
    ctx.save();
    if (sx < 0) { ctx.translate(size, 0); ctx.scale(-1, 1); }
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.moveTo(m - 10, m + 31.2);
    ctx.quadraticCurveTo(m - 7.5, m + 30.2, m - 4.6, m + 30.4);
    ctx.quadraticCurveTo(m - 5.4, m + 34.5, m - 7.4, m + 37.6);
    ctx.quadraticCurveTo(m - 8.8, m + 34.5, m - 10, m + 31.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  fang(1);
  fang(-1);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke(mouth);

  return c;
}


const MAKERS: Record<Fighter, (res?: number) => HTMLCanvasElement> = {
  bull: makeBullSprite,
  bear: makeBearSprite,
};

/**
 * A fighter head lit for the dusk scene, `px` wide in device pixels.
 * The art gets dusk grading (warm where the sun hits the upper right, plum
 * shadow toward the lower left) and a thin rim of sunset light behind its
 * upper-right edge, so it sits in the world instead of on top of it.
 */
export function renderFighter(f: Fighter, px: number): HTMLCanvasElement {
  const res = Math.max(1, Math.ceil(px / 128));
  const art = MAKERS[f](res);
  const actx = art.getContext('2d')!;
  actx.setTransform(1, 0, 0, 1, 0, 0);
  actx.globalCompositeOperation = 'source-atop';
  const g = actx.createLinearGradient(art.width, 0, 0, art.height);
  g.addColorStop(0, 'rgba(255, 196, 156, 0.2)');
  g.addColorStop(0.5, 'rgba(255, 196, 156, 0)');
  g.addColorStop(1, 'rgba(46, 18, 58, 0.34)');
  actx.fillStyle = g;
  actx.fillRect(0, 0, art.width, art.height);

  const rim = document.createElement('canvas');
  rim.width = art.width;
  rim.height = art.height;
  const rctx = rim.getContext('2d')!;
  rctx.drawImage(art, 0, 0);
  rctx.globalCompositeOperation = 'source-in';
  rctx.fillStyle = '#ffc8a2';
  rctx.fillRect(0, 0, rim.width, rim.height);

  const pad = 4 * res;
  const out = document.createElement('canvas');
  out.width = art.width + pad * 2;
  out.height = art.height + pad * 2;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(rim, pad + 2.2 * res, pad - 2.2 * res);
  ctx.drawImage(art, pad, pad);
  return out;
}
