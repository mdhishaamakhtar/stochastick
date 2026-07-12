# Stochastick Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flappy Bird played on real Indian stock candlestick charts — a fully static, no-backend web game (spec: `docs/superpowers/specs/2026-07-12-stochastick-design.md`).

**Architecture:** Vite + vanilla TypeScript. A build-time Node script bakes Yahoo Finance OHLC data into compact binary files under `public/data/`. The client is one `<canvas>` (game world, fixed-timestep 120Hz physics + interpolated rendering) plus a DOM overlay for all UI. Pure modules (physics, level, collision, codec) are unit-tested with Vitest.

**Tech Stack:** Vite, TypeScript (strict), Vitest. **Zero runtime dependencies.**

## Global Constraints

- No runtime npm dependencies; devDependencies only (vite, typescript, vitest).
- TypeScript `strict: true`.
- Logical game world: **450 × 800 units**, letterboxed/scaled to viewport. All physics/level constants in these units.
- Canvas backing store = CSS px × `min(devicePixelRatio, 2)`.
- Mobile first-class: `touch-action: none` on game surface, `100dvh` layout, `viewport-fit=cover` + safe-area insets, hit targets ≥44px.
- All `localStorage` access wrapped in try/catch.
- Data files served from `public/data/` — same-origin static fetches only at runtime.
- Commit after every green test cycle. Do not batch tasks into one commit.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/style.css`, `src/main.ts`, `.gitignore`

**Interfaces:**
- Produces: running dev server, `npm test` (vitest), `npm run build`. Directory layout `src/{data,game,ui}`, `scripts/`, `public/data/`.

- [ ] **Step 1: Write config files**

`package.json`:
```json
{
  "name": "stochastick",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "fetch-data": "node --experimental-strip-types scripts/fetch-data.ts"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "skipLibCheck": true
  },
  "include": ["src", "scripts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: { target: 'es2022' },
});
```

`.gitignore`:
```
node_modules
dist
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <title>Stochastick — Flappy Bird on Stock Candles</title>
    <meta name="description" content="Flappy Bird on real Indian stock market candles. Pick a stock, pick a timeframe, survive the chart." />
  </head>
  <body>
    <div id="app">
      <canvas id="game"></canvas>
      <div id="ui"></div>
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/style.css` (base only; UI styles come in Task 9):
```css
:root {
  --bg: #0b0e14;
  --surface: #121722;
  --line: #1e2635;
  --text: #e6edf7;
  --muted: #8b98ad;
  --green: #22c58b;
  --red: #f0505a;
  --accent: #f5b83d;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  overflow: hidden;
}
#app {
  position: fixed;
  inset: 0;
  height: 100dvh;
  display: grid;
  place-items: center;
}
#game {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  display: block;
}
#ui { position: absolute; inset: 0; pointer-events: none; }
#ui > * { pointer-events: auto; }
```

`src/main.ts` (placeholder boot, replaced in Task 10):
```ts
import './style.css';
console.log('stochastick boot');
```

- [ ] **Step 2: Install and verify**

Run: `npm install && npm run build`
Expected: build succeeds, `dist/` created.

Run: `mkdir -p src/data src/game src/ui scripts public/data`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: scaffold vite + ts + vitest project"
```

---

### Task 2: Candle binary codec (encode + decode)

**Files:**
- Create: `src/data/types.ts`, `src/data/codec.ts`
- Test: `src/data/codec.test.ts`

**Interfaces:**
- Produces:
  - `interface Candle { t: number; o: number; h: number; l: number; c: number }` (t = unix seconds, prices in rupees) in `src/data/types.ts`
  - `encodeCandles(candles: Candle[]): ArrayBuffer` and `decodeCandles(buf: ArrayBuffer): Candle[]` in `src/data/codec.ts`

Binary format `STK1` (little-endian): bytes 0–3 magic `"STK1"`, uint32 count, then `count` × uint32 timestamps (seconds), then `count*4` × int32 prices in paise (o,h,l,c interleaved). Decoder throws on bad magic.

- [ ] **Step 1: Write the failing test** — `src/data/codec.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { encodeCandles, decodeCandles } from './codec.ts';
import type { Candle } from './types.ts';

const sample: Candle[] = [
  { t: 1700000000, o: 2500.5, h: 2510.05, l: 2490.0, c: 2505.25 },
  { t: 1700086400, o: 2505.25, h: 2555.1, l: 2500.0, c: 2550.0 },
  { t: 1700172800, o: 2550.0, h: 2550.0, l: 2401.15, c: 2410.6 },
];

describe('candle codec', () => {
  it('round-trips candles exactly (paise precision)', () => {
    expect(decodeCandles(encodeCandles(sample))).toEqual(sample);
  });

  it('round-trips empty array', () => {
    expect(decodeCandles(encodeCandles([]))).toEqual([]);
  });

  it('throws on bad magic', () => {
    const buf = new ArrayBuffer(16);
    expect(() => decodeCandles(buf)).toThrow(/magic/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/codec.test.ts`
Expected: FAIL (cannot resolve `./codec.ts`).

- [ ] **Step 3: Implement**

`src/data/types.ts`:
```ts
export interface Candle {
  t: number; // unix seconds
  o: number;
  h: number;
  l: number;
  c: number; // rupees
}
```

`src/data/codec.ts`:
```ts
import type { Candle } from './types.ts';

const MAGIC = 0x314b5453; // "STK1" little-endian

export function encodeCandles(candles: Candle[]): ArrayBuffer {
  const n = candles.length;
  const buf = new ArrayBuffer(8 + n * 4 + n * 16);
  const dv = new DataView(buf);
  dv.setUint32(0, MAGIC, true);
  dv.setUint32(4, n, true);
  let off = 8;
  for (const cd of candles) { dv.setUint32(off, cd.t, true); off += 4; }
  for (const cd of candles) {
    dv.setInt32(off, Math.round(cd.o * 100), true);
    dv.setInt32(off + 4, Math.round(cd.h * 100), true);
    dv.setInt32(off + 8, Math.round(cd.l * 100), true);
    dv.setInt32(off + 12, Math.round(cd.c * 100), true);
    off += 16;
  }
  return buf;
}

export function decodeCandles(buf: ArrayBuffer): Candle[] {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== MAGIC) throw new Error('bad magic: not an STK1 file');
  const n = dv.getUint32(4, true);
  const out: Candle[] = new Array(n);
  let tOff = 8;
  let pOff = 8 + n * 4;
  for (let i = 0; i < n; i++) {
    out[i] = {
      t: dv.getUint32(tOff, true),
      o: dv.getInt32(pOff, true) / 100,
      h: dv.getInt32(pOff + 4, true) / 100,
      l: dv.getInt32(pOff + 8, true) / 100,
      c: dv.getInt32(pOff + 12, true) / 100,
    };
    tOff += 4;
    pOff += 16;
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/codec.test.ts` — Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/data && git commit -m "feat: STK1 candle binary codec with round-trip tests"
```

---

### Task 3: Data pipeline (fetch Yahoo → public/data)

**Files:**
- Create: `scripts/fetch-data.ts`, `src/data/manifest.ts`
- Output (generated, committed): `public/data/manifest.json`, `public/data/<SYMBOL>_<TF>.bin`

**Interfaces:**
- Consumes: `encodeCandles` from `src/data/codec.ts`, `Candle` from `src/data/types.ts`.
- Produces:
  - `src/data/manifest.ts` types: `type Timeframe = '15m' | '1h' | '1d' | '1wk'`; `interface StockMeta { symbol: string; name: string; index?: boolean; spark: number[]; tfs: Partial<Record<Timeframe, { n: number; from: number; to: number }>> }`; `interface Manifest { generated: string; stocks: StockMeta[] }`; `const TF_LABELS: Record<Timeframe, string>` = `{ '15m': '15 Min', '1h': '1 Hour', '1d': 'Daily', '1wk': 'Weekly' }`.
  - Data files: manifest at `/data/manifest.json`; candles at `/data/<fileSymbol>_<tf>.bin` where `fileSymbol` = symbol with non-alphanumerics stripped (e.g. `M&M` → `MM`, `^NSEI` → `NSEI`, `BAJAJ-AUTO` → `BAJAJAUTO`). Export `fileSymbol(symbol: string): string` from `src/data/manifest.ts`.

- [ ] **Step 1: Write manifest types**

`src/data/manifest.ts`:
```ts
export type Timeframe = '15m' | '1h' | '1d' | '1wk';

