---
name: Stochastick
description: Afterglow. A dusk sky with frosted plum glass over it, where a real stock chart is the level.
colors:
  sky-fallback: "#18123c"
  ink: "#0c0920"
  plum-950: "#120a1c"
  plum-900: "#1c0f28"
  plum-800: "#2a1236"
  cream: "#fff3e6"
  rim: "#ffb28c"
  jade: "#8ff0c4"
  coral: "#ff9d8f"
typography:
  display:
    fontFamily: "Gloock, Georgia, serif"
    fontSize: "clamp(56px, 15.5vw, 136px)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Gloock, Georgia, serif"
    fontSize: "27px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  ui:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.45
  data:
    fontFamily: "Azeret Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 500
    letterSpacing: "0.02em"
rounded:
  inner: "12px"
  control: "16px"
  panel: "28px"
spacing:
  gap: "12px"
  pad: "16px"
components:
  button-primary:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.plum-800}"
    rounded: "{rounded.control}"
    height: "56px"
    padding: "0 24px"
  button-glass:
    textColor: "{colors.cream}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 18px"
  icon-button:
    textColor: "{colors.cream}"
    rounded: "22px"
    size: "44px"
  panel:
    textColor: "{colors.cream}"
    rounded: "{rounded.panel}"
    width: "400px"
    padding: "16px"
---

# Stochastick

## Overview

Afterglow: the page is a dusk sky, and everything else floats on it. A rally lifts the sun into golden hour and a sell-off sinks it toward night, so the mood of the screen is the mood of the chart. The surface is Experience on the landing page and in play, Operate in the picker. The bar is a stranger impressed in one viewport.

## Colors

- **Cream** is all type and the one solid action on a screen.
- **Rim** is the sun's warm edge: focus rings, the caret, best scores, live dots.
- **Jade and coral only ever mean up and down.** Never use them as decoration or for success and error states in general.
- Secondary text is cream at 80% and 62% alpha, never gray.
- Plums are for glass and pillars. The sky owns every other hue; UI does not add any.

## Typography

Three voices, each with one job. Gloock is for the moments: wordmark, score, titles. Hanken Grotesk is the interface. Azeret Mono is market data only, with tabular numerals: prices, dates, tickers, percentages. Prose in mono is wrong.

## Layout

Every floating surface is a panel, 400px wide at most with 16px inside and 12px between blocks. The picker is a full-height sheet on phones and a 560px floating sheet from 720px. Side gutters respect the safe area, and portrait and landscape are both first-class. Interactive heights come in three sizes only: 56 primary, 48 control, 44 icon.

## Elevation & Depth

Depth is frosted glass over a moving world: plum at 46% or 64% alpha with `blur(22px) saturate(150%)`, a 1px warm hairline, and `0 24px 60px rgba(12, 4, 20, 0.45)` on panels. On slow GPUs the engine adds `.low-gpu`, which drops the blur and raises the plum to 86% and 94%, so anything that uses glass must stay legible without blur.

## Shapes

Corners follow what they sit in: 28 for panels, 16 for controls, 12 for items in a 4px-padded track. Icon buttons and pills are fully round. Candle pillars keep a small radius on the gap-facing end only.

## Components

- **Primary button:** cream fill and plum text, one per screen, scales to 0.98 on press.
- **Glass button and icon button:** translucent cream or plum, the hairline brightens on hover.
- **Segmented track:** 4px padding, the selected segment is solid cream. Timeframes are a radio group with arrow keys.
- **Picker row:** ticker in mono, tier and name, one-month sparkline, price, and a one-month change labelled 1M. Only the row being loaded reacts.
- **Difficulty tier:** four small bars plus the word (Easy, Medium, Hard, Brutal), in rim. Never jade or coral: difficulty is not a price direction.
- **Death card:** carries the score, the run's chart and the sharing actions, so the HUD's score and chart step aside while it is up. Retry ignores input for its first 500ms.

## Do's and Don'ts

- Do keep the real market data legible and true. Dates and prices on screen are real ones.
- Do give every reduced-motion state a still, finished frame rather than removing content.
- Don't use a kicker above a heading, and don't add a second primary button.
- Don't use glass where nothing moves behind it.
- Don't let jade or coral creep into anything that isn't a price direction.
