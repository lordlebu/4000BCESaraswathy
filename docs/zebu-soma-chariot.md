# Zebu, Soma and the Chariot

The round of 4 October 2026, built on the owner's asks after the Plates and Scenes page closed. Its
plan page is <https://claude.ai/artifact/FvWpowUY5WUZQoPFkYz9Bc>. Canon's half merged as
SouthOfTethys #162 (v3.5.0); this repository holds the game's half.

## What shipped

**Three animals from the held paintings.** Canon added the zebu, the Panchet Broad-Head (a
temnospondyl relict) and the Southern Sea-Gull; their plates were built from the paintings the art
brief had held for a decision, and the brief no longer holds them. The zebu plate is a cow, whose
hump is barely a rise; the bull carries the tall hump and goes in the traces.

**Zebu milk** (`material_zebu_milk`), so the zebu gives something. Hill curd can now be made on Dwarka
and Lothal, and `test/suppliable.test.ts` records that.

**Kulfi, on the Narmada only.** Two of any milk and glacier ice, over a fire. Glacier ice comes from
snow, and only the Narmada has snow; but nothing in the satchel spoils, so carried ice would set a
kulfi anywhere. A recipe may now say `made_on` (field maps), and `crafting.mapAllows` refuses it
elsewhere, beside `placeAllows` rather than inside it so the board and the rule still agree. Off the
plateau the workshop says it "is only made on the Narmada Plateau". `test/kulfi.test.ts`.

**The Sinauli wagon patrols North Dwarka.** A wanderer can be a vehicle (`PATROLS` in
`content/wanderers.ts`): it keeps a round of desert, grass and hill within eight tiles of the
Caravan Ground, joined by ways that never cross marsh or water. It first rolled from ten until half
past twelve on the day's clock and lurched: that clock jumps about 45 seconds with every step the
traveller takes. It now keeps the scene's own clock, as the strait's ship does (`patrolAt`): it glides
between tiles at `PATROL_PACE` (0.4 tiles a second, a little under the ship) with its legs walking,
and halts `PATROL_HALT_S` (20 seconds) at each stop. Sudama drives it for Jarro (canon's `npc_sudama`, read
through `drives`), with a zebu bull in the traces. Coming alongside opens one card a journey
(`passing`), and never before `PASSING_AFTER_STEPS` steps on the map. No errand hangs on it.
`test/patrol.test.ts`.

**It walks.** The owner's sheet was a full walk cycle, four rows of four. `tools/build-wanderers.js`
takes sixteen as one row per facing -- the first step is the still, the others `-walk1..3` -- and
`WandererView.animate` steps through them every frame while it rolls, holding the still while it
stands. Each step is scaled as its still is, so it does not pulse. It is drawn a tile and a quarter
long side-on, on the owner's word (`SHORTER` in `game/frames.ts`). The card's painting was cropped off
its sketchbook page to the painted area.

**Soma is lore.** Canon holds the plant and the pressing; the game carries only Ila's line about it.
When the game wants soma, it adds the item, a stalk material and the recipe here.

## The title, and a random seed

**Every visit opens on the title** (the owner, 4 October 2026): *South of Tethys*, and under it the
name in Brahmi, bold -- 𑀲𑁄𑀅𑀣𑁆 𑀑𑀨𑁆 𑀢𑁂𑀣𑀺𑀲𑁆. Somebody who has never walked goes on from it
into the Walking Song and the plates, and then the door asks who sets out; the opening does not play
again on setting out. Somebody coming back sees the title alone, then the door. Before this, the door
came first, with the seed printed on it, and the opening played only after it.

Brahmi is in few system fonts, so Noto Sans Brahmi ships with the game (`src/ui/fonts/`, 27 KB, SIL
Open Font License), limited by `unicode-range` to the Brahmi block. It has one weight; the bold is
the browser's.

**Whoever starts the game starts on a random seed.** Every player used to begin on
`jambhudweepa-evening`. `seed.chooseSeed` is the rule: a link's seed first; under automation the fixed
world the suites measure; then the seed this browser last walked (`south-of-tethys:last-seed`), so
coming back finds the walk; and otherwise a new one, written into the address. **Starting a new walk
rolls a new world** rather than wiping this one. `DEFAULT_SEED` stays as the world the tests walk.

Wherever the door is skipped, so is the title; `?title=skip` skips the title alone, for the specs
that are about the door. `e2e/opening.spec.ts` holds the order, `test/opening.test.tsx` the cards and
`test/seedChoice.test.ts` the seed.

## Vasuki keeps far from people

The owner's ask, the same day: Vasuki indicus keeps far from every settlement and every temporary
camp, and may cross a road. `KEEPS_AWAY` in `content/wanderers.ts`: its stops are ten tiles from any
settlement or cart stop (`camps.isCamp`) and the settlement ground, and four from every tile a
temporary camp could pitch on (`encampments.campGround`, the half camps choose from); every tile of
the ways between stops keeps eight and three. Measured first over twelve seeds of North Dwarka, where
camp ground is 117 to 370 tiles of a 48 by 48 map: those numbers leave a full round of four on every
seed, and five from camp ground left one seed a single stop. Its round now needs the placed points of
interest, and without them it has none rather than one that walks into the market.
`test/vasukiKeepsAway.test.ts`.

## Open

- The gull plate is 512 by 482 and was stretched about six percent to square, with a small mark in a
  corner. Kept unless the owner sends a square take.
- Kulfi is known to the Maru. A Narmada herder could teach it with a line instead.
- `build-wanderers.js --force` and `build-plates.js --force` re-cut every accepted piece of art from
  the dump, not only the new one; this round put the others back from git both times.
