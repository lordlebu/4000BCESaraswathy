// What a carried thing is *for*.
//
// **One verb over three systems, and the collapsing is the design.** A remedy, a meal and a
// shelter were three things the player was told about and could do nothing with: canon holds
// seven `physic` items affording `heal`, thirteen foods affording `eat` and two shelters
// affording `shelter`, the crafting layer could make all twenty-two of them, and **not one had a
// caller anywhere in the game**. `cooking.ts` had zero importers for its whole life. That is this
// codebase's signature fault, named at the top of `journey.ts`: a mechanic written, tested,
// believed, and wired to nothing.
//
// The obvious repair is three panels -- an apothecary, a kitchen, a camp-builder. That is three
// screens, three verbs and three places to look, for a game whose whole interface budget is one
// dock with one occupant. So instead there is **one question, asked of anything in the satchel:
// what is this for?** Canon has already answered it, on the item, in the `affords` list, and this
// module does nothing but read that answer back.
//
// That is also the genre convention rather than a local economy. Stardew, Animal Crossing,
// Spiritfarer and Cozy Grove all put using a thing on the thing itself: you select it and use it.
// None of them has an apothecary screen.
//
// **Nothing here can hurt you, and nothing here is required.** Easing tiredness is the only
// effect, `fatigue.ts` holds four invariants whose entire content is that tiredness never stops
// you, and a player who never opens the satchel still finishes the game -- which is the promise
// `satchel.ts` and `kit.ts` both make and this module is careful not to break. There is no
// hunger, no health, no spoilage and no stat a meal moves except the one that was only ever a
// pace.
//
// Pure, immutable, and free of React and Phaser.

import { type Item, item, recipesMaking } from './making';
import { type Satchel, count, itemsHeld, remove } from './satchel';
import { MEAL_EASES, REMEDY_EASES } from './tiers';

/**
 * What kind of use a thing has.
 *
 * Three, because canon's affordance vocabulary has exactly three words that are about the person
 * carrying the thing rather than about the work they are doing with it. `cut`, `bind`, `work`,
 * `mark` and the rest are all tools -- they answer a *process*, and `crafting.missingTools`
 * already reads them. These three answer *you*.
 */
export type UseKind = 'remedy' | 'meal' | 'shelter';

/** The affordance that makes a thing each kind of usable, in the order they are offered. */
const KIND_OF: readonly [UseKind, string][] = [
  ['remedy', 'heal'],
  ['meal', 'eat'],
  ['shelter', 'shelter']
];

export interface Use {
  id: string;
  name: string;
  kind: UseKind;
  /** What the button says. A verb about the thing, never "Use item". */
  verb: string;
  /** What this does, said plainly, before it is done. One clause. */
  promise: string;
  /**
   * Whether it is gone afterwards.
   *
   * **A shelter is not, and that is the whole of "building" in this game.** You do not spend a
   * tent by sleeping under it; you spend an evening raising it and it is yours for the journey.
   * A remedy and a meal are gone, which is what makes them worth making again -- and the only
   * reason the crafting tree has a reason to be re-run at all.
   */
  spends: boolean;
  /**
   * How much of the walking this takes back, from 0 to 1.
   *
   * Zero for a shelter, which changes the night rather than the hour. The numbers live in
   * `tiers.ts` with every other pacing judgement, because none of them is a fact about the world.
   */
  eases: number;
}

/** "A remedy", "A meal", "Shelter" -- what the satchel groups a row under. */
export const USE_HEADING: Record<UseKind, string> = {
  remedy: 'Physic',
  meal: 'Food',
  shelter: 'Shelter'
};

/**
 * What a thing is for, or null -- which is the usual answer and not a problem.
 *
 * A raw material is never usable: stuff is what you make things *out of*, and offering to eat a
 * handful of reed fibre would be the interface inventing an affordance canon did not give it.
 * So this asks `item()` and stops if the id is not one.
 *
 * **The first matching affordance wins, in `KIND_OF` order, and the order is a ruling.** Four of
 * canon's items carry two of these at once -- `item_ashwagandha_tonic` both heals and is eaten,
 * `item_reed_mat` and `item_indigo_cloth` both shelter and carry -- and a thing that is both a
 * physic and a food is offered as the physic, because that is the reason somebody went to the
 * trouble of making it.
 */
export function useOf(id: string): Use | null {
  const made = item(id);
  if (!made || made.isPrototype) return null;
  for (const [kind, affordance] of KIND_OF) {
    if (!made.affords.includes(affordance as never)) continue;
    return {
      id,
      name: made.name,
      kind,
      verb: verbFor(kind, made),
      promise: promiseFor(kind, made),
      spends: kind !== 'shelter',
      eases: kind === 'remedy' ? REMEDY_EASES : kind === 'meal' ? MEAL_EASES : 0
    };
  }
  return null;
}

