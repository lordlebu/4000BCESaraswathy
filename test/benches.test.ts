// The board and the rule must agree.
//
// **Why this exists.** A place's board (`stations.stationsAt`) shows which benches stand there, and
// the crafting rule (`crafting.canMake`) decides what can be made -- and for as long as both existed
// the rule never looked at the board. The owner stood at the loom in the Camp in the Kilns and was
// asked for a loom frame; measured on 3 October 2026, the same disagreement refused 21 recipe-place
// pairs on the Aravali, 8 on Dwarka, 4 on the Narmada and 2 on Lothal, and asked for a carried
// loom, quern or brazier at its own bench in 9 or 10 recipes on every map. `stations.worksProcess`
// already answered the question correctly and was called by a test and nothing else.
//
// So these assert through `benchAt`, the one function the workshop builds its bench with, and
// through `canMake` / `shortfalls`, the functions the workshop asks -- never through a parallel
// answer that the game does not use. That parallel answer is how the fault survived.

import { describe, expect, it } from 'vitest';
import { benchAt, stationForProcess, stationsAt, worksProcess } from '../src/content/stations';
import { poi, pointsOfInterest } from '../src/content/places';
import { canMake, missingTools, openGround, placeAllows, shortfalls, type Shortfall } from '../src/content/crafting';
import { item, items, materials, hasClass, recipe, recipes } from '../src/content/making';
import { add, emptySatchel, type Satchel } from '../src/content/satchel';

const idOf = (x: Shortfall): string | null => (x.kind === 'ingredient' ? x.id : null);

/** Everything a recipe asks for, in plenty -- except its kept tools, which is the point. */
function ingredientsOnly(recipeId: string): Satchel {
  let s = emptySatchel();
  const r = recipe(recipeId)!;
  for (const need of r.ingredients) {
    if (need.kept) continue;
    if (need.material) s = add(s, need.material, need.count + 5);
    else if (need.item) s = add(s, need.item, need.count + 5);
    else if (need.tag) s = add(s, materials.find((m) => hasClass(m.id, need.tag!))!.id, need.count + 5);
  }
  return s;
}

describe('a bench on the board is a bench in the rule', () => {
  it('lets every place work every process its board lists', () => {
    const refused: string[] = [];
    let checked = 0;
    for (const p of pointsOfInterest) {
      const bench = benchAt(p);
      for (const r of recipes) {
        const station = stationForProcess(r.process);
        if (!station || !bench.stations.includes(station.id)) continue;
        checked += 1;
        if (!placeAllows(r.id, bench)) refused.push(`${r.id} at ${p.id} (${station.id})`);
      }
    }
    expect(checked, 'no place/recipe pair was checked').toBeGreaterThan(300);
    expect(refused, 'the board shows a bench the rule refuses').toEqual([]);
  });

  it('agrees with worksProcess everywhere, so there is one answer and not two', () => {
    for (const p of pointsOfInterest) {
      const bench = benchAt(p);
      for (const r of recipes) {
        expect(placeAllows(r.id, bench), `${r.id} at ${p.id}`).toBe(worksProcess(p, r.process));
      }
    }
  });

  it('still keeps a sited process off open ground', () => {
    // The kiln is a building. Out in a field there is no bench, so the board's opening cannot reach.
    const firing = recipes.find((r) => r.process === 'process_firing')!;
    expect(placeAllows(firing.id, openGround())).toBe(false);
    expect(placeAllows(firing.id, benchAt(null))).toBe(false);
  });
});

