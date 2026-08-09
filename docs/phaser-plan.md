# Phaser Plan: One Engine, One Month, One Demo

This plan takes **South of Tethys: Jambhudweepa Adventure** from the vanilla-canvas prototype on
`main` to a hostable demo built on **React + Phaser 4 + TypeScript + Vite**.

It **supersedes Phase 0 of [build-plan.md](build-plan.md)**. Phases 1–4 of that document remain the
source of truth for *what* to build; this document changes *what it is built on*. Vision and tone
still live in [game-plan.md](game-plan.md).

Working branch: `feat/phaser-shell`.

---

## Context — why change the stack at all

The prototype on `main` renders the world with hand-written `canvas` calls in
[`src/main.js`](../src/main.js). That was the right call for proving the idea, and it is now the
ceiling. Everything the cozy slice still needs — smooth movement between tiles, a camera that
follows the player, fog that fades rather than snaps, ambient particles, a day/night tint, sprite
tiles, audio — is work the renderer would have to grow from scratch. Phaser 4 ships all of it, is
stable as of v4.1.0 (April 2026), and is free and open source with no runtime cost beyond its
bundle.

React is not there to draw the map. It is there to own the journal panel, the seed field, and the
buttons — DOM work that is genuinely painful inside a game canvas and genuinely easy in React.

TypeScript matters because the content layer is now large: 236 creatures, 70 flora, 11 biomes, each
with a required shape. Today a typo in `journalPrompt` surfaces as the string `undefined` in the
player's journal (this already happened once — see finding 3 in [build-plan.md](build-plan.md)).
Types turn that class of bug into a build error.

### What carries over

The `src/` layering — generation and content logic kept free of DOM and framework code, DOM touched
only in `main.js` — means the migration is cheap. Roughly 85% of the work survives:

| Asset | Fate |
| --- | --- |
| `docs/bestiary.md`, `data/*.json`, `tools/build-species-data.js` | **Unchanged.** Engine-agnostic. The largest body of work in the repo, carried over at zero cost. |
| [`src/generator.js`](../src/generator.js) | Ported to TS. Logic preserved; the flat-field bug fixed. |
| [`src/species.js`](../src/species.js) | Ported to TS. `fetch` becomes a build-time `import`. |
| [`src/journal.js`](../src/journal.js) | Ported to TS almost verbatim. |
| [`src/smoke-test.js`](../src/smoke-test.js) | Assertions preserved; the runner becomes Vitest. |
| [`src/main.js`](../src/main.js) | ~180 lines replaced by Phaser. The `localStorage` save/load block ports. |
| `tools/serve.js`, `tools/stop-server.js`, `run.cmd` | Retired — the Vite dev server replaces them. |

### What this decision retires

**`feat/react-upgrade` is abandoned, not merged.** Its ~1,800 lines of atmosphere work
(`FogOfWar`, `DayNightCycle`, `AmbientParticles`, `BiomeAmbience`) are DOM and CSS
reimplementations of effects Phaser provides natively through camera fades, tile tint, and
`ParticleEmitter`. Merging them would put two renderers in contention for the same pixels. The
branch stays unmerged as a **visual reference** for the day/night palette and the feel of the fog,
and is deleted once the demo ships. Its rewritten, weaker generator (`src/world.js`) is not used at
all.

---

## Decisions taken

| Decision | Choice | Why |
| --- | --- | --- |
| Engine | Phaser **4.1.x** | Stable since April 2026. The renderer rewrite means Phaser 3 tutorials do not always transfer, but the API surface this game needs (tilemap, sprites, tweens, camera, particles) is close to v3. Fallback: pin `phaser@3` — game code is unaffected because Phaser is confined to `src/game/`. |
| UI | React 19 for chrome only | The map is never React-rendered. React owns the journal, seed input, buttons. |
| Bridge | A ~30-line `EventBus` (`Phaser.Events.EventEmitter`) | The pattern from the official `phaserjs/template-react-ts`, without adopting the template's cruft. React never reaches into a scene; scenes never reach into React state. |
| Demo goal | **A polished 10-minute journey** | Depth over breadth. One good seed, real highlands and rivers, smooth movement, fog that lifts, a landmark arrival that lands. |
| Art | **Coloured tiles + glyphs, rendered well** | No new art needed in month one. Smooth camera, tile tint, soft fog, an animated `Varuna.png`. Sprite tiles are a post-demo pass; the tile renderer is written so swapping in an atlas is a data change. |
| Hosting | **GitHub Pages first, Hostinger later** | Free, deploys from CI on push, no credentials. The build is plain static files, so moving to Hostinger later is an upload, not a port. Requires setting Vite `base`. |

