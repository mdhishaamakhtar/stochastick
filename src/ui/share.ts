import { makeBullSprite, makeBearSprite, type Fighter } from '../game/render.ts';
import type { DeathInfo } from './hud.ts';

export interface ShareInfo extends DeathInfo {
  fighter: Fighter;
  stockLabel: string; // e.g. "RELIANCE · 1D"
}

const SITE = 'stochastick.hishaam.dev';

const BG = '#0a0b13';
const GRID = 'rgba(35, 39, 57, 0.6)';
const TEXT = '#f0f2f9';
const MUTED = '#9ba1b8';
const DIM = '#6e7681';
const VIOLET = '#8f7bff';
const GREEN = '#22d68e';
const RED = '#ff5964';

// One obstacle column pair, same construction as the game / og-image.
function candlePair(x: CanvasRenderingContext2D, h: number, cx: number, gapTop: number, gapBot: number, up: boolean) {
  const body = up ? GREEN : RED;
  const dim = up ? '#0e3626' : '#3c1a22';
  const w = 92, hw = w / 2;
  x.fillStyle = dim; x.fillRect(cx - hw, 0, w, gapTop);
  x.fillStyle = body; x.fillRect(cx - hw, gapTop - 8, w, 8); x.fillRect(cx - 4, gapTop, 8, 34);
  x.strokeStyle = body; x.lineWidth = 2.5;
  x.strokeRect(cx - hw + 1.5, 1.5, w - 3, gapTop - 3);
  x.fillStyle = dim; x.fillRect(cx - hw, gapBot, w, h - gapBot);
  x.fillStyle = body; x.fillRect(cx - hw, gapBot, w, 8); x.fillRect(cx - 4, gapBot - 34, 8, 34);
  x.strokeRect(cx - hw + 1.5, gapBot + 1.5, w - 3, h - gapBot - 3);
}

export async function buildShareCard(info: ShareInfo): Promise<HTMLCanvasElement> {
  const W = 1080, H = 1080;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;

  const MONO = '"Martian Mono", ui-monospace, monospace';
  const DISPLAY = '"Bungee", ui-sans-serif, sans-serif';
  await Promise.all([
    document.fonts.load(`400 240px ${DISPLAY}`),
    document.fonts.load(`700 36px ${MONO}`),
    document.fonts.load(`400 26px ${MONO}`),
  ]);
  await document.fonts.ready;

  // ---- background + chart grid
  x.fillStyle = BG;
  x.fillRect(0, 0, W, H);
  x.strokeStyle = GRID;
  x.lineWidth = 1;
  for (let gx = 0.5; gx <= W; gx += 54) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); }
  for (let gy = 0.5; gy <= H; gy += 54) { x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }

  // ---- candle columns hugging the edges
  candlePair(x, H, 54, 250, 630, true);
  candlePair(x, H, W - 54, 420, 820, false);

  // ---- wordmark
  x.textBaseline = 'alphabetic';
  x.font = `400 52px ${DISPLAY}`;
  const w1 = x.measureText('STOCHAST').width;
  const w2 = x.measureText('ICK').width;
  const wx = (W - w1 - w2) / 2;
  x.fillStyle = TEXT; x.fillText('STOCHAST', wx, 150);
  x.fillStyle = VIOLET; x.fillText('ICK', wx + w1, 150);

  // ---- the fighter you flew, mid-flight with speed lines
  const sprite = info.fighter === 'bear' ? makeBearSprite(2) : makeBullSprite(2);
  x.fillStyle = '#dfe7f2';
  for (const [px, py, s, a] of [[388, 358, 10, 0.8], [352, 386, 7, 0.55], [322, 412, 6, 0.35]] as const) {
    x.globalAlpha = a; x.fillRect(px, py, s, s);
  }
  x.globalAlpha = 1;
  x.save();
  x.translate(W / 2, 352);
  x.rotate(info.fighter === 'bear' ? 0.14 : -0.14);
  x.drawImage(sprite, -140, -140, 280, 280);
  x.restore();

  // ---- score
  x.textAlign = 'center';
  x.font = `400 26px ${MONO}`;
  x.fillStyle = MUTED;
  x.letterSpacing = '4px';
  x.fillText(info.survivedAll ? 'FINAL SCORE — FULL CLEAR' : 'FINAL SCORE', W / 2, 560);
  x.letterSpacing = '0px';
  x.font = `400 240px ${DISPLAY}`;
  x.fillStyle = TEXT;
  x.fillText(String(info.score), W / 2, 790);

  // ---- run details
  x.font = `700 36px ${MONO}`;
  x.fillStyle = VIOLET;
  x.fillText(info.stockLabel.toUpperCase(), W / 2, 862);

  x.font = `400 26px ${MONO}`;
  x.fillStyle = MUTED;
  const detail = info.survivedAll
    ? 'SURVIVED THE ENTIRE CHART!'
    : `REKT ON ${info.dateLabel.toUpperCase()}${info.price != null ? ` · ₹${info.price.toLocaleString('en-IN')}` : ''}`;
  x.fillText(detail, W / 2, 916);

  x.fillStyle = info.isNewBest ? VIOLET : MUTED;
  x.fillText(info.isNewBest ? '★ NEW BEST!' : `BEST: ${info.best}`, W / 2, 964);

  // ---- brand ticks + url
  x.fillStyle = GREEN; x.fillRect(W / 2 - 76, 1000, 64, 4);
  x.fillStyle = VIOLET; x.fillRect(W / 2, 1000, 24, 4);
  x.fillStyle = RED; x.fillRect(W / 2 + 36, 1000, 24, 4);
  x.font = `400 24px ${MONO}`;
  x.fillStyle = DIM;
  x.fillText(SITE, W / 2, 1048);

  return c;
}

export function canCopyImage(): boolean {
  return typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write;
}

// Must be called synchronously from the click handler: Safari only allows
// clipboard writes inside a user gesture, so the ClipboardItem is created
// immediately and the still-rendering card is handed over as a promise.
export function copyScore(info: ShareInfo): Promise<void> {
  const blob = buildShareCard(info).then(
    (c) => new Promise<Blob>((res, rej) =>
      c.toBlob((b) => (b ? res(b) : rej(new Error('canvas export failed'))), 'image/png')),
  );
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

export type ShareOutcome = 'shared' | 'cancelled' | 'downloaded';

export async function shareScore(info: ShareInfo): Promise<ShareOutcome> {
  const canvas = await buildShareCard(info);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('canvas export failed');
  const file = new File([blob], 'stochastick-score.png', { type: 'image/png' });

  // The file must be the ONLY item in the payload. Any text item — including
  // `title`, which iOS vends to the share sheet as text — makes Slack's share
  // extension take the text and silently drop the image.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // NotAllowedError etc — fall through to the download path
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'stochastick-score.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
