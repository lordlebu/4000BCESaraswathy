# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**South of Tethys: Jambhudweepa Adventure** — a cozy 2D browser exploration game with a seed-based
world generator. The player wanders a tile map, reads a travel journal describing the terrain,
creatures, and plants of each tile, and records a landmark. Combat is absent by design; creatures
are observed, not fought.

Stack: **React 19 + Phaser 4 + TypeScript + Vite**. React owns the DOM chrome, Phaser owns the map
canvas, and the game logic belongs to neither.

## Commands

```bash
npm install
npm run dev        # serve at http://localhost:4173 and open a browser
npm test           # vitest — world, content and journal, under plain Node
npm run test:e2e   # playwright — does the game actually boot and draw?
npm run test:watch # vitest in watch mode
npm run typecheck  # tsc --noEmit
npm run build      # static bundle into dist/
npm run build:data # regenerate data/creatures.json and data/flora.json
```

Run a single test file with `npx vitest run test/generator.test.ts`, or a single case with
`npx vitest run -t "some test name"`.

**Two suites, two jobs.** `test/` runs under Node and covers everything in `world/` and `content/`.
`e2e/` drives a real Chromium and is the only thing that can catch "Phaser booted but the canvas is
blank" — worth having because Phaser 4 is new enough that most published advice describes v3.
First run needs `npx playwright install chromium`. Vitest is scoped to `test/**/*.test.ts` in
`vite.config.ts` so it does not try to run the Playwright specs in Node.

Reading pixels back out of the Phaser canvas in-page does not work: the WebGL drawing buffer is
undefined after compositing unless `preserveDrawingBuffer` is set, which costs the real game
performance to serve a test. `e2e/game.spec.ts` screenshots the composited surface instead and
checks the PNG does not compress like a flat fill.

**Testing the deploy artifact.** `PLAYWRIGHT_BASE_URL` aims the browser suite at something already
running instead of starting a dev server — a `vite preview` of the subpath build, or the live Pages
URL. The subpath build is a genuinely different code path from dev, and a wrong `base` is the
classic way a Pages deploy goes blank. `base` is read from `DEPLOY_BASE` at config load, so
**`vite preview` needs the same env var as `vite build`** or it will serve at `/` while the HTML
asks for `/<repo>/`, which looks exactly like a broken build and is not:

```powershell
$env:DEPLOY_BASE = '/4000BCESaraswathy/'
npx vite build
npx vite preview --port 4180            # same env var, same shell
$env:PLAYWRIGHT_BASE_URL = 'http://localhost:4180/4000BCESaraswathy/'
npm run test:e2e
```

Navigation in the specs is relative (`?seed=x`, never `/?seed=x`) so a baseURL subpath is honoured.

`npm run build` respects `DEPLOY_BASE`, which CI sets to `/<repo>/` for GitHub Pages. Locally and
on any plain static host it defaults to `/`.

## Architecture

### The data pipeline is one-directional

```
docs/bestiary.md  →  tools/build-species-data.js  →  data/creatures.json
(authored prose)                                     data/flora.json
```

**`data/creatures.json` and `data/flora.json` are generated. Never hand-edit them** — run
`npm run build:data` instead. CI fails if the committed copies have drifted from the bestiary.
`data/biomes.json` is hand-written and is the one place biome colours, symbols, walkability,
travel costs, and journal descriptions live.

The bestiary is authored by *region* (seven, e.g. "Saraswati & Godavari Deltas"), but the generator
places tiles by *biome* (eleven, e.g. `wetland`). The build script bridges the two by reading biome
keywords out of each species' prose, preferring matches that agree with the species' own region.
Species whose prose matches nothing in their region keep the prose — that is deliberate, and is how
entries filed under the wrong section get re-placed. Sky species and Asura conjurations become
`placement: "lore"` and never appear in play.

### Layers, and the rules between them