export const TIMEFRAMES: Timeframe[] = ['15m', '1h', '1d', '1wk'];

export const TF_LABELS: Record<Timeframe, string> = {
  '15m': '15 Min',
  '1h': '1 Hour',
  '1d': 'Daily',
  '1wk': 'Weekly',
};

export interface TfMeta { n: number; from: number; to: number }

export interface StockMeta {
  symbol: string;
  name: string;
  index?: boolean;
  spark: number[]; // 30 values, 0-99, recent daily closes normalized
  tfs: Partial<Record<Timeframe, TfMeta>>;
}

export interface Manifest {
  generated: string;
  stocks: StockMeta[];
}

export function fileSymbol(symbol: string): string {
  return symbol.replace(/[^A-Za-z0-9]/g, '');
}
```

- [ ] **Step 2: Write the fetch script**

`scripts/fetch-data.ts`:
```ts
import { writeFileSync, mkdirSync } from 'node:fs';
import { encodeCandles } from '../src/data/codec.ts';
import type { Candle } from '../src/data/types.ts';
import { fileSymbol, TIMEFRAMES, type Manifest, type StockMeta, type Timeframe } from '../src/data/manifest.ts';

const UNIVERSE: Array<{ yahoo: string; symbol: string; name: string; index?: boolean }> = [
  { yahoo: '^NSEI', symbol: 'NIFTY50', name: 'NIFTY 50', index: true },
  { yahoo: '^NSEBANK', symbol: 'BANKNIFTY', name: 'BANK NIFTY', index: true },
  { yahoo: '^BSESN', symbol: 'SENSEX', name: 'SENSEX', index: true },
  { yahoo: 'RELIANCE.NS', symbol: 'RELIANCE', name: 'Reliance Industries' },
  { yahoo: 'TCS.NS', symbol: 'TCS', name: 'Tata Consultancy Services' },
  { yahoo: 'HDFCBANK.NS', symbol: 'HDFCBANK', name: 'HDFC Bank' },
  { yahoo: 'ICICIBANK.NS', symbol: 'ICICIBANK', name: 'ICICI Bank' },
  { yahoo: 'INFY.NS', symbol: 'INFY', name: 'Infosys' },
  { yahoo: 'HINDUNILVR.NS', symbol: 'HINDUNILVR', name: 'Hindustan Unilever' },
  { yahoo: 'ITC.NS', symbol: 'ITC', name: 'ITC' },
  { yahoo: 'SBIN.NS', symbol: 'SBIN', name: 'State Bank of India' },
  { yahoo: 'BHARTIARTL.NS', symbol: 'BHARTIARTL', name: 'Bharti Airtel' },
  { yahoo: 'KOTAKBANK.NS', symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank' },
  { yahoo: 'LT.NS', symbol: 'LT', name: 'Larsen & Toubro' },
  { yahoo: 'AXISBANK.NS', symbol: 'AXISBANK', name: 'Axis Bank' },
  { yahoo: 'ASIANPAINT.NS', symbol: 'ASIANPAINT', name: 'Asian Paints' },
  { yahoo: 'MARUTI.NS', symbol: 'MARUTI', name: 'Maruti Suzuki' },
  { yahoo: 'SUNPHARMA.NS', symbol: 'SUNPHARMA', name: 'Sun Pharma' },
  { yahoo: 'TITAN.NS', symbol: 'TITAN', name: 'Titan Company' },
  { yahoo: 'ULTRACEMCO.NS', symbol: 'ULTRACEMCO', name: 'UltraTech Cement' },
  { yahoo: 'WIPRO.NS', symbol: 'WIPRO', name: 'Wipro' },
  { yahoo: 'NESTLEIND.NS', symbol: 'NESTLEIND', name: 'Nestle India' },
  { yahoo: 'BAJFINANCE.NS', symbol: 'BAJFINANCE', name: 'Bajaj Finance' },
  { yahoo: 'M&M.NS', symbol: 'M&M', name: 'Mahindra & Mahindra' },
  { yahoo: 'NTPC.NS', symbol: 'NTPC', name: 'NTPC' },
  { yahoo: 'HCLTECH.NS', symbol: 'HCLTECH', name: 'HCL Technologies' },
  { yahoo: 'POWERGRID.NS', symbol: 'POWERGRID', name: 'Power Grid' },
  { yahoo: 'TATAMOTORS.NS', symbol: 'TATAMOTORS', name: 'Tata Motors' },
  { yahoo: 'TATASTEEL.NS', symbol: 'TATASTEEL', name: 'Tata Steel' },
  { yahoo: 'ADANIENT.NS', symbol: 'ADANIENT', name: 'Adani Enterprises' },
  { yahoo: 'ADANIPORTS.NS', symbol: 'ADANIPORTS', name: 'Adani Ports' },
  { yahoo: 'COALINDIA.NS', symbol: 'COALINDIA', name: 'Coal India' },
  { yahoo: 'BAJAJFINSV.NS', symbol: 'BAJAJFINSV', name: 'Bajaj Finserv' },
  { yahoo: 'DRREDDY.NS', symbol: 'DRREDDY', name: "Dr. Reddy's Labs" },
  { yahoo: 'GRASIM.NS', symbol: 'GRASIM', name: 'Grasim Industries' },
  { yahoo: 'HINDALCO.NS', symbol: 'HINDALCO', name: 'Hindalco' },
  { yahoo: 'TECHM.NS', symbol: 'TECHM', name: 'Tech Mahindra' },
  { yahoo: 'INDUSINDBK.NS', symbol: 'INDUSINDBK', name: 'IndusInd Bank' },
  { yahoo: 'JSWSTEEL.NS', symbol: 'JSWSTEEL', name: 'JSW Steel' },
  { yahoo: 'CIPLA.NS', symbol: 'CIPLA', name: 'Cipla' },
  { yahoo: 'EICHERMOT.NS', symbol: 'EICHERMOT', name: 'Eicher Motors' },
  { yahoo: 'ONGC.NS', symbol: 'ONGC', name: 'ONGC' },
  { yahoo: 'HEROMOTOCO.NS', symbol: 'HEROMOTOCO', name: 'Hero MotoCorp' },
  { yahoo: 'DIVISLAB.NS', symbol: 'DIVISLAB', name: "Divi's Labs" },
  { yahoo: 'APOLLOHOSP.NS', symbol: 'APOLLOHOSP', name: 'Apollo Hospitals' },
  { yahoo: 'BRITANNIA.NS', symbol: 'BRITANNIA', name: 'Britannia' },
  { yahoo: 'TATACONSUM.NS', symbol: 'TATACONSUM', name: 'Tata Consumer' },
  { yahoo: 'BPCL.NS', symbol: 'BPCL', name: 'BPCL' },
  { yahoo: 'SBILIFE.NS', symbol: 'SBILIFE', name: 'SBI Life' },
  { yahoo: 'HDFCLIFE.NS', symbol: 'HDFCLIFE', name: 'HDFC Life' },
  { yahoo: 'BAJAJ-AUTO.NS', symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto' },
  { yahoo: 'SHRIRAMFIN.NS', symbol: 'SHRIRAMFIN', name: 'Shriram Finance' },
  { yahoo: 'LTIM.NS', symbol: 'LTIM', name: 'LTIMindtree' },
];

const TF_PARAMS: Record<Timeframe, { range: string; interval: string }> = {
  '15m': { range: '60d', interval: '15m' },
  '1h': { range: '730d', interval: '1h' },
  '1d': { range: '5y', interval: '1d' },
  '1wk': { range: '10y', interval: '1wk' },
};

const MIN_CANDLES = 60;
const OUT = 'public/data';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchCandles(yahoo: string, tf: Timeframe): Promise<Candle[]> {
  const { range, interval } = TF_PARAMS[tf];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?range=${range}&interval=${interval}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (stochastick data pipeline)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const ts: number[] = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  if (!q) throw new Error('no quote data');
  const out: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i];
    if (o == null || h == null || l == null || c == null) continue;
    out.push({ t: ts[i], o, h, l, c });
  }
  return out;
}

