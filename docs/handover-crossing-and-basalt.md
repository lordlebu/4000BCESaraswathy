# Handover — The Aravali Crossing, and Rust and Basalt

Both plans are closed. This is what shipped, what it cost, and what the next person should know
before touching any of it.

Written 2026-09-08, against canon v2.18.0 and 955 tests.

---

## What the two plans were

**The Aravali Crossing** — a fourth field map, and the first that is a *sequence* rather than a
country: stony shore, water, two floating islands, far shore, walked in that order.

**Rust and Basalt** — the fang-and-scale history at Dwarka, the Asura gates, and the black
pavement they stand on.

They are handed over together because they turned out to be the same problem twice. Both were
blocked for months on something everyone believed was art, and in both cases the art was the
easy third of the work.

---

## The one rule worth carrying forward

**A renderable biome that no module stamps does not exist.**

`classifyBiome` only ever emits the eight biomes in `ALL_TERRAIN`. Four painted grounds are *not*
in that list and never will be — `snow`, `sky_island`, `sky_underside` and `lava_field`. They are
**places**, not climates, and a place is stamped onto finished ground *after* classification:

| Ground | Stamped by |
|---|---|
| `snow` | `src/world/tableland.ts` |
| `sky_island`, `sky_underside` | `src/world/crossing.ts` |
| `lava_field` | `src/world/basalt.ts` |

`lava_field` had a painted tile, a terrain frame, six decor props, basalt columns on the overdraw
sheet, 25 creatures, 6 plants, `renderable: true` in `data/biomes.json`, canon's palette entry for
Dwarka, and four points of interest asking to stand on it — and **the map generated zero tiles of
it on every seed**, for months, because nobody had written the stamp. Both Asura gates stood on
sand. Every test passed throughout, because none of them asked whether any of it was on the map.

That is now the first assertion in `test/basalt.test.ts`, and it is the assertion to copy when
canon adds the next renderable biome.

**The corollary bit twice:** a biome nothing draws hides its own data errors. All 31 species
carrying `lava_field` carried the *identical* pair `lava_field, mountains` — the signature of a
bestiary import rather than of anybody's judgement — and it had swept up eight polar species. The
first evening the ground existed, the game offered a **glacial ribbon-seal on warm basalt in a
cold desert**. Canon's `lint_story.py` now refuses a species whose name states one climate while
its biome list states another.

---

## The crossing, in the pieces that were not obvious

Full detail is in `docs/world-generator.md` under "The crossing, and what a fourth landform cost".
The short version:

- **A map's shape is canon's to state.** `proportion` (`square` | `portrait`) sits beside `relief`
  and `scale`. Square, the crossing could not be any of its four bands properly at once. 44×66 is
  the reference's own 2:3 and *fewer* tiles than 64×64.
- **Islands are ellipses.** Round was why they had to be shrunk to fit: a circle wide enough to
  look right is also tall enough to close the gap between them.
- **The rock face hangs below the island, not around it.** A ring stamped *inside* the ellipse
  turns the island's outer tiles into rock — a grey moat that reads as a crater.
- **`Tile.track` is a flag, not a biome.** The sea below it stays sea and stays navigable.
- **Rail between the islands; ropes from each shore.** Which is which is **derived** from where the
  islands are (`railSpan`), never stored, so the drawing and the carriage's route cannot drift.
- **A shadow is what makes it float.** Everything else about a floating shelf is equally true of a
  sea stack.
- **The two shores are different countries**, which canon's arrival text had said all along.

---

## Three tests that passed while being wrong

Worth reading before writing a new one, because all three are the same mistake:

1. **Cliffs.** `expect(planCliffs(world).length).toBeGreaterThan(20)` — counted every cliff on the
   map, so it passed while the islands had *none*. The mainland's own height steps carried it.
2. **The route.** Asked whether the run was continuous and one column wide. It was — while **three
   parallel railways** ran up the middle of the sea, because the route was always the centre column
   of the three.
3. **The start tile.** Asked whether it was on land. It was. It was on the wrong side of the water.

The pattern: the assertion was true, and about the wrong thing. When a test is named for something
visual, make it measure *that thing* and not a proxy that correlates with it.

---

## CI, and the fixture that goes stale

`test/e2eFixtures.test.ts` exists so that claims about the generated world are checked in a second
rather than in a six-minute browser run. It now covers two kinds of claim:

- **does this tile still give** (the gathering spec), and
- **does walking from here arrive there** (the dockyard specs).

The second was missing, and that gap cost a red PR: reading canon's `terrain` list in preference
order moved the drowned dockyard, 949 unit tests stayed green, and eight browser specs failed
fifteen minutes later. **When a spec hard-codes a seed and a coordinate, add a row.**

And one thing a unit test cannot tell you: `dock-9` passed the new fixture and then came back
**3-of-5 flaky in the container**, because its start tile is in a river. `dock-8` starts on plains
and is 6-of-6. Use `tools/ci-local.sh <spec>` before pushing anything that moves placement — it
runs the real image, one spec at a time.

---

## What is still open

| # | Item | Where |
|---|---|---|
| 1 | **The railcar.** `src/content/vehicles.ts` has **zero importers**. Nothing builds or boards it. `railSpan`, `trackRoute` and `canBoardAt` all exist and go unused. This is the largest single gap and the obvious next piece. | `src/content/vehicles.ts` |
| 2 | **26 of 42 sky species are `placement: lore`.** The Aravali's islands have 10 creatures and 6 plants, which works — but two thirds of the authored sky life cannot appear, and it is what blocks a Tethys Sky Routes map. | canon `database/fauna`, `database/flora` |
| 3 | **The 31 lava species have empty descriptions.** This is why the new lint rule has to guess from names. With descriptions it could read biology. | canon |
| 4 | `work.png` shows winnowing, not quarrying. Keep it for a crafting scene; regenerate a hammerstone one. | `assets/source/` |
| 5 | Panel count — 14+ reachable at once, wants a grouping pass. | `src/ui/` |

Items 2 and 3 are canon work. Item 1 is game work and needs no new art: the carriage is already
drawn (`assets/vehicles.png`).

---

## Where the reasoning lives

- `docs/world-generator.md` — the crossing, and why `lava_field` needed a stamp
- `docs/art-brief.md` Asset 2b — the tile that shipped and changed nothing
- `CLAUDE.md`, "Known issues" — the stamp rule, and the import artefact
- Canon `docs/decisions.md` — the `lava_field` entry, closed in three steps; and the
  fourth-field-map question, answered
- Canon `database/TODO.md` — both plans ticked off
