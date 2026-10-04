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
  item as itemById,
  nameOf,
  process,
  recipe,
  recipes
} from './making';
import { type Satchel, add, affording, count, remove } from './satchel';
import { fieldMap } from './places';
import { benchOpens, benchSupplies } from './stations';

/** Where the traveller is standing, as far as making is concerned. */
export interface Bench {
  /** The `poi.kind` under foot, or null out in the open. */
  kind: string | null;
  /**
   * The benches standing here (`stations.stationsAt`): a loom, a quern, a kiln. Absent out in the
   * open, and for a caller that only knows the kind.
   */
  stations?: readonly string[];
  /**
   * The field map the traveller is on, for a recipe that can only be made on some (`Recipe.madeOn`).
   * Absent means a caller that does not know, and such a recipe is then refused rather than
   * offered everywhere -- a rule nobody wired is this codebase's signature fault.
   */
  fieldMapId?: string | null;
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

/**
 * Whether a kept tool is here as a bench rather than in the satchel.
 *
 * **The owner, 3 October 2026**: at the loom in the Camp in the Kilns, weaving a reed mat still asked
 * for a loom frame. The frame is a loom you carry; standing at a loom is having one. Only the tools
 * the data says are a bench's carried form (`stands_in_for`) -- a cooking pot or a knife is still
 * yours to bring, and a tool that is spent is never stood in for. The same move as a hearth lighting
 * a cook fire (`fireFor`).
 */
export function benchStandsIn(need: Ingredient, bench: Bench = openGround()): boolean {
  if (!need.kept || !need.item) return false;
  const tool = itemById(need.item);
  return Boolean(tool?.standsInFor && bench.stations?.includes(tool.standsInFor));
}

function haveIngredient(satchel: Satchel, need: Ingredient, bench: Bench = openGround()): boolean {
  if (benchStandsIn(need, bench)) return true;
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
  if (bench.kind !== null && p.performedAt.includes(bench.kind)) return true;
  // A bench on this place's board opens its processes here (`stations.benchOpens`). The board
  // showed a kiln at the Sunk Cutting for as long as this said "settlements only" and refused it.
  return benchOpens(bench.stations, p.id);
}

/**
 * Whether this map allows the recipe: `Recipe.madeOn`, the owner's kulfi on the Narmada.
 *
 * **Beside `placeAllows` rather than inside it.** That one answers what a kind of place and its
 * benches can work, and agrees with the board everywhere (`test/benches.test.ts`); which country you
 * are in is a different question, and folding it in would make the board wrong on every map but one.
 */
export function mapAllows(recipeId: string, bench: Bench): boolean {
  const r = recipe(recipeId);
  if (!r || r.madeOn.length === 0) return true;
  return Boolean(bench.fieldMapId && r.madeOn.includes(bench.fieldMapId));
}

/**
 * What lights a cook fire: any carried material of these kinds.
 *
 * **The owner's ruling, 2 October 2026** (`docs/satchel-and-hearth.md`, phase 3). Canon calls dung
 * cake a fuel, and the owner carried a satchel of it -- but every cooking recipe asked for a carried
 * *thing* that burns, a bow drill or a torch, and fuel was only ever an ingredient in a kiln. So a
 * satchel full of fuel could not cook anything. Now any one fuel lights the fire for one meal, from
 * the kit's own lamp, which is always carried; the meal spends it. The way other games do it --
 * Valheim's campfire, Don't Starve's fire pit -- is fuel into a fire, and food over the fire.
 */
export const FIRE_FOR: readonly MaterialClass[] = ['fuel'];

/**
 * Where a fire is already lit, so cooking spends nothing on one: a settlement's hearths, and the
 * fires at a road's stopping place. Point-of-interest kinds, as a `Bench` reports them.
 */
export const HEARTH_AT: readonly string[] = ['settlement', 'travel_node'];

/** The process a cook fire answers. Only cooking: a kiln is a kiln, and asks for more than a meal. */
const COOKING = 'process_cooking';

/**
 * How a cooking recipe will be fired here, or null if it will not.
 *
 * In order: something carried that burns already does it, and nothing is spent; a hearth here does
 * it, and nothing is spent; otherwise one carried fuel does it and the meal spends it -- the most
 * plentiful, so the last dung cake is not the one burned while ten pine resins sit beside it.
 */
export function fireFor(
  satchel: Satchel,
  recipeId: string,
  bench: Bench = openGround()
): { by: 'tool' } | { by: 'hearth' } | { by: 'fuel'; fuel: string } | null {
  const r = recipe(recipeId);
  if (!r || r.process !== COOKING) return null;
  if (affording(satchel, 'burn').length > 0) return { by: 'tool' };
  if (bench.kind !== null && HEARTH_AT.includes(bench.kind)) return { by: 'hearth' };
  // A fuel the dish is cooked from is not also the fire under it: one is burned only if every
  // ingredient is still met without it -- beedu oil is an oil and a fuel, and a dish of it must not
  // lose its oil to the fire.
  const fuel = FIRE_FOR.flatMap((kind) => satisfying(satchel, kind))
    .sort((a, b) => count(satchel, b) - count(satchel, a) || (a < b ? -1 : 1))
    .find((id) => {
      const left = remove(satchel, id, 1);
      return r.ingredients.every((need) => haveIngredient(left, need));
    });
  return fuel ? { by: 'fuel', fuel } : null;
}

/**
 * What the fire under a dish will be, in words, for the workshop to say before the press: "burns
 * one dung cake, lit from your lamp", "over a hearth here". Null where nothing needs saying -- not
 * cooking, or something carried already burns.
 */
export function fireLine(satchel: Satchel, recipeId: string, bench: Bench = openGround()): string | null {
  const fire = fireFor(satchel, recipeId, bench);
  if (!fire || fire.by === 'tool') return null;
  if (fire.by === 'hearth') return 'over a hearth here, which costs nothing';
  return `burns one ${nameOf(fire.fuel).toLowerCase()}, lit from your lamp`;
}

/** Affordances the process needs that nothing carried provides -- a cook fire answering `burn`. */
export function missingTools(satchel: Satchel, recipeId: string, bench: Bench = openGround()): string[] {
  const p = process(recipe(recipeId)?.process ?? '');
  if (!p) return [];
  return p.needs.filter(
    (n) =>
      affording(satchel, n).length === 0 &&
      !(n === 'burn' && fireFor(satchel, recipeId, bench) !== null) &&
      // The loom works the weft; nobody at it is asked to carry something that can work.
      !benchSupplies(bench.stations, p.id, n)
  );
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
  if (!placeAllows(recipeId, bench) || !mapAllows(recipeId, bench)) return false;
  if (missingTools(satchel, recipeId, bench).length > 0) return false;
  return r.ingredients.every((need) => haveIngredient(satchel, need, bench));
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
  return shortfalls(satchel, recipeId, bench).map((s) => s.why);
}

/**
 * What stands between the satchel and this recipe, one entry per thing, in `blockedBy`'s order.
 *
 * The same facts `blockedBy` words, kept structured so a panel can go on to say where each one
 * comes from (`sources.ts`) without parsing the sentence back apart. `blockedBy` is this, worded --
 * so the reason and the pointer beside it cannot come to disagree about what is missing.
 */
export type Shortfall =
  | { kind: 'place'; why: string; places: string[] }
  | { kind: 'tool'; why: string; affordance: string }
  | { kind: 'ingredient'; why: string; id: string | null; tag: string | null };

export function shortfalls(satchel: Satchel, recipeId: string, bench: Bench = openGround()): Shortfall[] {
  const r = recipe(recipeId);
  if (!r) return [];
  const out: Shortfall[] = [];

  if (!mapAllows(recipeId, bench)) {
    // The map is the reason, not the kind of place: say where, by the map's own name.
    const names = r.madeOn.map((id) => (fieldMap(id)?.name ?? id).replace(/^The /, 'the '));
    out.push({ kind: 'place', why: `is only made on ${names.join(' or ')}`, places: [] });
  } else if (!placeAllows(recipeId, bench)) {
    const where = process(r.process)?.performedAt ?? [];
    out.push({ kind: 'place', why: `needs to be done at a ${where.join(' or ')}`, places: where });
  }
  for (const tool of missingTools(satchel, recipeId, bench)) {
    // A cook fire can be fuel as well as a tool, and saying only "something that can burn" sent
    // the owner looking for a bow drill with a satchel full of dung cakes.
    const fuel = tool === 'burn' && r.process === COOKING ? ', or any fuel to light a fire' : '';
    out.push({ kind: 'tool', why: `needs something that can ${tool}${fuel}`, affordance: tool });
  }
  for (const need of r.ingredients) {
    if (haveIngredient(satchel, need, bench)) continue;
    if (need.tag) {
      out.push({ kind: 'ingredient', why: `needs ${need.count} ${need.tag}, has ${tagCount(satchel, need.tag)}`, id: null, tag: need.tag });
    } else {
      const id = need.material ?? need.item ?? '';
      out.push({ kind: 'ingredient', why: `needs ${need.count} ${nameOf(id)}, has ${count(satchel, id)}`, id, tag: null });
    }
  }
  return out;
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
  // The fire first, decided against the satchel as it stands, so the fuel it burns is one the dish
  // was not about to use. Burned only when no tool or hearth already does the work.
  const fire = fireFor(satchel, recipeId, bench);
  let next = fire?.by === 'fuel' ? remove(satchel, fire.fuel, 1) : satchel;

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