function sparkline(candles: Candle[]): number[] {
  const closes = candles.slice(-30).map((c) => c.c);
  const min = Math.min(...closes), max = Math.max(...closes);
  const span = max - min || 1;
  return closes.map((c) => Math.round(((c - min) / span) * 99));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const stocks: StockMeta[] = [];
  for (const stock of UNIVERSE) {
    const meta: StockMeta = { symbol: stock.symbol, name: stock.name, spark: [], tfs: {} };
    if (stock.index) meta.index = true;
    for (const tf of TIMEFRAMES) {
      try {
        const candles = await fetchCandles(stock.yahoo, tf);
        if (candles.length < MIN_CANDLES) {
          console.warn(`skip ${stock.symbol} ${tf}: only ${candles.length} candles`);
          continue;
        }
        writeFileSync(`${OUT}/${fileSymbol(stock.symbol)}_${tf}.bin`, Buffer.from(encodeCandles(candles)));
        meta.tfs[tf] = { n: candles.length, from: candles[0]!.t, to: candles[candles.length - 1]!.t };
        if (tf === '1d') meta.spark = sparkline(candles);
        console.log(`ok ${stock.symbol} ${tf}: ${candles.length} candles`);
      } catch (e) {
        console.warn(`skip ${stock.symbol} ${tf}: ${(e as Error).message}`);
      }
      await sleep(250);
    }
    if (Object.keys(meta.tfs).length > 0) stocks.push(meta);
  }
  const manifest: Manifest = { generated: new Date().toISOString(), stocks };
  writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest));
  console.log(`\nmanifest: ${stocks.length} stocks`);
}

main();
```

- [ ] **Step 3: Run the pipeline (network required, ~3–5 min)**

Run: `npm run fetch-data`
Expected: `ok <SYMBOL> <tf>: N candles` lines for the vast majority; final `manifest: 50+ stocks`. If Node <22.6 rejects `--experimental-strip-types`, run via `npx tsx scripts/fetch-data.ts` instead (add `tsx` as devDependency).

Verify: `ls public/data | head` shows `.bin` files and `manifest.json`; total size `du -sh public/data` under ~15MB raw (candle files are 20B/candle).

- [ ] **Step 4: Sanity-check one file decodes**

Run: `node --experimental-strip-types -e "import('./src/data/codec.ts').then(async m => { const fs = await import('node:fs'); const buf = fs.readFileSync('public/data/RELIANCE_1d.bin'); const c = m.decodeCandles(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)); console.log(c.length, c[0], c[c.length-1]); })"`
Expected: candle count > 1000, plausible rupee prices, increasing timestamps.

- [ ] **Step 5: Commit**

```bash
git add scripts src/data/manifest.ts public/data && git commit -m "feat: data pipeline baking Nifty50+indices OHLC into static binary files"
```

---

### Task 4: Physics (pure, TDD)

**Files:**
- Create: `src/game/constants.ts`, `src/game/physics.ts`
- Test: `src/game/physics.test.ts`

**Interfaces:**
- Produces:
  - `src/game/constants.ts`: `WORLD_W = 450`, `WORLD_H = 800`, `PHYS_DT = 1/120`, `GRAVITY = 2400`, `FLAP_VY = -640`, `MAX_FALL = 1150`, `BIRD_X = 130`, `BIRD_R = 20`, `SCROLL_SPEED = 190`, `OBSTACLE_SPACING = 250`, `OBSTACLE_HALF_W = 34`, `GAP_HALF_MAX = 130`, `GAP_HALF_MIN = 84`, `GAP_TIGHTEN_CANDLES = 120`, `GAP_MARGIN = 90`, `MAX_CENTER_STEP = 165` (all exported consts).
  - `src/game/physics.ts`: `interface Bird { y: number; vy: number; rot: number }`; `createBird(): Bird` (y = WORLD_H/2, vy 0, rot 0); `flap(b: Bird): void`; `stepBird(b: Bird, dt: number): void` (gravity, clamp to MAX_FALL, rotation eases toward `vy`-based target: up ≈ −0.45rad, down ≈ +1.25rad).

- [ ] **Step 1: Write the failing test** — `src/game/physics.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createBird, flap, stepBird } from './physics.ts';
import { GRAVITY, FLAP_VY, MAX_FALL, PHYS_DT, WORLD_H } from './constants.ts';

