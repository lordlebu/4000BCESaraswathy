# UI handoff — Varuna's Field Diary

This is a brief for the instance doing UI and art. **The data layer is finished and tested;
none of it needs to change.** What follows is what to build on top of it, what to call, and
what not to touch.

Everything here is on branch `feature/canon-bundle` in both repos. `npm run typecheck` is
clean and 183 tests pass across 11 files. If you break one of those tests, the fix is almost
certainly in your code rather than in the test.

---

## The one rule

**Ask `src/journey.ts`; do not reimplement it.**

Every rule about whether a discovery can advance, why it cannot, which readings of a question
are available, who can be gathered at the end and how far each discipline has got already
exists as a pure function. They are covered by `test/journey.test.ts`, which walks the Lothal
slice the way a player would.

A panel that computes "the player has 3 of 5 rungs so show 60%" by reading `progress.rungs`
directly is a second implementation of the ladder, and it will drift. Call
`disciplineProgress()`. If something you need genuinely is not exposed, say so and it gets
added to `journey.ts` with a test — do not compute it in a component.

---

## Standing constraints — these are not negotiable

These predate this work and the CI enforces most of them:

- **`src/world/` and `src/content/` import neither React nor Phaser.** This is what lets the
  tests run under plain Node and exercise what actually ships. `src/journey.ts` follows the
  same rule.
- **Phaser is confined to `src/game/`.** React never renders a tile; Phaser never renders a
  panel. They talk over `src/game/EventBus.ts`.
- **All network code lives in `src/ui/`.** `src/ui/canonClient.ts` is the only thing that
  makes a request.
- **`VITE_CANON_API` stays opt-in.** If it is unset, the game makes no network call at all.
  This is not a preference — defaulting it to `localhost:8000` broke CI once already,
  because every e2e page load probed a service that was not running and logged an error.
  The retrieval service is an enhancement; the game is a static bundle that works offline.
- **`data/canon/` is generated. Never hand-edit it.** It comes from
  `SouthOfTethys/utils/export_canon_bundle.py`, and `tools/check-canon-lock.js` fails CI if
  the committed files do not match `canon.lock.json`. If content is wrong, it gets fixed in
  the canon repo and re-exported.
- **Content lives in JSON, not in components.** No prose in a `.tsx` file. If you need a
  string the player reads and canon does not have it, that is a canon change.

---

## What the data layer now gives you

Three adapters under `src/content/`, all already written:

| File | Holds |
|---|---|
| `canon.ts` | species — the existing bestiary, unchanged |
| `places.ts` | field maps, points of interest, NPCs |
| `knowledge.ts` | discoveries, field questions, vocabulary |

Plus `src/journey.ts` for player state and `src/world/fieldMap.ts`, which turns a canon field
map into walkable ground with the authored places standing on it.

Authored so far: **2 field maps (Lothal, the Narmada Plateau), 12 points of interest, 18
discoveries, 5 field questions, 6 NPCs, and 6 words across two languages** (`kia` in the
delta, `maru` on the plateau), covering all 7 disciplines.

That is still a slice rather than the finished game, so **derive everything from the data**.
Nothing should hardcode a map id, a place count, a discipline list, or two languages — read
`fieldMaps`, the keys of `disciplineProgress()`, and `languagesKnown()`. The two maps are
deliberately unalike in scale and palette; a third will not resemble either.

---

## Part 1 — Adopt `progress` in the save

`SAVE_VERSION` is at 5 and `Journey` carries `progress: Progress`. `Progress` holds four
things: `rungs`, `words`, `answered`, and `questions` (the open questions the player is
carrying — distinct from `answered`, because the interesting part of the game happens between
the two).

`saveJourney` currently takes `progress` **optionally** and defaults to whatever is already
stored. That was deliberate so the data layer could land without touching `App.tsx`. Your
job is to start passing it:

```ts
saveJourney(seed, { discovered, observed, reached, progress });
```

Hold `progress` in the same place `App.tsx` holds `discovered` / `observed` today. Every
mutating function in `journey.ts` returns a **new** `Progress` and never mutates, so it
drops straight into `useState`:

```ts
const [progress, setProgress] = useState(() => loadJourney(seed).progress);
// ...
setProgress((p) => advance(p, discoveryId, moment));
```

Once `App.tsx` passes it, the optional parameter can stay as-is — it costs nothing.

---

## Part 2 — The diary

This replaces the notion of a journal that lists what you have seen. The diary is the
progression system: there are no experience points, and a discovery climbing its ladder is
what advancement means.

Each discovery has between 3 and 7 **rungs**, and the count varies by discovery — read it
from `lastRung()` rather than assuming a fixed ladder height. A rung carries `entry` — the prose the player
reads — and the entries are deliberately *less certain* lower down. Rung 0 is a guess; the
last rung is understanding.

**What to render, per discovery:**

- `entryFor(progress, id)` — the text to show. Returns `null` if never noticed; show nothing
  at all in that case, not a locked row. The player should not see an inventory of things
  they have not found.
