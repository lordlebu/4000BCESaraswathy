# Activity scenes

Five paintings so far: `stoop.png`, `stalk.png`, `work.png`, `rest.png`, `rest-camp.png`.

**The set grew from three to about twenty-four**, and none of the new ones is a blocker. A fourth
gesture arrived (`fish`), the night wants one painting per shelter kind, and a making activity can
now narrow by canon's process word — `stoop-weaving.png`, `work-smelting.png`. Anything unpainted
falls back to the plain gesture, and a gesture with no painting at all still opens and works.

`docs/art-placement.md` is the queue, in the order worth doing.

## The six nights

`rest-<shelter>.png`, one per kind of place a night can be spent. **This is what the shelter
vocabulary is for** — `NIGHT_RESTORES` is flat, so sleeping in the woods and sleeping in a town are
worth the same rest, and what differs is the picture and (later) what can happen in it.

| File | The night |
|---|---|
| `rest-palace.png` | the great house in the grandest town: a swept floor, a lamp you did not have to ration |
| `rest-settlement.png` | somebody's spare room, and other people awake nearby |
| `rest-roof.png` | in out of it, under somebody else's stonework — a ruin, not a home |
| `rest-camp.png` | a fire ring somebody banked before you got there ✓ *done* |
| `rest-tent.png` | the hide tent, pitched and pegged — **the only one he built** |
| `rest-bedroll.png` | oiled cloth on open ground, no fire |
| `rest.png` | the fallback, when a kind has no painting of its own ✓ *done* |

An unpainted kind falls back to `rest.png`, so these land one at a time and in any order.

## The ground a gesture happens on

`stoop-<biome>.png`, `work-<biome>.png`, `stalk-<biome>.png`, `fish-<biome>.png` — one per kind of
ground, for the cases where the same gesture looks nothing like itself somewhere else. **Cutting
herbs off a cliff and cutting reeds at a waterline are both a stoop**, and a single painting cannot
be both.

Biome ids come from `data/biomes.json`: `mountains`, `hills`, `forest`, `wetland`, `river`, `coast`,
`plains`, `desert`, and the stamped ones — `snow`, `lava_field`, `sky_island`, `sky_underside`.

Entirely optional. An unpainted biome falls back to the plain gesture, which is what every take
shows today.

Drop a built PNG in here and it appears — `src/ui/scenes.ts` globs this folder, exactly the way
`plates.ts` globs the species plates. No list to update, no code to change.

Unlike the 297 species plates, **this set can actually be finished**, so there is no queue and no
priority order. A gesture with no painting still opens, still plays, and simply shows a blank
parchment panel where the picture goes.

## What they are of

A species plate is one animal against a suggestion of habitat. A scene is **a pair of hands at
work** — the traveller is in it. That difference is what makes the modal read as an activity
rather than as a bestiary entry that happens to have a button.

| File | The moment |
|---|---|
| `stoop.png` | cutting or digging a plant — patient, close, both hands busy |
| `stalk.png` | moving low through cover toward an animal at a distance |
| `work.png` | striking stone with a hammerstone, chips flying |

A stalk prefers the **animal's own plate** when one exists — the animal is the subject — and falls
back to `stalk.png`. So `stalk.png` is the least urgent of the three.

The prompts are in `docs/activity-scene-prompts.md`.
