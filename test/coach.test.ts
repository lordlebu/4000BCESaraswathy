// The first morning: one line at a time, each done when the save says so.

import { describe, expect, it } from 'vitest';
import { COACH, coachLine, MORNING_GOAL, type CoachFacts } from '../src/content/coach';
import { recipe } from '../src/content/making';

const facts = (over: Partial<CoachFacts> = {}): CoachFacts => ({
  moved: false,
  knows: () => false,
  made: () => false,
  carried: () => 0,
  ...over
});

describe('the first morning', () => {
  it('starts by teaching the walk, and goes in order', () => {
    expect(coachLine(facts())?.id).toBe('walk');
    expect(coachLine(facts({ moved: true }))?.id).toBe('uma');
    expect(coachLine(facts({ moved: true, knows: (id) => id === 'recipe_reed_mat' }))?.id).toBe('reeds');
  });

  it('counts the reeds as cut once the rope is made, even if they are spent', () => {
    const after = facts({ moved: true, knows: () => true, made: (id) => id === 'recipe_reed_rope' });
    expect(coachLine(after)?.id).toBe('knife');
  });

  it('is over once the knife is made', () => {
    expect(coachLine(facts({ moved: true, knows: () => true, made: () => true, carried: () => 9 }))).toBeNull();
  });

  it('only ever asks for things a first morning can do', () => {
    // Twisting needs no tool and knapping needs none either -- the whole reason the morning ends at
    // a knife and pins the mat rather than asking for it.
    expect(recipe('recipe_reed_rope')?.process).toBe('process_twisting');
    expect(recipe('recipe_flint_knife')?.ingredients.every((i) => !i.kept)).toBe(true);
    expect(COACH.map((s) => s.id)).toEqual(['walk', 'uma', 'reeds', 'rope', 'knife']);
    expect(recipe(MORNING_GOAL)?.taughtBy).toContain('npc_uma');
  });
});
