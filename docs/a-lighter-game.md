# A Lighter Game

The plan after the making layer moved to the game, written on 2 October 2026. **Phases 1 and 2
are built** (game #243, canon #158 as 3.1.0); phases 3 to 5 were left for the owner and the plan
is closed with them unstarted.
The illustrated copy is the artifact
[Field Diary Roadmap](https://claude.ai/artifact/Uhu8Vnb7XNLu8fGGtpmpF1), which is private to the
owner; this file is the authoritative one.

## The owner's direction

*"The lore should focus more on providing context about the world and shouldn't be used to make
granular calculations in the game."* The rule that came out of it, recorded on both sides:
**a number, a cost or a rule belongs in the game; who, where, what and why belong in canon.**

Moving materials, items, processes, recipes, vehicles and homesteads into `data/making/` was the
first step (game #243, canon #158, canon 3.0.0). This plan is what still makes the game do
granular sums, measured on the data as it stands.

## Phases

### 1. Rungs need only understanding — built

12 of 241 discovery rungs wait for an hour or a weather (`conditions`), and 6 need a tool in hand
(`needs_tool`). Drop both: a rung needs only what it stands on to be understood (`canAdvance` in
`src/journey.ts`). The entry can still say "seen on a clear night"; nothing makes the traveller wait
for one. Canon stops carrying the two fields.

**What shipped:** `canAdvance`, `blockedBy` and `advance` take only the progress and the discovery;
the diary and place panel no longer say "come back at night"; canon 3.1.0 drops both fields from
the schema and the eighteen rungs, and `check_playability.py` its unproduced-weather check.

**The tool gates had never worked in play.** `canAdvance`, `blockedBy` and `advance` take what the
traveller carries as an optional argument, and no caller in `src/` passes it, so it defaults to an
empty satchel and those six rungs cannot be climbed. Every test that covers them passes the satchel
by hand. This phase fixes that by removing the gate, not by wiring it.

### 2. Regrowth tiers set by the game — built

**The ground still runs down.** Removing depletion was proposed and withdrawn: with nothing to run
out, one reed bed gives forever, the pointer and pins lose their reason, and everything can be made
on the first day. What changes is how a material gets its tier.

**What happens today** (`content/tiers.ts`, `content/nodes.ts`):

- A tile holds a stock set by rarity — common 4, rare 2, mythic 1 — plus 0 to 2 seeded per tile.
  Each take draws one; one in four gives two.
- A worked tile gets one unit back every N **in-game days**. A day passes by walking about eighty
  steps or by sleeping; nothing reads the real clock.
- N comes from the material's `renews` tier: `fast` 3 days, `seasonal` 7, `slow` 30, `never` none.
  Stone never comes back; working an outcrop makes another likelier within six tiles instead.

**What is wrong with it:** the tiers were assigned by canon's real-world reasoning — a fossil "needs
another age of rock", sandalwood "takes years". That is lore deciding play, which the owner's
direction rules out.

**The change: three tiers, sorted by use.**

| Tier | Back in | Rule | Materials |
|---|---|---|---|
| **Quick** | 3 days | used by 3 or more recipes or building stages | 22 |
| **Steady** | 7 days | used by 1 or 2 | 37 |
| **Slow** | 14 days | used by nothing a player has to make | 20 |

"Used" counts a recipe ingredient or a building-stage need that names the material, and a quarter
for each tagged need it could fill (`#timber`, `#fibre`), measured over `data/making/` on
2 October 2026.

- **"Never" goes**, and with it the reveal-nearby rule for stone (`REVEAL_WITHIN`,
  `REVEAL_PER_NODE`, `REVEAL_CAP`). Flint, sandstone and ammonite shell become Steady.
- **The workhorses come back fastest.** Bamboo cane, mangrove pole and iron-teak move from Slow to
  Quick — the Narmada bamboo problem from `docs/satchel-and-hearth.md`, solved by the rule.
- **Luxuries go slow.** Leviathan bone, frankincense, scar glass: for collecting, not progress.
- **47 of 79 materials change tier**, mostly the real-world tiers being undone.

**Slow is a fortnight, not a month**, on the owner's word while it was being built: thirty days was
too long for a player ever to see a luxury return.

**What shipped:** `regrows` on every material in `data/making/crafting.json`, `REGROW_DAYS` and
`REGROWTH_RULE` in `content/tiers.ts`, the count in `content/regrowth.ts`, and
`test/regrowth.test.ts`, broken once on purpose (bamboo set to Slow) to see it fail by name.
`renewal_rates.json`, `revealedNear` and the reveal constants are gone; the event lean that stops
offering a fifth stone now reads the stone class. 22 Quick, 37 Steady, 20 Slow, as measured.

**How it is kept.**

- Each material stores its tier name in `data/making/crafting.json`, in place of `renews`.
- `content/tiers.ts` has one table of three numbers, so tuning a whole tier is one edit.
- A test re-sorts every material by the rule and fails if a stored tier disagrees. Moving one
  material on purpose means listing it as an exception, with the reason, so nothing drifts quietly.
- Stock per tile and the one-in-four double take are unchanged.
- **Save:** remembered nodes keep their counts; only the days to return change. Existing saves stay
  valid unless the node shape changes, in which case `SAVE_VERSION` moves (fog and position only,
  never the diary).

### 3. One outcome per act — the owner's call

Drop the `clean` / `fair` / `clumsy` grade (`content/activity.ts`), so taking or making gives the
same every time and the card stops judging tools and the moment.

### 4. Retire fatigue — the owner's call

About 160 lines (`game/fatigue.ts`) already off unless the address carries `?fatigue=1`. Meals and
remedies keep their words and stop tuning a number.

### 5. The owner's play round

Each map from start to settlement, noting what confused, as on 19 August and 27 September.

## Kept, and why

- **Species rarity** (201 common, 104 rare, 40 mythic) decides how often something is met. That is
  world context, and stays in canon.
- **People's lines gated on understanding** (47 of 110) are the diary's progression itself.

## Parked

- **A cross-repository contract test**: made unnecessary by moving making to the game. The game's
  `test/gameOwned.test.ts` resolves the 44 ids canon names into the game and the 201 the game names
  into canon.
- **Loading panels on demand**: would break offline play for an unopened panel, and the app chunk
  has room (203.5 of 220 KB).

## Closed

Phases 1 and 2 went onto the open branches of game #243 and canon #158, the owner's word being to
build those two and nothing else. Phases 3 to 5 stay recorded above as options, not commitments.
