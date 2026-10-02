// What the traveller is working towards: a recipe or a building stage, and what it still wants.
//
// `content/goals.ts` is asked by the pinned line, the events that turn something up, the pointer to
// the nearest source and the next-step line -- four readers of one answer. These hold the answer.

import { describe, expect, it } from 'vitest';
import { goalOf, stagePin, wantedKinds, wantedMaterials, wanting } from '../src/content/goals';
import { openGround } from '../src/content/crafting';
import { add, emptySatchel } from '../src/content/satchel';

describe('reading a pin', () => {
  it('reads a recipe id and a building stage, and nothing else', () => {
    expect(goalOf('recipe_flint_knife')).toEqual({ kind: 'recipe', id: 'recipe_flint_knife' });
    expect(goalOf(stagePin('field_map_narmada'))).toEqual({ kind: 'stage', fieldMapId: 'field_map_narmada' });
    // A stale pin from an old save, or a map with no homestead, pins nothing rather than throwing.
    expect(goalOf('recipe_no_such_thing')).toBeNull();
    expect(goalOf(stagePin('field_map_aravali'))).toBeNull();
    expect(goalOf(null)).toBeNull();
  });
});

describe('what a recipe still wants', () => {
  it('counts how many more of each, by id and by kind', () => {
    const s = add(emptySatchel(), 'material_bamboo_cane', 1);
    const w = wanting({ kind: 'recipe', id: 'recipe_carry_basket' }, s, openGround(), [])!;
    expect(w.name).toMatch(/carry basket/i);
    expect(w.wants.map((x) => x.label).join(' · ')).toMatch(/more/);
    expect(w.ready).toBe(false);
    expect(wantedMaterials(w).length + wantedKinds(w).length).toBeGreaterThan(0);
  });

  it('counts a missing tool as wanted, so a recipe with every material but no tool is not ready', () => {
    const s = add(emptySatchel(), 'material_palm_husk', 9);
    const w = wanting({ kind: 'recipe', id: 'recipe_husk_hawser' }, s, openGround(), [])!;
    expect(w.wants.some((x) => x.label === 'something that can work')).toBe(true);
    expect(w.ready).toBe(false);
    // A tool asks nothing of the ground.
    expect(wantedMaterials(w)).toEqual([]);
  });

  it('is ready once everything is carried', () => {
    const w = wanting({ kind: 'recipe', id: 'recipe_flint_knife' }, add(emptySatchel(), 'material_flint', 2), openGround(), [])!;
    expect(w.ready).toBe(true);
    expect(w.wants).toEqual([]);
  });
});

describe('what a building stage still wants', () => {
  it('reads the next stage from the flags, and moves on as each is raised', () => {
    const first = wanting({ kind: 'stage', fieldMapId: 'field_map_narmada' }, emptySatchel(), openGround(), [])!;
    expect(first.name).toBe('Lay the footing');
    expect(wantedMaterials(first)).toEqual(expect.arrayContaining(['material_basalt', 'material_bark_bast']));
    const second = wanting(
      { kind: 'stage', fieldMapId: 'field_map_narmada' },
      emptySatchel(),
      openGround(),
      ['homestead:field_map_narmada:built:foundation']
    )!;
    expect(second.name).toBe('Raise the tower');
    // Any straight timber, since the owner's ruling of 2 October 2026 -- not bamboo alone.
    expect(wantedKinds(second)).toContain('timber');
    expect(wantedMaterials(second)).not.toContain('material_bamboo_cane');
  });
});
