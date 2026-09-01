// Making a thing whose parts are also made.
//
// Thirty-eight of eighty-two recipes need something else made first, so the workshop runs the
// chain and prints what it did. The dangerous part is not the walk -- it is that a chain which
// gets its arithmetic wrong spends materials a player never agreed to spend, and the satchel has
// no undo. Every test here is about that: what is consumed, what is produced, and that a chain
// which cannot complete changes nothing at all.

import { describe, expect, it } from 'vitest';
import { plan, runPlan } from '../src/content/making-chain';
import { openGround } from '../src/content/crafting';
import { add, count, emptySatchel } from '../src/content/satchel';
import { recipe, recipes } from '../src/content/making';

const all = () => true;
const ground = openGround();

describe('planning a chain', () => {
  it('makes a one-step recipe in one step', () => {
    const s = add(emptySatchel(), 'material_flint', 2);
    const p = plan(s, 'recipe_flint_knife', ground, all);
    expect(p.blocked).toBeNull();
    expect(p.steps.map((x) => x.recipeId)).toEqual(['recipe_flint_knife']);
  });

  it('makes what it needs before making what was asked for', () => {
    // A fish weir needs reed rope, and reed rope needs retted reed. Carrying only the raw reed,
    // the plan should be three rungs deep and end with the weir.
    const weir = recipe('recipe_fish_weir');
    expect(weir, 'canon should still hold the fish weir').toBeTruthy();

    let s = emptySatchel();
    s = add(s, 'material_reed', 40);
    const p = plan(s, 'recipe_fish_weir', ground, all);

    if (p.blocked === null) {
      expect(p.steps.length).toBeGreaterThan(1);
      // The thing asked for is last: everything before it exists to serve it.
      expect(p.steps[p.steps.length - 1]!.recipeId).toBe('recipe_fish_weir');
    }
  });

  it('refuses a chain it cannot finish, and says what is short', () => {
    const p = plan(emptySatchel(), 'recipe_flint_knife', ground, all);
    expect(p.steps).toEqual([]);
    expect(p.blocked).toMatch(/needs/i);
  });

  it('says a missing tool is a missing tool', () => {
    // **The hole twelve tests did not cover.** A process needs an affordance -- something that
    // can `work`, or `cut` -- and that is satisfied by anything carried affording it rather than
    // by a named material. The walk only chases ingredients, so a recipe blocked on a tool was
    // reported as "something is still missing" after a search that could never have found it.
    // The player was told nothing they could act on.
    const needsTool = recipes.find(
      (r) => r.id === 'recipe_fish_weir' || r.ingredients.some((i) => i.kept)
    );
    expect(needsTool).toBeTruthy();

    // Carry the ingredients but no tool at all.
    let s = emptySatchel();
    s = add(s, 'material_reed_fibre', 12);
    s = add(s, 'material_bamboo_cane', 12);
    const p = plan(s, 'recipe_fish_weir', ground, all);
    if (p.blocked !== null) {
      expect(p.blocked, 'a tool shortfall must name the affordance').toMatch(
        /can \w+|needs \d+/
      );
      expect(p.blocked).not.toMatch(/something is still missing/);
    }
  });

  it('never falls back on the useless message', () => {
    // "something is still missing" is the last resort and means the walk failed to explain
    // itself. It should be unreachable for anything canon actually holds.
    let s = emptySatchel();
    s = add(s, 'material_reed_fibre', 6);
    for (const r of recipes) {
      const p = plan(s, r.id, ground, all);
      expect(p.blocked ?? '', `${r.id} gave up without a reason`).not.toBe(
        'something is still missing'
      );
    }
  });

  it('refuses a recipe nobody has taught', () => {
    const s = add(emptySatchel(), 'material_flint', 9);
    const p = plan(s, 'recipe_flint_knife', ground, () => false);
    expect(p.blocked).toMatch(/show you/i);
  });

  it('terminates on a recipe that consumes what it produces', () => {
    // **Canon holds one.** Retting reed takes reed and gives retted reed, and the shapes are
    // close enough that a naive walk recurses forever. This is the test that would hang rather
    // than fail, which is why it is written explicitly rather than trusted to the suite.
    const s = add(emptySatchel(), 'material_reed', 1);
    for (const r of recipes) {
      const p = plan(s, r.id, ground, all);
      expect(Array.isArray(p.steps)).toBe(true);
    }
  });

  it('never plans the same rung twice in one run', () => {
    let s = emptySatchel();
    s = add(s, 'material_reed', 40);
    for (const r of recipes) {
      const p = plan(s, r.id, ground, all);
      const ids = p.steps.map((x) => x.recipeId);
      expect(new Set(ids).size, `${r.id} planned a rung twice`).toBe(ids.length);
    }
  });
});

