// Does the making layer actually touch anything?
//
// It shipped connected to nothing: 72 recipes a player could make, meaning nothing to the
// diary, the discoveries, the people or the ending. Three edges close that, and each one is a
// rule that could be written, tested and never called — which is the failure this codebase has
// shipped three times and writes about at the top of `journey.ts`.
//
// So the last block walks a real map and uses only what a player has: it gathers, it talks, it
// makes, and it hands somebody a thing they asked for. Nothing in it seeds a satchel or calls
// `learnRecipe` directly.

import { describe, expect, it } from 'vitest';
import {
  advance,
  blockedBy,
  canAdvance,
  emptyProgress,
  hear,
  knowsRecipe,
  learnRecipe,
  linesFor,
  rungOf
} from '../src/journey';
import { discoveries } from '../src/content/knowledge';
import { npc, npcs } from '../src/content/places';
import { recipes } from '../src/content/making';
import { add, count, emptySatchel } from '../src/content/satchel';
import { canMake, make, makeableNow, openGround, withinReach } from '../src/content/crafting';
import { gather } from '../src/content/gathering';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap } from '../src/content/places';

describe('a rung can need a tool', () => {
  const tooled = discoveries.flatMap((d) =>
    d.rungs.map((r, i) => ({ d, i, needs: r.needsTool })).filter((x) => x.needs.length > 0)
  );

  it('is a thing canon actually says, on more than nothing', () => {
    expect(tooled.length).toBeGreaterThan(0);
  });

  it('never asks for one of the four the kit already affords', () => {
    // The kit gives burn, mark, shelter and cross from the first step. A rung gated on one of
    // those is a gate the player walks through without noticing, which is worse than no gate:
    // it looks like a mechanic and is not one.
    for (const { d, i, needs } of tooled) {
      for (const n of needs) {
        expect(['burn', 'mark', 'shelter', 'cross'], `${d.id} rung ${i}`).not.toContain(n);
      }
    }
  });

  it('holds the rung back until something is carried', () => {
    const { d, i, needs } = tooled[0]!;
    // Climb to just below the gated rung, carrying nothing.
    let p = emptyProgress();
    for (let step = 0; step < i; step += 1) p = advance(p, d.id);
    expect(rungOf(p, d.id)).toBe(i - 1);

    expect(canAdvance(p, d.id, null, emptySatchel())).toBe(false);
    expect(blockedBy(p, d.id, null, emptySatchel())).toContain(`tool:${needs[0]}`);
  });

  it('opens once the tool is in hand', () => {
    const { d, i, needs } = tooled[0]!;
    let p = emptyProgress();
    for (let step = 0; step < i; step += 1) p = advance(p, d.id);

    // Anything affording it will do — that is the whole reason canon names an affordance.
    const knife = add(emptySatchel(), 'item_flint_knife', 1);
    if (needs.includes('cut')) {
      expect(canAdvance(p, d.id, null, knife)).toBe(true);
      expect(advance(p, d.id, null, knife)).not.toBe(p);
    }
  });
});

describe('a recipe can have to be taught', () => {
  it('leaves most of them common, so making works from the first step', () => {
    const common = recipes.filter((r) => r.taughtBy.length === 0);
    expect(common.length).toBeGreaterThan(recipes.length / 2);
    expect(knowsRecipe(emptyProgress(), 'recipe_flint_knife')).toBe(true);
  });

  it('withholds the taught ones until somebody says so', () => {
    const taught = recipes.filter((r) => r.taughtBy.length > 0);
    expect(taught.length).toBeGreaterThan(10);
    for (const r of taught) {
      expect(knowsRecipe(emptyProgress(), r.id), `${r.id} known too early`).toBe(false);
    }
  });

  it('refuses to learn one nobody teaches, so the list stays meaningful', () => {
    const p = learnRecipe(emptyProgress(), 'recipe_flint_knife');
    expect(p.recipes).toEqual([]);
    expect(learnRecipe(emptyProgress(), 'recipe_nonsense').recipes).toEqual([]);
  });

  it('keeps a taught recipe out of the making panel until it is known', () => {
    // Every ingredient in hand and still not offered, because nobody has shown you.
    let s = add(emptySatchel(), 'material_deer_antler', 4);
    s = add(s, 'item_flint_knife', 1);
    const knows = (id: string) => knowsRecipe(emptyProgress(), id);

    expect(canMake(s, 'recipe_bone_awl')).toBe(true);
    expect(makeableNow(s, openGround(), knows).map((r) => r.id)).not.toContain('recipe_bone_awl');
    expect(withinReach(s, openGround(), knows).map((r) => r.id)).not.toContain('recipe_bone_awl');

    const taught = learnRecipe(emptyProgress(), 'recipe_bone_awl');
    const after = (id: string) => knowsRecipe(taught, id);
    expect(makeableNow(s, openGround(), after).map((r) => r.id)).toContain('recipe_bone_awl');
  });

  it('names a teacher who actually says it', () => {
    // Canon's own check, mirrored: the recipe points at a person and the person's line points
    // back, and the two are authored separately.
    for (const r of recipes) {
      for (const who of r.taughtBy) {
        const person = npc(who);
        expect(person, `${r.id} taught by ${who}, who does not exist`).not.toBeNull();
        expect(
          person!.lines.some((l) => l.gives.includes(r.id)),
          `${r.id} says ${who} teaches it, and no line of theirs gives it`
        ).toBe(true);
      }
    }
  });
});

