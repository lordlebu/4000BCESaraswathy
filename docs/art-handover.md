# Art handover

Everything the art still wants, where each file goes, and what is on screen until it arrives.

**Start here for an art session.** `docs/art-placement.md` is the mechanism — which folder, which
filename, what falls back. This is the *work*: the inventory, the order, the prompts for the slots
that do not have one yet, and the things that have gone wrong before.

---

## Art is never discarded

**Once a piece of art is accepted it stays, for good.** Not archived, not superseded, not replaced
by a better one later — kept, and still shown. That covers *everything*: species plates, portraits,
sprites, marks, scenes.

**Showing one of several takes is narrower — it is the activity plate only.** That is the painting
in the middle of the screen when you do something: `scenes/` and `events/`. Two nights are texture,
and a player seeing a different one is a good surprise.

A species plate is not that. It is the record of **that animal**, and swapping between two drawings
of a desert fox mid-journey would read as two different foxes. A portrait is a face. A place view is
a place. A mark is a glyph. Those take one image and keep it.

So a second take of a scene is **added as another take**, never a replacement:

```
scenes/rest.png        the first night
scenes/rest.2.png      a second night — both are kept, one is shown
scenes/rest-camp.png   a night at a camp
scenes/rest-camp.2.png a second of those
```

A trailing `.<number>` before the extension is a take number and is not part of the name. Everything
else in the filename still means what it meant: `rest-camp` is the shelter variant, `stoop-mountains`
is the ground.

**Which take is shown is seeded, never random.** `App` passes a `tileHash` on the tile and the day,
exactly as every other choice in this game is made, so two players on one seed see the same night
and a test can assert it. `Math.random` here would quietly make a seed unshareable.

**A `.2` in any other folder will never draw**, because nothing there picks — it parses as a take
and is then always passed over. `test/artKept.test.ts` fails on it rather than letting it sit.

### How the rule is enforced, because a rule in a document is not one

Deleting a file is one keystroke; the game keeps working, because every lookup has a fallback; and
no type, lint or test would notice. That is the same shape as every other silent art fault this
repository has paid for.

So: **`src/ui/art-kept.json` lists everything ever accepted, and `test/artKept.test.ts` fails by
name the moment one is missing.** It checks both directions — a recorded file that has gone, and a
file on disk nobody recorded, because an unrecorded one is exactly the one this guard could not
protect.

**Adding art means adding a line to that file.** That is the whole cost, and it is deliberate: a
list that regenerated itself would close neatly around a deletion and enforce nothing.

If the check fails, **restore the file — never remove the line.** That is what the rule means.

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
| `src/ui/scenes/` | 10 | ~24 | the plain gesture, then a blank panel | **yes** |
| `src/ui/marks/` | 4 | 47 | an emoji in `ThingIcon` | **yes** |
| `src/ui/places/` | 0 | 6 kinds, then 37 | prose alone | **yes**, at the kind tier |
| `src/ui/things/` | 0 | 10 kinds, then 143 | the category mark, then an emoji | **yes**, at the kind tier |
| `src/ui/events/` | 0 | one per event | the night's scene, then a blank panel | n/a — no events authored |
| `src/ui/plates/` | 20 | 341 | a derived silhouette | **no, by design** |
| `src/ui/portraits/` | 17 | 17 | a trade-derived silhouette | **done** — everybody in canon has a face |
| `assets/traveller-*.png` | 3 | 3 | a playable character's sheet, which was the bug | **done** — see `art-brief.md` Asset 7 |

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
   **Four done** — `rest-camp`, `rest-tent`, `rest-settlement`, `rest-roof`. **Two left: `bedroll`, `palace`.**
2. **The six place kinds** — `kind-<poikind>.png` in `places/`. Six files and every place in the game has a view.
3. **The ten item kinds** — `kind-<itemkind>.png` in `things/`. Ten files and all 143 things have a plate.
4. ~~**`fish.png`** in `scenes/` — the fourth gesture has no painting at all.~~ **Done.**
5. **The ten `kind-*` marks** — the category tier under (3), for anywhere a mark is wanted rather than a plate.
6. ~~**Anu's portrait**~~ **Done, and so is every other face.** `src/ui/portraits/` holds
   **seventeen against canon's seventeen `npc_*` ids** — Anu, Kunch and Moonj were the last three,
   and all three were circuit-walkers because the portrait batch predates the travel layer.
   **This row has been wrong twice**: it said *Vessa* for as long as it existed while
   `src/ui/portraits/vessa.png` was on disk, and it said fifteen people after canon had grown to
   seventeen. **Count the folder against canon rather than trusting the sentence** — nothing
   enforces this: `test/portraits.test.ts` checks that every portrait names somebody canon has,
   and not that everybody canon has holds a portrait, because a missing one falls back to a
   silhouette by design and is not a failure.
