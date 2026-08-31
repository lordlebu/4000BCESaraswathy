// Whether a recipe can be made right now, and what happens when it is.
//
// Shaped after `src/journey.ts` on purpose, field for field: `canMake` / `blockedBy` / `make`
// answer the same three questions as `canAdvance` / `blockedBy` / `advance`, in the same
// order, with the same rule about who asks. **The UI asks; it never reimplements.** A panel
// that walks a recipe's ingredients itself to compute a percentage is a second implementation
// and will drift -- which has happened three times in this codebase, each time a mechanic
// written, tested, and with no caller.
//
// Pure and free of React and Phaser, so `test/` exercises the exact code that ships.
//
// **This duplicates the craft closure in canon's `utils/check_playability.py`**, in a second
// language and a second repository, exactly as this repo's `holds` and `observed` duplicate
// that file's. The cost is accepted for the same reason: canon must be able to prove a recipe
// reachable before exporting. If the rule here changes, change it there.

import {
  type Ingredient,
  type MaterialClass,
  type Recipe,
  hasClass,
  nameOf,
  process,
  recipe,
  recipes
} from './making';
import { type Satchel, add, affording, count, remove } from './satchel';

/** Where the traveller is standing, as far as making is concerned. */
export interface Bench {
  /** The `poi.kind` under foot, or null out in the open. */
  kind: string | null;
}

/** Standing in a field, which is where most of this happens. */
export const openGround = (): Bench => ({ kind: null });

/**
 * A material in the satchel that satisfies a `#tag` ingredient.
 *
 * Returns the ids in carried order and lets the caller decide -- a UI offers the choice, and
 * `make` takes the first. Deliberately not "the cheapest" or "the most plentiful": canon has
 * no prices, and spending the rarest fibre first would be a design decision made in a
 * utility function.
 */
export function satisfying(satchel: Satchel, tag: MaterialClass): string[] {
  return Object.keys(satchel)
    .filter((id) => hasClass(id, tag))
    .sort();
}

/** How many of a tag's class are carried, across every material that has it. */
export function tagCount(satchel: Satchel, tag: MaterialClass): number {
  return satisfying(satchel, tag).reduce((n, id) => n + count(satchel, id), 0);
}

function haveIngredient(satchel: Satchel, need: Ingredient): boolean {
  if (need.tag) return tagCount(satchel, need.tag) >= need.count;
  const id = need.material ?? need.item;
  return id ? count(satchel, id) >= need.count : false;
}

/**
 * Whether the place allows the process.
 *
 * An empty `performedAt` means anywhere, including standing in a field, which is the honest
 * default for hand work -- somebody splitting reeds needs a river bank, not a building.
 */
export function placeAllows(recipeId: string, bench: Bench): boolean {
  const p = process(recipe(recipeId)?.process ?? '');
  if (!p || p.performedAt.length === 0) return true;
  return bench.kind !== null && p.performedAt.includes(bench.kind);
}

/** Affordances the process needs that nothing carried provides. */
export function missingTools(satchel: Satchel, recipeId: string): string[] {
  const p = process(recipe(recipeId)?.process ?? '');
  if (!p) return [];
  return p.needs.filter((n) => affording(satchel, n).length === 0);
}

/**
 * Whether this can be made here, now.
 *
 * Three things can stop it, and they are the three the process model has: the ground is
 * wrong, nothing carried does what the work needs, or an ingredient is short.
 */
export function canMake(satchel: Satchel, recipeId: string, bench: Bench = openGround()): boolean {
  const r = recipe(recipeId);
  if (!r) return false;
  if (!placeAllows(recipeId, bench)) return false;
  if (missingTools(satchel, recipeId).length > 0) return false;
  return r.ingredients.every((need) => haveIngredient(satchel, need));
}

/**
 * Why it cannot be made, as readable reasons, for a UI that wants to say something useful.
 *
 * Reasons rather than ids: `blockedBy` in `journey.ts` returns requirement ids because those
 * are things the player can go and look at. What blocks a recipe is a mixture of a place, a
 * tool and a shortfall, and only the last is an id, so this returns prose.
 */
export function blockedBy(
  satchel: Satchel,
  recipeId: string,
  bench: Bench = openGround()
): string[] {
  const r = recipe(recipeId);
  if (!r) return [];
  const why: string[] = [];

  if (!placeAllows(recipeId, bench)) {
    const where = process(r.process)?.performedAt ?? [];
    why.push(`needs to be done at a ${where.join(' or ')}`);
  }
  for (const tool of missingTools(satchel, recipeId)) {
    why.push(`needs something that can ${tool}`);
  }
  for (const need of r.ingredients) {
    if (haveIngredient(satchel, need)) continue;
    if (need.tag) {
      why.push(`needs ${need.count} ${need.tag}, has ${tagCount(satchel, need.tag)}`);
    } else {
      const id = need.material ?? need.item ?? '';
      why.push(`needs ${need.count} ${nameOf(id)}, has ${count(satchel, id)}`);
    }
  }
  return why;
}

