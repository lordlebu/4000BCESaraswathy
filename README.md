# 4000BCESaraswathy

Stories from the Edge of Time.

## Current Project Direction

**South of Tethys: Jambhudweepa Adventure** is planned as a simple 2D indie exploration game and procedural world map generator. The player travels through a gentle, geography-driven version of Jambhudweepa, discovering rivers, coasts, forests, mountains, settlements, and creatures while keeping a calming travel journal.

The immediate goal is to define the build structure before moving into a playable browser prototype.

## Run It Locally

From the repo root, using the `run` launcher (no dependencies needed for the prototype):

```
.\run            Serve the prototype at http://localhost:4173 and open it
.\run test       Run the world generator smoke test
.\run dev        Vite dev server (feat/react-upgrade branch)
.\run build      Production build, then preview it (feat/react-upgrade branch)
```

Move with WASD or arrow keys. See [src/PLAYTEST.md](src/PLAYTEST.md) for what to look for.

## Planning Documents

- [Build plan](docs/build-plan.md): current repo audit, chosen tech track, and the phased work to reach a cozy playable slice.
- [Game plan](docs/game-plan.md): vision, MVP, gameplay loop, milestones, and open questions.
- [World generator design](docs/world-generator.md): map generation inputs, passes, tile fields, terrain palette, and success criteria.
- [Bestiary and herbarium](docs/bestiary.md): the full authored flora and fauna canon, by region.
- [Creature seed data](data/creatures.json): first creature concepts for biome-based encounters.
- [Biome seed data](data/biomes.json): first terrain palette and travel metadata.
- [Prototype source plan](src/README.md): planned source layout for the first browser implementation.

## Near-Term Next Step

Consolidate the two prototypes onto the React/Vite shell with `src/generator.js` as the single world generator, then fix the elevation field so hills, mountains, and rivers can actually appear. See [Phase 0 and Phase 1](docs/build-plan.md#3-phases).
