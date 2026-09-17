# Art handover

Everything the art still wants, where each file goes, and what is on screen until it arrives.

**Start here for an art session.** `docs/art-placement.md` is the mechanism — which folder, which
filename, what falls back. This is the *work*: the inventory, the order, the prompts for the slots
that do not have one yet, and the things that have gone wrong before.

---

## The one rule that makes this safe to hand over

**Every slot already renders something.** A painting **replaces** what is there; it never fills a
gap. So this queue can be worked in any order, in any quantity, by anybody, and each file takes
effect the moment it lands — no code, no list to update, no build step.

That is not a convenience. It is what keeps art off the critical path: 341 species reach the game
and one painted plate is a good session's work, so the set will never be complete and no panel may
wait for it.

(341 rather than canon's 376: `export_canon_bundle.py` drops the 35 species canon marks
`placement: "lore"`, so they never reach the game and need no plate. The holdback is applied at the
export boundary, which is why nothing in `src/` reads the field.)

`src/ui/art.ts` globs `./*/*.{svg,png,webp,jpg,jpeg}`, one directory level wider than the loaders it
replaced — so **a new folder of art needs no code either.**

---

## The inventory

| Folder | Have | Wanted | Fallback while missing | Finishable? |
|---|---:|---:|---|---|
| `src/ui/scenes/` | 5 | ~24 | the plain gesture, then a blank panel | **yes** |
| `src/ui/marks/` | 4 | 47 | an emoji in `ThingIcon` | **yes** |
| `src/ui/places/` | 0 | 6 kinds, then 37 | prose alone | **yes**, at the kind tier |
| `src/ui/things/` | 0 | 10 kinds, then 143 | the category mark, then an emoji | **yes**, at the kind tier |
| `src/ui/events/` | 0 | one per event | the night's scene, then a blank panel | n/a — no events authored |
| `src/ui/plates/` | 20 | 341 | a derived silhouette | **no, by design** |
| `src/ui/portraits/` | 14 | 15 | a trade-derived silhouette | **yes** — one left |

**Four of those seven are finishable in a sitting or two**, and three of them are finishable
*twice over* because they have a category tier underneath: six paintings cover every place in the
game, ten cover all 143 things, ten more cover every item kind. Paint the category first.

### Where the prompts already are

| Folder | Prompts |
|---|---|
| `plates/` | `docs/plate-prompts.md` — 365 lines, style block, hard requirements, the first twenty |
| `marks/` | `docs/mark-prompts.md` — the four that exist and what is missing |
| `scenes/` | `docs/activity-scene-prompts.md` — style block and per-gesture subject lines |
| `portraits/` | `docs/portrait-prompts.md` — what canon says, and the framing failure that costs a portrait |
| **`places/`, `things/`, `events/`, the six nights** | **below — these had none** |

`docs/art-direction.md` holds the five rules the art follows and what each one cost to learn.
`docs/art-brief.md` is the long-form original.

---

## The order worth doing

Cheapest-first, and each step is independently shippable.

1. **The six nights** — `rest-<shelter>.png`. Six files and the shelter vocabulary means something.
2. **The six place kinds** — `kind-<poikind>.png` in `places/`. Six files and every place in the game has a view.
3. **The ten item kinds** — `kind-<itemkind>.png` in `things/`. Ten files and all 143 things have a plate.
4. **`fish.png`** in `scenes/` — the fourth gesture has no painting at all.
5. **The ten `kind-*` marks** — the category tier under (3), for anywhere a mark is wanted rather than a plate.
6. **Vessa's portrait** — the only one of fifteen missing.
7. **Everything else**, forever: species plates, the seventeen making scenes, the individual places and things.

Steps 1–6 are **38 files** and they move every folder except `plates/` from "nothing" to "complete
at the category tier". That is the whole of the leverage.

---

## The gaps: prompts for the slots that had none

All four use the shared style block. Copy it once, then append one subject line.

> Watercolour illustration from a field naturalist's notebook, ancient South Asia, 4000 BCE.
> Painted with visible brush and pigment granulation on off-cream paper. Muted, low-saturation
> colour — nothing neon, nothing that glows. Soft gradients within each shape and gentle ambient
> shading. Warm near-black for the darks, never pure black. Unhurried and calm; there is no threat
> in this world and nothing is in danger. Not photographic: no lens blur, no specular highlights,
> no 3D render. No text, no caption, no label, no border, no frame, no watermark, no signature.
>
> **Subject:** *(one line from below)*

