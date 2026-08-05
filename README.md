# The Ark of South Tethys: A Solarpunk Odyssey

Stories from the Edge of Time.

## South of Tethys: Jambhudweepa Adventure

A cozy 2D exploration game and procedural world map generator. The player travels a gentle,
geography-driven Jambhudweepa — rivers, coasts, forests, mountains, settlements — meeting creatures
and plants along the way and keeping a calming travel journal. Combat is absent by design.

A playable browser prototype exists today: a seeded tile map, a wandering player, fog that lifts as
you go, and a journal that names the terrain, a creature, and a plant for every tile.

## Run It Locally

No dependencies are needed. From the repo root:

```
.\run              Serve the prototype at http://localhost:4173 and open it
.\run stop         Stop the server without starting a new one
.\run test         Run the smoke test
```

Use `.\run`, not bare `run` — PowerShell does not search the current directory. Re-running
`.\run` restarts cleanly over a previous instance. Change the port with `set PORT=4174` first.

Move with **WASD** or the **arrow keys**, generate a new map with a seed of your choosing, and press
**Observe creature** to record a sketch. See [src/PLAYTEST.md](src/PLAYTEST.md) for what to look for.

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
- [Build plan](docs/build-plan.md): repo audit, chosen tech track, and the phased work to a cozy playable slice.
- [Game plan](docs/game-plan.md): vision, MVP, gameplay loop, milestones, and open questions.
- [World generator design](docs/world-generator.md): generation inputs, passes, tile fields, and success criteria.
- [Bestiary and herbarium](docs/bestiary.md): the authored flora and fauna canon, by region.
- [Prototype source notes](src/README.md): the browser prototype's source layout.

## Known Limitation

The generator cannot currently produce hills, mountains, or rivers — smoothing flattens the
elevation field below the thresholds that classify them, so river carving never runs. Highland
species exist in the data but are unreachable in play. Fixing this is
[Phase 1](docs/build-plan.md#3-phases) and the next substantial piece of work.
