<!-- markdownlint-disable MD033 -->

<p align="center">
  <img src="./public/favicon.svg" alt="Stochastick Preview" width="120">
</p>

## Stochastick

Flappy Bird played on real Indian stock market candlestick charts. Pick a stock, pick a timeframe, survive the chart.

No backend, no accounts, no API keys at runtime — a fully static site that ships the market data with it.

## What It Does

- Pick any of ~54 NSE instruments (Nifty 50 constituents + NIFTY 50, BANK NIFTY, SENSEX) and a timeframe — 15m, 1h, Daily, or Weekly
- The stock's real price history becomes the level, played chronologically left to right
- Each candle turns into an obstacle pair — one rising from the floor, an inverted mirror hanging from the ceiling — the gap tracks the candle's close price
- Classic Flappy Bird physics — gravity, one fixed impulse per flap, terminal fall speed
- +1 point per candle survived; crash and it's over — the death screen shows the actual date you got rekt on and the price
- Best scores kept per stock × timeframe in `localStorage`

## Tech Stack

[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Canvas](https://img.shields.io/badge/Canvas-2D-FDE047?style=for-the-badge&logo=html5&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Vercel](https://img.shields.io/badge/Vercel-static-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![License](https://img.shields.io/badge/License-GPLv3-blue?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)

## Quick Start

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default [http://localhost:5173](http://localhost:5173)).

## Dev

```bash
npm run dev          # local dev server
npm test             # Vitest: physics, level generation, codec round-trip, collision, state machine
npm run build        # tsc --noEmit && vite build -> dist/
npm run fetch-data   # re-pull candle data from Yahoo Finance -> public/data/*.bin + manifest.json
```

The production build is tiny — under 12 kB gzipped for the entire app shell (`19.55 kB JS (7.61 kB gzip)` + `10.72 kB CSS (2.90 kB gzip)` + 1.28 kB HTML).

## How It Works

Each candle becomes an obstacle pair: the real candle rising from the floor, an inverted mirror of it hanging from the ceiling. The gap between them tracks the candle's close price, rolling-normalized against its neighbors — so a rally climbs the level and a crash sends the gap diving toward the floor. The chart's actual shape *is* the level.

You're a chubby golden bull (pure Dalal Street energy). Tap, click, or hit Space to flap through the gaps. Level generation is unit-tested against an invariant: **any** real (or adversarial synthetic) price series produces a completable level — gap size is clamped to a playable range, and no single step exceeds what the flap physics can reach.

## Scripts

| Command | When to use |
|--------|-------------|
| `npm run dev` | Local development server |
| `npm test` | Run the Vitest unit tests |
| `npm run build` | Type-check and bundle to `dist/` |
| `npm run fetch-data` | Re-pull candle data from Yahoo Finance (no API key) |

## Project Structure

```
src/
  data/
    types.ts        # Candle shape
    codec.ts        # STK1 binary encode/decode
    load.ts         # fetch + decode a candle file at runtime
    manifest.ts     # manifest schema, timeframe list
  game/
    physics.ts      # pure fixed-step bird physics (gravity, flap, terminal velocity, rotation)
    level.ts        # pure: candle array -> obstacle list (normalization, gap placement, difficulty)
    loop.ts         # RAF loop, fixed-timestep accumulator, interpolation, pause/resume
    render.ts       # canvas drawing, offscreen sprite cache
    collision.ts    # bird vs obstacle/floor/ceiling AABB checks
    state.ts        # menu -> ready -> playing -> dead state machine
    constants.ts    # tunables
  ui/
    picker.ts       # stock/timeframe picker
    hud.ts          # in-game score HUD
    storage.ts      # localStorage best-score persistence
  main.ts          # wiring
scripts/
  fetch-data.ts    # build-time data pipeline (Yahoo Finance -> public/data/*.bin + manifest.json)
```

## Data

Baked at build time, not fetched at runtime. `npm run fetch-data` (`scripts/fetch-data.ts`) pulls OHLC candles from Yahoo Finance's public chart API for the full universe of instruments and every timeframe, then writes:

- `public/data/<SYMBOL>_<TF>.bin` — a compact binary file per stock × timeframe, custom **STK1** format: a 4-byte magic number, a 4-byte candle count, a run of `uint32` timestamps, then a run of `int32` OHLC values in paise (rupees × 100) — about 20 bytes per candle.
- `public/data/manifest.json` — the stock list with names, index flags, sparkline previews, and per-timeframe candle counts and date ranges, loaded once at startup.

There's no API key and no server involved; the script just writes static files into `public/`. The shipped data is a frozen snapshot — re-run `npm run fetch-data` to refresh it.

## Disclaimer

This is a game, not a trading terminal — nothing here is financial advice. Market data is sourced from Yahoo Finance's public chart API; accuracy is not guaranteed, and the shipped data is a static snapshot, not a live feed.

## Deployment

Static output in `dist/`, deployed on Vercel. Pushes to `main` auto-deploy.

## Contributor

- Md Hishaam Akhtar

<p align="center">
  Built for traders who want to get rekt virtually first.
</p>