describe('a line can cost something', () => {
  const priced = npcs.flatMap((n) => n.lines.filter((l) => l.costs).map((l) => ({ n, l })));

  it('exists, and asks for a thing that can be made', () => {
    expect(priced.length).toBeGreaterThan(0);
    for (const { l } of priced) {
      expect(recipes.some((r) => r.outputs.some((o) => o.item === l.costs))).toBe(true);
    }
  });

  it('is not offered to somebody who cannot pay', () => {
    for (const { n, l } of priced) {
      expect(linesFor(emptyProgress(), n.id, emptySatchel())).not.toContain(l);
      const holding = add(emptySatchel(), l.costs!, 1);
      expect(linesFor(emptyProgress(), n.id, holding)).toContain(l);
    }
  });

  it('takes the thing when the line is heard', () => {
    const { n, l } = priced[0]!;
    const holding = add(emptySatchel(), l.costs!, 1);
    const at = linesFor(emptyProgress(), n.id, holding).indexOf(l);
    const heard = hear(emptyProgress(), n.id, at, holding);

    expect(heard.paid).toBe(l.costs);
    // Gone, not merely marked. A gift the player keeps looks like it worked and did not.
    expect(count(heard.satchel, l.costs!)).toBe(0);
  });

  it('leaves a free line untouched, by identity', () => {
    const holding = add(emptySatchel(), 'material_flint', 2);
    const heard = hear(emptyProgress(), 'npc_thrali', 0, holding);
    expect(heard.paid).toBeNull();
    expect(heard.satchel).toBe(holding);
  });
});

// ---------------------------------------------------------------------------------------
// Only the calls a player has.
// ---------------------------------------------------------------------------------------

describe('a player can earn a craft and pay for one', () => {
  const lothal = fieldMap('field_map_lothal')!;
  const built = buildFieldMap(lothal);

  /** Walk the whole map picking things up. No hand-seeded satchel anywhere below. */
  function walked() {
    let bag = emptySatchel();
    for (let y = 0; y < built.world.height; y += 1) {
      for (let x = 0; x < built.world.width; x += 1) {
        bag = gather(bag, built.world.seed, { x, y }, built.world.tiles[y]![x]!.biome);
      }
    }
    return bag;
  }

  it('learns a craft by talking to somebody, and then can do it', () => {
    let p = emptyProgress();
    const bag = walked();

    // Uma is at the Lothal camp and shows you how a mat is laid. Heard the way the panel
    // hears it: indexed against what `linesFor` returned, never against canon order.
    expect(knowsRecipe(p, 'recipe_reed_mat')).toBe(false);
    const said = linesFor(p, 'npc_uma', bag);
    const teaches = said.findIndex((l) => l.gives.includes('recipe_reed_mat'));
    expect(teaches, 'Uma no longer teaches the mat').toBeGreaterThanOrEqual(0);

    p = hear(p, 'npc_uma', teaches, bag).progress;
    expect(knowsRecipe(p, 'recipe_reed_mat')).toBe(true);

    // And it is now a thing the panel would offer, given a loom.
    const knows = (id: string) => knowsRecipe(p, id);
    const withLoom = add(bag, 'item_loom_frame', 1);
    expect(makeableNow(withLoom, openGround(), knows).map((r) => r.id)).toContain('recipe_reed_mat');
  });

  it('makes the thing Uma wants and hands it over', () => {
    let p = emptyProgress();
    let bag = walked();

    // Learn the mat, make a loom (common knowledge), make a mat, give it back.
    const said = linesFor(p, 'npc_uma', bag);
    p = hear(p, 'npc_uma', said.findIndex((l) => l.gives.includes('recipe_reed_mat')), bag).progress;

    // The real bootstrap, and it is worth spelling out because it is not obvious: spinning
    // needs something that *works*, and the only things that work are a bow drill, a quern and
    // a loom — all of which want cordage, which wants spinning. The bow drill is the way in,
    // because carving needs only something that cuts.
    expect(canMake(bag, 'recipe_flint_knife')).toBe(true);
    bag = make(bag, 'recipe_flint_knife');
    bag = make(bag, 'recipe_bow_drill');
    expect(count(bag, 'item_bow_drill'), 'nothing in Lothal can work material').toBe(1);
    bag = make(bag, 'recipe_reed_rope');
    bag = make(bag, 'recipe_loom_frame');
    expect(count(bag, 'item_loom_frame')).toBe(1);

    bag = make(bag, 'recipe_reed_mat');
    expect(count(bag, 'item_reed_mat'), 'the mat could not be made from a walk of Lothal').toBe(1);

    // Now the priced line is offered, and paying it teaches the bedroll.
    const now = linesFor(p, 'npc_uma', bag);
    const gift = now.findIndex((l) => l.costs === 'item_reed_mat');
    expect(gift, 'Uma no longer wants a mat').toBeGreaterThanOrEqual(0);

    const heard = hear(p, 'npc_uma', gift, bag);
    expect(heard.paid).toBe('item_reed_mat');
    expect(count(heard.satchel, 'item_reed_mat')).toBe(0);
    expect(knowsRecipe(heard.progress, 'recipe_bedroll')).toBe(true);
  });
});
