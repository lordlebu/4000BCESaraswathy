// Can a player actually gather something, make something, and cook something?
//
// The rule this file exists to satisfy is written at the top of `src/journey.ts`: a mechanic
// can be written, tested and shipped with no caller, and the suite stays green while the
// thing simply does not exist in the game. It has happened three times here — no word could
// be learned, no question could be settled, the game had no ending.
//
// So the last describe block walks a real generated map and uses **only the calls a player
// has**: gather from the tile under foot, then make from what that gave. It never seeds a
// satchel by hand. If gathering stops producing anything a recipe can use, this fails, and
// no amount of unit coverage on `add` and `remove` would have caught it.

import { describe, expect, it } from 'vitest';
import {
  affording,
  add,
  canDo,
  carried,
  count,
  describe as describeStack,
  emptySatchel,
  holds,
  itemsHeld,
  materialsHeld,
  remove
} from '../src/content/satchel';
import {
  blockedBy,
  canMake,
  make,
  makeableNow,
  openGround,
  satisfying,
  tagCount,
  withinReach
} from '../src/content/crafting';
import { anythingAt, gather, gatheredLine, yieldsAt } from '../src/content/gathering';
import { canCook, cookableNow, dishes, foods, isFood, whereCooked } from '../src/content/cooking';
import { couldBuild, crosses, forBiome, missingFor, opensUp } from '../src/content/vehicles';
import { items, materials, processes, recipes, vehicles, item } from '../src/content/making';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMap } from '../src/content/places';
import { biomes } from '../src/content/species';

describe('the making layer arrives from canon', () => {
  it('carries every collection', () => {
    expect(materials.length).toBeGreaterThan(40);
    expect(items.length).toBeGreaterThan(60);
    expect(processes.length).toBeGreaterThan(10);
    expect(recipes.length).toBeGreaterThan(60);
    expect(vehicles.length).toBeGreaterThan(8);
  });

  it('resolves affordances through base_item', () => {
    // `item_reed_rope` states no affordances of its own in canon and inherits `bind` from
    // `item_cordage`. If the chain walk breaks, this becomes an empty array rather than an
    // error, which is exactly the kind of silent wrong the adapter tests exist for.
    expect(item('item_reed_rope')!.affords).toContain('bind');
    expect(item('item_cordage')!.isPrototype).toBe(true);
  });

  it('says nothing about damage', () => {
    // The ruling, asserted rather than trusted. Canon's affordance vocabulary has no word for
    // harm, so no item can claim one — a spear cuts and deters.
    const spear = item('item_reed_spear')!;
    expect(spear.kind).toBe('weapon');
    expect(spear.affords.sort()).toEqual(['cut', 'deter']);
    const words = new Set(items.flatMap((i) => i.affords));
    for (const banned of ['damage', 'attack', 'strike', 'harm']) {
      expect(words.has(banned as never)).toBe(false);
    }
  });

  it('keeps materials off ground the walk cannot draw', () => {
    const drawable = new Set(biomes.map((b) => b.id));
    for (const m of materials) {
      for (const b of m.foundIn) expect(drawable.has(b), `${m.id} on ${b}`).toBe(true);
    }
  });
});

describe('the satchel', () => {
  it('stacks and never mutates', () => {
    const empty = emptySatchel();
    const one = add(empty, 'material_reed_fibre', 3);
    expect(count(empty, 'material_reed_fibre')).toBe(0);
    expect(count(one, 'material_reed_fibre')).toBe(3);
    expect(holds(one, 'material_reed_fibre', 3)).toBe(true);
    expect(holds(one, 'material_reed_fibre', 4)).toBe(false);
  });

  it('drops a stack that reaches zero rather than keeping a nought', () => {
    const s = remove(add(emptySatchel(), 'material_flint', 2), 'material_flint', 2);
    expect(carried(s)).toEqual([]);
    // And never goes negative, however hard it is asked.
    expect(count(remove(s, 'material_flint', 5), 'material_flint')).toBe(0);
  });

  it('separates what is stuff from what is made', () => {
    const s = add(add(emptySatchel(), 'material_flint'), 'item_flint_knife');
    expect(materialsHeld(s)).toEqual(['material_flint']);
    expect(itemsHeld(s)).toEqual(['item_flint_knife']);
  });

  it('answers what it can do rather than what it holds', () => {
    const s = add(emptySatchel(), 'item_flint_knife');
    expect(canDo(s, 'cut')).toBe(true);
    expect(canDo(s, 'burn')).toBe(false);
    expect(affording(s, 'cut')).toEqual(['item_flint_knife']);
  });

  it('counts a stack in the diary register', () => {
    const s = add(emptySatchel(), 'material_reed_fibre', 4);
    expect(describeStack(s, 'material_reed_fibre')).toBe('Reed fibre ×4');
    expect(describeStack(add(emptySatchel(), 'material_flint'), 'material_flint')).toBe('Flint');
  });
});

