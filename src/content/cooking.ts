// Food, and what eating it is worth.
//
// **Nothing here restores anything.** There is no hunger, no health and no stat a meal moves.
// A cooked thing gives a line in the diary and a mood, which in a game whose whole
// progression system is a written journal is not a small thing to give.
//
// That is the satchel's ruling applied to food specifically: inventory without scarcity. The
// alternative was on the table and refused — hunger coupled to `fatigue.ts` would have made
// eating a thing you must do, and `fatigue.ts` holds four invariants whose whole content is
// that it never stops you.
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
 * What eating it is like, for the diary.
 *
 * Canon's `notes` on the item is the description; this frames it as an evening rather than
 * as an object. The distinction matters because everything else in the satchel is described
 * as a thing and a meal is described as a time.
 */
export function eatingLine(itemId: string): string | null {
  const dish = item(itemId);
  if (!dish || !isFood(itemId)) return null;
  return `${dish.name}. ${dish.description}`;
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