**Hard requirements, all five, every time.** Each is here because an asset was lost to it:

1. **No text of any kind.** A naturalist illustration *looks* like it should be labelled, so models
   add labels unprompted. This is the most likely failure.
2. **No border or frame.** The card draws its own edge; a painted one reads as a picture of a picture.
3. **No watermark, no signature.** A mark across the subject cannot be cropped out.
4. **The right aspect** — stated per group below. Getting it wrong loses the top and bottom to
   `object-fit: cover`.
5. **Lossless PNG**, not JPEG.

### The six nights — `src/ui/scenes/rest-<shelter>.png`

**Landscape 4:3.** A moment, with the traveller in it or just out of frame. These are what the
shelter vocabulary is *for*: `NIGHT_RESTORES` is flat, so every night restores the same and what
differs is the picture and — once events have content — what can happen in it.

| File | Subject line |
|---|---|
| `rest-palace.png` | A swept upper room in a large mud-brick house at night, a good oil lamp burning steadily on a low table beside an open notebook and a folded travelling cloak, a woven mat bed made up on the floor, warm light on plastered walls. |
| `rest-settlement.png` | A borrowed corner of somebody's house at night, bedding laid on a swept floor, a small lamp, a doorway open onto a lane where one other window is still lit. Quiet and slightly crowded. |
| `rest-roof.png` | Sheltering inside an old stone ruin at night, bedroll laid on flagstones between fallen blocks, a small lamp throwing light up broken walls, open sky visible through a gap overhead. Nobody has lived here in a long time. |
| `rest-tent.png` | A low hide tent pitched and pegged on open ground at dusk, guy-lines taut, a small fire in front of it, the traveller's staff leaned against the entrance. Newly put up and holding. |
| `rest-bedroll.png` | An oiled cloth bedroll unrolled on bare open ground at dusk, no fire, a satchel for a pillow, wide empty country and a cold sky. It counts as a night and no more. |
| `rest.png` *(have)* | the generic fallback — keep it |

`rest-camp.png` already exists. An unpainted kind falls back to `rest.png`, so these land one at a
time.

### The six place kinds — `src/ui/places/kind-<kind>.png`

**Landscape, wide — 16:7.** Cropped with `object-fit: cover` across the top of `PlacePanel`, so
compose for a band. Around 800px wide is plenty; it is never shown larger than the dock.

A place view is **a view, not a scene** — no traveller, no hands. The player is standing here and
looking out.

| File | Subject line |
|---|---|
| `kind-settlement.png` | A small mud-brick town seen from its edge in flat afternoon light: low flat-roofed houses, a lane, drying cloth, smoke from one roof, worked ground around it. Lived in and ordinary. |
| `kind-travel_node.png` | A halt on a road: a stone-ringed fire scar, a low wall to sit on, cart ruts, a single leaning marker post, open country beyond. Somebody was here and is not now. |
| `kind-archaeological_site.png` | Dressed stone ruins in open ground, a collapsed wall line and a fallen block or two, lichen on the lower courses, grass growing through. Old, quiet, and not dangerous. |
| `kind-eco_site.png` | A place that is about what grows in it: dense reeds or a stand of trees against water, layered greens, birds small and distant. No buildings at all. |
| `kind-anomaly.png` | Ground that is wrong in one specific way — a fused glassy scar across bare earth, or strata that bend where they should lie flat — in plain daylight, described rather than dramatised. Unsettling, never threatening. |
| `kind-wilderness.png` | Open country with no sign of anybody: a ford, a ridge line, scrub and rock, weather coming across. Wide and empty. |

Individual places (`poi_glass_scar.png`, `poi_lothal_camp.png`) replace their kind whenever somebody
has an afternoon. **Read the entity's `arrival` prose in canon before painting one** — see the
gotcha below.

### The ten item kinds — `src/ui/things/kind-<kind>.png`

**Square, ~256px, transparent background.** Drawn at 20–44px beside a name, so it has to read at a
glance: one object, centred, no scene, no hand holding it.

