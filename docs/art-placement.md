# Art placement

Every slot the interface will draw a picture into, what a file must be called, and what is on
screen until one arrives.

> **Doing the art rather than wiring it? Start at `docs/art-handover.md`.** That is the inventory,
> the order worth working in, prompts for the four slots that had none, and the gotchas. This file
> is the mechanism underneath it.

**Nothing here is a blocker and nothing here is a gap.** Every slot already renders something — a
derived silhouette, a category mark, an emoji, or prose alone. A painting *replaces* what is there.
So this queue can be worked in any order, in any quantity, by anybody, and each file takes effect
the moment it lands. No code, no list to update, no build step.

That is not a convenience; it is the thing that keeps art off the critical path. Canon holds a few
hundred species and one painted plate is a good session's work, so the set will never be complete
and no panel may wait for it.

---

## How it works

`src/ui/art.ts` globs `./*/*.{svg,png,webp,jpg,jpeg}` — one directory level wider than the four
loaders it replaced. **A new folder under `src/ui/` is picked up by existing code the moment
somebody puts a file in it.**

Four near-identical twenty-line loaders had already begun to disagree — one admitted SVG and three
did not — so whoever added the first SVG plate would have found out by it silently not appearing.

The named modules stay as the doors callers use, one line each, because the part that actually
costs time is different per folder: **the naming convention.** A file under the wrong one matches
nothing, throws nothing, and quietly keeps drawing the fallback. That has happened three times.

| Folder | Named after | Example | Wrong, and silent |
|---|---|---|---|
| `plates/` | the **engine** id | `desert-fox.png` | `fauna_desert_fox.png` |
| `events/` | the event's id | `event_third_night_dream.png` | a title, a slug |
| `portraits/` | the bare person | `thrali.png` | `npc_thrali.png` |
| `marks/` | namespace + canon word | `class-fibre.svg` | `fibre.svg` |
| `scenes/` | the gesture, or gesture-variant | `rest-camp.png` | `resting.png` |
| `places/` | canon's **poi id, whole** | `poi_glass_scar.png` | `glass-scar.png` |
| `things/` | canon's **item id, whole** | `item_bronze_knife.png` | `bronze-knife.png` |

Species ids are rewritten on the way in and everything else is kept whole. `making.ts` states why
at the top of its own file: the making layer cross-references far harder than the species layer, so
a second naming would be a second thing to get wrong.

---

## The queue

### `scenes/` — activity cards · 5 of ~24

A pair of hands at work, with the traveller in it — as distinct from a plate, which is one animal
against a suggestion of habitat. That difference is what makes the card read as an act rather than
as a bestiary entry with a button.

**Have:** `stoop`, `stalk`, `work`, `rest`, `rest-camp`.

| Wanted | The moment |
|---|---|
| `fish.png` | knee-deep, a spear held still, the water doing the waiting |
| `rest-roof.png` | a real room, a lamp, the diary open and being written properly |
| `rest-bedroll.png` | oiled cloth on open ground, no fire, rain having happened |
| `rest-none.png` | sitting up against a pack, nothing to write by |
| `stoop-<process>.png` ×12 | carving, weaving, spinning, retting, tanning, boatbuilding, purifying, gathering |
| `work-<process>.png` ×5 | knapping, smelting, grinding, casting, pressing |
| `stalk-<process>.png` ×4 | firing, cooking, brewing, drying — all of them *waiting for the right moment* |

The making variants are named after the bare process word, the same word `PROCESS_MARK` keys on. A
variant with no painting falls back to the plain gesture, so these can land one at a time.

**The six nights are the set worth finishing.** `rest-<shelter>.png`, one per kind of place a night
can be spent — `palace`, `settlement`, `roof`, `camp` ✓, `tent`, `bedroll`. This is what the shelter
vocabulary is *for*: `NIGHT_RESTORES` is flat, so every night is worth the same rest and what
differs is the picture and, later, what can happen in it. An unpainted kind falls back to
`rest.png`, so they land one at a time.

**Worth doing first:** `fish.png`, then `rest-tent.png` — the tent is the only night the player
built, and the one the crafting tree pays for.

### `events/` — something happening to you · 0 of ? · **new**

A dream, an animal at the edge of the firelight, somebody arriving in the dark. **No events are
authored yet either** — the framework ships before the content on purpose, and
`docs/events-plan.md` says why.

