// How generous the ground is: every number the resource layer is tuned by, in one file.
//
// **These are the game's numbers, and since 2 October 2026 so is the data they are applied to.**
// Materials are the game's own (`data/making/crafting.json`), and which regrowth tier a material
// sits in is set by how much the game uses it rather than by what the lore says the thing is like
// (`docs/a-lighter-game.md`). This file holds how many days each tier takes.
//
// Everything here is pacing. None of it is a fact about the world, and none of it should be read
// as one -- a number here is a judgement about how a walk should feel, and the right way to settle
// it is to play and adjust rather than to argue.
//
// It is one file so that tuning is one edit. The numbers were previously split between
// `nodes.ts` (regrowth, stock) and `gathering.ts` (the odds of a good cut), which meant changing
// how generous the ground feels meant finding three tables in two modules and hoping there was
// not a fourth.
//
// Pure and free of React and Phaser.

import type { Regrowth } from './making';
import type { Rarity } from '../world/types';

/**
 * How many in-game days a worked place takes to give one more of a material, by its tier.
 *
 * A day passes by walking about eighty steps or by sleeping; nothing reads the real clock.
 *
 *   `quick`    3 days  -- the materials three or more recipes or building stages ask for. A
 *                         there-and-back across a field map, so the ground a player leans on is
 *                         never a dead end.
 *   `steady`   7 days  -- used by one or two. Go somewhere else and come back.
 *   `slow`    14 days  -- used by nothing a player has to make. For collecting, not for progress.
 *                         A fortnight on the owner's word: thirty was too long to ever see one return.
 *
 * Which tier each material is in is `REGROWTH_RULE` below, applied once and stored in the data.
 * There is no tier that never comes back: stone sorts by use like everything else, and the rule
 * that worked ground revealed new stone nearby went with the old `never`.
 */
export const REGROW_DAYS: Record<Regrowth, number> = {
  quick: 3,
  steady: 7,
  slow: 14
};

/**
 * Which tier a material belongs in, by how much the game uses it (`content/regrowth.ts` counts).
 *
 * A recipe ingredient or a building-stage need that names the material counts one; a tagged need
 * it could fill (`#timber`, `#fibre`) counts `tagged`, because any of several materials answers it.
 * At `quickFrom` uses or more it is `quick`, at `steadyFrom` or more `steady`, otherwise `slow`.
 */
export const REGROWTH_RULE = {
  tagged: 0.25,
  quickFrom: 3,
  steadyFrom: 1
};

/**
 * Materials whose tier is set by hand rather than by the rule, each with its reason. Empty on
 * purpose: `test/regrowth.test.ts` fails on any material the rule would sort differently unless it
 * is named here, so a hand-move is always written down.
 */
export const REGROWTH_EXCEPTIONS: Record<string, { tier: Regrowth; why: string }> = {};

/**
 * How much a place holds before it is drawn down, by how common the material is.
 *
 * Not a canon number: canon does not model a world's stock and says so, because stock depends on
 * a seed canon has never seen. Rarity is the honest game-side proxy — a common reed bed is worth
 * several visits and a mythic thing is one and done.
 *
 * **The floor is 1 rather than 0.** A node that exists always gives at least once; a tile that
 * offers something and then refuses it is a bug wearing a mechanic's clothes.
 */
export const STOCK: Record<Rarity, number> = {
  common: 4,
  rare: 2,
  mythic: 1
};

/**
 * How much a single tile's stock varies around `STOCK`.
 *
 * Seeded on the tile, so the variation is part of the world rather than a throw — the same
 * stand is always the better one. Between the base and base + this, so a good patch is visibly
 * a good patch and the shape of the number stays legible.
 */
export const STOCK_VARIANCE = 3;

/**
 * One stoop in this many is a good one, giving two rather than one.
 *
 * **Never a chance of nothing**, and that is a design ruling rather than a number to tune past:
 * cozy games vary how much rather than whether, and gathering is the only thing that puts a
 * material into a satchel, so a failure roll would put a die in front of every recipe in the
 * game and stack multiplicatively with depletion. `test/nodes.test.ts` fails by name if a
 * material ever gives nothing on an untouched node.
 *
 * Four means a quarter — measured across Lothal at 1,942 stoops for 2,421 items. Frequent enough
 * to be a texture, rare enough to still read as luck.
 */
