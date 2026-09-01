// Making a thing whose parts are also made.
//
// **Thirty-eight of eighty-two recipes need something else made first**, and the deepest run four
// steps: ore to ingot to blade to hafted knife. Asking a player to click each rung is the tedium
// that makes crafting a chore in every game that does it -- twenty-nine of canon's crafted things
// exist *only* as inputs to more crafting, so those are clicks that produce nothing a player ever
// uses directly.
//
// So the workshop offers the finished thing and performs the run itself. Canon keeps the true
// process -- bronze is still smelted before it is cast -- and the player reads what happened
// instead of clicking through it.
//
// **The log is what makes this honest rather than magic.** A chain that silently consumes four
// materials and hands back a knife is indistinguishable from a cheat; one that prints *smelted
// the ore, poured the ingot, cast the blade, hafted it* teaches the process it just spared you.
// That is the whole reason `plan` returns steps rather than a satchel.
//
// Two things this deliberately does not do. It never invents materials -- every step is a recipe
// canon already holds, and a chain that cannot be completed from what is carried is refused
// whole rather than half-made. And it never spends a `kept` ingredient: a tool is needed for the
// work and still there afterwards, and getting that backwards is how a crafting system quietly
// eats every knife in the world.

import { type Ingredient, type Recipe, nameOf, recipe, recipes } from './making';
import { type Satchel, count, remove } from './satchel';
import { type Bench, type Knows, canMake, make, missingTools, placeAllows, satisfying, tagCount } from './crafting';

/** One rung of a chain, in the order it happens. */
export interface Step {
  recipeId: string;
  /** What the log says: the recipe's own name. */
  name: string;
  /** What it produced, for the line under it. */
  made: string;
}

export interface Plan {
  /** Every rung, deepest first, ending with the thing that was asked for. */
  steps: Step[];
  /** Why the chain cannot be run, or null when it can. */
  blocked: string | null;
}

/** The recipe that makes a thing, or null. First one wins, as `crafting.ts` does elsewhere. */
function madeBy(id: string, knows: Knows): Recipe | null {
  for (const r of recipes) {
    if (!knows(r.id)) continue;
    for (const out of r.outputs) {
      if ((out.item ?? out.material) === id) return r;
    }
  }
  return null;
}

/** Whether the satchel already covers this ingredient outright. */
function have(satchel: Satchel, need: Ingredient): boolean {
  if (need.tag) return tagCount(satchel, need.tag) >= need.count;
  const id = need.material ?? need.item;
  return id ? count(satchel, id) >= need.count : false;
}

/**
 * Work out the run of recipes that ends in this one, or say why it cannot be run.
 *
 * Depth-first through the ingredients, deepest first, so every step is makeable by the time it is
 * reached.
 *
 * **`seen` is not an optimisation, and canon justifies it explicitly.** `recipe_ret_reed_fibre`
 * takes reed fibre and produces two of it -- its own note calls it "the one recipe here that
 * turns a thing into more of itself, because retting is what makes gathered reed into usable
 * fibre at all". A walk that chased it would recurse forever, so a recipe already on the stack is
 * refused rather than followed.
 *
 * The refusal reports the *shortfall* rather than naming the recipe. Saying "needs retting reed
 * first" while the player is holding reed fibre is true and useless; "needs 4 Reed fibre, has 1"
 * is what they can act on, and it is the same sentence `blockedBy` would have given.
 *
 * The satchel is threaded through as it *would* be after each step, so a chain that spends the
 * same material twice is caught here rather than half-way through making.
 *
 * **Two satchels, and both are needed.** `running` is what the player would be holding as the
 * sub-chains complete -- their outputs are real and go into it. `budget` is `running` minus
 * everything this recipe's earlier ingredients have already claimed, and it is what each new
 * ingredient is checked against.
 *
 * Getting this wrong twice is what the tests caught. Spending from `running` while checking made
 * a flint knife needing two flint refuse while holding exactly two, because the final `canMake`
 * saw an empty satchel. Not reserving at all made a fish weir needing four reed fibre *and* a
 * rope made of four reed fibre pass its checks on the same four, then fail at the end with
 * nothing useful to say. The budget is the reservation; `make` still does the real spending.
 */