7. **Everything else**, forever: species plates, the seventeen making scenes, the individual places and things.

Steps 1–5 are **37 files** and they move every folder except `plates/` from "nothing" to "complete
at the category tier". That is the whole of the leverage. Step 6 is done.

---

## Who these people are

**Every figure in this art is somebody from canon's world, and canon says who lives there.** Two
paintings in and a default was already forming — both were young men, bare-chested, with long dark
hair. Nobody chose that; it is what a generator returns when the prompt does not say.

### What canon actually holds

The fifteen people in the game belong to **two language groups**, and it is not close:

| | Who | In the cast |
|---|---|---|
| **Kia** | the delta's indigenous marsh-dwelling people, oral-tradition bound, co-rulers with the Harappans since the Stone Pact | **9 of 15** — Thrali, Bekh, Dala, Hesh, Ila, Odri, Pell, Sesh, Sura |
| **Maru** | the inland and upland group — herders, drovers, hunters, scholars | **5 of 15** — Anu, Marn, Okhi, Terke, Vessa |

Canon's wider list runs much further — `harappan`, `vedda`, `jharwa`, `tuli`, `silvershore`,
`narmada_scholar`, `vanara`, `maya_born` and more, in `database/cultures.json`.

**The cast is majority women: nine of fifteen.** Uma roofs, Hesh keeps the line, Odri scavenges
iron, Sura reads four hundred years of stratigraphy, Terke droves. None of those is a soft trade.

### What this means for a prompt

**Canon does not describe anyone's face**, and the art must not invent an ethnic marker it has not
authored. What it *does* give is livelihood, age, sex and people — so vary those, and let the rest
be ordinary South Asian without further specification.

Four things to put in a subject line, and the fourth is the one that gets forgotten:

1. **Sex, explicitly**, and reach for a woman by default — the cast is 60% women and the generator's
   default is not.
2. **An age**, explicitly. Canon has a *senior* copyist and a *junior* archivist, elders and
   children. A cast of twenty-five-year-olds is a choice nobody made.
3. **The trade in the body** — a roofer's shoulders, a drover's legs, a copyist's stoop and eyes.
   This is what stops "diverse" becoming a coat of paint over one figure.
4. **Clothed for the work and the weather.** The first two came back bare-chested because nothing
   said otherwise. A delta fisher in the wet and a herder on a cold upland do not dress alike.

### The running tally

Keep it varied across the set rather than inside any one picture. So far:

| File | Who |
|---|---|
| `stoop-mountains.png` | young man, long hair, bare-chested |
| `fish.png` | young man, long hair, bare-chested |
| `rest-tent.png` | **older woman, grey, clothed against the cold** |
| `rest-settlement.png` | **man in his forties, grey-flecked beard, clothed for a day's work** |
| `rest-roof.png` | woman in her thirties, ornamented, seated by a lamp |
| `rest-roof.2.png` | the same night, second take — paler, line-and-wash |

**Still wanted: a child or a very young person, and somebody plainly dressed for hard weather.**
Nobody in the set is under twenty and canon has children. Two of five are women against a cast
that is nine of fifteen, so keep reaching for women.

`rest-roof` is the first slot to take **two paintings rather than one**, and it is worth saying why
that was the right answer instead of choosing. Two versions came back, neither strictly better: the
first is darker and closer to the set's register, the second is paler line-and-wash and reads
lighter. Arbitrating would have thrown one away, which is the thing this document's first rule
exists to prevent. **The activity plate already supports takes, so both are in** and the seeded
`tileHash` picks. That is what the mechanism is for, and this is the first time it has been used
for its actual purpose rather than as a promise.

Both are a partial hit on the brief rather than a clean one: the age and the sex are right and the
register is not — she reads as a painted figure at rest rather than a traveller who walked here.
**Accepted as the best the tool would give**, which is the correct trade. A good-enough painting in
hand beats a perfect one that does not exist.

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

**Do not ask a generator for high resolution.** Every one of these is built down — scenes to
512×384, plates and portraits to 384 — so whatever comes back above that is thrown away. Asking for
it buys nothing, and most tools either cannot do it or trade detail for pixels trying. **The aspect
ratio is the only dimension instruction that matters**, because the build crops to it; a square
image handed to a 4:3 slot loses its top and bottom. Whatever a tool gives you at the right shape
is enough.

**Hard requirements, all five, every time.** Each is here because an asset was lost to it:

1. **No text of any kind.** A naturalist illustration *looks* like it should be labelled, so models
   add labels unprompted. This is the most likely failure.
2. **No border or frame.** The card draws its own edge; a painted one reads as a picture of a picture.
3. **No watermark, no signature.** A mark across the subject cannot be cropped out.
4. **The right aspect** — stated per group below, and it is the *only* size instruction worth
   giving. Getting it wrong loses the top and bottom to the build's crop.
5. **Lossless PNG**, not JPEG.

### The six nights — `src/ui/scenes/rest-<shelter>.png`

**Landscape 4:3**, at whatever size the tool gives. A moment, with the traveller in it or just out of frame. These are what the
shelter vocabulary is *for*: `NIGHT_RESTORES` is flat, so every night restores the same and what
differs is the picture and — once events have content — what can happen in it.

| File | Subject line |
|---|---|
| `rest-palace.png` | A swept upper room in a large mud-brick house at night, a good oil lamp burning steadily on a low table beside an open notebook and a folded travelling cloak, a woven mat bed made up on the floor, warm light on plastered walls. |
| `rest-settlement.png` *(have)* | A borrowed corner of somebody's house at night, bedding laid on a swept floor, a small lamp, a doorway open onto a lane where one other window is still lit. Quiet and slightly crowded. |
| `rest-roof.png` *(have)* | Sheltering inside an old stone ruin at night, bedroll laid on flagstones between fallen blocks, a small lamp throwing light up broken walls, open sky visible through a gap overhead. Nobody has lived here in a long time. |
| `rest-tent.png` *(have)* | A low hide tent pitched and pegged on open ground at dusk, guy-lines taut, a small fire in front of it, the traveller's staff leaned against the entrance. Newly put up and holding. |
| `rest-bedroll.png` | An oiled cloth bedroll unrolled on bare open ground at dusk, no fire, a satchel for a pillow, wide empty country and a cold sky. It counts as a night and no more. |
| `rest.png` *(have)* | the generic fallback — keep it |

Four of the six exist, so **`bedroll` and `palace` are what is left**. An unpainted kind falls back
to `rest.png`, so these land one at a time.

### The six place kinds — `src/ui/places/kind-<kind>.png`

**Landscape, wide — 16:7.** Cropped across the top of `PlacePanel`, so compose for a band. Size
does not matter beyond the shape; it is never shown larger than the dock.

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

**Square, transparent background.** Drawn at 20–44px beside a name, so it has to read at a
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

## How a finished file gets in

**Drop the raw into `assets/source/scenes/` (or `plates/`, `portraits/`) under any name and run the
builder.** It derives the id, crops to the right aspect, resizes, palettises, and writes the built
file where the loader globs it.

```bash
node tools/build-plates.js --scenes      # activity scenes, 4:3 at 512x384
node tools/build-plates.js --portraits   # people, square at 384
node tools/build-plates.js               # species plates, square at 384
node tools/build-plates.js --list        # what it would do, without doing it
```

**The raws are git-ignored and the built files are tracked.** `assets/source/scenes/` and
`assets/source/plates/` both sit in `.gitignore` — the raws stay on disk and only the built
100–160 KB reaches everybody's clone. That is the same arrangement `dump/` uses, for the same
reason.

**Never drop a raw straight into `src/ui/`.** It is the right picture at ten times the weight and
the wrong encoding, and the game renders it perfectly — the download just grows.
`stoop-mountains.png` arrived at 1200×896 and 1.7 MB and came out of the builder at 129 KB.

**`test/scenesFolder.test.ts` now catches that**, which matters most when art is being added by hand
rather than through one pipeline. It checks four things per file — the name is a gesture or a real
variant, the size is under 300 KB, the dimensions are the builder's 512×384, and the colour type is
palettised — and the failure names the command to run. Dropping the 1.7 MB raw in on purpose fails
two of them with `1685 KB. A built scene is around 130`. `test/platesFolder.test.ts` is the same
guard for species plates.

## Gotchas, all of them paid for

**Read the art before writing prose about it — and before repainting it.** A point of interest was
authored as a temple in four stacked courses; the painted sheet was a single domed temple on one
plinth, and the recommendation that followed ("regenerate the art") was written *without opening the
file*. Looking took ten seconds and reversed it. Canon's entity now follows the painting.

**A moon in a night scene is fine, and a note here said otherwise for about an hour.**

The argument made against it was that `question_silver_water`'s wrong resolution is *"the moon
draws the water"*, corrected by *"It happens under heavy cloud and at every phase"* — so a rest
plate showing a full moon every night quietly asserts that every night is clear and full.

