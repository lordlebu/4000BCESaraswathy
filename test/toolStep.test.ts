// Which tool to make next, and the walk a new traveller takes by following only that advice.
//
// **Why this exists.** The crafting audit of 3 October 2026 found a traveller with plenty of a map's
// raw blocked on 43 to 48 known recipes by a tool, and the workshop naming every tool that would do
// regardless of what was carried. The unit cases below hold the choice; the walk at the bottom is
// the player-path test this mechanic owes (see "The rules layer" in CLAUDE.md): it starts from an
// empty satchel, presses only the button the workshop's reason row offers, and asserts where that
// leaves a traveller on every map. It never calls `toolStep` with knowledge a player lacks.

import { describe, expect, it } from 'vitest';
import { toolAction, toolLine, toolStep } from '../src/content/toolStep';
import { canMake, make, missingTools, shortfalls, type Bench } from '../src/content/crafting';
import { plan, runPlan } from '../src/content/making-chain';
import { item, recipe, recipes } from '../src/content/making';
import { add, affording, emptySatchel, type Satchel } from '../src/content/satchel';
import { benchAt } from '../src/content/stations';
import { fieldMap, fieldMaps, npcsAt, poi } from '../src/content/places';
import { buildFieldMap } from '../src/world/fieldMap';
import { yieldsAt } from '../src/content/gathering';

const common = (id: string) => (recipe(id)?.taughtBy.length ?? 1) === 0;

describe('the tool to make next', () => {
  it('names a tool that does the job, made by a recipe the player knows', () => {
    for (const need of ['cut', 'contain', 'work', 'burn']) {
      const step = toolStep(need, emptySatchel(), benchAt(null), common);
      expect(step, `nothing a player knows makes something that can ${need}`).not.toBeNull();
      expect(item(step!.item)!.affords).toContain(need);
      expect(common(step!.recipeId)).toBe(true);
    }
  });

  it('prefers the tool that can be made now over one that cannot', () => {
    // Give exactly what one cutting tool's recipe wants, and it must be that one -- whichever comes
    // first in the data.
    const cutters = recipes.filter(
      (r) => common(r.id) && r.outputs.some((o) => o.item && item(o.item)?.affords.includes('cut'))
    );
    for (const r of cutters) {
      let s = emptySatchel();
      for (const need of r.ingredients) if (!need.kept && (need.material ?? need.item)) s = add(s, (need.material ?? need.item)!, need.count);
      if (!canMake(s, r.id, benchAt(null))) continue;
      const step = toolStep('cut', s, benchAt(null), common)!;
      expect(step.ready, `${r.id} is makeable but the step is not ready`).toBe(true);
      const run = plan(s, step.recipeId, benchAt(null), common);
      expect(canMake(s, step.recipeId, benchAt(null)) || (run.blocked === null && run.steps.length > 0)).toBe(true);
    }
  });

  it('says "you can, here and now" only when it can be', () => {
    const step = toolStep('cut', emptySatchel(), benchAt(null), common)!;
    expect(step.ready).toBe(false);
    expect(toolLine(step)).not.toMatch(/here and now/);
    expect(toolAction(step).ready).toBe(false);
  });

  it('names the tool a tool needs first, one level down', () => {
    // A tool whose own recipe is blocked by a tool must say so rather than stop at "has 0".
    for (const need of ['cut', 'contain', 'work', 'burn']) {
      const step = toolStep(need, emptySatchel(), benchAt(null), common);
      if (!step || step.ready) continue;
      const toolShort = shortfalls(emptySatchel(), step.recipeId, benchAt(null)).find((s) => s.kind === 'tool');
      if (!toolShort || toolShort.kind !== 'tool' || toolShort.affordance === need) continue;
      expect(step.first, `${step.item} needs something that can ${toolShort.affordance} and the step does not say so`).not.toBeNull();
      expect(toolLine(step)).toContain(`first needs something that can ${toolShort.affordance}`);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// The walk: a new traveller who follows only the workshop's tool advice.

const SEEDS = ['tool-walk-0', 'tool-walk-1', 'tool-walk-2'];

/** What this map's ground gives on every seed, on three tiles or more. Plenty of each. */
function groundOf(mapId: string): string[] {
  const map = fieldMap(mapId)!;
  let common_: Set<string> | undefined;
  for (const seed of SEEDS) {
    const { world } = buildFieldMap(map, { seed });
    const n = new Map<string, number>();
    for (let y = 0; y < world.height; y++)
      for (let x = 0; x < world.width; x++)
        for (const m of yieldsAt(world.seed, { x, y }, world.tiles[y]![x]!.biome)) n.set(m.id, (n.get(m.id) ?? 0) + 1);
    const here = new Set([...n].filter(([, c]) => c >= 3).map(([id]) => id));
    const prev: Set<string> | undefined = common_;
    common_ = prev ? new Set([...prev].filter((id) => here.has(id))) : here;
  }
  return [...(common_ ?? [])];
}

/**
 * Follow the reason row's button, at every bench this map has, until it offers nothing new. Returns
 * the affordances the traveller still cannot do anywhere on the map.
 */
function walk(mapId: string): string[] {
  const map = fieldMap(mapId)!;
  const people = new Set(map.pointsOfInterest.flatMap((p) => npcsAt(p).map((n) => n.id)));
  const knows = (id: string) => {
    const r = recipe(id);
    return Boolean(r && (r.taughtBy.length === 0 || r.taughtBy.some((t) => people.has(t))));
  };
  const benches: Bench[] = [benchAt(null), ...map.pointsOfInterest.map((p) => benchAt(poi(p)))];
  let s: Satchel = emptySatchel();
  for (const id of groundOf(mapId)) s = add(s, id, 99);
  const NEEDS = ['cut', 'contain', 'work', 'burn'];
  for (let round = 0; round < 12; round++) {
    let grew = false;
    for (const need of NEEDS) {
      if (affording(s, need).length > 0) continue;
      for (const bench of benches) {
        const step = toolStep(need, s, bench, knows);
        if (!step) continue;
        const act = toolAction(step);
        if (!act.ready) continue;
        const run = plan(s, act.recipeId, bench, knows);
        s = run.blocked === null ? runPlan(s, run.steps, bench) : make(s, act.recipeId, bench);
        grew = true;
        break;
      }
    }
    if (!grew) break;
  }
  // `burn` for cooking is also any carried fuel (`fireFor`), so ask a cooking recipe rather than
  // the satchel: what matters is whether a traveller can cook, not whether they hold a bow drill.
  const stew = recipes.find((r) => r.process === 'process_cooking' && knows(r.id))!;
  return NEEDS.filter((need) =>
    need === 'burn' ? benches.every((b) => missingTools(s, stew.id, b).includes('burn')) : affording(s, need).length === 0
  );
}

/**
 * What following the advice cannot reach yet, map by map. **A ratchet**: a new entry fails, and an
 * entry that closes fails until it is struck off, so the list only shortens.
 */
const STILL_OUT_OF_REACH: Record<string, string[]> = {};

describe('a new traveller who follows only the workshop', () => {
  for (const map of fieldMaps) {
    it(`${map.id}: can come to cut, contain, work and cook`, { timeout: 60_000 }, () => {
      expect(walk(map.id)).toEqual(STILL_OUT_OF_REACH[map.id] ?? []);
    });
  }
});