export function plan(
  satchel: Satchel,
  recipeId: string,
  bench: Bench,
  knows: Knows,
  seen: readonly string[] = []
): Plan {
  const r = recipe(recipeId);
  if (!r) return { steps: [], blocked: 'no such recipe' };
  if (!knows(recipeId)) return { steps: [], blocked: 'somebody would have to show you' };
  if (!placeAllows(recipeId, bench)) {
    return { steps: [], blocked: null }; // `blockedBy` says where; this is not the place to repeat it
  }

  // **A missing tool is not a missing ingredient, and confusing them cost an afternoon.** A
  // process needs an affordance -- something that can `work`, or `cut`, or `contain` -- and that
  // is satisfied by anything carried that affords it rather than by a named material. The walk
  // below only chases ingredients, so without this a recipe blocked on a tool was reported as
  // "something is still missing" after a search that could never have found it.
  //
  // Tools are deliberately not chased either. Making the knife you need to make the thing you
  // asked for is a decision worth showing a player, not one to take on their behalf inside a
  // chain they did not ask to run.
  const short = missingTools(satchel, recipeId);
  if (short.length > 0) {
    return { steps: [], blocked: `needs something that can ${short[0]}` };
  }

  const steps: Step[] = [];
  let running = satchel;
  let budget = satchel;

  for (const need of r.ingredients) {
    if (need.kept) continue;
    if (have(budget, need)) {
      budget = reserve(budget, need);
      continue;
    }

    // Not carried. Can it be made? A tag ingredient is deliberately not chased -- `#fibre` names
    // a class rather than a thing, and picking which fibre to manufacture on the player's behalf
    // is a decision the panel should be offering rather than this making quietly.
    const id = need.tag ? null : (need.material ?? need.item ?? null);
    const sub = id ? madeBy(id, knows) : null;
    if (!id || !sub) {
      return { steps: [], blocked: shortfall(budget, need) };
    }

    // A recipe already on the stack is a loop -- see the note above. Report what is short
    // rather than chasing it, because that is the thing the player can do something about.
    if (seen.includes(sub.id) || sub.id === recipeId) {
      return { steps: [], blocked: shortfall(budget, need) };
    }

    // Planned against the budget, so the sub-chain only spends what this recipe has not claimed.
    const under = plan(budget, sub.id, bench, knows, [...seen, recipeId]);
    if (under.blocked) return { steps: [], blocked: under.blocked };

    // The outputs are real, so they go into both: `running` is what the player ends up holding,
    // `budget` is what is left to claim.
    for (const step of under.steps) {
      running = make(running, step.recipeId, bench);
      budget = make(budget, step.recipeId, bench);
    }
    steps.push(...under.steps);

    if (!have(budget, need)) return { steps: [], blocked: shortfall(budget, need) };
    budget = reserve(budget, need);
  }

  if (!canMake(running, recipeId, bench)) {
    return { steps: [], blocked: 'something is still missing' };
  }

  steps.push({
    recipeId,
    name: r.name,
    made: r.outputs.map((o) => nameOf(o.item ?? o.material ?? '')).join(', ')
  });
  return { steps, blocked: null };
}

/** Claim an ingredient against the budget, so a later one cannot spend it again. */
function reserve(satchel: Satchel, need: Ingredient): Satchel {
  if (need.tag) {
    let owed = need.count;
    let next = satchel;
    for (const id of satisfying(next, need.tag)) {
      if (owed <= 0) break;
      const take = Math.min(owed, count(next, id));
      next = remove(next, id, take);
      owed -= take;
    }
    return next;
  }
  const id = need.material ?? need.item;
  return id ? remove(satchel, id, need.count) : satchel;
}

/** What is short, in the same words `blockedBy` uses. */
function shortfall(satchel: Satchel, need: Ingredient): string {
  if (need.tag) return `needs ${need.count} ${need.tag}, has ${tagCount(satchel, need.tag)}`;
  const id = need.material ?? need.item ?? '';
  return `needs ${need.count} ${nameOf(id)}, has ${count(satchel, id)}`;
}

/**
 * Run a plan, returning the satchel afterwards.
 *
 * Separate from `plan` so a caller can show the run before committing to it, and so the log is
 * produced by the same walk that decides the steps rather than by a second one that could
 * disagree with it.
 */
export function runPlan(satchel: Satchel, steps: readonly Step[], bench: Bench): Satchel {
  let next = satchel;
  for (const step of steps) next = make(next, step.recipeId, bench);
  return next;
}
