// What this ground can never make, and why.
//
// **Why this exists.** The crafting audit of 3 October 2026 found 9 to 18 recipes per map that a
// player knows from the first step and that the map's ground can never supply -- dates on a map with
// no date palm, a dish that wants salt where there is none -- and the workshop greyed them out
// exactly like a recipe one walk away. A player could not tell "go and find reeds" from "not here",
// and hunted for what did not exist. The owner's ruling: **label them, never hide them.** A recipe
// another map can supply is a reason to keep travelling, and one whose missing thing is carried in
// from elsewhere moves straight back up the list.
//
// So this answers, for the world underfoot: which materials its ground gives on enough tiles to ask
// a player to find (`groundOf`), and then, from plenty of those plus whatever is carried, which
// recipes still cannot be made at any bench on the map, naming what is missing (`outOfReach`).
//
// Pure, and free of React and Phaser. `groundOf` walks every tile once and is cached per world.

import type { World } from '../world/types';
import { yieldsAt } from './gathering';
import { type Bench, type Knows, canMake } from './crafting';
import { type Recipe, hasClass, materials, nameOf, recipes } from './making';
import { type Satchel, add, count } from './satchel';
import { benchAt } from './stations';
import { fieldMap, poi } from './places';

/** A material counts as on this ground at this many tiles: two reed beds on a map is not findable. */
export const FINDABLE_TILES = 3;
/** "Plenty", for the closure. Counts are not what this asks; reaching is. */
const PLENTY = 99;

const grounds = new WeakMap<World, ReadonlySet<string>>();

/** The materials this world's ground gives on at least `FINDABLE_TILES` tiles. Cached per world. */
export function groundOf(world: World): ReadonlySet<string> {
  const known = grounds.get(world);
  if (known) return known;
  const tiles = new Map<string, number>();
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      for (const m of yieldsAt(world.seed, { x, y }, world.tiles[y]![x]!.biome)) tiles.set(m.id, (tiles.get(m.id) ?? 0) + 1);
    }
  }
  const found = new Set([...tiles].filter(([, n]) => n >= FINDABLE_TILES).map(([id]) => id));
  grounds.set(world, found);
  return found;
}

/** Every bench on this map, and open ground. */
function benchesOf(fieldMapId: string | null): Bench[] {
  const pois = fieldMapId ? (fieldMap(fieldMapId)?.pointsOfInterest ?? []) : [];
  return [benchAt(null), ...pois.map((id) => benchAt(poi(id)))];
}

/** What a recipe's ingredient is short of, in the closure, as the name a player knows it by. */
function missingNames(r: Recipe, made: Satchel): string[] {
  const out: string[] = [];
  for (const need of r.ingredients) {
    if (need.tag) {
      const tag = need.tag;
      if (!materials.some((m) => hasClass(m.id, tag) && count(made, m.id) > 0)) out.push(`anything ${tag}`);
    } else {
      const id = need.material ?? need.item;
      if (id && count(made, id) === 0) out.push(nameOf(id).toLowerCase());
    }
  }
  return out;
}

/**
 * The known recipes this ground cannot supply, each with what is missing.
 *
 * From plenty of everything the ground gives and whatever is carried, it makes everything it can
 * at any bench on the map until nothing new opens -- the same closure `test/criticalPath.test.ts`
 * runs -- and returns what is left. A recipe stopped only by a tool is never here: the workshop's
 * tool step answers that. Only a missing material or part puts a recipe out of reach.
 */
export function outOfReach(
  ground: ReadonlySet<string>,
  satchel: Satchel,
  fieldMapId: string | null,
  knows: Knows
): Map<string, string[]> {
  const benches = benchesOf(fieldMapId);
  let made = satchel;
  for (const id of ground) made = add(made, id, PLENTY);
  for (let grew = true; grew; ) {
    grew = false;
    for (const r of recipes) {
      if (!knows(r.id)) continue;
      const outputs = r.outputs.map((o) => o.item ?? o.material ?? '').filter(Boolean);
      if (outputs.every((id) => count(made, id) > 0)) continue;
      if (!benches.some((b) => canMake(made, r.id, b))) continue;
      for (const id of outputs) made = add(made, id, PLENTY);
      grew = true;
    }
  }
  const out = new Map<string, string[]>();
  for (const r of recipes) {
    if (!knows(r.id) || benches.some((b) => canMake(made, r.id, b))) continue;
    const missing = missingNames(r, made);
    // Short only of a tool or a place, not of any material: reachable, and other rows say how.
    if (missing.length === 0) continue;
    out.set(r.id, missing);
  }
  return out;
}
