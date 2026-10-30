# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: the owner left stack choices open. Currently Vite + Svelte 5 + TypeScript, with a WebGL2 sky and a Canvas 2D scene, no runtime dependencies beyond Svelte's compiled output, static deploy on Vercel at stochastick.hishaam.dev. Market data is baked into `public/data/*.bin` by `npm run fetch-data` (Yahoo Finance).

## Users

Casual gamers on the web, on phones and desktops, in short sessions. It is also a portfolio and hackathon showcase: the owner shows it to peers, judges and recruiters as "look what I made", so the first impression must land within seconds.

## Product Purpose

A Flappy-style arcade game whose levels are real Indian stock market price history. Pick a stock and timeframe; each candle becomes an obstacle and the gap tracks the close, so a rally climbs and a crash dives. Success means it feels premium and crafted, and people want to share a run (score, the "rekt on <date>" moment).

## Positioning

The level is a real chart: 54 NSE instruments (Nifty 50 constituents plus NIFTY 50, BANK NIFTY, SENSEX) across 15m, 1h, daily and weekly candles. The date and price where you die are real.

## Operating Context

Played with tap, click, Space or ArrowUp. Mobile portrait and desktop landscape are both first-class. Fully static, no accounts, no backend. Best scores persist per stock and timeframe in localStorage.

## Capabilities and Constraints

- Level generation is unit-tested so any price series yields a completable level (gap clamped, max step per candle bounded by flap physics).
- Physics is fixed-step at 120 Hz; render interpolates.
- TMCV has no weekly timeframe (young listing).
- Everything about the look, characters, copy voice and stack is open to redesign (owner's explicit answer).

## Brand Commitments

Name "Stochastick". Domain stochastick.hishaam.dev. Everything else was explicitly left open by the owner.

## Evidence on Hand

Real OHLC candle data for every instrument and timeframe in `public/data/`, plus `manifest.json` with names and 64-point sparklines. No testimonials, user counts or press exist; do not invent any.

## Product Principles

1. The chart is the level: real market data must stay legible and true while playing.
2. Premium first impression: a stranger should get it, and be impressed, in one viewport.
3. Every run ends in something worth sharing.
4. Fair on every device: what you can see ahead should not depend on the screen shape.

## Accessibility & Inclusion

Respect prefers-reduced-motion; keep text contrast readable on every screen; keyboard play must work.
