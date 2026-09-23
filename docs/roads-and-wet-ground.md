# Roads and wet ground — closed

Seven asks from play, in one programme: paths that vanished and a player who got stuck; no bridges;
wading in river and swamp; places and buildings laid out with some sense; roads lit and easy to
follow while rivers are hard going; swamp that looks sunk and runs into the river; and all of it by
methods that are known to work. The plan was kept as a published page and updated as each phase
landed; this is the record of what shipped and why.

## What was a bug

**A reload wiped every road, ford, rail and plank.** `bakeWorld` stored each tile's biome and height
band and nothing else, so the four flags that grew on `Tile` later were never written. A seed drew
its paths on the first visit and never again; on the Aravali the rail and the planks went with them,
and a reload cut 2,121 reachable tiles to 863 and six of its twelve places off. Bake format 3 stores
the flags (`TILE_FLAGS`, append-only, a fifth bit for `bridge` since). `test/bake.test.ts` compares
the whole tile now, less a named list of what is deliberately not kept, so a sixth flag fails by name.

**Click-to-walk died after one press released off the map.** The scene counted pointers so a pinch
never walks, and heard only `POINTER_UP`, which Phaser fires for a release over the canvas. Press,
drag onto a panel, let go, and every later click read as a second finger — on every map, until a
reload. `lost` in `game/gesture.ts` ends a pointer released off the map; window blur clears them.

**A click on unreachable ground did nothing.** It walks to the nearest reachable tile now
(`nearestReachable`) and marks where the click landed.

**A letter typed on a phone walked the traveller.** A soft keyboard sends a letter with no `code`, so
the guard keyed on `event.code` let it through and Phaser recorded W as held. The game's keyboard is
off while any text field has focus, and every key is released on each focus change.

## What was design

| Phase | What it does | Where |
|---|---|---|
| Costs | River 3 on foot; road and bridge a flat 0.75; tap-to-walk prefers road. Easing no longer turns marsh into river. | `data/biomes.json`, `world/routes.ts`, `content/species.ts` |
| Bridges | A straight river crossing of one to three tiles that the road passes straight through is a bridge; anything else is a ford. Sky pools and the Nomad Ground's crossing stay fords. | `world/bridges.ts` |
| Wading | River to the waist, ford to the shins, swamp to the feet, dry on a bridge; the figure is cropped at the surface with a ring. The sky pools keep their own fade. | `game/wading.ts` |
| Wet relief | Swamp draws a half-strength bank shadow against dry land, none against water, and blends into the river both ways. | `sunkAt`, `shoreAt`, `blends` in `game/frames.ts` |
| Dugout | On Lothal the dugout is in the kit from the first morning: step from a bank into the river and you are paddling (0.5 a step), seated in the hull; step onto land or a bridge and you walk. | `game/afloat.ts`, `boatFor` in `content/kit.ts`, canon's `vehicles` |
| Road light | The road is revealed six tiles ahead as you walk it, never the whole network. Lamps at bridge ends, junctions and every few tiles glow at night, shown once their tile is known. | `game/roadLight.ts` |
| Places | Candidates are weighted by spread against an even layout, and an empty quarter counts 1.6x; roads are a spanning tree plus up to two loops; towns build along the road, never on it; a forecourt round each place stays clear, except at a camp. | `world/fieldMap.ts`, `networkLegs` in `world/routes.ts`, `planHuts` |

The owner's rulings, which are the reasons behind several of those rows: the road is revealed as you
walk it rather than all at once, because every road shows roughly where every place is; the dugout
is in the kit from the start and boards without a button; river bridges get their own art and the
sky-island art stays separate; yurts only in camps and huts only in towns, and camps away from
cities.

## Measured

- Lothal's route tiles in water: 40.8 a seed to 2.1; its longest wet stretch 27 tiles to 3; its
  visible road 63 tiles to 102.
- Places: Clark–Evans 0.95–1.02 (a random scatter) to 1.13–1.30; quarters of the map reached 3.1–3.8
  to 3.6–4.0. `test/layout.test.ts` holds floors under the new values.
- Towns: the first road-first density halved every town (Lothal 30 huts to 14); the kept one leaves
  them near where they were, the difference being ground that is street and forecourt now.
- `findPath` on a heap: map generation about 27% faster, with every path identical to the old
  sorted array's on 160 real walks.

## The art

The owner was shown code-drawn versions of the bridge, the dugout and the lamp on the game's own
tiles and kept them. `tools/draw-river-art.py` draws them into `assets/source/`;
`tools/build-river-craft.js` builds the sheets. The bridge is drawn flat, and the builder turns the
north–south pieces and only then adds the south face and a shadow falling south and a little east —
lit after turning, so the light is the same whichever way a bridge runs. Painted art dropped into
`assets/source/` gets the same treatment. The image prompts written for a generator are in the
published plan, if painted versions are ever wanted.

## Left

Nothing in the seven asks. Two things noticed and not done: a traveller or a wandering animal does
not wade or paddle (the player does); and the hull has no bow-on picture, so paddling north or south
shows the side view.
