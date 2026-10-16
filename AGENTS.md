# AGENTS.md

Asteroids clone in vanilla HTML5 canvas. **Zero toolchain**: no `package.json`, no bundler, no dependencies, no tests, no lint/typecheck, no CI. Do not invent build/test steps — they don't exist.

## Run / verify

- Open `index.html` directly in a browser, or `npx serve .` (visit `http://localhost:3000`).
- Verification = manual play in the browser. There is no automated check to run.

## Structure

- All game logic lives in a single file: `game.js` (~420 lines), loaded as a **classic script** (not an ES module) from `index.html`. Everything is top-level in one shared scope — no imports/exports, no build step. `'use strict'` at the top.
- `index.html` holds only the canvas, inline CSS, and the `<script>` tag. `favicon.svg` and `README.md` are standalone.

## Gotchas

- **Canvas size is defined in two places**: `width="800" height="600"` in `index.html` and `const W = 800; const H = 600;` in `game.js`. Change both together.
- **README is out of sync with the code**: it advertises power-ups and a "estrella fugaz" asteroid type that do not exist in `game.js`. Trust the code; update the README if you actually implement those.
- **Input pattern**: `justPressed[code]` is set on keydown, and `pressed(code)` *consumes* the flag (one-shot). Call `pressed()` exactly once per logical action per frame; calling it twice in a frame will miss the press.
- **Game state machine**: `state` is `'playing' | 'dead' | 'gameover'`. `update(dt)` early-returns for `'dead'`/`'gameover'`, so new per-frame behavior must be added *after* those guards or explicitly inside them.
- Physics uses `wrap()` for toroidal edges on positions; `dt` is capped at 0.05s in `loop()` to avoid jumps after tab switches.

## Conventions

- Comments, README, and all in-game UI text are in **Spanish** (`NIVEL`, `PUNTAJE`, section headers like `── Update ──`). Keep new text and comments in Spanish for consistency.
- Tunable tables are parallel arrays near the top of their section: `RADII`, `SPEEDS`, `POINTS` (index = asteroid size 1–3, where size 3 = big). Update all three when adjusting asteroid tiers.
- Follow the existing section-divider comment style (`// ── Name ────...`) when adding sections to `game.js`.