describe('bird physics', () => {
  it('starts centered and still', () => {
    const b = createBird();
    expect(b.y).toBe(WORLD_H / 2);
    expect(b.vy).toBe(0);
  });

  it('accelerates downward under gravity', () => {
    const b = createBird();
    stepBird(b, PHYS_DT);
    expect(b.vy).toBeCloseTo(GRAVITY * PHYS_DT);
    expect(b.y).toBeGreaterThan(WORLD_H / 2);
  });

  it('flap sets a fixed upward impulse', () => {
    const b = createBird();
    b.vy = 500;
    flap(b);
    expect(b.vy).toBe(FLAP_VY);
  });

  it('falls no faster than terminal velocity', () => {
    const b = createBird();
    for (let i = 0; i < 600; i++) stepBird(b, PHYS_DT);
    expect(b.vy).toBe(MAX_FALL);
  });

  it('rotates nose-up after flap and nose-down in freefall', () => {
    const b = createBird();
    flap(b);
    stepBird(b, PHYS_DT);
    expect(b.rot).toBeLessThan(0);
    for (let i = 0; i < 600; i++) stepBird(b, PHYS_DT);
    expect(b.rot).toBeGreaterThan(0.8);
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `npx vitest run src/game/physics.test.ts` (module not found).

- [ ] **Step 3: Implement**

`src/game/constants.ts`:
```ts
export const WORLD_W = 450;
export const WORLD_H = 800;
export const PHYS_DT = 1 / 120;

export const GRAVITY = 2400;
export const FLAP_VY = -640;
export const MAX_FALL = 1150;

export const BIRD_X = 130;
export const BIRD_R = 20;

export const SCROLL_SPEED = 190;
export const OBSTACLE_SPACING = 250;
export const OBSTACLE_HALF_W = 34;

export const GAP_HALF_MAX = 130;
export const GAP_HALF_MIN = 84;
export const GAP_TIGHTEN_CANDLES = 120;
export const GAP_MARGIN = 90;
export const MAX_CENTER_STEP = 165;
```

`src/game/physics.ts`:
```ts
import { GRAVITY, FLAP_VY, MAX_FALL, WORLD_H } from './constants.ts';

export interface Bird { y: number; vy: number; rot: number }

export function createBird(): Bird {
  return { y: WORLD_H / 2, vy: 0, rot: 0 };
}

export function flap(b: Bird): void {
  b.vy = FLAP_VY;
}

export function stepBird(b: Bird, dt: number): void {
  b.vy = Math.min(b.vy + GRAVITY * dt, MAX_FALL);
  b.y += b.vy * dt;
  const target = b.vy < 0 ? -0.45 : Math.min(1.25, (b.vy / MAX_FALL) * 1.25);
  b.rot += (target - b.rot) * Math.min(1, dt * 12);
}
```

- [ ] **Step 4: Run to verify PASS** — `npx vitest run src/game/physics.test.ts` — 5 passed.

- [ ] **Step 5: Commit** — `git add src/game && git commit -m "feat: classic flappy bird physics with tests"`

---

### Task 5: Level generation (pure, TDD)

**Files:**
- Create: `src/game/level.ts`
- Test: `src/game/level.test.ts`

**Interfaces:**
- Consumes: `Candle` from `src/data/types.ts`; constants from Task 4.
- Produces (`src/game/level.ts`):
  - `interface Obstacle { x: number; gapCenter: number; gapHalf: number; candle: Candle; bull: boolean; index: number }` (`bull` = close ≥ open; `x` = obstacle center in world units, first obstacle at `x = 700`, then `+OBSTACLE_SPACING` each).
  - `buildLevel(candles: Candle[]): Obstacle[]`

Algorithm: for candle `i`, take window of closes `[i-20, i]` (clamped to array start). `norm = (close - winMin) / (winMax - winMin)` (0.5 if flat window). Raw center = `GAP_MARGIN + (1 - norm) * (WORLD_H - 2*GAP_MARGIN)` (price up ⇒ gap up). Then walk left→right clamping each center to within `MAX_CENTER_STEP` of the previous center. `gapHalf` eases linearly from `GAP_HALF_MAX` at index 0 to `GAP_HALF_MIN` at index ≥ `GAP_TIGHTEN_CANDLES`.

- [ ] **Step 1: Write the failing test** — `src/game/level.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildLevel } from './level.ts';
import type { Candle } from '../data/types.ts';
import {
  WORLD_H, GAP_MARGIN, GAP_HALF_MAX, GAP_HALF_MIN,
  MAX_CENTER_STEP, OBSTACLE_SPACING, GAP_TIGHTEN_CANDLES,
} from './constants.ts';

function mk(closes: number[]): Candle[] {
  return closes.map((c, i) => ({ t: 1700000000 + i * 86400, o: c * 0.99, h: c * 1.01, l: c * 0.98, c }));
}

function playable(obs: ReturnType<typeof buildLevel>) {
  for (let i = 0; i < obs.length; i++) {
    const ob = obs[i]!;
    expect(ob.gapCenter - ob.gapHalf).toBeGreaterThanOrEqual(0);
    expect(ob.gapCenter + ob.gapHalf).toBeLessThanOrEqual(WORLD_H);
    expect(ob.gapHalf).toBeGreaterThanOrEqual(GAP_HALF_MIN);
    expect(ob.gapHalf).toBeLessThanOrEqual(GAP_HALF_MAX);
    if (i > 0) expect(Math.abs(ob.gapCenter - obs[i - 1]!.gapCenter)).toBeLessThanOrEqual(MAX_CENTER_STEP + 1e-9);
  }
}

describe('buildLevel', () => {
  it('is playable for a violent crash series', () => {
    const closes = Array.from({ length: 300 }, (_, i) => 1000 * Math.exp(-i * 0.05) + (i % 7) * 3);
    playable(buildLevel(mk(closes)));
  });

  it('is playable for a dead-flat series', () => {
    playable(buildLevel(mk(Array(200).fill(500))));
  });

  it('is playable for alternating extreme spikes', () => {
    playable(buildLevel(mk(Array.from({ length: 200 }, (_, i) => (i % 2 ? 10 : 1000)))));
  });

  it('trend direction moves the gap: rally pushes gaps up (smaller y)', () => {
    const obs = buildLevel(mk(Array.from({ length: 100 }, (_, i) => 100 + i * 10)));
    const late = obs[80]!.gapCenter;
    const flat = buildLevel(mk(Array(100).fill(500)))[80]!.gapCenter;
    expect(late).toBeLessThan(flat);
  });

  it('gaps tighten with progress and spacing is uniform', () => {
    const obs = buildLevel(mk(Array(200).fill(500)));
    expect(obs[0]!.gapHalf).toBe(GAP_HALF_MAX);
    expect(obs[GAP_TIGHTEN_CANDLES]!.gapHalf).toBe(GAP_HALF_MIN);
    expect(obs[1]!.x - obs[0]!.x).toBe(OBSTACLE_SPACING);
  });

  it('marks bull/bear candles', () => {
    const candles: Candle[] = [
      { t: 1, o: 10, h: 12, l: 9, c: 11 },
      { t: 2, o: 11, h: 12, l: 9, c: 10 },
    ];
    const obs = buildLevel(candles);
    expect(obs[0]!.bull).toBe(true);
    expect(obs[1]!.bull).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `npx vitest run src/game/level.test.ts`.

- [ ] **Step 3: Implement** — `src/game/level.ts`:

```ts
import type { Candle } from '../data/types.ts';
import {
  WORLD_H, GAP_MARGIN, GAP_HALF_MAX, GAP_HALF_MIN,
  MAX_CENTER_STEP, OBSTACLE_SPACING, GAP_TIGHTEN_CANDLES,
} from './constants.ts';

export interface Obstacle {
  x: number;
  gapCenter: number;
  gapHalf: number;
  candle: Candle;
  bull: boolean;
  index: number;
}

const FIRST_X = 700;
const WINDOW = 20;

export function buildLevel(candles: Candle[]): Obstacle[] {
  const lo = GAP_MARGIN;
  const hi = WORLD_H - GAP_MARGIN;
  const out: Obstacle[] = [];
  let prevCenter = WORLD_H / 2;
  for (let i = 0; i < candles.length; i++) {
    const cd = candles[i]!;
    let winMin = Infinity, winMax = -Infinity;
    for (let j = Math.max(0, i - WINDOW); j <= i; j++) {
      const c = candles[j]!.c;
      if (c < winMin) winMin = c;
      if (c > winMax) winMax = c;
    }
    const norm = winMax > winMin ? (cd.c - winMin) / (winMax - winMin) : 0.5;
    let center = lo + (1 - norm) * (hi - lo);
    center = Math.max(prevCenter - MAX_CENTER_STEP, Math.min(prevCenter + MAX_CENTER_STEP, center));
    center = Math.max(lo, Math.min(hi, center));
    const ease = Math.min(1, i / GAP_TIGHTEN_CANDLES);
    const gapHalf = GAP_HALF_MAX - (GAP_HALF_MAX - GAP_HALF_MIN) * ease;
    out.push({ x: FIRST_X + i * OBSTACLE_SPACING, gapCenter: center, gapHalf, candle: cd, bull: cd.c >= cd.o, index: i });
    prevCenter = center;
  }
  return out;
}
```

- [ ] **Step 4: Run to verify PASS** — `npx vitest run src/game/level.test.ts` — 6 passed.

- [ ] **Step 5: Commit** — `git add src/game/level.ts src/game/level.test.ts && git commit -m "feat: data-driven level generation with playability invariants"`

---

### Task 6: Collision + scoring (pure, TDD)

**Files:**
- Create: `src/game/collision.ts`
- Test: `src/game/collision.test.ts`

**Interfaces:**
- Consumes: `Obstacle` from level.ts, `Bird` from physics.ts, constants.
- Produces (`src/game/collision.ts`):
  - `hitsObstacle(birdY: number, scrollX: number, ob: Obstacle): boolean` — circle (at world pos `BIRD_X`, `birdY`, radius `BIRD_R`) vs the two pillar AABBs. Pillar rects: x ∈ `[ob.x - OBSTACLE_HALF_W, ob.x + OBSTACLE_HALF_W]` in level space; bird's level-space x is `BIRD_X + scrollX`. Top pillar y ∈ `[0, gapCenter - gapHalf]`, bottom y ∈ `[gapCenter + gapHalf, WORLD_H]`.
  - `hitsBounds(birdY: number): boolean` — `birdY - BIRD_R <= 0 || birdY + BIRD_R >= WORLD_H`.
  - `passedObstacle(scrollX: number, ob: Obstacle): boolean` — `BIRD_X + scrollX > ob.x + OBSTACLE_HALF_W`.

- [ ] **Step 1: Write the failing test** — `src/game/collision.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hitsObstacle, hitsBounds, passedObstacle } from './collision.ts';
import type { Obstacle } from './level.ts';
import { BIRD_X, BIRD_R, WORLD_H, OBSTACLE_HALF_W } from './constants.ts';

const ob: Obstacle = {
  x: 700, gapCenter: 400, gapHalf: 100, index: 0, bull: true,
  candle: { t: 0, o: 1, h: 2, l: 0.5, c: 1.5 },
};

describe('collision', () => {
  it('no hit when bird is centered in the gap at the obstacle', () => {
    expect(hitsObstacle(400, 700 - BIRD_X, ob)).toBe(false);
  });

  it('hits the top pillar when above the gap', () => {
    expect(hitsObstacle(280, 700 - BIRD_X, ob)).toBe(true);
  });

  it('hits the bottom pillar when below the gap', () => {
    expect(hitsObstacle(520, 700 - BIRD_X, ob)).toBe(true);
  });

  it('no hit when horizontally far from the obstacle', () => {
    expect(hitsObstacle(100, 0, ob)).toBe(false);
  });

  it('bounds: floor and ceiling kill, middle does not', () => {
    expect(hitsBounds(BIRD_R - 1)).toBe(true);
    expect(hitsBounds(WORLD_H - BIRD_R + 1)).toBe(true);
    expect(hitsBounds(400)).toBe(false);
  });

  it('passedObstacle flips exactly after trailing edge', () => {
    const edge = 700 + OBSTACLE_HALF_W - BIRD_X;
    expect(passedObstacle(edge - 1, ob)).toBe(false);
    expect(passedObstacle(edge + 1, ob)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `npx vitest run src/game/collision.test.ts`.

- [ ] **Step 3: Implement** — `src/game/collision.ts`:

```ts
import type { Obstacle } from './level.ts';
import { BIRD_X, BIRD_R, WORLD_H, OBSTACLE_HALF_W } from './constants.ts';

function circleRect(cx: number, cy: number, r: number, x0: number, y0: number, x1: number, y1: number): boolean {
  const nx = Math.max(x0, Math.min(cx, x1));
  const ny = Math.max(y0, Math.min(cy, y1));
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function hitsObstacle(birdY: number, scrollX: number, ob: Obstacle): boolean {
  const bx = BIRD_X + scrollX;
  const x0 = ob.x - OBSTACLE_HALF_W, x1 = ob.x + OBSTACLE_HALF_W;
  return (
    circleRect(bx, birdY, BIRD_R, x0, 0, x1, ob.gapCenter - ob.gapHalf) ||
    circleRect(bx, birdY, BIRD_R, x0, ob.gapCenter + ob.gapHalf, x1, WORLD_H)
  );
}

export function hitsBounds(birdY: number): boolean {
  return birdY - BIRD_R <= 0 || birdY + BIRD_R >= WORLD_H;
}

export function passedObstacle(scrollX: number, ob: Obstacle): boolean {
  return BIRD_X + scrollX > ob.x + OBSTACLE_HALF_W;
}
```

- [ ] **Step 4: Run to verify PASS** — 6 passed.

- [ ] **Step 5: Commit** — `git add src/game/collision.* && git commit -m "feat: collision and pass detection with tests"`

---

### Task 7: Game state + fixed-timestep loop (TDD on the reducer)

**Files:**
- Create: `src/game/state.ts`, `src/game/loop.ts`
- Test: `src/game/state.test.ts`

**Interfaces:**
- Consumes: physics, level, collision modules.
- Produces:
  - `src/game/state.ts`:
    - `type Phase = 'ready' | 'playing' | 'dead'`
    - `interface GameState { phase: Phase; bird: Bird; scrollX: number; score: number; nextObstacle: number; obstacles: Obstacle[]; deadAt: Obstacle | null }`
    - `createGame(obstacles: Obstacle[]): GameState` (phase 'ready', scrollX 0, score 0)
    - `tapGame(g: GameState): void` — in 'ready': set phase 'playing' and flap; in 'playing': flap; in 'dead': no-op (restart handled by UI).
    - `stepGame(g: GameState, dt: number): void` — no-op unless 'playing'. Advances `scrollX += SCROLL_SPEED*dt`, steps bird, increments score via `passedObstacle` on `obstacles[nextObstacle]`, checks `hitsBounds` + `hitsObstacle` against the 3 obstacles nearest the bird, sets phase 'dead' and `deadAt` on hit. Also 'dead' if `nextObstacle === obstacles.length` (survived the whole chart — treat as win, `deadAt` stays null).
  - `src/game/loop.ts`: `startLoop(update: (dt: number) => void, render: (alpha: number) => void): { stop(): void; setPaused(p: boolean): void }` — RAF loop with accumulator at `PHYS_DT`, `alpha = acc / PHYS_DT`, clamps frame delta to 0.1s (tab-switch protection).

- [ ] **Step 1: Write the failing test** — `src/game/state.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createGame, tapGame, stepGame } from './state.ts';
import { buildLevel } from './level.ts';
import type { Candle } from '../data/types.ts';
import { PHYS_DT, SCROLL_SPEED } from './constants.ts';

const candles: Candle[] = Array.from({ length: 50 }, (_, i) => ({
  t: 1700000000 + i * 86400, o: 100, h: 101, l: 99, c: 100,
}));

describe('game state', () => {
  it('starts ready; first tap starts playing and flaps', () => {
    const g = createGame(buildLevel(candles));
    expect(g.phase).toBe('ready');
    tapGame(g);
    expect(g.phase).toBe('playing');
    expect(g.bird.vy).toBeLessThan(0);
  });

  it('does not advance while ready', () => {
    const g = createGame(buildLevel(candles));
    stepGame(g, PHYS_DT);
    expect(g.scrollX).toBe(0);
  });

  it('scrolls at SCROLL_SPEED while playing', () => {
    const g = createGame(buildLevel(candles));
    tapGame(g);
    stepGame(g, PHYS_DT);
    expect(g.scrollX).toBeCloseTo(SCROLL_SPEED * PHYS_DT);
  });

  it('dies without input (gravity into the floor)', () => {
    const g = createGame(buildLevel(candles));
    tapGame(g);
    for (let i = 0; i < 1200 && g.phase === 'playing'; i++) stepGame(g, PHYS_DT);
    expect(g.phase).toBe('dead');
  });

  it('scores when passing an obstacle (bird held in gap by direct y control)', () => {
    const obstacles = buildLevel(candles);
    const g = createGame(obstacles);
    tapGame(g);
    for (let i = 0; i < 2400 && g.score === 0 && g.phase === 'playing'; i++) {
      g.bird.y = obstacles[g.nextObstacle]?.gapCenter ?? 400;
      g.bird.vy = 0;
      stepGame(g, PHYS_DT);
    }
    expect(g.score).toBeGreaterThanOrEqual(1);
    expect(g.phase).toBe('playing');
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `npx vitest run src/game/state.test.ts`.

- [ ] **Step 3: Implement**

`src/game/state.ts`:
```ts
import { createBird, flap, stepBird, type Bird } from './physics.ts';
import { hitsBounds, hitsObstacle, passedObstacle } from './collision.ts';
import type { Obstacle } from './level.ts';
import { SCROLL_SPEED } from './constants.ts';

export type Phase = 'ready' | 'playing' | 'dead';

export interface GameState {
  phase: Phase;
  bird: Bird;
  scrollX: number;
  score: number;
  nextObstacle: number;
  obstacles: Obstacle[];
  deadAt: Obstacle | null;
}

export function createGame(obstacles: Obstacle[]): GameState {
  return { phase: 'ready', bird: createBird(), scrollX: 0, score: 0, nextObstacle: 0, obstacles, deadAt: null };
}

export function tapGame(g: GameState): void {
  if (g.phase === 'ready') { g.phase = 'playing'; flap(g.bird); }
  else if (g.phase === 'playing') flap(g.bird);
}

export function stepGame(g: GameState, dt: number): void {
  if (g.phase !== 'playing') return;
  g.scrollX += SCROLL_SPEED * dt;
  stepBird(g.bird, dt);

  const next = g.obstacles[g.nextObstacle];
  if (next && passedObstacle(g.scrollX, next)) {
    g.score++;
    g.nextObstacle++;
  }
  if (g.nextObstacle >= g.obstacles.length) { g.phase = 'dead'; return; }

  if (hitsBounds(g.bird.y)) { g.phase = 'dead'; g.deadAt = g.obstacles[g.nextObstacle] ?? null; return; }
  for (let i = g.nextObstacle; i < Math.min(g.nextObstacle + 3, g.obstacles.length); i++) {
    const ob = g.obstacles[i]!;
    if (hitsObstacle(g.bird.y, g.scrollX, ob)) { g.phase = 'dead'; g.deadAt = ob; return; }
  }
}
```

`src/game/loop.ts`:
```ts
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
```

- [ ] **Step 4: Run to verify PASS** — `npx vitest run src/game/state.test.ts` — 5 passed. Then run the whole suite: `npm test` — all green.

- [ ] **Step 5: Commit** — `git add src/game && git commit -m "feat: game state machine and fixed-timestep loop"`

---

### Task 8: Canvas renderer (candles, bull sprite, background)

**Files:**
- Create: `src/game/render.ts`

**Interfaces:**
- Consumes: `GameState`, `Obstacle`, constants.
- Produces (`src/game/render.ts`):
  - `class Renderer { constructor(canvas: HTMLCanvasElement); resize(cssW: number, cssH: number): void; draw(g: GameState, alpha: number): void }`
  - `resize` sets backing store to `css × min(devicePixelRatio, 2)` and computes a world→screen transform: uniform scale `s = min(cssW / WORLD_W, cssH / WORLD_H)`... **No — fill height, crop width**: `s = cssH / WORLD_H`, world is vertically exact, horizontally the visible world width is `cssW / s` (desktop sees more runway ahead; difficulty is unaffected because it's vertical). Bird stays at `BIRD_X` world-x from the left screen edge.
  - Colors from CSS palette: bg `#0b0e14`, grid `#1e2635`, green `#22c58b`, red `#f0505a`, bull sprite golden `#f5b83d`.

No unit tests (visual); verified in browser in Task 10. Keep every draw call in the hot path allocation-free (no per-frame object/string creation except unavoidable `fillStyle` strings, which are hoisted to consts).

- [ ] **Step 1: Implement** — `src/game/render.ts`:

```ts
import type { GameState } from './state.ts';
import type { Obstacle } from './level.ts';
import { WORLD_H, BIRD_X, BIRD_R, OBSTACLE_HALF_W } from './constants.ts';

const BG = '#0b0e14';
const GRID = '#1e2635';
const GREEN = '#22c58b';
const GREEN_DIM = '#17303a';
const RED = '#f0505a';
const RED_DIM = '#3a2030';
const GOLD = '#f5b83d';
const GOLD_DARK = '#b8860b';
const WHITE = '#e6edf7';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale = 1;
  private bull: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.bull = makeBullSprite();
  }

  resize(cssW: number, cssH: number): void {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.scale = (cssH / WORLD_H) * dpr;
  }

  draw(g: GameState, alpha: number): void {
    const { ctx } = this;
    const s = this.scale;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // price gridlines
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 8; i++) {
      const y = (H / 8) * i;
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    ctx.setTransform(s, 0, 0, s, 0, 0);
    const viewW = W / s;
    const scroll = g.scrollX;

    // obstacles in view
    for (const ob of g.obstacles) {
      const x = ob.x - scroll;
      if (x < -OBSTACLE_HALF_W * 2) continue;
      if (x > viewW + OBSTACLE_HALF_W * 2) break;
      drawCandlePair(ctx, ob, x);
    }

    // bird (interpolate y one physics step for smoothness)
    const by = g.bird.y + g.bird.vy * (alpha * (1 / 120));
    ctx.save();
    ctx.translate(BIRD_X, by);
    ctx.rotate(g.bird.rot);
    ctx.drawImage(this.bull, -BIRD_R * 1.4, -BIRD_R * 1.4, BIRD_R * 2.8, BIRD_R * 2.8);
    ctx.restore();
  }
}

function drawCandlePair(ctx: CanvasRenderingContext2D, ob: Obstacle, x: number): void {
  const body = ob.bull ? GREEN : RED;
  const dim = ob.bull ? GREEN_DIM : RED_DIM;
  const topEnd = ob.gapCenter - ob.gapHalf;
  const botStart = ob.gapCenter + ob.gapHalf;
  const wick = 26; // cosmetic wick length at the gap-facing end
  const w = OBSTACLE_HALF_W * 2;

  // bottom pillar: body from floor up, wick pointing into the gap
  ctx.fillStyle = dim;
  ctx.fillRect(x - OBSTACLE_HALF_W, botStart, w, WORLD_H - botStart);
  ctx.fillStyle = body;
  ctx.fillRect(x - OBSTACLE_HALF_W, botStart, w, 6); // rim
  ctx.fillRect(x - 3, botStart - wick, 6, wick); // wick
  ctx.strokeStyle = body;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - OBSTACLE_HALF_W + 1, botStart + 1, w - 2, WORLD_H - botStart - 2);

  // top pillar (inverted)
  ctx.fillStyle = dim;
  ctx.fillRect(x - OBSTACLE_HALF_W, 0, w, topEnd);
  ctx.fillStyle = body;
  ctx.fillRect(x - OBSTACLE_HALF_W, topEnd - 6, w, 6);
  ctx.fillRect(x - 3, topEnd, 6, wick);
  ctx.strokeStyle = body;
  ctx.strokeRect(x - OBSTACLE_HALF_W + 1, 1, w - 2, topEnd - 2);
}

function makeBullSprite(): HTMLCanvasElement {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const m = size / 2;

  // horns
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(m - 18, m - 26);
  ctx.quadraticCurveTo(m - 34, m - 52, m - 10, m - 54);
  ctx.moveTo(m + 26, m - 20);
  ctx.quadraticCurveTo(m + 24, m - 52, m + 46, m - 44);
  ctx.stroke();

  // body
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.ellipse(m, m, 44, 38, 0, 0, Math.PI * 2);
  ctx.fill();

  // snout
  ctx.fillStyle = GOLD_DARK;
  ctx.beginPath();
  ctx.ellipse(m + 26, m + 12, 18, 13, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2a10';
  ctx.beginPath();
  ctx.arc(m + 32, m + 12, 2.6, 0, Math.PI * 2);
  ctx.arc(m + 24, m + 15, 2.6, 0, Math.PI * 2);
  ctx.fill();

  // eye
  ctx.fillStyle = '#0b0e14';
  ctx.beginPath();
  ctx.arc(m + 14, m - 12, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.arc(m + 16, m - 14, 2, 0, Math.PI * 2);
  ctx.fill();

  // wing (little chart-arrow wing)
  ctx.strokeStyle = GOLD_DARK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(m - 30, m + 4);
  ctx.lineTo(m - 12, m - 8);
  ctx.lineTo(m - 2, m + 2);
  ctx.stroke();

  return c;
}
```

- [ ] **Step 2: Typecheck** — Run: `npx tsc --noEmit` — Expected: no errors.

- [ ] **Step 3: Commit** — `git add src/game/render.ts && git commit -m "feat: canvas renderer with candle pillars and procedural bull sprite"`

Note: this renderer is deliberately functional-first; the impeccable design pass (Task 11) restyles it.

---

### Task 9: UI overlay — picker, HUD, death screen, storage

**Files:**
- Create: `src/ui/picker.ts`, `src/ui/hud.ts`, `src/ui/storage.ts`
- Modify: `src/style.css` (append UI styles)

**Interfaces:**
- Consumes: `Manifest`, `StockMeta`, `Timeframe`, `TF_LABELS` from `src/data/manifest.ts`.
- Produces:
  - `src/ui/storage.ts`: `getBest(symbol: string, tf: string): number` and `setBest(symbol: string, tf: string, score: number): void` — key `stochastick.best.<symbol>.<tf>`, all guarded try/catch, `getBest` returns 0 on any failure.
  - `src/ui/picker.ts`: `createPicker(root: HTMLElement, manifest: Manifest, onPick: (stock: StockMeta, tf: Timeframe) => void): { show(): void; hide(): void }` — full-screen panel: title, search input (filters by symbol/name, case-insensitive), timeframe pill row (defaults to `1d`), scrollable stock list with name + symbol + sparkline `<canvas>` (60×24) + best score for the selected TF. Rows are `<button>`s ≥ 48px tall. Picking calls `onPick` and hides.
  - `src/ui/hud.ts`: `createHud(root: HTMLElement): { setScore(n: number): void; setStock(label: string): void; showReady(): void; showDeath(info: DeathInfo): void; hideOverlays(): void; onRestart(fn: () => void): void; onChangeStock(fn: () => void): void }` where `interface DeathInfo { score: number; best: number; isNewBest: boolean; dateLabel: string; price: number | null; survivedAll: boolean }`. Death panel: big score, "Rekt on <date>" (or "You survived the entire chart!" when `survivedAll`), price, best, two buttons: "Retry" and "Change stock". Ready overlay: "Tap to flap".

- [ ] **Step 1: Implement storage** — `src/ui/storage.ts`:

```ts
export function getBest(symbol: string, tf: string): number {
  try {
    return Number(localStorage.getItem(`stochastick.best.${symbol}.${tf}`)) || 0;
  } catch {
    return 0;
  }
}

export function setBest(symbol: string, tf: string, score: number): void {
  try {
    if (score > getBest(symbol, tf)) localStorage.setItem(`stochastick.best.${symbol}.${tf}`, String(score));
  } catch { /* private mode: scores just don't persist */ }
}
```

- [ ] **Step 2: Implement picker** — `src/ui/picker.ts`:

```ts
import type { Manifest, StockMeta, Timeframe } from '../data/manifest.ts';
import { TIMEFRAMES, TF_LABELS } from '../data/manifest.ts';
import { getBest } from './storage.ts';

export function createPicker(
  root: HTMLElement,
  manifest: Manifest,
  onPick: (stock: StockMeta, tf: Timeframe) => void,
) {
  const el = document.createElement('div');
  el.className = 'picker';
  el.innerHTML = `
    <div class="picker-head">
      <h1 class="logo">STOCHASTICK</h1>
      <p class="tagline">Flappy bird on real stock candles. Survive the chart.</p>
      <input class="search" type="search" placeholder="Search stocks…" autocomplete="off" />
      <div class="tf-row"></div>
    </div>
    <div class="stock-list"></div>
  `;
  root.appendChild(el);

  const search = el.querySelector<HTMLInputElement>('.search')!;
  const tfRow = el.querySelector<HTMLElement>('.tf-row')!;
  const list = el.querySelector<HTMLElement>('.stock-list')!;
  let tf: Timeframe = '1d';

  for (const t of TIMEFRAMES) {
    const b = document.createElement('button');
    b.className = 'pill';
    b.textContent = TF_LABELS[t];
    b.dataset.tf = t;
    b.onclick = () => { tf = t; renderTfs(); renderList(); };
    tfRow.appendChild(b);
  }

  function renderTfs() {
    tfRow.querySelectorAll<HTMLButtonElement>('.pill').forEach((b) => {
      b.classList.toggle('active', b.dataset.tf === tf);
    });
  }

  function drawSpark(canvas: HTMLCanvasElement, spark: number[]) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = 60 * dpr; canvas.height = 24 * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const up = (spark[spark.length - 1] ?? 0) >= (spark[0] ?? 0);
    ctx.strokeStyle = up ? '#22c58b' : '#f0505a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    spark.forEach((v, i) => {
      const x = (i / (spark.length - 1 || 1)) * 58 + 1;
      const y = 22 - (v / 99) * 20;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  function renderList() {
    const q = search.value.trim().toLowerCase();
    list.textContent = '';
    for (const s of manifest.stocks) {
      if (!s.tfs[tf]) continue;
      if (q && !s.symbol.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q)) continue;
      const best = getBest(s.symbol, tf);
      const row = document.createElement('button');
      row.className = 'stock-row';
      row.innerHTML = `
        <span class="stock-names"><span class="stock-sym">${s.symbol}</span><span class="stock-name">${s.name}</span></span>
        <canvas class="spark" width="60" height="24"></canvas>
        <span class="stock-best">${best > 0 ? `★ ${best}` : ''}</span>
      `;
      drawSpark(row.querySelector('canvas')!, s.spark);
      row.onclick = () => { hide(); onPick(s, tf); };
      list.appendChild(row);
    }
  }

  search.oninput = renderList;
  renderTfs();
  renderList();

  function show() { el.style.display = 'flex'; renderList(); }
  function hide() { el.style.display = 'none'; }
  return { show, hide };
}
```

- [ ] **Step 3: Implement HUD** — `src/ui/hud.ts`:

```ts
export interface DeathInfo {
  score: number;
  best: number;
  isNewBest: boolean;
  dateLabel: string;
  price: number | null;
  survivedAll: boolean;
}

export function createHud(root: HTMLElement) {
  const el = document.createElement('div');
  el.className = 'hud';
  el.innerHTML = `
    <div class="hud-top">
      <span class="hud-stock"></span>
      <span class="hud-score">0</span>
    </div>
    <div class="ready-overlay hidden"><span class="ready-pulse">TAP TO FLAP</span></div>
    <div class="death-overlay hidden">
      <div class="death-card">
        <p class="death-title"></p>
        <p class="death-score"></p>
        <p class="death-detail"></p>
        <p class="death-best"></p>
        <div class="death-buttons">
          <button class="btn btn-primary btn-retry">Retry</button>
          <button class="btn btn-change">Change stock</button>
        </div>
      </div>
    </div>
  `;
  root.appendChild(el);

  const q = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel)!;
  const score = q('.hud-score');
  const stockLabel = q('.hud-stock');
  const ready = q('.ready-overlay');
  const death = q('.death-overlay');
  let restartFn = () => {};
  let changeFn = () => {};
  q<HTMLButtonElement>('.btn-retry').onclick = (e) => { e.stopPropagation(); restartFn(); };
  q<HTMLButtonElement>('.btn-change').onclick = (e) => { e.stopPropagation(); changeFn(); };

  return {
    setScore(n: number) { score.textContent = String(n); },
    setStock(label: string) { stockLabel.textContent = label; },
    showReady() { ready.classList.remove('hidden'); death.classList.add('hidden'); },
    showDeath(info: DeathInfo) {
      q('.death-title').textContent = info.survivedAll
        ? 'You survived the entire chart!'
        : `Rekt on ${info.dateLabel}`;
      q('.death-score').textContent = String(info.score);
      q('.death-detail').textContent = info.price != null ? `Price there: ₹${info.price.toLocaleString('en-IN')}` : '';
      q('.death-best').textContent = info.isNewBest ? '★ New best!' : `Best: ${info.best}`;
      death.classList.remove('hidden');
      ready.classList.add('hidden');
    },
    hideOverlays() { ready.classList.add('hidden'); death.classList.add('hidden'); },
    onRestart(fn: () => void) { restartFn = fn; },
    onChangeStock(fn: () => void) { changeFn = fn; },
  };
}
```

- [ ] **Step 4: Append UI styles to `src/style.css`**

```css
/* ---------- UI overlay ---------- */
.hidden { display: none !important; }

.picker {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  background: var(--bg);
  padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
  gap: 12px;
}
.picker-head { display: flex; flex-direction: column; gap: 10px; max-width: 520px; width: 100%; margin: 0 auto; }
.logo { font-size: clamp(28px, 6vw, 40px); letter-spacing: 0.08em; color: var(--accent); }
.tagline { color: var(--muted); font-size: 14px; }
.search {
  background: var(--surface); border: 1px solid var(--line); color: var(--text);
  border-radius: 10px; padding: 12px 14px; font-size: 16px; min-height: 48px; outline: none;
}
.search:focus { border-color: var(--accent); }
.tf-row { display: flex; gap: 8px; }
.pill {
  flex: 1; min-height: 44px; border-radius: 10px; border: 1px solid var(--line);
  background: var(--surface); color: var(--muted); font-size: 14px; cursor: pointer;
}
.pill.active { border-color: var(--accent); color: var(--accent); }
.stock-list {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;
  max-width: 520px; width: 100%; margin: 0 auto; -webkit-overflow-scrolling: touch;
}
.stock-row {
  display: grid; grid-template-columns: 1fr 60px 48px; align-items: center; gap: 12px;
  min-height: 56px; padding: 8px 12px; border-radius: 10px;
  background: var(--surface); border: 1px solid var(--line); color: var(--text);
  cursor: pointer; text-align: left;
}
.stock-row:active { border-color: var(--accent); }
.stock-names { display: flex; flex-direction: column; overflow: hidden; }
.stock-sym { font-weight: 700; font-size: 15px; }
.stock-name { color: var(--muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stock-best { color: var(--accent); font-size: 13px; text-align: right; }

.hud { position: absolute; inset: 0; pointer-events: none; }
.hud .btn { pointer-events: auto; }
.hud-top {
  position: absolute; top: max(10px, env(safe-area-inset-top)); left: 0; right: 0;
  display: flex; justify-content: space-between; align-items: baseline; padding: 0 16px;
}
.hud-stock { color: var(--muted); font-size: 13px; letter-spacing: 0.06em; }
.hud-score { font-size: 40px; font-weight: 800; color: var(--text); font-variant-numeric: tabular-nums; }

.ready-overlay, .death-overlay {
  position: absolute; inset: 0; display: grid; place-items: center;
}
.ready-pulse { color: var(--text); font-size: 20px; letter-spacing: 0.2em; animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.35; } }

.death-card {
  background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
  padding: 24px 28px; text-align: center; display: flex; flex-direction: column; gap: 8px;
  min-width: min(320px, 84vw);
}
.death-title { color: var(--red); font-weight: 700; }
.death-score { font-size: 56px; font-weight: 800; font-variant-numeric: tabular-nums; }
.death-detail, .death-best { color: var(--muted); font-size: 14px; }
.death-buttons { display: flex; gap: 10px; margin-top: 10px; }
.btn {
  flex: 1; min-height: 48px; border-radius: 10px; font-size: 15px; cursor: pointer;
  border: 1px solid var(--line); background: var(--bg); color: var(--text);
}
.btn-primary { background: var(--accent); border-color: var(--accent); color: #14100a; font-weight: 700; }
```

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` — no errors.

```bash
git add src/ui src/style.css && git commit -m "feat: picker, HUD, death screen, localStorage bests"
```

---

### Task 10: Wire it all together (main.ts, input, resize, pause)

**Files:**
- Create: `src/data/load.ts`
- Modify: `src/main.ts` (replace placeholder)
- Create: `.claude/launch.json`

**Interfaces:**
- Consumes: everything above.
- Produces: `src/data/load.ts`: `loadManifest(): Promise<Manifest>` and `loadCandles(symbol: string, tf: Timeframe): Promise<Candle[]>` (fetch `/data/manifest.json` / `/data/<fileSymbol>_<tf>.bin`, throw on !ok). Playable game.

- [ ] **Step 1: Implement loader** — `src/data/load.ts`:

```ts
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
```

- [ ] **Step 2: Implement main** — `src/main.ts` (full replacement):

```ts
import './style.css';
import { loadManifest, loadCandles } from './data/load.ts';
import { TF_LABELS, type StockMeta, type Timeframe } from './data/manifest.ts';
import { buildLevel, type Obstacle } from './game/level.ts';
import { createGame, stepGame, tapGame, type GameState } from './game/state.ts';
import { startLoop } from './game/loop.ts';
import { Renderer } from './game/render.ts';
import { createPicker } from './ui/picker.ts';
import { createHud } from './ui/hud.ts';
import { getBest, setBest } from './ui/storage.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const uiRoot = document.querySelector<HTMLElement>('#ui')!;
const renderer = new Renderer(canvas);

function fitCanvas() {
  renderer.resize(window.innerWidth, window.innerHeight);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

async function boot() {
  let manifest;
  try {
    manifest = await loadManifest();
  } catch {
    uiRoot.innerHTML = '<div class="death-overlay"><div class="death-card"><p>Failed to load market data.</p><button class="btn btn-primary" onclick="location.reload()">Retry</button></div></div>';
    return;
  }

  const hud = createHud(uiRoot);
  let game: GameState | null = null;
  let obstacles: Obstacle[] = [];
  let current: { stock: StockMeta; tf: Timeframe } | null = null;
  let scoreShown = -1;

  const picker = createPicker(uiRoot, manifest, async (stock, tf) => {
    try {
      const candles = await loadCandles(stock.symbol, tf);
      obstacles = buildLevel(candles);
      current = { stock, tf };
      hud.setStock(`${stock.symbol} · ${TF_LABELS[tf]}`);
      startRound();
    } catch {
      picker.show();
    }
  });

  function startRound() {
    game = createGame(obstacles);
    scoreShown = -1;
    hud.setScore(0);
    hud.showReady();
  }

  function onDeath(g: GameState) {
    if (!current) return;
    const { stock, tf } = current;
    const prevBest = getBest(stock.symbol, tf);
    setBest(stock.symbol, tf, g.score);
    const at = g.deadAt;
    const survivedAll = at === null;
    const dateLabel = at
      ? new Date(at.candle.t * 1000).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short',
          year: 'numeric', ...(tf === '15m' || tf === '1h' ? { hour: '2-digit', minute: '2-digit' } : {}),
        })
      : '';
    hud.showDeath({
      score: g.score,
      best: Math.max(prevBest, g.score),
      isNewBest: g.score > prevBest && g.score > 0,
      dateLabel,
      price: at ? at.candle.c : null,
      survivedAll,
    });
  }

  hud.onRestart(() => startRound());
  hud.onChangeStock(() => { game = null; hud.hideOverlays(); picker.show(); });

  const loop = startLoop(
    (dt) => {
      if (!game) return;
      const before = game.phase;
      stepGame(game, dt);
      if (before === 'playing' && game.phase === 'dead') onDeath(game);
      if (game.score !== scoreShown) { scoreShown = game.score; hud.setScore(scoreShown); }
    },
    (alpha) => { if (game) renderer.draw(game, alpha); },
  );

  // Tab-switch protection: pause on hidden; if mid-run, stay paused until the
  // player taps again (spec: no unfair deaths on resume).
  let suspended = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      loop.setPaused(true);
      if (game?.phase === 'playing') { suspended = true; hud.showReady(); }
    } else if (!suspended) {
      loop.setPaused(false);
    }
  });

  function tap() {
    if (!game || game.phase === 'dead') return;
    if (suspended) {
      suspended = false;
      hud.hideOverlays();
      loop.setPaused(false);
      tapGame(game); // flap on resume so the bird doesn't just drop
      return;
    }
    if (game.phase === 'ready') hud.hideOverlays();
    tapGame(game);
  }
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); tap(); });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); tap(); }
  });
}