describe('a bench stands in for the tool that is its carried form', () => {
  it('weaves a reed mat at the loom in the Camp in the Kilns without a loom frame', () => {
    const camp = poi('poi_lothal_camp')!;
    expect(stationsAt(camp).map((s) => s.id)).toContain('loom');
    const s = ingredientsOnly('recipe_reed_mat');
    expect(shortfalls(s, 'recipe_reed_mat', benchAt(camp))).toEqual([]);
    expect(canMake(s, 'recipe_reed_mat', benchAt(camp))).toBe(true);
  });

  it('never asks for a kept tool at a place whose board has its bench', () => {
    const asked: string[] = [];
    let checked = 0;
    for (const r of recipes) {
      for (const need of r.ingredients) {
        const standsFor = need.kept && need.item ? item(need.item)?.standsInFor : null;
        if (!standsFor) continue;
        for (const p of pointsOfInterest) {
          const bench = benchAt(p);
          if (!bench.stations.includes(standsFor as never)) continue;
          checked += 1;
          const short = shortfalls(emptySatchel(), r.id, bench);
          if (short.some((x) => x.kind === 'ingredient' && x.id === need.item)) asked.push(`${r.id} at ${p.id}`);
        }
      }
    }
    expect(checked, 'no kept tool met its own bench').toBeGreaterThan(20);
    expect(asked, 'a kept tool was asked for at its own bench').toEqual([]);
  });

  it('does the work its own processes need, so nothing carried has to', () => {
    // Weaving needs something that can work; the loom is that something. Before this the owner,
    // at the loom with the reeds, was asked for a frame *and* a tool.
    let checked = 0;
    for (const p of pointsOfInterest) {
      const bench = benchAt(p);
      for (const r of recipes) {
        const st = stationForProcess(r.process);
        if (!st || !bench.stations.includes(st.id)) continue;
        for (const need of st.supplies) {
          checked += 1;
          expect(missingTools(emptySatchel(), r.id, bench), `${r.id} at ${p.id} asks for ${need}`).not.toContain(need);
        }
      }
    }
    expect(checked, 'no bench supplied anything').toBeGreaterThan(50);
  });

  it('a kiln is a fire for firing, not for a stew', () => {
    // Every place has a hearth on its board, and a cook fire is free only at a settlement or road
    // stop (the owner, 2 October 2026). A kiln standing at a ruin must not quietly overrule that.
    const cutting = poi('poi_sunk_cutting')!;
    expect(benchAt(cutting).stations).toContain('kiln');
    const stew = recipes.find((r) => r.process === 'process_cooking')!;
    expect(missingTools(emptySatchel(), stew.id, benchAt(cutting))).toContain('burn');
    const firing = recipes.find((r) => r.process === 'process_firing')!;
    expect(missingTools(emptySatchel(), firing.id, benchAt(cutting))).not.toContain('burn');
  });

  it('still asks for the frame out in the open', () => {
    const s = ingredientsOnly('recipe_reed_mat');
    expect(canMake(s, 'recipe_reed_mat', benchAt(null))).toBe(false);
    expect(shortfalls(s, 'recipe_reed_mat', benchAt(null)).map(idOf)).toContain('item_loom_frame');
  });

  it('only the three bench-shaped tools stand in, and each names a bench that works its recipes', () => {
    const standing = items.filter((i) => i.standsInFor).map((i) => `${i.id}:${i.standsInFor}`).sort();
    expect(standing).toEqual(['item_charcoal_brazier:kiln', 'item_grinding_quern:quern', 'item_loom_frame:loom']);
    for (const r of recipes) {
      for (const need of r.ingredients) {
        const standsFor = need.kept && need.item ? item(need.item)?.standsInFor : null;
        if (!standsFor) continue;
        expect(stationForProcess(r.process)?.id, `${r.id} keeps ${need.item} but is not worked at a ${standsFor}`).toBe(standsFor);
      }
    }
  });

  it('never stands in for a tool the recipe spends', () => {
    // A cooking pot at a hearth is still yours to bring: only a kept tool, and only a bench-shaped one.
    const pot = recipes.find((r) => r.ingredients.some((i) => i.item === 'item_cooking_pot' && i.kept));
    if (!pot) return;
    const camp = poi('poi_lothal_camp')!;
    expect(shortfalls(emptySatchel(), pot.id, benchAt(camp)).map(idOf)).toContain('item_cooking_pot');
  });
});