export const GOOD_CUT_IN = 4;

/** How many a good cut gives. Two, because the diary says "two of reed fibre" and not a number. */
export const GOOD_CUT_GIVES = 2;

/**
 * How much of the walking a remedy takes back, as a fraction of the tiredness carried.
 *
 * **Measured rather than argued, which is this file's own standard.** It shipped as a guess with
 * "wants a playthrough" written beside it; a playthrough is still the right way to settle how it
 * *feels*, but what it is *worth* is arithmetic and was never done. From the game's own constants
 * -- `travelTimeMs` at 45s a step, `DAY_MS`, `DAY_OF_WALKING_MS`:
 *
 *   a day buys                80 steps of easy ground
 *   rested to spent          320 steps, so four days of walking
 *
 *   remedy, at 25% tired      40 steps back, pace 1.15 -> 1.07
 *   remedy, at 100% tired    160 steps back, pace 1.60 -> 1.30
 *   meal,   at 25% tired      20 steps back, pace 1.15 -> 1.11
 *   meal,   at 100% tired     80 steps back, pace 1.60 -> 1.45
 *
 * **A fraction of what is carried, never an absolute, and that is what makes the number safe.** It
 * scales with how tired you actually are, so a remedy taken fresh is nearly wasted and one taken
 * spent is worth two days of walking -- which is the right shape for a thing you carry and choose a
 * moment for. It also means neither can ever fully rest you: that stays the night's job, and the
 * night is the older and better mechanic.
 *
 * The ceiling matters more than either number. `fatigue.ts` holds four invariants whose whole
 * content is that tiredness never stops you -- it is a pace between 1 and 1.6 and nothing else --
 * so no value here can unblock anything, because nothing was blocked.
 */
export const REMEDY_EASES = 0.5;

/**
 * The same, for a meal. Half what a physic gives, because a physic is the one made *for* it.
 *
 * A meal earning anything at all is a change of position worth naming. `cooking.ts` has said since
 * it was written that "nothing here restores anything" -- correctly, against hunger, which this
 * still does not have. What it now says is narrower: a meal is an hour sitting down, and an hour
 * sitting down is worth something to a pair of legs. There is still nothing you must eat.
 */
export const MEAL_EASES = 0.25;

/**
 * How much of the walking each kind of night takes back, from 0 to 1.
 *
 * **Every night that is a night restores the same, and that is a decision rather than a stub.**
 * Sleeping in the woods and sleeping in a town are worth the same rest today. Only sitting it out
 * with no shelter at all is worth nothing, because that is not sleeping.
 *
 * A graded version of this table was built and taken back out. It read plausibly -- a bedroll worth
 * a third of a night in town -- and it was answering a question nobody had asked: **the shelter
 * kinds exist to be different *places*, not different amounts.** What a player gets out of where
 * they slept is going to be an *event* -- a dream, an animal at the edge of the firelight, somebody
 * arriving in the dark -- and an event is a scene and a choice, not a number.
 *
 * So the ladder below is a vocabulary of six places and their art, and this table is deliberately
 * flat behind it. When the night events land, the thing that varies by shelter is **which events
 * can happen there**, which is a far more interesting axis than a percentage and is the one
 * `content/events.ts` is built on.
 *
 * Keep the mechanism. It costs nothing, `easedMark` is tested, and it is the seam a later design
 * would come back through. Do not reintroduce a spread without a reason that is not "it seems more
 * realistic" -- that was the reason the first time.
 */
export const NIGHT_RESTORES: Record<string, number> = {
  none: 0,
  bedroll: 1,
  tent: 1,
  dugout: 1,
  camp: 1,
  roof: 1,
  settlement: 1,
  palace: 1
};