boot();
```

- [ ] **Step 3: Create `.claude/launch.json`**

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "stochastick", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173 }
  ]
}
```

- [ ] **Step 4: Verify in browser**

Run the dev server (via preview_start with name `stochastick`), then:
1. Picker shows stock list with sparklines; search filters; timeframe pills switch.
2. Pick RELIANCE / Daily → "TAP TO FLAP" → click/space starts; bird flaps; candles scroll; score increments.
3. Die → death card shows score + real date + price + best; Retry restarts instantly; Change stock returns to picker.
4. Resize window → canvas refits, no distortion.
5. `npm test` all green; `npm run build` succeeds.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: wire game loop, input, UI into playable game"`

---

### Task 11: Design pass (impeccable) + mobile polish + final verification

**Files:**
- Modify: `src/style.css`, `src/game/render.ts`, `index.html` (as the design pass dictates)

**Interfaces:** none new — visual/UX refinement only. Game rules, physics, and module APIs must not change.

- [ ] **Step 1: Invoke the impeccable skill** (user explicitly requested it) with the game running in the browser. Scope: start screen, HUD, death card, canvas aesthetics (background depth/parallax, candle styling, ticker-tape marquee on the start screen, particles on flap/death), typography (a distinctive display face for the logo/score — self-hosted or system stack, no external CDN at runtime), motion polish. Keep the render hot path allocation-free and effect-light (no shadows/filters per frame).

- [ ] **Step 2: Mobile verification** (resize_window to mobile preset, 375×812):
  - Picker usable with thumb-sized targets; no horizontal scroll; safe-area respected.
  - Game fills viewport, tap-to-flap works via touch events, no double-tap zoom, no scroll rubber-banding.
  - Rotate/resize mid-game doesn't distort (letterboxing recomputes).
- [ ] **Step 3: Desktop verification** (1280×800): letterboxed world, keyboard input, hover states on buttons.
- [ ] **Step 4: Performance check**: DevTools performance trace during play — no long tasks >16ms on desktop; bundle check via `npm run build` — main JS chunk gzipped <40KB (excluding data files).
- [ ] **Step 5: Full suite + commit**

Run: `npm test && npm run build` — all green.

```bash
git add -A && git commit -m "polish: impeccable design pass + mobile/desktop verification"
```