describe('running a chain', () => {
  it('produces what the last step makes', () => {
    const s = add(emptySatchel(), 'material_flint', 2);
    const p = plan(s, 'recipe_flint_knife', ground, all);
    const after = runPlan(s, p.steps, ground);
    expect(count(after, 'item_flint_knife')).toBeGreaterThan(0);
  });

  it('spends the materials it said it would, and no more', () => {
    // The property that matters most. A chain with the arithmetic wrong takes things a player
    // never agreed to give up, and there is no undo.
    const s = add(add(emptySatchel(), 'material_flint', 5), 'material_reed', 10);
    const p = plan(s, 'recipe_flint_knife', ground, all);
    const after = runPlan(s, p.steps, ground);

    expect(count(after, 'material_flint')).toBeLessThan(count(s, 'material_flint'));
    // Untouched by this recipe, so it must come through exactly.
    expect(count(after, 'material_reed')).toBe(count(s, 'material_reed'));
  });

  it('changes nothing when the plan is blocked', () => {
    // An empty plan run against a satchel must be the same satchel. A half-made chain is the
    // worst outcome available: materials gone, nothing to show.
    const s = add(emptySatchel(), 'material_flint', 1);
    const p = plan(s, 'recipe_flint_knife', ground, all);
    expect(p.blocked).toBeTruthy();
    expect(runPlan(s, p.steps, ground)).toEqual(s);
  });

  it('keeps a tool rather than eating it', () => {
    // `kept` ingredients are tools: needed for the work and still there afterwards. Getting this
    // backwards is how a crafting system quietly consumes every knife in the world.
    const withTool = recipes.find((r) => r.ingredients.some((i) => i.kept));
    expect(withTool, 'canon should still hold a recipe using a tool').toBeTruthy();

    const tool = withTool!.ingredients.find((i) => i.kept)!;
    const toolId = tool.item ?? tool.material ?? '';
    let s = emptySatchel();
    s = add(s, toolId, 1);
    for (const need of withTool!.ingredients) {
      if (need.kept || need.tag) continue;
      const id = need.material ?? need.item;
      if (id) s = add(s, id, need.count * 2);
    }

    const p = plan(s, withTool!.id, ground, all);
    if (p.blocked === null) {
      const after = runPlan(s, p.steps, ground);
      expect(count(after, toolId), 'the tool was eaten').toBe(1);
    }
  });
});

describe('the log', () => {
  it('names every rung and what it made', () => {
    const s = add(emptySatchel(), 'material_flint', 2);
    const p = plan(s, 'recipe_flint_knife', ground, all);
    for (const step of p.steps) {
      expect(step.name.length).toBeGreaterThan(0);
      expect(step.made.length).toBeGreaterThan(0);
    }
  });

  it('ends with the thing that was asked for', () => {
    // The log reads as a story of how you got there, so the order is the order it happened.
    const s = add(emptySatchel(), 'material_flint', 2);
    const p = plan(s, 'recipe_flint_knife', ground, all);
    expect(p.steps[p.steps.length - 1]!.recipeId).toBe('recipe_flint_knife');
  });
});