**That over-applies the question.** It is about the silver water in the drowned dockyard, and its
correction is a line Thrali says, not an inference a player draws from a painting of a ruin.
`src/world/weather.ts` not generating `full_moon` is a fact about the *weather roll* and says
nothing about what a painting may show — and that distinction was collapsed to make the case.

Canon has moon lore and plenty of it: the moon-seed the Narmada Man gives Jambanson, the
Bhuta-Kāna fig grown from it, the Silver-Leaved Oracle Fig lineage, the Moonseed Vine, and the
belief that *the moon is an unyielding archive of his ancient grief*. A moon in the sky is
world-building rather than a contradiction.

**So the moon stays**, and `rest-roof.png` was rebuilt from the untouched raw to put it back. The
only thing worth watching is the palette — the first version's moon was lavender, and a saturated
hue is a real objection where the moon itself is not.

**Jewellery is fine. Gold is not.** Canon has an `ornament` item kind and three items in it —
`item_shell_bead`, `item_ammonite_pendant`, `item_sandalwood_comb` — so people in this world wear
things and a figure wearing them is right. What canon has no material for is **gold or silver**:
`crafting.json` runs to `material_native_copper` and `material_bronze` and stops. The words "gold"
and "silver" appear in canon only as colour adjectives on species names. So: shell, bone, ammonite,
copper, bronze, sandalwood — never gold.

This entry exists because a review of `rest-roof.png` listed "gold jewellery" as a fault and meant
only the gold. **Say the checkable half.** A list that bundles a real objection with a taste one
gets argued with as a whole, and deserves to be.

**Three things have to know what a take is, and for a while only one did.** `rest.2.png` is a
second take of the same scene, and `src/ui/art.ts` reads a trailing `.<digits>` that way. But:

- **`tools/build-plates.js`'s `idFor` stripped the dot.** Its last step removes everything that is
  not a letter, a digit or a hyphen, so `rest-roof.2.png` built as `rest-roof2.png` — which parses
  as a *variant* named `roof2`, matches no shelter kind, and draws nothing.
- **`test/scenesFolder.test.ts` split on the dot too**, so a correctly-named take failed the guard
  as an unknown shelter kind.

Which meant the takes mechanism shipped with a loader that could read a take and a builder that
could not write one — this codebase's signature fault, in miniature, four commits after the
mechanism landed. Both are fixed and both carry a comment saying why. **If a fourth place ever
parses a scene filename, it needs the same two lines.**

**A tool's signature survives on a landscape source, and the builder cannot help you.** Gemini
signs its work with a small four-pointed sparkle in a bottom corner. `build-plates.js` drops the
bottom tenth to remove exactly that — but **only when the source is taller than it is wide**, because
squaring a portrait has to lose that height anyway and cropping a square or landscape image does not.
Its comment says so and is right: the first version cropped regardless and took a camel's feet off.

**Every activity scene is landscape 4:3.** So on `scenes/` that crop never fires and the sparkle
lands in the built file. It did on `rest-settlement.png`, sitting on the dark ledge the lamp stands
on, and no check catches it — `test/scenesFolder.test.ts` asks about the name, the weight, the
dimensions and the colour type, and a signature is none of those.

**Most of the time the answer is to leave it.** The sparkle is small, low-contrast and lands on
dark ground; at 512×384 it reads as a highlight. The standing instruction is to ship it. What
follows is for the case where it is genuinely conspicuous — and crop it out only if there is no
other way, because the corner has the picture in it.

There are three ways out and only one of them is right:

| | |
|---|---|
| Crop it out | **No.** The sparkle is in the corner of the composition and the corner has the picture in it — on this one it would have taken the lamp. |
| Regenerate | **No.** The painting was good. Throwing away a good painting over 40px is the trade this whole document argues against. |
| **Paint it out of the raw, then build** | **Yes.** Copy a clean strip of the same material from the *same rows* so the vertical gradient carries, feather the edges, and rebuild. |

On `rest-settlement.png` that was an 80×82 patch at `1046,734` taken from 100px to the left, with a
14px feather. It took a minute and the seam is invisible at 2×.

**Write the patched raw as truecolour, not through `encodePng`.** The builder's encoder quantises to
a palette, which is right for the ~130 KB file that ships and wrong for a 1.07 MP raw that has not
been resampled yet — quantising first and resampling second is strictly worse than the other order.
Doing it the wrong way round once is why this paragraph exists.

**And say so in the prompt** — "no watermark, no signature" is already hard requirement 3, and it
did not stop this. The requirement is worth keeping because it works often enough; it is simply not
something to rely on.

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
