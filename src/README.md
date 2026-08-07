# Source Layout

**South of Tethys: Jambhudweepa Adventure** — React shell, Phaser canvas, TypeScript throughout.
Run it with `npm run dev` from the repo root.

| Folder | Role |
| --- | --- |
| `world/` | Deterministic world generation. Seeded RNG, noise fields, biome classification, river carving, pathfinding. |
| `content/` | The data layer over `data/*.json`: which creature and plant live on a tile, and the journal prose. |
| `game/` | Everything that knows Phaser exists — the scene, the tile textures, and the React↔Phaser bridge. |
| `ui/` | React chrome: journal panel, seed bar, layout, styles. |
| `main.tsx` | React entry point. |
| `save.ts` | Versioned `localStorage` journeys, keyed by seed. |

## The rules that keep this from tangling

**`world/` and `content/` import neither React nor Phaser.** They run under plain Node, so
`test/` exercises the exact code the game ships rather than a stand-in. Keep new game logic there,
not in a scene.

**Phaser is confined to `game/`.** Swapping engine versions — or engines — touches one folder.

**Content lives in `data/*.json`.** No hardcoded creature or biome tables in TypeScript. The
creature and flora files are generated from `docs/bestiary.md`; run `npm run build:data` rather
than editing them.

**React never renders a tile.** The map is a Phaser canvas; React owns the DOM around it. The two
talk over `game/EventBus.ts` and nothing else.

**Determinism is a promise.** The same seed must produce the same world and the same journal text,
so nothing in `world/` or `content/` may use `Math.random()` or the clock. All randomness comes
from `world/rng.ts`.

See [PLAYTEST.md](PLAYTEST.md) for what to look for while playing, and
[../docs/phaser-plan.md](../docs/phaser-plan.md) for where this is going.
