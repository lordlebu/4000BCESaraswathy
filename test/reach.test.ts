// Can a container and a cook fire be made from what lies near the start, on every map?
//
// **The owner's play of the Narmada, 2 October 2026, and the measure every later phase answers to.**
// A carry basket wanted bamboo, and on the Narmada 4% of forest tiles hold any; a satchel full of
// dung could not cook, because cooking asked for a carried thing that burns. Each was a rule
// working as written on ground that could not satisfy it. So this asks the real maps -- every map,
// five seeds -- whether the two things a traveller most wants from the making layer can be made
// out of what the ground holds within `REACH` steps of where they arrive. Not one lucky seed, and
// not by reading recipes: by summing what `yieldsAt` and `capacityOf` actually put on those tiles,
// and solving each recipe down to raw materials. See `docs/satchel-and-hearth.md`.

import { describe, expect, it } from 'vitest';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';
import { yieldsAt } from '../src/content/gathering';
import { capacityOf } from '../src/content/nodes';
import { type Ingredient, items, materials, process, recipes } from '../src/content/making';
import { FIRE_FOR } from '../src/content/crafting';

/** Steps from the start: a morning's walk out and back. */
const REACH = 20;
const SEEDS = ['jambhudweepa-evening', 'a', 'b', 'c', 'd'];

/** How much of each raw material lies within reach, summed over every tile's stock. */
function stockNear(mapId: string, seed: string): Map<string, number> {
  const built = buildFieldMap(fieldMaps.find((m) => m.id === mapId)!, { seed });
  const w = built.world;
  const stock = new Map<string, number>();
  for (const row of w.tiles) {
    for (const t of row) {
      if (Math.abs(t.x - w.start.x) + Math.abs(t.y - w.start.y) > REACH) continue;
      for (const m of yieldsAt(seed, t, t.biome)) stock.set(m.id, (stock.get(m.id) ?? 0) + capacityOf(seed, t, m));
    }
  }
  return stock;
}

/**
 * Whether `id` can be had from this stock, spending from it -- open ground only, common knowledge
 * only (a recipe somebody must teach is a person away, not a walk), and tools made once and kept.
 */
class Solver {
  readonly made = new Set<string>();
  constructor(readonly stock: Map<string, number>) {}

  private spend(id: string, n: number): boolean {
    const have = this.stock.get(id) ?? 0;
    if (have < n) return false;
    this.stock.set(id, have - n);
    return true;
  }

  private tag(tag: string, n: number): boolean {
    const kinds = materials.filter((m) => m.classes.includes(tag as never)).map((m) => m.id);
    const total = kinds.reduce((sum, id) => sum + (this.stock.get(id) ?? 0), 0);
    if (total < n) return false;
    let left = n;
    for (const id of kinds.sort((a, b) => (this.stock.get(b) ?? 0) - (this.stock.get(a) ?? 0))) {
      const take = Math.min(left, this.stock.get(id) ?? 0);
      this.spend(id, take);
      left -= take;
    }
    return true;
  }

  affords(affordance: string, depth: number): boolean {
    if ([...this.made].some((id) => items.find((i) => i.id === id)?.affords.includes(affordance as never))) return true;
    return items
      .filter((i) => i.affords.includes(affordance as never))
      .some((i) => this.item(i.id, depth + 1));
  }

  item(id: string, depth = 0): boolean {
    if (this.made.has(id)) return true;
    if (depth > 6) return false;
    for (const r of recipes) {
      if (r.taughtBy.length > 0 || !r.outputs.some((o) => o.item === id)) continue;
      const p = process(r.process);
      if (!p || p.performedAt.length > 0) continue;
      const before = new Map(this.stock);
      const madeBefore = new Set(this.made);
      if (p.needs.every((n) => this.affords(n, depth)) && r.ingredients.every((i) => this.ingredient(i, depth))) {
        this.made.add(id);
        return true;
      }
      // That way did not work out: put back what it spent and try the next recipe.
      this.stock.clear();
      for (const [k, v] of before) this.stock.set(k, v);
      this.made.clear();
      for (const k of madeBefore) this.made.add(k);
    }
    return false;
  }

  ingredient(i: Ingredient, depth: number): boolean {
    if (i.tag) return this.tag(i.tag, i.count);
    if (i.material) return this.spend(i.material, i.count);
    if (i.item) return i.kept ? this.item(i.item, depth + 1) : Array.from({ length: i.count }, () => 0).every(() => this.item(i.item!, depth + 1) && (this.made.delete(i.item!), true));
    return false;
  }
}

describe('a container and a cook fire, near the start of every map', () => {
  for (const map of fieldMaps) {
    it(`can both be made on ${map.id}, on every seed`, () => {
      const missed: string[] = [];
      for (const seed of SEEDS) {
        const solver = new Solver(stockNear(map.id, seed));
        const container = items.filter((i) => i.affords.includes('contain' as never)).some((i) => solver.item(i.id));
        // A cook fire is what `FIRE_FOR` says lights one, from the ground near the start.
        const fire =
          FIRE_FOR.some((tag) => materials.some((m) => m.classes.includes(tag as never) && (solver.stock.get(m.id) ?? 0) > 0)) ||
          solver.affords('burn', 0);
        if (!container) missed.push(`${seed}: no container`);
        if (!fire) missed.push(`${seed}: no cook fire`);
      }
      expect(missed, `within ${REACH} steps of the start`).toEqual([]);
    });
  }
});
