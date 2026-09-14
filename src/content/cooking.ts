// Food, and what cooking it is worth.
//
// **There is still no hunger, and there never will be.** That was on the table and refused:
// hunger coupled to `fatigue.ts` would make eating a thing you *must* do, and `fatigue.ts` holds
// four invariants whose whole content is that it never stops you. A player who never cooks
// anything finishes the game.
//
// What changed is narrower and is stated in `using.ts`: a meal is an hour sitting down, and an
// hour sitting down is worth something to a pair of legs. It eases tiredness by `MEAL_EASES` --
// a quarter of what is carried, half what a physic gives -- and tiredness is a walking pace
// between 1 and 1.6 and nothing else. Nothing is restored because nothing is depleted.
//
// **This module answers what can be cooked; `using.ts` answers what eating it does.** The split is
// the one this whole layer runs on: canon says what a dish is, the game says what an evening is
// worth. `eatingLine` used to live here and was the fourth casualty of this codebase's signature
// fault -- for the whole of its life **nothing imported this file at all**, so the line it wrote
// could not reach a diary. It is `using.usedLine` now, where the verb that produces it lives.
//
// Canon carries the rest of it. A `foodway` says what a dish means — whose it is, when it is
// eaten, what it marks — and canon deliberately does not export them, so the meanings are in
// the book and not in this bundle. What ships is the dish.
//
// Pure and free of React and Phaser.

import { type Item, type Recipe, item, process, recipes } from './making';
import { type Bench, canMake, makeableNow } from './crafting';
import type { Satchel } from './satchel';

/** Recipes whose output is something you can eat. */
export const dishes: Recipe[] = recipes.filter((r) =>
  r.outputs.some((o) => o.item !== null && (item(o.item)?.affords.includes('eat') ?? false))
);

/** Every food item canon knows about. */
export const foods: Item[] = dishes
  .flatMap((r) => r.outputs.map((o) => o.item))
  .filter((id): id is string => id !== null)
  .map((id) => item(id))
  .filter((i): i is Item => i !== null)
  .filter((i, at, all) => all.findIndex((x) => x.id === i.id) === at);

/** Whether an item is food. */
export function isFood(id: string): boolean {
  return item(id)?.affords.includes('eat') ?? false;
}

/** The dishes that can be cooked right now, given what is carried and where you stand. */
export function cookableNow(satchel: Satchel, bench?: Bench): Recipe[] {
  const ready = new Set(makeableNow(satchel, bench).map((r) => r.id));
  return dishes.filter((d) => ready.has(d.id));
}

/**
 * Whether this dish can be cooked here.
 *
 * A thin pass-through to `canMake`, and deliberately thin: cooking is not a second crafting
 * system, it is crafting whose output happens to be edible. Having it as a named function
 * means a Cooking panel asks a question about cooking rather than reaching for the general
 * one and filtering, but the rule lives in one place.
 */
export function canCook(satchel: Satchel, recipeId: string, bench?: Bench): boolean {
  return dishes.some((d) => d.id === recipeId) && canMake(satchel, recipeId, bench);
}

/**
 * Where a dish can be cooked, said plainly.
 *
 * `process_cooking` names no site on purpose — a hearth is a fire somebody built, and a
 * traveller builds one wherever they stop. So this almost always answers "anywhere", and
 * saying so is worth more than leaving a panel to infer it from an empty array.
 */
export function whereCooked(recipeId: string): string {
  const r = dishes.find((d) => d.id === recipeId);
  const where = r ? (process(r.process)?.performedAt ?? []) : [];
  return where.length === 0 ? 'anywhere you can build a fire' : where.join(' or ');
}