/**
 * How rarely a woven event happens, as one in N chances each time the question is asked.
 *
 * **Authored events are not rationed by this; only woven ones are.** An authored event is somebody's
 * deliberate scene with its own `conditions`, and it fires whenever those hold. A woven event can be
 * made from almost any tile, so without a ration one would open on every night, every arrival and
 * every day of road -- and a thing that always happens is furniture, not an event.
 *
 * What the numbers mean in play, given how often each question is asked:
 *
 * - `road` is asked once per day of walking (see `onRoad` in `App.tsx`), so 3 is about one
 *   meeting on the road every three days.
 * - `night` is asked every time somebody sleeps: one night in three has something in it.
 * - `arriving` is asked once per place per journey, so about a third of places greet you.
 * - `working` is asked after every take, and a take is the commonest act in the game -- so it is
 *   the rarest, one in nine, or the satchel fills to a running commentary. It was one in six
 *   until the simulation showed gathering making as many events as the road (0.27 a day each);
 *   nine brings it to 0.19, and days with anything in them from 63% to 59%. The owner's call,
 *   26 September, on the recommendation in `docs/strangers-and-happenings.md`.
 *
 * Tune here and nowhere else. `test/happenings.test.ts` measures the realised rate over many rolls
 * and fails if it drifts far from what this table says.
 */
export const WOVEN_ONE_IN: Record<'night' | 'arriving' | 'road' | 'working' | 'journey', number> = {
  night: 3,
  arriving: 3,
  road: 3,
  working: 9,
  // Never rationed: a crossing asks for its happening (`ui/Journey.tsx`), the first time on a road.
  journey: 1
};

/**
 * The first day of the journey a boat is lent, counting from nought -- so 2 is the third day.
 *
 * **The owner's ruling, 3 October 2026**: the dugout is Thrali's to lend, and not straight away. A
 * player given it on the first morning never wades, so never sees the water take them to the knee;
 * two days on foot first is the delta as it is meant to be met. Canon says who lends it, where, and
 * what they say if asked too soon (`field_map.firsts`); this says when.
 */
export const LEND_FROM_DAY = 2;

/** How much a woven event eases, when it eases at all. Company on the road is worth less than a meal. */
export const COMPANY_EASES = 0.15;

/**
 * The pacer: how the ration leans on how long it has been since anything happened.
 *
 * **A cozy storyteller, not a dramatic one.** `RimWorld`'s storytellers pace incidents against what
 * the colony has just been through; this does the same for a walk, with no threat in it anywhere.
 * The day after something happened, the road is quieter; after a long quiet stretch it leans in. A
 * multiplier on `WOVEN_ONE_IN`'s chance, by whole days since the last woven event of any kind, and
 * the last entry holds for every longer gap.
 *
 * Read as: the same day as another event, a third as likely; a day after, two thirds; two to four
 * days, as `WOVEN_ONE_IN` says; five to seven, half again; eight or more, twice. A fresh journey
 * with nothing yet counts as an ordinary day, and nothing woven happens before `WOVEN_FROM_DAY`.
 * `test/simulation.test.ts` measures what this produces over hundreds of journeys.
 */
export const PACE: readonly { fromDay: number; times: number }[] = [
  { fromDay: 0, times: 0.35 },
  { fromDay: 1, times: 0.7 },
  { fromDay: 2, times: 1 },
  { fromDay: 5, times: 1.5 },
  { fromDay: 8, times: 2 }
];

/** No woven event is ever more likely than this, however long the quiet. A sure thing is furniture. */
export const PACE_CEILING = 0.85;

/**
 * Variety: a kind sharing a tag with anything from the last `VARIETY_DAYS` days is picked
 * `VARIETY_DAMP` times as often. Two animals in a row can happen; it just usually does not.
 */
export const VARIETY_DAYS = 3;
export const VARIETY_DAMP = 0.35;

/**
 * The first day a woven event can happen on. Day zero is the journey's first.
 *
 * **The first day belongs to the place.** A player who has just arrived is learning where they are,
 * who is here and what the ground gives, and a card about tracks on the road lands on top of all of
 * that. Games that deal random events commonly hold them back at the start for exactly this; here
 * it is one day. Authored events are not held back -- somebody who wrote a first-night dream meant
 * it for the first night -- and the inspector (`window.__happen`) is not either.
 */
export const WOVEN_FROM_DAY = 1;