---

## Target structure

```
data/                    biomes.json, creatures.json, flora.json   ← unchanged, single source of truth
docs/bestiary.md         ← unchanged, authored prose
tools/build-species-data.js  ← unchanged, still CommonJS

index.html               single Vite entry point
vite.config.ts           base set for Pages
src/
  world/
    rng.ts               hashSeed, mulberry32, tileHash  (from generator.js + species.js)
    field.ts             noise fields — where the flat-field bug is fixed
    classify.ts          classifyBiome + thresholds
    rivers.ts            carveRiver
    generate.ts          generateWorld
    types.ts             Tile, World, Biome, Creature, Flora
  content/
    species.ts           buildSpecies (ported), data imported not fetched
    journal.ts           describeTile, creatureAction (ported)
  game/
    EventBus.ts          React ↔ Phaser bridge
    PhaserGame.tsx       React component that owns the Phaser.Game lifecycle
    scenes/
      Boot.ts            asset load
      WorldScene.ts      tile rendering, camera, input, movement, fog
  ui/
    App.tsx              layout + shared state
    JournalPanel.tsx     title, description, creature, flora, observe button
    SeedBar.tsx          seed input + new journey
  save.ts                versioned localStorage (ported from main.js)
  main.tsx               React entry
test/
  generator.test.ts      guardrails from build-plan.md §Phase 1
  species.test.ts        content shape + determinism
```

Rules that keep this from re-diverging:

- **`src/world/` and `src/content/` import neither React nor Phaser.** They run under plain Node, so
  the tests exercise the exact code the game ships.
- **Content lives in `data/*.json`.** No hardcoded creature or biome tables in TS.
- **Phaser is confined to `src/game/`.** Swapping engine versions — or engines — touches one folder.

---

## Four weeks

### Week 1 — Toolchain and the ported core

*Goal: `npm run dev` boots a React page with a Phaser canvas drawing a real generated map, and
`npm test` is green.*

1. Scaffold `package.json` (Vite 7, React 19, TypeScript 5, Phaser 4.1, Vitest), `tsconfig.json`,
   `vite.config.ts`, single root `index.html`.
2. Replace the Adventure Game Studio `.gitignore` with a Node/Vite one.
3. Port `src/generator.js` → `src/world/*.ts`, splitting rng / field / classify / rivers / generate.
4. **Fix the flat-field bug** — the highest-value change in the whole plan. Seven blur passes over
   white noise collapse elevation to ~0.09–0.48 while `classifyBiome` needs `> 0.64` for hills, so
   hills, mountains, desert and rivers can never appear and `carveRiver` is dead code. Fix by
   building elevation from 3–4 octaves of value noise and renormalising each field to 0–1 after
   smoothing, plus a seeded highland spine with radial falloff so mountains form ridges.
5. Re-tune `classifyBiome` against the corrected field; confirm `carveRiver` now runs and rivers
   terminate in sea, lake or wetland.
6. Port `species.js` → `src/content/species.ts` and `journal.js` → `src/content/journal.ts`, typed,
   with `data/*.json` imported at build time rather than fetched.
7. Port `smoke-test.js` to Vitest and add the guardrails from build-plan Phase 1: every biome
   appears across 20 seeds; every seed yields ≥1 mountain, ≥1 hills, ≥1 river tile; every river
   chain reaches water; the landmark is reachable; the same seed is byte-identical twice; the start
   tile is walkable and off the border.

**Done when:** a rendered map at three sample seeds visibly shows highlands with rivers running to
the coast, and the new tests fail if the flat-field bug returns.

### Week 2 — The exploration loop in Phaser

*Goal: parity with `main`, but better to move around in.*

1. `WorldScene` draws tiles as a pooled grid of rectangles + glyph text, sized from the world grid.
   Written so a later texture atlas is a data swap, not a rewrite.
2. Camera follows the player with a lerp and is clamped to world bounds.
3. Discrete grid movement (WASD/arrows) with a short tween between tiles and an input lock during
   the tween, so movement reads as walking rather than teleporting. `sea` stays impassable.
