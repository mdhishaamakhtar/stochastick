import { decodeCandles } from './codec.ts';
import { fileSymbol, type Manifest, type Timeframe } from './manifest.ts';
import type { Candle } from './types.ts';

export async function loadManifest(): Promise<Manifest> {
  const res = await fetch('/data/manifest.json');
  if (!res.ok) throw new Error(`manifest: HTTP ${res.status}`);
  return res.json();
}

async function fetchCandles(symbol: string, tf: Timeframe): Promise<Candle[]> {
  const res = await fetch(`/data/${fileSymbol(symbol)}_${tf}.bin`);
  if (!res.ok) throw new Error(`candles: HTTP ${res.status}`);
  return decodeCandles(await res.arrayBuffer());
}

const charts = new Map<string, Promise<Candle[]>>();

export function loadCandles(symbol: string, tf: Timeframe): Promise<Candle[]> {
  const key = `${symbol}_${tf}`;
  let chart = charts.get(key);
  if (!chart) {
    chart = fetchCandles(symbol, tf);
    chart.catch(() => charts.delete(key)); // a failed load can be retried
    charts.set(key, chart);
  }
  return chart;
}

/** Start fetching a chart the player is reaching for, ignoring any failure. */
export function preloadCandles(symbol: string, tf: Timeframe): void {
  loadCandles(symbol, tf).catch(() => {});
}
