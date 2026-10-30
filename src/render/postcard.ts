import { renderFighter, type Fighter } from './fighters.ts';

/**
 * Still images in the Afterglow look, drawn with Canvas 2D so they work
 * everywhere: the shareable run card and the site's OG image.
 */

const SKY: Array<[number, string]> = [
  [0, '#18123c'], [0.34, '#3a2470'], [0.6, '#8a3f80'], [0.83, '#e0786f'], [1, '#ffc99a'],
];

export async function fontsReady(): Promise<void> {
  await Promise.all([
    document.fonts.load('400 100px Gloock'),
    document.fonts.load('500 40px "Hanken Grotesk"'),
    document.fonts.load('600 40px "Hanken Grotesk"'),
    document.fonts.load('500 30px "Azeret Mono"'),
  ]);
}

function backdrop(ctx: CanvasRenderingContext2D, w: number, h: number, horizon: number, sun: [number, number, number]): void {
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  for (const [o, c] of SKY) sky.addColorStop(o, c);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon);

  const [sx, sy, sr] = sun;
  let g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 7);
  g.addColorStop(0, 'rgba(255,190,150,0.42)');
  g.addColorStop(1, 'rgba(255,190,150,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, horizon);
  g = ctx.createRadialGradient(sx, sy - sr * 0.2, 0, sx, sy, sr);
  g.addColorStop(0, '#fffaf2');
  g.addColorStop(0.6, '#ffe2c2');
  g.addColorStop(1, '#ffb791');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();

  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  ctx.fillStyle = '#fff3e6';
  for (let i = 0; i < 70; i++) {
    const x = rnd() * w, y = rnd() * horizon * 0.42;
    ctx.globalAlpha = 0.25 + rnd() * 0.6;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function skyline(ctx: CanvasRenderingContext2D, w: number, horizon: number, series: number[], k: number, calm = false): void {
  const n = series.length;
  if (!n) return;
  // Same irregular skyline as the game: hashed width, spacing and height.
  const hash = (j: number) => {
    const x = Math.sin(j * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const layer = (sp: number, pw: number, base: number, amp: number, color: string, stride: number, seed: number) => {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * k;
    for (let j = 0; j * sp < w + sp; j++) {
      const r = hash(j + seed * 1000);
      const v = series[(j * stride) % n]!;
      const x = j * sp + (r - 0.5) * sp * 0.5;
      const tw = pw * (0.7 + r * 0.7);
      const hgt = (base + amp * (0.35 * v + 0.65 * hash(j * 3 + seed))) * k;
      ctx.fillRect(x, horizon - hgt, tw, hgt + 2);
      if (r > 0.35) {
        ctx.beginPath();
        ctx.moveTo(x + tw / 2, horizon - hgt);
        ctx.lineTo(x + tw / 2, horizon - hgt - (6 + 10 * r) * k);
        ctx.stroke();
      }
    }
  };
  const fog = (top: number, bottom: number, a: number) => {
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, 'rgba(255,214,196,0)');
    g.addColorStop(0.55, `rgba(255,214,196,${a})`);
    g.addColorStop(1, 'rgba(255,214,196,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, top, w, bottom - top);
  };
  if (calm) {
    // One distant layer only: a horizon, not a city.
    layer(38 * k, 14 * k, 26, 110, 'rgba(150,62,112,0.42)', 3, 0);
    fog(horizon - 200 * k, horizon + 4, 0.22);
    return;
  }
  layer(26 * k, 13 * k, 70, 230, 'rgba(160,64,116,0.6)', 2, 0);
  fog(horizon - 340 * k, horizon - 30 * k, 0.3);
  layer(56 * k, 26 * k, 30, 150, '#4f1d4c', 3, 7);
  fog(horizon - 140 * k, horizon + 4, 0.2);
}

function ground(ctx: CanvasRenderingContext2D, w: number, h: number, horizon: number, sunX: number): void {
  const g = ctx.createLinearGradient(0, horizon, 0, h);
  g.addColorStop(0, '#22102f');
  g.addColorStop(1, '#0d0616');
  ctx.fillStyle = g;
  ctx.fillRect(0, horizon, w, h - horizon);
  const glow = ctx.createRadialGradient(sunX, horizon, 0, sunX, horizon, w * 0.55);
  glow.addColorStop(0, 'rgba(255,186,150,0.26)');
  glow.addColorStop(1, 'rgba(255,186,150,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, horizon, w, h - horizon);
  ctx.fillStyle = 'rgba(255,178,140,0.45)';
  ctx.fillRect(0, horizon, w, 2);
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 4; // dither only, so gradients don't band
    d[i] = d[i]! + n; d[i + 1] = d[i + 1]! + n; d[i + 2] = d[i + 2]! + n;
  }
  ctx.putImageData(img, 0, 0);
}

/** The chart of the run: lit up to where it ended, a faint dashed future. */
function runLine(ctx: CanvasRenderingContext2D, series: number[], at: number, x: number, y: number, w: number, h: number, k: number): [number, number] {
  const pt = (i: number): [number, number] => [x + (i / (series.length - 1)) * w, y + (1 - series[i]!) * h];
  const cut = Math.round(at * (series.length - 1));
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash([3 * k, 9 * k]);
  ctx.lineWidth = 2.5 * k;
  ctx.strokeStyle = 'rgba(255,243,230,0.38)';
  ctx.beginPath();
  for (let i = cut; i < series.length; i++) { const [px, py] = pt(i); i === cut ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.save();
  ctx.shadowColor = 'rgba(255,214,190,0.7)';
  ctx.shadowBlur = 18 * k;
  ctx.lineWidth = 4.5 * k;
  ctx.strokeStyle = '#fff3e6';
  ctx.beginPath();
  for (let i = 0; i <= cut; i++) { const [px, py] = pt(i); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.stroke();
  ctx.restore();
  return pt(cut);
}

/** Draw a fighter head centred at (cx, cy), `size` px across its 128-unit art. */
function drawHead(ctx: CanvasRenderingContext2D, f: Fighter, cx: number, cy: number, size: number): void {
  const img = renderFighter(f, size * 2);
  const out = (size * img.width) / (img.width - (img.width / 136) * 8);
  ctx.drawImage(img, cx - out / 2, cy - out / 2, out, out);
}

const label = (ctx: CanvasRenderingContext2D, font: string, color: string, text: string, x: number, y: number, align: CanvasTextAlign = 'left') => {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
};

export interface RunCard {
  score: number;
  stock: string;
  timeframe: string;
  title: string;
  move: string;
  up: boolean;
  chart: number[];
  at: number;
  fighter: Fighter;
}

export async function drawRunCard(r: RunCard): Promise<HTMLCanvasElement> {
  await fontsReady();
  // Three fixed zones that never overlap: the result (text, 96–630), the run
  // (chart band 720–930, fighter sitting on the point where it ended), and
  // the horizon with the footer on the ground (1110+).
  const W = 1080, H = 1350, k = 1;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const horizon = 1110;
  backdrop(ctx, W, H, horizon, [820, 1000, 112]);
  skyline(ctx, W, horizon, r.chart, k, true);
  ground(ctx, W, H, horizon, 820);

  ctx.textBaseline = 'alphabetic';
  label(ctx, '500 30px "Azeret Mono"', 'rgba(255,238,226,0.78)', `${r.stock} · ${r.timeframe}`.toUpperCase(), 90, 128);
  label(ctx, '400 280px Gloock', '#fff3e6', String(r.score), 78, 400);
  label(ctx, '500 36px "Hanken Grotesk"', 'rgba(255,238,226,0.82)', r.score === 1 ? 'candle survived' : 'candles survived', 92, 462);
  label(ctx, '400 56px Gloock', '#fff3e6', r.title, 90, 562);
  label(ctx, '500 30px "Azeret Mono"', r.up ? '#8ff0c4' : '#ff9d8f', r.move, 92, 614);

  const [dx, dy] = runLine(ctx, r.chart, r.at, 90, 730, 900, 200, k);
  drawHead(ctx, r.fighter, dx, dy, 104);

  label(ctx, '400 52px Gloock', '#fff3e6', 'Stochastick', 90, 1252);
  label(ctx, '500 26px "Azeret Mono"', 'rgba(255,238,226,0.7)', 'stochastick.hishaam.dev', 990, 1246, 'right');
  grain(ctx, W, H);
  return c;
}

export async function drawOgImage(series: number[]): Promise<HTMLCanvasElement> {
  await fontsReady();
  const W = 2400, H = 1260, k = 2;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const horizon = 1130;
  backdrop(ctx, W, H, horizon, [1980, 860, 150]);
  skyline(ctx, W, horizon, series, k, true);
  ground(ctx, W, H, horizon, 1980);

  // Four monolith candles from the game, with the close-to-close line
  // threading their gaps and the bull mid-flight between the first two.
  const cols: Array<{ x: number; cy: number; up: boolean; body: number; wick: number }> = [
    { x: 1560, cy: 660, up: true, body: 0.45, wick: 0.6 },
    { x: 1930, cy: 520, up: true, body: 0.8, wick: 0.35 },
    { x: 2300, cy: 600, up: false, body: 0.35, wick: 0.7 },
  ];
  const gap = 170, cw = 124, r = 12;
  for (const { x, cy, up, body, wick } of cols) {
    const x0 = x - cw / 2;
    const litLeft = x > 1980;
    const g = ctx.createLinearGradient(x0, 0, x0 + cw, 0);
    const [a, b2, c2] = litLeft ? ['#4d2160', '#2e1239', '#1b0a25'] : ['#1b0a25', '#2e1239', '#4d2160'];
    g.addColorStop(0, a); g.addColorStop(0.45, b2); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x0, -20, cw, cy - gap + 20, [0, 0, r, r]);
    ctx.roundRect(x0, cy + gap, cw, horizon - cy - gap + 2, [r, r, 0, 0]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,178,140,0.8)';
    const rx = litLeft ? x0 : x0 + cw - 3;
    ctx.fillRect(rx, -20, 3, cy - gap + 20 - r);
    ctx.fillRect(rx, cy + gap + r, 3, horizon - cy - gap - r);

    const tint = up ? '143,240,196' : '255,157,143';
    const solid = up ? '#8ff0c4' : '#ff9d8f';
    const band = 24 + 130 * body;
    let tg = ctx.createLinearGradient(0, cy - gap, 0, cy - gap - band);
    tg.addColorStop(0, `rgba(${tint},0.3)`); tg.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = tg; ctx.fillRect(x0, cy - gap - band, cw, band);
    tg = ctx.createLinearGradient(0, cy + gap, 0, cy + gap + band);
    tg.addColorStop(0, `rgba(${tint},0.3)`); tg.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = tg; ctx.fillRect(x0, cy + gap, cw, band);
    ctx.fillStyle = solid;
    ctx.fillRect(x0, cy - gap - 9, cw, 9);
    ctx.fillRect(x0, cy + gap, cw, 9);
    const wl = wick * gap * 0.5;
    ctx.fillRect(x - 3, cy - gap, 6, wl);
    ctx.fillRect(x - 3, cy + gap - wl, 6, wl);
    for (const ty of [cy - gap + wl, cy + gap - wl]) {
      const gl = ctx.createRadialGradient(x, ty, 0, x, ty, 34);
      gl.addColorStop(0, `rgba(${tint},0.75)`); gl.addColorStop(1, `rgba(${tint},0)`);
      ctx.fillStyle = gl; ctx.fillRect(x - 34, ty - 34, 68, 68);
    }
  }
  const pts: Array<[number, number]> = [[1240, 740], ...cols.map((c): [number, number] => [c.x, c.cy])];
  const birdX = 1745;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.setLineDash([6, 14]);
  ctx.strokeStyle = 'rgba(255,243,230,0.45)';
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, birdX, H);
  ctx.clip();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#fff3e6';
  ctx.shadowColor = 'rgba(255,214,190,0.7)';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.stroke();
  ctx.restore();
  for (const [px, py] of pts.slice(1)) {
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    if (px < birdX) { ctx.fillStyle = '#fff3e6'; ctx.fill(); }
    else { ctx.strokeStyle = 'rgba(255,243,230,0.6)'; ctx.lineWidth = 2.5; ctx.stroke(); }
  }
  ctx.strokeStyle = 'rgba(255,243,230,0.55)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(birdX - 78, 580); ctx.lineTo(birdX - 124, 588);
  ctx.moveTo(birdX - 82, 606); ctx.lineTo(birdX - 138, 616);
  ctx.stroke();
  ctx.save();
  ctx.translate(birdX, 590);
  ctx.rotate(-0.16);
  drawHead(ctx, 'bull', 0, 0, Math.round(cw * 0.97)); // same head-to-pillar ratio as in play
  ctx.restore();

  ctx.textBaseline = 'alphabetic';
  label(ctx, '400 200px Gloock', '#fff3e6', 'Stochastick', 150, 500);
  label(ctx, '500 56px "Hanken Grotesk"', 'rgba(255,238,226,0.9)', 'Flappy Bird, flown through', 160, 612);
  label(ctx, '500 56px "Hanken Grotesk"', 'rgba(255,238,226,0.9)', 'real Indian stock charts.', 160, 684);
  label(ctx, '500 30px "Azeret Mono"', 'rgba(255,238,226,0.62)', '54 NSE STOCKS & INDICES · 4 TIMEFRAMES', 160, 1208);
  label(ctx, '500 30px "Azeret Mono"', 'rgba(255,238,226,0.62)', 'STOCHASTICK.HISHAAM.DEV', 2240, 1208, 'right');
  grain(ctx, W, H);
  return c;
}

const toBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('canvas export failed'))), 'image/png'));

/**
 * Share through the OS sheet where files are supported, else download.
 * The file must be the ONLY item in the payload: any text, including a
 * `title` (which iOS vends as text), makes Slack's share extension take the
 * text and silently drop the image.
 */
export async function shareCanvas(c: HTMLCanvasElement, name: string): Promise<'shared' | 'saved' | 'cancelled'> {
  const blob = await toBlob(c);
  const file = new File([blob], name, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // NotAllowedError and friends: fall through to a download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'saved';
}

export const canCopyImage = (): boolean => typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;

/** Must be called synchronously inside the click: Safari only allows clipboard
 *  writes in a user gesture, so the item is created now and handed the
 *  still-rendering card as a promise. */
export function copyCanvas(card: Promise<HTMLCanvasElement>): Promise<void> {
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': card.then(toBlob) })]);
}
