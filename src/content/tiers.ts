// How generous the ground is: every number the resource layer is tuned by, in one file.
//
// **These are the game's numbers, not canon's, and that split is the whole reason this file
// exists separately.** Canon says a material renews `fast`, `seasonal`, `slow` or `never` — an
// *ordering*, stated in `database/renewal_rates.json`, which says in its own note that it "does
// not say in how many days, because a day is a unit of play and the length of one is the game's
// to decide". This is where that decision is made.
//
// Everything here is pacing. None of it is a fact about the world, none of it needs a canon edit
// to change, and none of it should be read as one — a number here is a judgement about how a walk
// should feel, and the right way to settle it is to play and adjust rather than to argue.
//
// It is one file so that tuning is one edit. The numbers were previously split between
// `nodes.ts` (regrowth, stock) and `gathering.ts` (the odds of a good cut), which meant changing
// how generous the ground feels meant finding three tables in two modules and hoping there was
// not a fourth.
//
// Pure and free of React and Phaser.

import type { Renewal } from './making';
import type { Rarity } from '../world/types';

/**
 * How long each of canon's four renewal tiers takes, in days.
 *
 * Sized against the day the game actually has. `dayNight.ts` spends `DAY_MS` over about eighty
 * steps of ordinary walking, so:
 *
 *   `fast`      3 days   — a there-and-back across a field map. Long enough that a stripped
 *                          reed bed is something you notice; short enough that noticing it is
 *                          not a punishment.
 *   `seasonal`  7 days   — a season's errand. You go somewhere else and come back.
 *   `slow`     30 days   — "not on this journey", which is what canon's own gloss says `slow`
 *                          means. A player will not usually see one of these return.
 *   `never`    null      — canon's word, honoured literally. A fossil bed you have emptied is
 *                          empty. `check_playability.py` reports which of these sit in one kind
 *                          of ground precisely so this cannot strand somebody quietly.
 *
 * **What `slow` actually means in play is worth knowing before tuning it.** Measured on Lothal
 * against a player who strips every tile on the map every day, a 30-day node is emptied thirty
 * times before it returns one — so to that player `slow` is indistinguishable from `never`.
 * Against a player who walks a route rather than carpet-sweeping, which is what the game is
 * actually shaped for, 1,923 of 1,942 nodes are still giving after ninety days. The tier is
 * doing its job; the exhaustive case is a player outrunning it on purpose.
 */
export const DAYS_TO_RETURN: Record<Renewal, number | null> = {
  fast: 3,
  seasonal: 7,
  slow: 30,
  never: null
};

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
 * How far away a worked-out stone node makes a new one likelier, in tiles.
 *
 * **Stone does not grow back; it is found.** A cut nodule is gone for ever — that is canon's
 * `never` and it stays literally true — but the *world* does not run out of stone, because
 * working the ground turns up more of it. A quarry face exposes fresh rock behind the block you
 * took; a flood rolls new cobbles into a bed you have already picked over.
 *
 * So the answer to "will the map be stripped bare" is not that stone regrows. It is that a
 * player who works one outcrop **reveals another nearby**, and the ground stays worth walking
 * without anything having to un-happen.
 *
 * Six tiles is a little over two kilometres at `KM_PER_TILE`, and a few minutes' walking: near
 * enough that the new seam reads as *this* place still giving, far enough that it is a walk
 * rather than a respawn under your feet.
 */
export const REVEAL_WITHIN = 6;

/**
 * How much likelier a new stone node is, per worked-out node nearby.
 *
 * Additive on the base chance rather than multiplicative, so the effect is legible: work out
 * four outcrops around a spot and the chance of finding another there roughly doubles. Capped
 * by `REVEAL_CAP` so a heavily worked district becomes *rich* rather than paved with stone.
 */
export const REVEAL_PER_NODE = 0.06;

/** The most the base chance can be raised by working the ground. */
export const REVEAL_CAP = 0.30;

/**
 * How much of the walking a remedy takes back, as a fraction of the tiredness carried.
 *
 * **Half, and the ceiling matters more than the number.** `fatigue.ts` holds four invariants whose
 * whole content is that tiredness never stops you -- it is a pace between 1 and 1.6 and nothing
 * else -- so a remedy cannot un-block anything, because nothing was blocked. What it buys is the
 * back half of a long day without walking to a camp for it.
 *
 * Deliberately not the whole of it. A physic that reset tiredness outright would make the four
 * kinds of night pointless, and the night is the older mechanic and the better one: it is a
 * decision about where to be at dusk, where this is a decision about what to carry.
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
  camp: 1,
  roof: 1,
  settlement: 1,
  palace: 1
};