describe('crafting', () => {
  it('spends ingredients and keeps tools', () => {
    // `recipe_bone_awl` takes a #bone and keeps a flint knife.
    let s = emptySatchel();
    s = add(s, 'material_deer_antler', 1);
    s = add(s, 'item_flint_knife', 1);
    expect(canMake(s, 'recipe_bone_awl')).toBe(true);

    const after = make(s, 'recipe_bone_awl');
    expect(count(after, 'material_deer_antler')).toBe(0);
    // The knife is `kept`. Getting this backwards is how a crafting layer eats every tool.
    expect(count(after, 'item_flint_knife')).toBe(1);
    expect(count(after, 'item_bone_awl')).toBe(1);
  });

  it('accepts any material carrying the tag', () => {
    // `#fibre` is satisfied by reed, husk, goat hair or sinew — the whole reason tags exist.
    const reed = add(emptySatchel(), 'material_reed_fibre', 6);
    const husk = add(emptySatchel(), 'material_palm_husk', 6);
    expect(tagCount(reed, 'fibre')).toBe(6);
    expect(tagCount(husk, 'fibre')).toBe(6);
    expect(satisfying(reed, 'fibre')).toEqual(['material_reed_fibre']);
  });

  it('draws a tag across more than one material', () => {
    // Four fibre out of two reeds and two husks is a legitimate way to make a mat.
    let s = add(add(emptySatchel(), 'material_reed_fibre', 3), 'material_palm_husk', 3);
    s = add(s, 'item_loom_frame', 1);
    expect(tagCount(s, 'fibre')).toBe(6);
    expect(canMake(s, 'recipe_reed_mat')).toBe(true);
    const after = make(s, 'recipe_reed_mat');
    expect(count(after, 'item_reed_mat')).toBe(1);
    expect(tagCount(after, 'fibre')).toBe(0);
  });

  it('refuses, and says why, in words a panel can print', () => {
    const nothing = emptySatchel();
    expect(canMake(nothing, 'recipe_bone_awl')).toBe(false);
    const why = blockedBy(nothing, 'recipe_bone_awl');
    expect(why.join(' ')).toMatch(/needs/);
    expect(why.some((w) => /can cut/.test(w))).toBe(true);
  });

  it('keeps a sited process off open ground', () => {
    // Firing needs a settlement. Standing in a field is not one, however much clay you have.
    let s = add(emptySatchel(), 'material_river_clay', 4);
    s = add(s, 'material_dung_cake', 4);
    s = add(s, 'item_oil_lamp', 1);
    expect(canMake(s, 'recipe_storage_jar', openGround())).toBe(false);
    expect(blockedBy(s, 'recipe_storage_jar', openGround()).join(' ')).toMatch(/settlement/);
    expect(canMake(s, 'recipe_storage_jar', { kind: 'settlement' })).toBe(true);
  });

  it('makes nothing when it cannot, and returns the same satchel', () => {
    const s = add(emptySatchel(), 'material_reed_fibre', 1);
    expect(make(s, 'recipe_reed_mat')).toBe(s);
    expect(make(s, 'recipe_that_does_not_exist')).toBe(s);
  });

  it('offers what is close as well as what is ready', () => {
    const s = add(emptySatchel(), 'material_flint', 2);
    expect(makeableNow(s).map((r) => r.id)).toContain('recipe_flint_knife');
    // One reed is not a rope, but it is worth showing that a rope is a thing.
    const nearly = add(emptySatchel(), 'material_reed_fibre', 1);
    expect(withinReach(nearly).map((r) => r.id)).toContain('recipe_reed_rope');
    expect(makeableNow(nearly).map((r) => r.id)).not.toContain('recipe_reed_rope');
  });
});

describe('cooking', () => {
  it('is crafting whose output happens to be edible', () => {
    expect(dishes.length).toBeGreaterThan(5);
    expect(foods.every((f) => isFood(f.id))).toBe(true);
    expect(isFood('item_flint_knife')).toBe(false);
  });

  it('needs no building', () => {
    // `process_cooking` names no site: a hearth is a fire somebody built.
    expect(whereCooked('recipe_salt_fish_stew')).toMatch(/anywhere/);
  });

  it('wants a fire and a pot before it wants ingredients', () => {
    // `process_cooking` needs `burn` and `contain`. Rice and salt alone is not a meal, and
    // the failure says so in those words rather than complaining about the rice.
    let s = add(emptySatchel(), 'material_delta_rice', 2);
    s = add(s, 'material_salt_crust', 1);
    expect(canCook(s, 'recipe_spiced_rice')).toBe(false);
    const why = blockedBy(s, 'recipe_spiced_rice').join(' ');
    expect(why).toMatch(/can burn/);
    expect(why).toMatch(/can contain/);
  });

  it('cooks when the makings are there', () => {
    let s = add(emptySatchel(), 'material_delta_rice', 2);
    s = add(s, 'material_salt_crust', 1);
    s = add(s, 'item_oil_lamp', 1);
    s = add(s, 'item_cooking_pot', 1);
    expect(canCook(s, 'recipe_spiced_rice')).toBe(true);
    expect(cookableNow(s).map((r) => r.id)).toContain('recipe_spiced_rice');
    expect(count(make(s, 'recipe_spiced_rice'), 'item_spiced_rice')).toBe(1);
  });

  it('restores nothing, because there is nothing to restore', () => {
    // The ruling, asserted. No food item affords anything that could read as a stat, and the
    // cooking module exports no function that returns a number.
    for (const f of foods) {
      expect(f.affords.every((a) => ['eat', 'carry', 'trade', 'heal'].includes(a))).toBe(true);
    }
  });
});