/**
 * Everything carried that can be used, remedies first.
 *
 * Sorted by kind rather than by name, so the row a tired player is looking for is at the top of
 * the list rather than wherever the alphabet put it. `itemsHeld` is already stably sorted, so
 * within a kind the order does not move between renders.
 */
export function usableIn(satchel: Satchel): Use[] {
  const order = KIND_OF.map(([kind]) => kind);
  return itemsHeld(satchel)
    .map(useOf)
    .filter((u): u is Use => u !== null)
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

/**
 * Use it. Returns a new Satchel; never mutates, and returns the same one if it cannot.
 *
 * A shelter comes back unchanged, because raising a tent does not consume it. Getting that
 * backwards is the same fault `crafting.make` guards with `kept` ingredients, and it is worth
 * guarding twice: a game that ate your tent the first night you pitched it would be teaching the
 * player never to press the button.
 */
export function use(satchel: Satchel, id: string): Satchel {
  const what = useOf(id);
  if (!what || count(satchel, id) < 1) return satchel;
  return what.spends ? remove(satchel, id, 1) : satchel;
}

/**
 * What using it is like, for the diary.
 *
 * Canon's `notes` on the item is the description; this frames it as a moment rather than as an
 * object, which is the distinction `cooking.eatingLine` was written for and never got to make.
 * Everything else in the satchel is described as a thing; these are described as a time.
 */
export function usedLine(id: string): string | null {
  const what = useOf(id);
  const made = item(id);
  if (!what || !made) return null;
  switch (what.kind) {
    case 'remedy':
      return `${made.name}. ${made.description} The ache in your legs goes somewhere else for a while.`;
    case 'meal':
      return `${made.name}. ${made.description} You ate it sitting down, which is the rare part.`;
    case 'shelter':
      return `${made.name}, up and pegged before the light went. A better night than the ground would have given.`;
  }
}

/**
 * What the traveller has built to sleep under, or null when it is the bedroll and the sky.
 *
 * **This is the whole of "building", and it deliberately has no new state behind it.** The obvious
 * design is a set of tiles the player has built on, which means a new field in `Journey`, which
 * means bumping `SAVE_VERSION` and discarding every existing journey -- for a mechanic whose
 * entire content is "the night went better". `night.shelterAt` already ranks four kinds of night
 * and the scene already asks it; all that was missing was a fourth thing for it to consider.
 *
 * So what you have built travels with you, which is truer to a walking naturalist than a fixed
 * camp would be, and the loop it closes is the one the making layer never had: **you craft a tent
 * because the nights are bad, and then the nights are better.** Eighty-three recipes and until now
 * not one of them changed anything a player could feel.
 *
 * **Returns what is carried, not what kind of night it buys**, and that is an architecture rule
 * rather than fussiness. `Shelter` is `game/night.ts`'s word, and `content/` importing from
 * `game/` would point the dependency arrow backwards through the one seam this codebase keeps
 * carefully one-way -- `world/` and `content/` run under plain Node so `test/` exercises the code
 * that ships. The ranking stays in `night.ts`, which already owns it.
 *
 * A tent is a camp's worth of night. A mat, a blanket or a bolt of cloth is the bedroll's, which
 * the kit already gives -- so they are not reported, because promising what you already have is
 * noise. `item_hide_tent` is the only thing in canon that beats the bedroll, and finding that out
 * is the reward for reading the crafting tree.
 */
export function shelterBuilt(satchel: Satchel): 'tent' | null {
  return count(satchel, 'item_hide_tent') > 0 ? 'tent' : null;
}

/**
 * Whether anything a player could reasonably reach would improve their nights.
 *
 * For the one line the rest row shows when there is nothing carried: pointing at the recipe is
 * how anybody finds out that building a tent is a thing the game lets you do. Asked of
 * `recipesMaking` rather than hard-coded, so a second canon shelter is picked up for free.
 */
export function shelterRecipeExists(): boolean {
  return recipesMaking('item_hide_tent').length > 0;
}

/** "Drink it", "Eat it", "Pitch it". Named for the thing, never "Use". */
function verbFor(kind: UseKind, made: Item): string {
  switch (kind) {
    case 'remedy':
      // A salve and a poultice go on; a tonic, a powder and a pill go in. Read off the name
      // rather than authored per item, because canon will add more and a table would not know.
      return /salve|poultice/i.test(made.name) ? 'Put it on' : 'Take it';
    case 'meal':
      return /liquor|sour|oil/i.test(made.name) ? 'Drink it' : 'Eat it';
    case 'shelter':
      return 'Pitch it';
  }
}

/** One clause on what it does, in the register the dock uses for everything else. */
function promiseFor(kind: UseKind, made: Item): string {
  switch (kind) {
    case 'remedy':
      return 'Takes the walking out of your legs. Gone once used.';
    case 'meal':
      return 'An hour sitting down, and the road afterwards is shorter. Gone once eaten.';
    case 'shelter':
      return `Raised wherever you stop. ${made.name} stays yours.`;
  }
}