- `rungOf(progress, id)` and `lastRung(discovery(id)!)` — for a "3 of 5" indicator.
- `isComplete(progress, id)` — whether the ladder is climbed.

**When the entry changes, say so.** Advancing a rung rewrites the diary entry — the player's
earlier reading is replaced by a better one. That moment is the core feedback loop of the
game and deserves the strongest treatment in the UI. The old text being *crossed out and
replaced* rather than simply swapped is worth the effort.

**Telling the player why a rung is out of reach** — `blockedBy(progress, id, moment)` returns
a list of strings:

- an id starting `discovery_` → they need to understand something else first
- an id starting `word_` → they need a word (see Part 3)
- the literal string `'conditions'` → the world is not cooperating

That last one matters and should not read as an error. A bloom that only shows on a still
night after rain is **not available at noon, and saying so is the point.** "Not now — come
back at night, after rain" is good copy. "Requirements not met" is not. Resolve the ids to
names via `discovery(id)?.name` and `word(id)?.word` — never show a raw id.

`canAdvance(progress, id, moment)` is the boolean if you just need one.

**`moment`** is `{ timeOfDay, weather }`, and you get it from **`momentAt()` in
`src/game/moment.ts`** — not from `dayNight.ts`, which only owns the hour:

```ts
const moment = momentAt(seed, elapsedMs, startPhase);
```

Pass it into `canAdvance`, `blockedBy` and `advance`. Passing `null` is the safe default but
makes every condition-gated rung permanently unreachable, so wire it up properly.