- **`src/world/`** — deterministic generation. Seeded RNG (`rng.ts`), octave value-noise fields
  (`field.ts`), biome thresholds (`classify.ts`), river carving (`rivers.ts`), BFS routing
  (`pathfind.ts`), and the assembly in `generate.ts`.
- **`src/content/`** — the data layer over `data/*.json`. `species.ts` answers which creature and
  plant live on a tile; `journal.ts` turns that into prose. Both import the JSON at build time.
- **`src/game/`** — the only code that knows Phaser exists. `scenes/WorldScene.ts` draws tiles,
  moves the player, and manages fog; `tileTextures.ts` generates the tile art from `biomes.json`;
  `PhaserGame.tsx` owns the `Phaser.Game` lifecycle; `EventBus.ts` is the seam to React.
- **`src/ui/`** — React chrome. Journal panel, seed bar, layout, styles.

Four rules hold this together. Breaking any of them is how the codebase gets tangled:

1. **`world/` and `content/` import neither React nor Phaser.** They run under plain Node, so
   `test/` exercises the exact code that ships. Put new game logic here, not in a scene.
2. **Phaser is confined to `game/`.** Swapping engine versions — or engines — touches one folder.
3. **React never renders a tile.** The two sides talk over `EventBus` and nothing else. A scene
   never calls `setState`; React never holds a scene reference and pokes at sprites.
4. **Content lives in `data/*.json`.** No hardcoded creature or biome tables in TypeScript.

### Module systems differ by directory

The root `package.json` sets `"type": "module"`, so **`src/` is ESM**. `tools/package.json` sets
`"type": "commonjs"`, so **`tools/` is CommonJS** and uses `require`. This is intentional — it lets
the app sources use modern `import` syntax without rewriting the build script.

### Why the generator looks the way it does

The original generator built every field by smoothing white noise seven times. Repeated box blur
is a low-pass filter, so elevation collapsed to roughly 0.09–0.48 while `classifyBiome` wanted
`> 0.64` for hills — meaning hills, mountains, desert and rivers could **never** appear, and
`carveRiver` was dead code. Nearly half the bestiary was unreachable in play.

Terrain is now built from octaves of value noise over a seeded highland spine, and every field is
**normalised to 0–1 after shaping** so the classifier's upper thresholds are always reachable.
`test/generator.test.ts` asserts every seed produces hills, mountains and a river, so the bug
cannot come back quietly. If you retune `THRESHOLDS` in `classify.ts`, those tests are the contract
you are negotiating with.

## Known issues to be aware of

- **`feat/react-upgrade` is abandoned, not merged.** Its atmosphere components (`FogOfWar`,
  `DayNightCycle`, `AmbientParticles`) are DOM reimplementations of things Phaser does natively,
  and it carries a weaker generator. It survives only as a visual reference. Do not merge it.
- `settlement` has very few species, so villages read repetitively. The bestiary has no village
  flora or fauna; `tools/build-species-data.js` carries curated fallbacks for biomes that would
  otherwise be empty. `plains` is thin for the same reason (3 creatures).
- Rivers usually terminate in wetland deltas rather than reaching open sea. That reads well for the
  Saraswati setting but does not literally meet the "rivers connect highlands to sea" line in
  `docs/world-generator.md`.
- `assets/Varuna.png` is 418 KB for one sprite and dominates the asset payload.

## Conventions

- Dependencies must justify themselves. The runtime is React and Phaser; that is the whole list.
  Dev dependencies are Vite, TypeScript, Vitest and Playwright.
- Determinism matters: the same seed must produce the same world and the same journal text. Do not
  introduce `Math.random()` or time-based values into `world/` or `content/` — all randomness comes
  from `world/rng.ts`.
- Saved journeys live in `localStorage` keyed by seed and carry a `version`; bump `SAVE_VERSION` in
  `src/save.ts` when the payload shape changes so old saves are discarded rather than misread.
- Field order in `generateWorld` is part of the seed contract. Reordering the `fractalField` and
  `highlandSpine` calls changes every existing map.
