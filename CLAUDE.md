# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**South of Tethys: Jambhudweepa Adventure** — a cozy 2D browser exploration prototype with a
seed-based world generator. The player wanders a tile map, reads a travel journal describing the
terrain, creatures, and plants of each tile, and records a landmark. Combat is absent by design;
creatures are observed, not fought.

## Commands

```bash
.\run              # serve at http://localhost:4173 and open a browser
.\run stop         # free the port without starting a server
.\run test         # smoke test
npm test           # same smoke test
npm run build:data # regenerate data/creatures.json and data/flora.json
```

`.\run` (not bare `run`) — PowerShell does not search the current directory. `.\run play` stops a
previous instance first, so it restarts cleanly. Override the port with `set PORT=4174` first.

There is no test framework. `src/smoke-test.js` is the entire suite: a script of plain assertions
that throw. There is no way to run a single case — add assertions to that file.

`.\run dev` and `.\run build` are for the unmerged `feat/react-upgrade` branch and print guidance
when run from `main`.

## Architecture

### The data pipeline is one-directional

```
docs/bestiary.md  →  tools/build-species-data.js  →  data/creatures.json
(authored prose)                                     data/flora.json
```

**`data/creatures.json` and `data/flora.json` are generated. Never hand-edit them** — run
`npm run build:data` instead. `data/biomes.json` is hand-written and is the one place biome
colours, symbols, walkability, travel costs, and journal descriptions live.

The bestiary is authored by *region* (seven, e.g. "Saraswati & Godavari Deltas"), but the generator
places tiles by *biome* (ten, e.g. `wetland`). The build script bridges the two by reading biome
keywords out of each species' prose, preferring matches that agree with the species' own region.
Species whose prose matches nothing in their region keep the prose — that is deliberate, and is how
entries filed under the wrong section get re-placed. Sky species and Asura conjurations become
`placement: "lore"` and never appear in play.

### Runtime layers

- `src/generator.js` — deterministic world generation. Mulberry32 PRNG seeded from a string, then
  smoothed elevation/moisture fields, biome classification, river carving, settlement and landmark
  placement. Framework-free.
- `src/species.js` — the shared data layer. `buildSpecies()` is pure and takes parsed JSON;
  `loadSpecies()` fetches `data/*.json`. Per-tile creature and plant selection is seeded by tile
  coordinates plus the world seed, so a tile reads identically on every revisit.
- `src/journal.js` — presentation only. All strings come from the loaded data.
- `src/main.js` — canvas rendering, input, save/load, and the only file that touches the DOM.

`species.js` and `generator.js` are deliberately free of DOM and framework code so they can be
tested under Node and reused when the React shell lands. Keep new game logic out of `main.js`.

### Module systems differ by directory

The root `package.json` sets `"type": "module"`, so **`src/` is ESM**. `tools/package.json` sets
`"type": "commonjs"`, so **`tools/` is CommonJS** and uses `require`. This is intentional — it lets
the browser sources use `import`/`fetch` without rewriting the build and server scripts.

### Local server

`tools/serve.js` is a dependency-free static server that serves the **repo root**, so `src/` and
`data/` are both reachable, and redirects `/` to `/src/index.html`. Serving the page's contents at
`/` would break its relative asset paths. It sends `Cache-Control: no-store`, so a stale page is
never a caching problem.

`tools/stop-server.js` reclaims the port. It kills a process only when the port answers with the
`X-Served-By` signature that `serve.js` sets, or failing that when the owning process is a node
process running `serve.js`. Anything else holding the port is reported and left alone.

## Known issues to be aware of

- **The generator cannot produce hills, mountains, or rivers.** Smoothing collapses the elevation
  field to roughly 0.09–0.48, but `classifyBiome` needs `> 0.64` for hills and `> 0.78` for
  mountains, so `highTiles` is always empty and `carveRiver` is never called. Highland species
  therefore never appear in play despite being the largest group in the data. See Phase 1 of
  `docs/build-plan.md`.
- **Two prototypes exist.** `main` holds the vanilla canvas version; `feat/react-upgrade` holds an
  unmerged React/Vite shell with atmosphere components but a weaker generator. The agreed direction
  is to adopt the React shell with `main`'s generator — see `docs/build-plan.md`.
- **`.github/workflows/npm-publish-github-packages.yml` publishes to a package registry**, which is
  the wrong target for a game; it should deploy to Pages.
- `settlement` has very few species, so villages read repetitively. The bestiary has no village
  flora or fauna; `tools/build-species-data.js` carries curated fallbacks for biomes that would
  otherwise be empty.

## Conventions

- No dependencies in the prototype. Anything added must justify the build step.
- Determinism matters: the same seed must produce the same world and the same journal text. Do not
  introduce `Math.random()` or time-based values into generation or species selection.
- Saved journeys live in `localStorage` keyed by seed and carry a `version`; bump `SAVE_VERSION` in
  `src/main.js` when the payload shape changes so old saves are discarded rather than misread.