describe('vehicles', () => {
  it('cross ground that walking cannot', () => {
    const walkable = new Set(biomes.filter((b) => b.walkable).map((b) => b.id));
    expect(walkable.has('sea')).toBe(false);
    expect(crosses('vehicle_coastal_dhow', 'sea')).toBe(true);
    expect(opensUp('vehicle_coastal_dhow', walkable)).toContain('sea');
    expect(forBiome('sea').length).toBeGreaterThan(0);
  });

  it('knows what it is short of', () => {
    const nothing = emptySatchel();
    expect(couldBuild(nothing, 'vehicle_reed_raft')).toBe(false);
    expect(missingFor(nothing, 'vehicle_reed_raft')).toContain('material_reed_fibre');
    let s = add(emptySatchel(), 'material_reed_fibre');
    s = add(s, 'material_bamboo_cane');
    expect(couldBuild(s, 'vehicle_reed_raft')).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------
// The one that matters: only the calls a player has.
// ---------------------------------------------------------------------------------------

describe('a player can actually do this', () => {
  const lothal = fieldMap('field_map_lothal')!;
  const built = buildFieldMap(lothal);
  const seed = built.world.seed;

  it('finds something to pick up while walking a real map', () => {
    let tilesWithSomething = 0;
    for (let y = 0; y < built.world.height; y += 1) {
      for (let x = 0; x < built.world.width; x += 1) {
        const biome = built.world.tiles[y]![x]!.biome;
        if (anythingAt(seed, { x, y }, biome)) tilesWithSomething += 1;
      }
    }
    // Not "some": a delta the player crosses should offer something constantly.
    expect(tilesWithSomething).toBeGreaterThan(100);
  });

  it('answers the same for a tile however it is reached', () => {
    // The whole reason gathering is built on `tileHash` and not a stream.
    const at = { x: 10, y: 10 };
    const biome = built.world.tiles[10]![10]!.biome;
    const first = yieldsAt(seed, at, biome).map((m) => m.id);
    for (let i = 0; i < 20; i += 1) yieldsAt(seed, { x: i, y: i }, biome);
    expect(yieldsAt(seed, at, biome).map((m) => m.id)).toEqual(first);
  });

  it('gathers, then makes, using nothing a player does not have', () => {
    // Walk the whole map picking things up. No hand-seeded satchel anywhere in this test.
    let satchel = emptySatchel();
    for (let y = 0; y < built.world.height; y += 1) {
      for (let x = 0; x < built.world.width; x += 1) {
        satchel = gather(satchel, seed, { x, y }, built.world.tiles[y]![x]!.biome);
      }
    }
    expect(carried(satchel).length).toBeGreaterThan(5);

    // Something must be makeable from a walk across one map, or the layer is decorative.
    const ready = makeableNow(satchel);
    expect(ready.length, 'nothing could be made from a full walk of Lothal').toBeGreaterThan(0);

    // And making it must actually change what is carried.
    const first = ready[0]!;
    const after = make(satchel, first.id);
    expect(after).not.toBe(satchel);
    const produced = first.outputs[0]!.item ?? first.outputs[0]!.material!;
    expect(count(after, produced)).toBeGreaterThan(0);
  });

  it('reaches a made tool, then a thing that needed the tool', () => {
    // The bootstrap the craft-closure check in canon exists to protect: flint is picked up,
    // a knife is knapped from it, and the knife is what makes the next thing possible.
    let satchel = emptySatchel();
    for (let y = 0; y < built.world.height; y += 1) {
      for (let x = 0; x < built.world.width; x += 1) {
        satchel = gather(satchel, seed, { x, y }, built.world.tiles[y]![x]!.biome);
      }
    }

    expect(canMake(satchel, 'recipe_flint_knife')).toBe(true);
    const withKnife = make(satchel, 'recipe_flint_knife');
    expect(count(withKnife, 'item_flint_knife')).toBe(1);

    // `recipe_bow_drill` needs the knife as a kept tool. Without one it is blocked; with one
    // it is not — which is the tool bootstrap working end to end.
    expect(blockedBy(satchel, 'recipe_bow_drill').some((w) => /Flint knife/.test(w))).toBe(true);
    expect(canMake(withKnife, 'recipe_bow_drill')).toBe(true);
  });

  it('writes a line for the diary when something is picked up', () => {
    for (let y = 0; y < built.world.height; y += 1) {
      for (let x = 0; x < built.world.width; x += 1) {
        const line = gatheredLine(seed, { x, y }, built.world.tiles[y]![x]!.biome);
        if (line) {
          expect(line).toMatch(/^Picked up .+\.$/);
          return;
        }
      }
    }
    throw new Error('nothing on the whole map produced a diary line');
  });
});
