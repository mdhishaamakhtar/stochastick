# Stochastick — Design Spec

**Date:** 2026-07-12
**Status:** Approved by user (pending written-spec review)

## Concept

Flappy Bird played on real Indian stock market candlestick charts. Pick any Nifty 50 stock (or index) and a timeframe; the price history becomes the level, played chronologically left to right. A chubby bull flies through gaps between candles. Fully static, ephemeral web game — no backend, no accounts, no maintenance.

## Goals & Constraints

- **Performance is the top priority**: instant load (<1s to interactive), locked 60fps (120fps on capable displays), tiny bundle.
- **Free everything**: data, hosting-compatible static output, no API keys at runtime.
- **No backend**: everything is static files; data is baked in at build time.
- **Desktop AND mobile are both first-class targets.** Not responsive-as-afterthought — designed for both.
- Visually clean and beautiful with a finance-fun vibe (visual design refined via the impeccable skill during implementation).

## Architecture

Static Vite + TypeScript site. No frameworks, no game engine. Two components:

### 1. Build-time data pipeline (`scripts/fetch-data.ts`)

Node script, run manually / at build time (never at runtime):

- Fetches OHLC candles from Yahoo Finance chart API (`query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>.NS`) — free, no key, no CORS issue server-side.
- Universe: all Nifty 50 constituents + NIFTY 50 (`^NSEI`), BANK NIFTY (`^NSEBANK`), SENSEX (`^BSESN`).
- Timeframes: **15m** (last ~60 days), **1h** (last ~2 years), **Daily** (~5 years), **Weekly** (~10 years).
- Output:
  - `public/data/manifest.json` — stock list: symbol, display name, sector, available timeframes with candle counts and date ranges. Loaded at startup.
  - `public/data/<SYMBOL>_<TF>.bin` — per stock×timeframe candle file, lazily fetched when the player picks it. Compact binary: quantized OHLC deltas + timestamps as typed arrays (~2–8KB each). A small decoder in the client reconstructs `{time, o, h, l, c}[]`.
- Failures for individual symbols are logged and skipped; the manifest only lists what succeeded.

### 2. Game client (`src/`)

- **One `<canvas>`** for the game world; **DOM/CSS overlay** for all UI (start screen, stock picker, HUD, death screen). DOM text is crisper and cheaper than canvas text.
- **Game loop**: `requestAnimationFrame` with a fixed-timestep accumulator (physics at 120Hz) and interpolated rendering — smooth on 60/90/120Hz displays, deterministic physics.
- **Rendering**: candle obstacle pairs pre-rendered to offscreen canvases when the level is generated; per-frame work is blits + the bull sprite + parallax background. Target: <2ms frame budget on a mid-range phone.
- **Canvas sizing**: CSS-pixel game coordinates, backing store scaled by `devicePixelRatio` (capped at 2 for perf) — crisp on retina, cheap on low-end.

Module boundaries (each independently understandable/testable):

| Module | Responsibility |
|---|---|
| `data/decode.ts` | Binary candle file → candle array |
| `game/physics.ts` | Pure fixed-step bird physics (gravity, flap, terminal velocity, rotation) |
| `game/level.ts` | Pure: candle array → obstacle list (normalization, gap placement, difficulty) |
| `game/loop.ts` | RAF loop, accumulator, interpolation, pause/resume |
| `game/render.ts` | Canvas drawing, offscreen sprite cache |
| `game/collision.ts` | Bird vs obstacle/floor/ceiling AABB checks |
| `ui/` | Start screen, picker, HUD, death screen (DOM) |
| `state.ts` | Game state machine: menu → ready → playing → dead |

## Gameplay

### Level generation (normalized but data-driven)

- Each candle becomes an obstacle pair: the real candle rising from the bottom, its mirror inverted candle hanging from the top, with a gap between the wick tips.
- **Gap center** = the candle's close price normalized against a rolling window (e.g. min/max of the surrounding N candles, eased) — so rallies push gaps up, crashes drag them down, and multi-year trends stay on screen. The stock's actual shape is the level.
- **Gap size** clamped to a playable range; starts generous, tightens gradually with distance (difficulty curve). Consecutive gap centers are also clamped so no single step exceeds what classic Flappy physics can reach.
- Invariant (unit-tested): **any** real price series produces a completable level.
- Candles keep their real green (close ≥ open) / red coloring.

### Physics & controls

Classic Flappy Bird feel: constant gravity, fixed upward impulse per flap, terminal fall velocity, bird rotation follows vertical velocity. Inputs: tap anywhere (mobile), click, or Space/↑ (desktop) — all identical.

### Scoring & death

- +1 per candle passed. Best score per stock×timeframe in `localStorage`.
- Every candle has a real date. Death screen shows: score, **the real date you died on** (e.g. "Rekt on 24 Mar 2020"), the price at that candle, and your best. Instant restart (tap/Space).
- Death on contact with a candle, the floor, or the ceiling.
- `visibilitychange` auto-pauses; a resume countdown prevents unfair deaths.

## Desktop & Mobile (both first-class)

- **Layout**: the game world uses a portrait-ish logical aspect on phones and letterboxes gracefully to wider desktop windows; obstacle spacing/speeds are defined in logical units so difficulty is identical across devices.
- **Touch**: full-viewport tap target during play; `touch-action: none` on the canvas (no scroll/zoom/double-tap-delay); no hover-dependent UI anywhere.
- **Viewport**: `100dvh` sizing, `viewport-fit=cover` with safe-area insets for notches/home bars; orientation change handled (re-layout, game auto-pauses).
- **Menus thumb-first**: stock picker is a large-hit-target searchable list, timeframe pills sized ≥44px; works equally with mouse + keyboard on desktop.
- **Perf floor**: mid-range Android at 60fps; DPR capped, no filters/shadows in the hot path.

## Visual Direction

Dark trading-terminal aesthetic: deep charcoal background, subtle price gridlines, ticker-tape marquee, crisp green/red candles, chunky bull sprite with flap animation and impact particles, mini sparkline previews in the picker. Refined during implementation using the **impeccable** skill (per user request). Light on effects in the render hot path.

## Error Handling

- Missing/failed candle file fetch → toast with retry (only network dependency, and it's same-origin static).
- Corrupt/short data (< minimum candles) → excluded at build time by the pipeline.
- `localStorage` unavailable (private mode) → scores just aren't persisted; no crash.

## Testing

- **Vitest** unit tests for the pure cores: `physics.ts` (deterministic step behavior), `level.ts` (normalization invariants: gaps always within playable bounds and reachable, for adversarial synthetic series and real fixtures), `decode.ts` (round-trip encode/decode).
- Everything else (feel, rendering, responsiveness) verified by playtesting in browser at desktop + mobile viewports.

## Out of Scope (YAGNI)

Live data fetching, arbitrary ticker input, backend/leaderboards, accounts, sound design beyond simple SFX, PWA/offline install (can add later — architecture already supports it trivially).