/**
 * How long a crossing between two maps takes, of the journey's clock.
 *
 * **Half a day: set out in the morning, arrive by evening** -- the owner's answer to Q7 of the
 * Roads and Hands plan, so a map feels far away and you arrive with light left to find a roof.
 * Canon says what a road is and never how long; this is the game's number, as every duration is.
 */
export const CROSSING_MS = 30 * 60 * 1000;

/**
 * A camp's day, in clock hours. See `content/campLife.ts` and `docs/living-camps.md`.
 *
 * **Windows, never timers.** Where somebody at a camp is comes from the hour, the way a traveller's
 * position does, so nothing about a camp's day is saved and a reload finds everybody where the hour
 * puts them. Tune these and nothing else when the day reads wrong: the words for each stretch are in
 * `data/camp-life.json`.
 *
 * `wake` is the fire relit; `chores` the morning's work; `shade` the hot middle of the day under the
 * shelter; `afternoon` work again; `meal` everybody at the fire; `evening` the kind's own evening
 * (singing, milking, the map, the toll); `sleep` two turn in and one keeps the fire. On a camp's
 * first day the shelter goes up at `pitched`; on its last it comes down from `strike`.
 */
export const CAMP_DAY = {
  wake: 5,
  chores: 7,
  shade: 12,
  afternoon: 14,
  meal: 17,
  evening: 19,
  sleep: 21,
  pitched: 10,
  strike: 15
} as const;

/**
 * How fast a camp's runner walks the way in, in tiles an hour of the day.
 *
 * **Measured, then chosen.** Ordinary travellers on the four maps walk a median 3.45 tiles an hour
 * and nine in ten walk 7.6 or slower (`docs/living-camps.md`, six seeds, every leg). A runner is a
 * local who knows the way and walks it unloaded going out, so five: at the median pace the meeting
 * happened on 13-21% of camp days, at five it happens on 30-48% on three maps. The Aravali's ways in
 * are a median 38 tiles and its runners almost never make it, which is the crossing being remote
 * rather than a number to tune past.
 */
export const RUNNER_PACE = 5;

/** How long a runner and a traveller stand at the turn-off trading, in hours. */
export const MEET_HOURS = 1;

/**
 * The fastest a visitor's day may be walked, in tiles an hour: the ninetieth percentile of ordinary
 * travellers, 7.6, rounded down. A visit replaces a traveller's leg with the walk to the camp and on
 * from it, which is longer, and a day that needs a faster walker than nine in ten is not offered.
 * Measured, visits then fall on a few days a month on three maps and never on the Aravali.
 */
export const VISIT_PACE_CAP = 7.5;

/** How long a visitor sits at a camp, in hours: eats, and does what they came for. */
export const VISIT_HOURS = 2;

// ---------------------------------------------------------------------------------------------
// Events that help (`docs/satchel-and-hearth.md`, phase 6; the owner's ruling, 2 October 2026).

/**
 * How often, in a hundred, something turned up on the road or under what you were taking is a thing
 * you are working towards -- the pinned recipe's or the next building stage's -- when the ground
 * could hold one. Three in four: often enough to feel looked after, rarely enough that it is still a
 * find. The rest is the old random pick. The owner's word for it: "nudge me towards what I pinned".
 */
export const EVENT_LEANS_PERCENT = 75;

/**
 * Carrying this many of a stone, it stops turning up unless something wanted
 * needs it. Flint is common on plains, hills and coast, and an event that hands over a fifth flint
 * to somebody who has never knapped one is the "useless flint" the owner complained of.
 */
export const STONE_ENOUGH = 4;

/**
 * Steps walked on a map before the Sinauli wagon's card can open (`happenings.ts`, `passing`).
 *
 * **The owner's ask of 4 October 2026: not the moment the traveller reaches the map.** Its round is
 * kept near the Caravan Ground, which is where Dwarka sets a traveller down, so without this the card
 * would open on the first step. Sixty is most of a morning's walking -- `tile-entered` fires about
 * eighty times a day -- so it comes once the traveller has been somewhere and come back. Counted per
 * visit and not saved: a reload starts the count again, which only ever makes the card later.
 */
export const PASSING_AFTER_STEPS = 60;