4. Fog of war on the discovered-tiles set, with a tint/alpha fade rather than a hard black square.
5. `Varuna.png` as a player sprite anchored by the feet, with the facing flip carried over from
   [`main.js:122`](../src/main.js#L122).
6. `EventBus` wiring: scene emits `tile-entered` / `world-ready`; React emits `new-journey` /
   `observe`.
7. React journal panel and seed bar rebuilt from `index.html`'s markup.
8. Versioned `localStorage` save/load ported; bump the version so old saves are dropped, not
   misread.
9. Touch/click-to-move so the demo works on a phone.

**Done when:** generate a seed, wander, watch fog lift, read a coherent journal, sketch a creature,
close the tab, reopen, and find the journey intact.

### Week 3 — The cozy slice

*Goal: a session that ends with a feeling, not just a state change.*

1. **Landmark quest with a beat** — a hint at the start camp, a directional nudge in the journal, a
   written journal page on arrival.
2. **Generated place names** for settlements, rivers and landmarks from a seeded syllable table:
   invented but evocative, per the game-plan's respectfulness pillar.
3. **Landmark variety** — 5–6 kinds (giant banyan, hot spring, shell beach, hill shrine, old
   observatory) with distinct text and biome affinities.
4. **Journal shows nearby geography**, not just the current tile — this is what makes the map
   legible.
5. **Day/night tint** via a Phaser camera/post filter, slow enough that a short session sees one
   gentle shift.
6. **Ambient particles** per biome group via `ParticleEmitter` — dust, pollen, spray.
7. **Make `travelCost` real** — it already sits unread in `data/biomes.json`. Slow movement on
   wetland and hills; no hunger, no threat.
8. **Journal export** as text or image — the shareable artifact and the natural end of a session.

### Week 4 — Ship and polish

1. GitHub Actions: install → typecheck → test → build on push and PR. **Done**, plus a browser job
   running the Playwright suite against Chromium.
2. Pages deploy. **Written and verified, but parked** — the workflow is `workflow_dispatch` only
   until Pages is enabled for the repository under Settings → Pages → Source: "GitHub Actions",
   because `configure-pages` 404s until then and a permanently red workflow is worse than none.
   Vite `base` comes from `DEPLOY_BASE`, and the browser suite passes against a subpath build
   served at `/4000BCESaraswathy/`, so only the setting is missing.
3. Add a `LICENSE` (none currently exists) and replace the npm-publish workflow, which cannot
   succeed and targets the wrong destination anyway.
4. Rewrite `README.md` to lead with the play link, a screenshot, and `npm install && npm run dev`.
5. Update `src/PLAYTEST.md` for the new build; fix 3–5 showcase seeds.
6. Retire `main`'s vanilla files and the `tools/serve.js` stack in one commit, so the repo has a
   single way to run.
7. Playtest round; log findings in `docs/playtest-notes.md`.
8. Delete `feat/react-upgrade`.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Phaser 4 is four months old; most tutorials and answers target v3, and the renderer rewrite means v3 pipeline/FX code does not transfer | Phaser lives only in `src/game/`. If v4 blocks us, pin `phaser@3` — scenes change, game logic does not. |
| The generator rewrite changes every existing seed | Accept it. Current seeds produce flat maps. Choose and document new showcase seeds after the fix. |
| Art becomes the schedule | Month one ships coloured tiles and glyphs deliberately. The tile renderer is built so an atlas swap is data, not a rewrite. |
| Two prototypes re-diverge | `feat/react-upgrade` is deleted in week 4, and `main`'s vanilla renderer is retired in the same week — not left as a second way to run. |
| Bundle size (Phaser is ~1 MB gzipped) | Acceptable for a hosted demo. Revisit with a Vite manual chunk if first paint suffers. |

---

## Definition of done for the demo

1. `npm ci && npm run typecheck && npm test && npm run build` is green in CI.
2. Every biome in `data/biomes.json` can appear, and every generated map has highlands **and** at
   least one river reaching water.
3. Creatures and flora are drawn from `data/*.json`, each observable in its habitat, each recorded
   correctly in the journal — no `undefined` reaches the player.
4. A named landmark, discoverable in 5–10 minutes, that writes a journal page on arrival.
5. The journey persists across reloads and can be exported.
6. The game is playable from a public URL with no install, on desktop and phone.