Not a specimen and not a bench: a moment with the traveller *in* it, the same register as `scenes/`.
The difference is that a scene is something he is doing and this is something that is happening.

Falls back to the night's own scene, then to `rest.png`, then to a blank panel. An event with no
painting still fires, still reads and still resolves.

### `marks/` — the making vocabulary · 4 of 47

Line drawings at ~20px. SVG rather than bitmap, because a bitmap has to ship at three sizes here
and an SVG does not.

Canon marks the making layer by **category**: 20 material classes, 10 item kinds, 17 processes.
That covers all 68 materials, 75 items and 83 recipes, which is what makes the set tractable.

**Have:** `process-casting`, `process-grinding`, `process-pressing`, `process-retting` — the four
whose emoji stand-in is worst (a quern is not a gear; a press is not an olive).

**Worth doing next:** the 10 `kind-*` marks. They are the fallback tier for `things/` below, so ten
files cover all seventy-five items at once.

The prefix is not decoration: `physic` is both a material class (bitter bark, scraped and dried)
and an item kind (the remedy made from it), and they must never share a glyph at exactly the moment
a player is learning they are not the same.

### `things/` — made things and materials · 0 of 143 · **new**

`item_bronze_knife.png`, `material_reed_fibre.png`. One folder for both: canon ids are unique
across them and `nameOf` already answers to either, so one convention rather than two.

Falls back to `kind-<kind>` in the same folder, then to the `marks/` category, then to an emoji.
**Three tiers**, so ten paintings named `kind-tool.png`, `kind-container.png` and so on cover the
whole set before a single item is painted individually.

**Worth doing first:** the eight things a player actually carries and uses — `item_hide_tent`,
`item_flint_knife`, `item_bronze_knife`, `item_cooking_pot`, `item_neem_salve`, `item_flood_bread`,
`item_reed_spear`, `item_bone_harpoon`. Those are the objects Phase 2 just gave a verb to.

### `places/` — points of interest · 0 of ~26 · **new**

`poi_lothal_camp.png`, or `kind-settlement.png` for the whole kind.

Canon holds six `poi.kind` values against twenty-odd authored places, so **six paintings cover
every place in the game** before one is painted individually. Same bargain as the marks: paint the
category first.

Shown at 16:7 across the top of `PlacePanel`, cropped rather than letterboxed.

**Worth doing first:** the six kinds.

### `plates/` — species · 20 of 341

The long queue, and the one that will never finish. `SpeciesIcon` draws a derived silhouette for
every species and a plate replaces one individually.

**341, not 297.** Canon's source holds 376 species; `export_canon_bundle.py` drops the 35 that are
`placement: "lore"`, so the bundle this repo reads holds 231 fauna and 110 flora and **every one of
them reaches the engine**. 341 is therefore the real plate queue — the held-back 35 never appear in
the game and need no plate.

The holdback is enforced at the **export boundary**, which is why nothing in `src/` reads
`placement`. Do not conclude from the bundle alone that it has gone: the bundle shows zero `lore`
because the filter has already run. See `docs/plate-prompts.md` for the prompts
and the working queue.

**One addition from this rework:** the activity card prefers the animal's plate for a **cast** as
well as a stalk, because the animal is the subject. So the aquatic species are now worth more than
they were — `fauna_estuary_sawfish`, `fauna_deep_river_bronze`, `fauna_narmada_mud_eel`,
`fauna_estuary_archer_fish`, `fauna_beedu`.

### `portraits/` — people · 14, effectively complete

`PersonPortrait` draws a trade-derived silhouette for anybody unpainted.

---

## Before adding a file

**Read the art before writing prose about it.** A point of interest was once authored as a temple
in four stacked courses; the painted sheet was a single domed temple on one plinth, and the
recommendation that followed was written without opening the file. Looking took ten seconds and
reversed it.

**A raw from an image model does not go in these folders.** It is 2–8 MB rather than ~100 KB and is
named `Gemini_plate-desert-fox.png`, which nothing will ever ask for — it ships the megabytes and
draws nothing. Raws live in `assets/source/plates/`, and `test/platesFolder.test.ts` is the only
thing that can see the mistake.

`docs/art-direction.md` holds the five rules the art follows. `docs/art-brief.md`,
`docs/plate-prompts.md`, `docs/mark-prompts.md` and `docs/activity-scene-prompts.md` hold the
prompts.