| File | Subject line |
|---|---|
| `kind-tool.png` | A hafted bronze-age working tool — blade lashed to a wooden handle with cord — laid flat, three-quarter view. |
| `kind-weapon.png` | A reed-shafted spear with a bone or bronze point, laid diagonally, no blood and nothing menacing. |
| `kind-container.png` | A round-bellied unglazed earthenware jar with a narrow neck, plain, slightly irregular. |
| `kind-textile.png` | A folded length of undyed woven cloth with a visible weave and a slubbed edge. |
| `kind-food.png` | A shallow dish of prepared grain with a few visible spices, plain and unstyled. |
| `kind-physic.png` | A small stone mortar with the pestle standing in it and a scatter of dried leaf beside. |
| `kind-light.png` | A closed clay oil lamp with a shielded wick, unlit, seen three-quarter. |
| `kind-record.png` | A palm-leaf sheet with a reed stylus laid across it — **blank leaf, no writing** (see hard requirement 1). |
| `kind-ornament.png` | A strung line of drilled shell beads, loosely coiled. |
| `kind-shelter.png` | A rolled and strapped hide tent bundle with its pegs bound alongside. |

Materials share the folder and the same rule: `material_reed_fibre.png`, square, one substance on a
plain ground.

### Events — `src/ui/events/<event id>.png`

**Landscape 4:3.** Nothing to draw yet: `content/events.ts` ships an empty registry on purpose, and
the framework is in place so the first authored event needs no wiring. See `docs/events-plan.md`.

When there are events, the register is: **a moment with the traveller in it**, the same as `scenes/`
— the difference is that a scene is something he is *doing* and an event is something that is
*happening*. Firelight, weather, an animal at a distance, a figure on a road.

---

## Gotchas, all of them paid for

**Read the art before writing prose about it — and before repainting it.** A point of interest was
authored as a temple in four stacked courses; the painted sheet was a single domed temple on one
plinth, and the recommendation that followed ("regenerate the art") was written *without opening the
file*. Looking took ten seconds and reversed it. Canon's entity now follows the painting.

**A raw from an image model does not go in these folders.** It is 2–8 MB rather than ~100 KB and is
named `Gemini_plate-desert-fox.png`, which nothing will ever ask for — so it ships the megabytes and
draws nothing. Raws live in `assets/source/plates/`. `test/platesFolder.test.ts` is the only thing
that can see this mistake.

**The filename convention differs per folder and a wrong one fails silently** — it matches nothing,
throws nothing, and quietly keeps drawing the fallback. That has happened three times.

| Folder | Named after | Right | Wrong, and silent |
|---|---|---|---|
| `plates/` | the **engine** id | `desert-fox.png` | `fauna_desert_fox.png` |
| `portraits/` | the bare person | `thrali.png` | `npc_thrali.png` |
| `marks/` | namespace + canon word | `class-fibre.svg` | `fibre.svg` |
| `scenes/` | gesture, or gesture-variant | `rest-camp.png` | `resting.png` |
| `places/` | canon's **poi id, whole** | `poi_glass_scar.png` | `glass-scar.png` |
| `things/` | canon's **item id, whole** | `item_bronze_knife.png` | `bronze-knife.png` |

Species ids are rewritten on the way in; everything else is kept whole.

**`git add -A` will sweep up a stray PNG.** A 6.4 MB lore map reached a canon commit that way, as a
side effect of staging a linter change. Check `git status` before staging when a large file is loose
in the tree.

**`marks/` takes SVG and should.** A mark is a line drawing at 20px, which is exactly where a bitmap
has to ship at three sizes and an SVG does not. Since `art.ts` landed, *every* folder accepts SVG —
before it, only `marks/` did, so the first SVG plate would have silently not appeared.

---

## What the art is *not* blocking

Nothing. Stated plainly because it is the point of the arrangement, and because it is worth checking
against before anybody treats a missing painting as a bug:

- A gesture with no scene opens, plays and resolves, with a blank panel where the picture goes.
- A species with no plate draws a derived silhouette and is fully playable.
- A place with no view reads exactly as it did before `places/` existed.
- A thing with no plate wears its category mark, and failing that an emoji.
- An event with no painting borrows the night's scene, then `rest.png`, then a blank panel.

`test/art.test.ts` asserts the fallback rather than the art: a missing file and a missing folder
both answer null, and a regression that made either throw would take the game down on a fresh clone
rather than degrade.