/**
 * Make it. Returns a new Satchel; never mutates, and returns the same one if it cannot.
 *
 * A `kept` ingredient is a tool: needed for the work and still there afterwards. Getting
 * that backwards is how a crafting system quietly eats every knife in the world, which is
 * why canon marks it on the ingredient rather than leaving it to be inferred from `kind`.
 *
 * A tag ingredient spends the carried materials in `satisfying` order until the count is
 * met, which may draw on more than one -- four fibre out of two reeds and two husks is a
 * legitimate way to make a mat.
 */
export function make(satchel: Satchel, recipeId: string, bench: Bench = openGround()): Satchel {
  if (!canMake(satchel, recipeId, bench)) return satchel;
  const r = recipe(recipeId)!;
  let next = satchel;

  for (const need of r.ingredients) {
    if (need.kept) continue;
    if (need.tag) {
      let owed = need.count;
      for (const id of satisfying(next, need.tag)) {
        if (owed <= 0) break;
        const spend = Math.min(owed, count(next, id));
        next = remove(next, id, spend);
        owed -= spend;
      }
    } else {
      const id = need.material ?? need.item;
      if (id) next = remove(next, id, need.count);
    }
  }

  for (const got of r.outputs) {
    const id = got.item ?? got.material;
    if (id) next = add(next, id, got.count);
  }
  return next;
}

/**
 * Whether the player knows how.
 *
 * A predicate rather than a `Progress`, so this module stays about the satchel and the ground
 * under foot and never learns what a journey is. The caller composes the two — `App` passes
 * `(id) => knowsRecipe(progress, id)` — and the default is "everything", which is the right
 * answer for a test asking a question about ingredients rather than about teaching.
 */
export type Knows = (recipeId: string) => boolean;
const ALL: Knows = () => true;

/** Every recipe that can be made right now. What a Making panel lists. */
export function makeableNow(
  satchel: Satchel,
  bench: Bench = openGround(),
  known: Knows = ALL
): Recipe[] {
  return recipes.filter((r) => known(r.id) && canMake(satchel, r.id, bench));
}

/**
 * Recipes worth showing even though they cannot be made yet.
 *
 * Anything the traveller has begun to have the makings of -- at least one ingredient in
 * hand. A panel listing all 72 from the first step is a wall; one listing nothing until a
 * recipe is complete never teaches anybody that making exists.
 *
 * **Or anything this place allows that nowhere else does.** Standing at a settlement is itself a
 * reason to show a recipe, whether or not the traveller is carrying a scrap of it: six of the
 * seventeen processes can only be performed somewhere, and until this clause existed a player
 * could stand in the middle of the only place in the world that can smelt and never be told so.
 * That is the discoverability hole the whole workshop screen is for -- a capability you are
 * standing inside and cannot see is worse than one you have not reached.
 */
export function withinReach(
  satchel: Satchel,
  bench: Bench = openGround(),
  known: Knows = ALL
): Recipe[] {
  return recipes.filter(
    (r) =>
      known(r.id) &&
      !canMake(satchel, r.id, bench) &&
      (sitedHere(r.id, bench) ||
        r.ingredients.some((need) => {
          if (need.tag) return tagCount(satchel, need.tag) > 0;
          const id = need.material ?? need.item ?? '';
          return count(satchel, id) > 0;
        }))
  );
}

/**
 * Whether this recipe's process is one that had to be done somewhere, and this is somewhere.
 *
 * Deliberately narrower than `placeAllows`, which is also true for the eleven processes that can
 * be done anywhere. Those are not news: a player standing in a field does not need telling that
 * knapping works there. What is worth surfacing is the recipe that is *only* possible because of
 * where they are standing.
 */
export function sitedHere(recipeId: string, bench: Bench): boolean {
  const p = process(recipe(recipeId)?.process ?? '');
  if (!p || p.performedAt.length === 0) return false;
  return bench.kind !== null && p.performedAt.includes(bench.kind);
}

/**
 * Every recipe this place allows that could not be made out in the open, whether or not the
 * traveller can make it yet. What a bench is *for*.
 */
export function offeredHere(bench: Bench, known: Knows = ALL): Recipe[] {
  return recipes.filter((r) => known(r.id) && sitedHere(r.id, bench));
}
