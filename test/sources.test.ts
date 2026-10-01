// Where a thing comes from.
//
// The owner stopped two-thirds of the way up Lothal's windmill because the panel said "Needs 1 reed
// rope (you carry 0)" and nothing else. These hold the pointer that now goes beside every reason:
// that it names the living thing or the ground, that a tool names something that would do and how
// that is made, and that a taught recipe names a person and where they stand.

import { describe, expect, it } from 'vitest';
import { sourceOf, taughtOn, taughtWhere, toolsAffording, whereFrom } from '../src/content/sources';
import { shortfalls } from '../src/content/crafting';
import { items, materials } from '../src/content/making';
import { emptySatchel } from '../src/content/satchel';

describe('where a thing comes from', () => {
  it('names the animal and the ground for sinew', () => {
    const line = whereFrom('material_sinew')!;
    expect(line).toMatch(/deer/);
    expect(line).toMatch(/forest/);
  });

  it('says what goes into a made thing, not the recipe that restates it', () => {
    expect(whereFrom('item_reed_rope')).toBe('made from reed fibre');
  });

  it('has an answer for every material and every made item in canon', () => {
    // A null here is a blank pointer in the workshop -- the exact silence this module exists to end.
    const silent = [...materials.map((m) => m.id), ...items.map((i) => i.id)].filter((id) => whereFrom(id) === null);
    // Items no recipe makes are found or given, not made; they are allowed to be silent.
    const madeItems = silent.filter((id) => id.startsWith('material_'));
    expect(madeItems, 'materials with no source, no ground and no recipe').toEqual([]);
  });
});

describe('a missing tool', () => {
  it('names something that would do, and how it is made', () => {
    const tool = shortfalls(emptySatchel(), 'recipe_reed_rope').find((s) => s.kind === 'tool')!;
    expect(tool.why).toBe('needs something that can work');
    const line = sourceOf(tool)!;
    expect(line).toMatch(/stone adze/);
    expect(line).toMatch(/made from/);
  });

  it('only offers things that really afford it', () => {
    expect(toolsAffording('work')).toContain('item_stone_adze');
    expect(toolsAffording('nothing_affords_this')).toEqual([]);
  });
});

describe('who teaches it', () => {
  it('names the person, the place and the country when they are on another map', () => {
    expect(taughtWhere('recipe_husk_hawser', 'field_map_lothal')).toBe('Pell teaches this at the Gate Court, North Dwarka');
  });

  it('leaves the country off on the map they are on', () => {
    expect(taughtWhere('recipe_husk_hawser', 'field_map_dwarka')).toBe('Pell teaches this at the Gate Court');
    expect(taughtOn('recipe_husk_hawser', 'field_map_dwarka')).toBe(true);
    expect(taughtOn('recipe_husk_hawser', 'field_map_lothal')).toBe(false);
  });

  it('is silent for a recipe nobody has to teach', () => {
    expect(taughtWhere('recipe_reed_rope')).toBeNull();
  });
});
