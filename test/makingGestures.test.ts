// Which gesture a making process asks for.
//
// What these guard, in order of how expensive the fault would be:
//
//   * **every process canon holds has a gesture and a verb**, checked against the real bundle
//     rather than a list written here -- a canon process nobody mapped is a recipe a player cannot
//     make, which is a canon edit silently breaking the game;
//   * an unmapped process still works, because the alternative is that same breakage;
//   * the mapping keys on the *process*, so 82 recipes need 17 answers and a new recipe needs none.

import { describe, expect, it } from 'vitest';
import { gestureForProcess, verbForProcess, PROCESS_GESTURE, PROCESS_VERB } from '../src/content/making-gestures';
import { processes, recipes } from '../src/content/making';

describe('a gesture for every way of making something', () => {
  /**
   * **The join between the two repositories, asserted rather than assumed.**
   *
   * Canon owns the list of processes and this repository owns what they feel like to do. That is
   * the right split -- pacing is play -- but it means canon can author a process this file has
   * never heard of, and the failure would show up as a recipe that plays wrong rather than as an
   * error. So the check reads the real bundle.
   */
  it('covers every process in the canon bundle', () => {
    const missing = processes.filter((p) => !(p.id in PROCESS_GESTURE));
    expect(
      missing.map((p) => p.id),
      'canon has a process with no gesture — add it to PROCESS_GESTURE'
    ).toEqual([]);

    const unnamed = processes.filter((p) => !(p.id in PROCESS_VERB));
    expect(
      unnamed.map((p) => p.id),
      'canon has a process with no verb — add it to PROCESS_VERB'
    ).toEqual([]);
  });

  it('maps nothing canon does not have', () => {
    // The other direction: a mapping for a process that no longer exists is dead weight, and it is
    // also the tell that canon renamed something and this file was not updated with it.
    const known = new Set(processes.map((p) => p.id));
    const stale = Object.keys(PROCESS_GESTURE).filter((id) => !known.has(id));
    expect(stale, 'a gesture is mapped to a process canon no longer has').toEqual([]);
  });

  /**
   * **Every recipe can be made**, which is the property that actually matters to a player.
   *
   * This is the one that would catch a canon edit before anybody plays it: 82 recipes today, and
   * the number only goes up.
   */
  it('gives every recipe a gesture and a verb', () => {
    for (const recipe of recipes) {
      const gesture = gestureForProcess(recipe.process);
      expect(['stoop', 'stalk', 'work'], `${recipe.id} has no sensible gesture`).toContain(gesture);
      expect(verbForProcess(recipe.process).length, `${recipe.id} has no verb`).toBeGreaterThan(0);
    }
  });

  /**
   * A process nobody has mapped still plays, rather than failing.
   *
   * The alternative is that a canon addition breaks the game until this repository catches up,
   * which is exactly the coupling the canon/game split exists to prevent. `stoop` is the gentlest
   * of the three and punishes nothing, which is the right thing to guess with.
   */
  it('falls back rather than failing on a process it has never seen', () => {
    expect(gestureForProcess('process_lithography')).toBe('stoop');
    expect(verbForProcess('process_lithography')).toBe('Make it');
  });

  it('keys on the process, so recipes sharing one share a gesture', () => {
    // The whole reason this file is small: carving alone covers 23 recipes today.
    const carved = recipes.filter((r) => r.process === 'process_carving');
    expect(carved.length, 'no carving recipes to check').toBeGreaterThan(1);
    const gestures = new Set(carved.map((r) => gestureForProcess(r.process)));
    expect(gestures.size, 'two recipes of the same process disagree').toBe(1);
  });
});
