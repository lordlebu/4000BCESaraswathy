# The Ark of South Tethys: A Solarpunk Odyssey

Stories from the Edge of Time.

## South of Tethys: Jambhudweepa Adventure

A cozy 2D exploration game and procedural world map generator. The player travels a gentle,
geography-driven Jambhudweepa — rivers, coasts, forests, mountains, settlements — meeting creatures
and plants along the way and keeping a calming travel journal. Combat is absent by design.

A playable browser prototype exists today: a seeded tile map with real highlands and rivers, a
wandering player, fog that lifts as you go and settles behind you, and a journal that names the
terrain, a creature, and a plant for every tile.

## Run It Locally

```
npm install
npm run dev          Serve at http://localhost:4173 and open it
npm test             Run the test suite
npm run typecheck    Typecheck without emitting
npm run build        Produce a static dist/ ready to host
```

Move with **WASD** or the **arrow keys**, or tap where you want to go. Generate a new map with a
seed of your choosing, and press **Observe creature** to record a sketch. A seed travels in the
URL — `?seed=river-road` — so a journey can be shared as a link. See
[src/PLAYTEST.md](src/PLAYTEST.md) for what to look for.

Built with React, Phaser 4, TypeScript and Vite. `npm run build` emits plain static files, so the
demo can be hosted on GitHub Pages, Hostinger, or anything else that serves a folder.

## World Content

The flora and fauna canon lives in [docs/bestiary.md](docs/bestiary.md): 300 species across seven
regions, from the Saraswati deltas to the Asura-tainted horrors.

`data/creatures.json` and `data/flora.json` are **generated** from that document — do not edit them
by hand:

```
npm run build:data
```

`data/biomes.json` is hand-written and holds the terrain palette, travel costs, and the journal
description for each biome.

## Documentation

- [CLAUDE.md](CLAUDE.md): architecture, commands, and known issues for anyone (or any agent) picking up the code.
- [Phaser plan](docs/phaser-plan.md): the current plan — React + Phaser 4 + TypeScript, and the four weeks to a hosted demo.
- [Build plan](docs/build-plan.md): the earlier repo audit. Phases 1–4 still hold; Phase 0 is superseded by the Phaser plan.
- [Game plan](docs/game-plan.md): vision, MVP, gameplay loop, milestones, and open questions.
- [World generator design](docs/world-generator.md): generation inputs, passes, tile fields, and success criteria.
- [Bestiary and herbarium](docs/bestiary.md): the authored flora and fauna canon, by region.
- [Prototype source notes](src/README.md): the browser prototype's source layout.

## Where It Stands

The generator used to flatten its own elevation field below the thresholds that classify hills and
mountains, so highlands and rivers could never appear and roughly half the bestiary was unreachable
in play. That is fixed: terrain is now built from octaves of value noise over a seeded highland
spine, normalised so the classifier's full range is reachable, and `test/generator.test.ts` fails
if it ever regresses.

Still to come, in [docs/phaser-plan.md](docs/phaser-plan.md): generated place names, landmark
variety, a day/night pass, ambient particles, and journal export.
