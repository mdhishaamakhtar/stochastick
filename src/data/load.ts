import { decodeCandles } from './codec.ts';
import { fileSymbol, type Manifest, type Timeframe } from './manifest.ts';
import type { Candle } from './types.ts';

export async function loadManifest(): Promise<Manifest> {
  const res = await fetch('/data/manifest.json');
  if (!res.ok) throw new Error(`manifest: HTTP ${res.status}`);
  return res.json();
}

export async function loadCandles(symbol: string, tf: Timeframe): Promise<Candle[]> {
  const res = await fetch(`/data/${fileSymbol(symbol)}_${tf}.bin`);
  if (!res.ok) throw new Error(`candles: HTTP ${res.status}`);
  return decodeCandles(await res.arrayBuffer());
}