Do **not** pass `skyAt(...).label` in directly. The engine labels the sky for the journal and
says `first light` and `noon`; canon's vocabulary is `dawn | morning | afternoon | evening |
night` and has never heard of either. `momentAt` does that translation, and a raw label
matches nothing, fails silently, and looks exactly like a content bug.

**When `blockedBy` returns `'conditions'`, you can say when to come back.**
`nextSpells(seed, fromHour, wanted, climate, hours)` in `src/world/weather.ts` returns the
upcoming hours matching a weather, and `inGameHour()` converts elapsed time for it. That turns
"conditions not met" into "the sky clears around dawn", which is the difference between the
mechanic reading as a world and reading as a lock.

Weather is deterministic and seed-derived like the terrain — same seed, same sky at the same
hour, for every player. Do not randomise it per session, and do not let the UI pick it.

---

## Part 3 — Field questions, and being allowed to be wrong

A field question is an open problem in the world with several possible readings. **At most
one is sound.** The others are plausible, reachable early, and wrong.

- `availableResolutions(progress, questionId)` → the readings the evidence currently
  supports. More than one can be available at once.
- `answer(progress, questionId, resolutionIndex)` → settle on one.
- `answeredSoundly(progress, questionId)` → `true` / `false` / `null` if unanswered.

**The player must be allowed to settle on a wrong reading.** Do not disable the unsound
options, do not warn, do not ask "are you sure". `question_silver_water`'s moon reading is
what a Narmada scholar would say, it is available before the bloom is understood, and it is
wrong. A player who commits early should be able to be mistaken and find out later —
`Resolution.revisit` names what eventually shows it was wrong.

Note the deliberate asymmetry in the rules, because it will look like a bug otherwise:
climbing a rung requires the discoveries beneath it to be **fully understood**, but forming a
reading requires only that the evidence has been **observed**. A hypothesis is built from
what you have seen, not from what you have finished. Ordering still works out on its own —
the sound reading of the silver water names two discoveries where the moon reading names one.

Each question also carries `localKnowledge` and `academicHypothesis`. **Show both, and do not
mark either as correct.** The people who live there are often right in their own terms; the
scholar is wrong about as often. Presenting the academic account as the authoritative one
inverts the meaning of the entire game.

---

## Part 4 — Points of interest

`src/world/fieldMap.ts` already places the six authored points on generated terrain, and
`buildFieldMap()` returns `placed: { poi, at }[]`. `poiAt(built, point)` answers what is
standing on a tile.

On arrival at a point of interest:

- `poi.arrival` — long-form prose, shown once on arriving. This is the writing the place
  exists for; give it room and do not truncate it into a toast.
- `poi.description` — the shorter line for repeat visits.
- `discoveriesAt(poi.id)` — what can be found here.
- `npcsAt(poi.id)` — who is here.
- `poi.ruinOf` — the canon entity this is the wreck of, if any. Lothal's camp is a
  settlement and a ruin at once, and that is worth showing.

**Sub-locations** are the gated depths. Use **`canEnter(progress, poiId, subLocationId)`** and
**`blockedFrom(progress, poiId, subLocationId)`** — both now exist and are tested; do not
inline the check.

The gate should read as a reason, not a lock: a cave that is *too dark to enter* becomes
enterable when you know what lives there. `blockedFrom` gives you the ids; resolve each to a
name and say what is missing. Never show a raw id, and never show a padlock with no
explanation.

Entry asks for **understanding**, not observation — the opposite of a conversation. The stair
is safe once you know how the tower fell; having glanced at it is not that.

---

## Part 4b — Talking to people

This is the only route by which a word can be learned, so it is not optional flavour.

- `linesFor(progress, npcId)` — what this person will say right now.
- `hear(progress, npcId, index)` — hear one and take what it gives. **The index is into the
  list `linesFor` returned**, not the NPC's full canon order, so you cannot trigger a locked
  line by accident. Pass the index of the line you rendered.
- `hasSomethingNew(progress, npcId)` — whether they still have anything to give, for a marker
  on the map. It is false when everything reachable has been heard, which is the honest signal.
- `openQuestions(progress)` — the field questions the player is carrying.

`hear` is idempotent, so re-reading a line costs nothing and you do not need to track which
lines have been heard.

Line requirements are read as **observed**, not finished — a person will talk about something
you have seen. That asymmetry is load-bearing: Thrali only names the silver water once you
have watched it, and the word he gives is what the *last rung of that same discovery* requires.
Demanding completion would deadlock the pair.

NPCs also carry `language` and `knows` (discoveries and questions they can move along — a lead,
not an answer), which are worth surfacing.

---

## Part 5 — The knowledge tree

- `disciplineProgress(progress)` → `Record<discipline, { climbed, total }>`. Counts **rungs,
  not discoveries**, so a half-understood discovery shows as partial progress. Derive the
  discipline list from the returned keys, not from a hardcoded array.
- `languagesKnown(progress)` → `Record<language, count>`. Fluency is emergent: there is no
  language level, only words held. Currently only `kia`, with 3 words.
- `vocabulary` and `word(id)` give `word`, `gloss`, `literal`, and `learnedFrom`. A word's
  `literal` is often the interesting part — show it.
- `learn(progress, wordId)` adds a word.

Words are how the Kia readings open. Learning one should feel like being handed a key,
because mechanically it is one.

---

## Part 6 — The ending

There is no roster and nothing separate is tracked, because **knowledge is how you help.**

- `gatherable(progress)` → the people who could be gathered: exactly those named by
  discoveries the player *finished*, crossed with whether they would come.
- `restored(progress)` → the places put back. The endgame settlement is built out of these.

**Some people will not come, and this is not a bug to be fixed.** `npc_bekh` has
`wouldSettle: false` and stays behind; somebody has to be there when the rest go, and the
ending is better for her refusing. Do not present her as a failure state, a missed
optional objective, or something the player should have done differently.

---

## Part 7 — Navigation across three scales

The design calls for Overworld → Field Map → Point of Interest → Instance. Only the middle
two exist in data so far:

- **Field Map** — works today. `buildFieldMap(fieldMap('field_map_lothal')!)`.
- **Point of Interest** — data is there (Part 4); entering it is UI work.
- **Overworld** — **two field maps now exist and they are joined.** `fieldMaps` lists them and
  `neighboursOf(id)` gives the edges. Canon states each edge from both ends, and a test
  enforces that, so you can render the graph without worrying about direction. Drive the
  screen off `fieldMaps` and `neighboursOf` — never hardcode two nodes, and do not invent
  placeholder regions in the UI; more places is a canon change in SouthOfTethys.

  The two are deliberately unalike: Lothal is `small`, wetland and river; the Narmada Plateau
  is `large`, hills and mountains. They share only `settlement`. Travel between them should
  feel like travel, and the `scale` field is the hint that they should not be drawn at the
  same size.
- **Instance** — sub-locations are the closest thing that exists. Nothing more is authored.

`fieldMap.arrival` is the prose for arriving on a map, mirroring `poi.arrival`.

The seed contract is unchanged: `?seed=` and `?hour=` still work, terrain is still
deterministic, and a field map defaults to seeding from its own id — **Lothal is the same
Lothal for every player.** This is a documented island, not a roguelike. Do not randomise it
per playthrough.

---

## What is deliberately not specified here

Art direction, layout, palette, typography, animation, and how the three-scale navigation
actually looks and feels are yours. `docs/art-brief.md` and `docs/playtest-notes.md` are the
existing context. The constraints above are about where code lives and which functions own
which rules — not about how any of it should look.

Two things worth knowing that are judgement calls rather than rules: the diary is the
protagonist of this interface, and the game is cozy — no combat, no fail states, no timers.
Nothing in the UI should create urgency.

---

## Verification before you call it done

```bash
npm run typecheck     # world/, content/ and journey.ts must stay React- and Phaser-free
npm test              # 142 tests, 9 files — journey.test.ts walks the Lothal slice
npm run test:e2e      # Phaser actually boots and draws
npm run build         # with VITE_CANON_API unset — the game must work with no service
```

That last one is the check that was missed once already. Every check I ran had the retrieval
service running, so I never tested the configuration CI actually uses. Run the build with no
canon API configured and confirm the console is clean.
