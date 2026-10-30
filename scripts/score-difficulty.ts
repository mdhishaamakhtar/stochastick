import { readFileSync, writeFileSync } from 'node:fs';
import { decodeCandles } from '../src/data/codec.ts';
import { fileSymbol, type Manifest, type TfMeta } from '../src/data/manifest.ts';
import { rankDifficulty, survival } from '../src/game/difficulty.ts';
import { buildLevel } from '../src/game/level.ts';

const OUT = 'public/data';

const manifest: Manifest = JSON.parse(readFileSync(`${OUT}/manifest.json`, 'utf8'));
const charts: TfMeta[] = [];
const survivals: number[] = [];
for (const stock of manifest.stocks) {
  for (const [tf, meta] of Object.entries(stock.tfs)) {
    const file = readFileSync(`${OUT}/${fileSymbol(stock.symbol)}_${tf}.bin`);
    const candles = decodeCandles(file.buffer.slice(file.byteOffset, file.byteOffset + file.length) as ArrayBuffer);
    charts.push(meta);
    survivals.push(survival(buildLevel(candles)));
  }
}
rankDifficulty(survivals).forEach((d, i) => { charts[i]!.d = d; });
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest));
console.log(`scored ${charts.length} charts`);
