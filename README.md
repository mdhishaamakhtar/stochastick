# Stochastick

Flappy Bird played on real Indian stock market candlestick charts. Pick a stock, pick a timeframe, survive the chart.

No backend, no accounts, no API keys at runtime — a fully static site that ships the market data with it.

## How it works

Pick any of ~54 NSE instruments (all Nifty 50 constituents, plus NIFTY 50, BANK NIFTY, and SENSEX) and a timeframe — 15m, 1h, Daily, or Weekly. The stock's real price history becomes the level, played chronologically left to right.

Each candle turns into an obstacle pair: the real candle rising from the floor, an inverted mirror of it hanging from the ceiling. The gap between them tracks the candle's close price, rolling-normalized against its neighbors — so a rally climbs the level and a crash sends the gap diving toward the floor. The chart's actual shape *is* the level.

You're a chubby golden bull (pure Dalal Street energy). Tap, click, or hit Space to flap through the gaps. Classic Flappy Bird physics — gravity, one fixed impulse per flap, terminal fall speed.

+1 point per candle survived. Crash into a candle, the floor, or the ceiling and it's over — the death screen shows the actual date you got rekt on and the price at that candle, plus your best score for that stock and timeframe. Best scores are kept per stock × timeframe in `localStorage`.

## Tech

- **Vite + vanilla TypeScript.** Zero runtime dependencies.
- One `<canvas>` for the game world, a DOM/CSS overlay for all UI (menus, HUD, death screen) — DOM text is crisper and cheaper than canvas text.
- Fixed-timestep physics at 120Hz with interpolated rendering, driven by a `requestAnimationFrame` accumulator loop — smooth and deterministic across 60/90/120Hz displays.
- The bull and score-pop sprites are rasterized once to offscreen canvases; candles are simple rects with hoisted colors. The per-frame render path is allocation-free — no gradients, shadows, or string building per frame.
- Self-hosted fonts (Archivo Black + JetBrains Mono), preloaded, no external font requests.
- Production build: **16.17 kB JS (6.49 kB gzip)** + **8.39 kB CSS (2.42 kB gzip)** + 1.28 kB HTML. Under 10 kB gzipped for the entire app shell.

## Data

Baked at build time, not fetched at runtime. `npm run fetch-data` (`scripts/fetch-data.ts`) pulls OHLC candles from Yahoo Finance's public chart API for the full universe of instruments and every timeframe, then writes:

- `public/data/<SYMBOL>_<TF>.bin` — a compact binary file per stock × timeframe, custom **STK1** format: a 4-byte magic number, a 4-byte candle count, a run of `uint32` timestamps, then a run of `int32` OHLC values in paise (rupees × 100) — about 20 bytes per candle.
- `public/data/manifest.json` — the stock list with names, index flags, sparkline previews, and per-timeframe candle counts and date ranges, loaded once at startup.

There's no API key and no server involved; the script just writes static files into `public/`. The shipped data is a frozen snapshot — re-run `npm run fetch-data` to refresh it.

## Dev

```bash
npm install
npm run dev        # local dev server
npm test           # Vitest: physics, level generation, codec round-trip, collision, state machine
npm run build      # tsc --noEmit && vite build -> dist/
npm run fetch-data # re-pull candle data from Yahoo Finance
```

## Structure

```
src/
  data/
    types.ts       # Candle shape
    codec.ts        # STK1 binary encode/decode
    load.ts         # fetch + decode a candle file at runtime
    manifest.ts      # manifest schema, timeframe list
  game/
    physics.ts      # pure fixed-step bird physics (gravity, flap, terminal velocity, rotation)
    level.ts         # pure: candle array -> obstacle list (normalization, gap placement, difficulty)
    loop.ts          # RAF loop, fixed-timestep accumulator, interpolation, pause/resume
    render.ts        # canvas drawing, offscreen sprite cache
    collision.ts      # bird vs obstacle/floor/ceiling AABB checks
    state.ts         # menu -> ready -> playing -> dead state machine
    constants.ts      # tunables
  ui/
    picker.ts        # stock/timeframe picker
    hud.ts           # in-game score HUD
    storage.ts        # localStorage best-score persistence
  main.ts           # wiring
scripts/
  fetch-data.ts     # build-time data pipeline (Yahoo Finance -> public/data/*.bin + manifest.json)
```

## Playability guarantee

Level generation is unit-tested against an invariant: **any** real (or adversarial synthetic) price series produces a completable level. Gap size is clamped to a playable range, and consecutive gap centers are clamped so no single step exceeds what the flap physics can actually reach — no chart, however violent, can generate an impossible level.

## Disclaimer

This is a game, not a trading terminal — nothing here is financial advice. Market data is sourced from Yahoo Finance's public chart API; accuracy is not guaranteed, and the shipped data is a static snapshot, not a live feed.

## Deployment

Static output in `dist/`, deployed on Vercel. Pushes to `main` auto-deploy.
