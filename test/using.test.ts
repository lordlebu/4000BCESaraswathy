// What a carried thing is for, and the three mechanics that had data and no door.
//
// **This file exists because of the fault it is named after.** Canon holds seven `physic` items
// affording `heal`, thirteen foods affording `eat` and two shelters affording `shelter`; the
// crafting layer could make every one of them; and nothing in the game could do anything with one.
// `src/content/cooking.ts` had **zero importers** for its whole life. That is this codebase's
// signature failure -- a mechanic written, tested, believed and wired to nothing -- and
// `journey.ts` lists three previous instances of it at the top of its own file.
//
// So what these guard is, in order:
//
//   * every affordance canon uses for a *person* rather than for a *process* has a use, against
//     the real bundle -- so a canon addition cannot land inert;
//   * a shelter is never consumed by being used, which is the one way this could eat somebody's
//     tent and teach them never to press the button;
//   * using is offered on made things only, never on raw stuff;
//   * nothing here can make a player worse off, which is the promise `satchel.ts` and `kit.ts`
//     both make and the reason there is no hunger.

import { describe, expect, it } from 'vitest';
import {
  USE_HEADING,
  shelterBuilt,
  usableIn,
  use,
  usedLine,
  useOf
} from '../src/content/using';
import { items, materials } from '../src/content/making';
import { add, count, emptySatchel } from '../src/content/satchel';

describe('what a thing is for', () => {
  /**
   * **The guard against a canon addition landing inert.**
   *
   * Asked of the real bundle rather than of a fixture, because the whole failure this module fixes
   * was data the game shipped and never read. If canon authors an eighth physic tomorrow it gets a
   * verb, a promise and a row for free -- and if somebody breaks that, this fails by name.
   */
  it('gives every healing, edible and sheltering item in canon a use', () => {
    const usable = items.filter(
      (i) =>
        !i.isPrototype &&
        (i.affords.includes('heal') || i.affords.includes('eat') || i.affords.includes('shelter'))
    );
    expect(usable.length, 'canon has no usable items at all').toBeGreaterThan(15);
    for (const i of usable) {
      const what = useOf(i.id);
      expect(what, `${i.id} affords something and has no use`).not.toBeNull();
      expect(what!.verb.length, `${i.id} has an empty verb`).toBeGreaterThan(2);
      expect(what!.promise.length, `${i.id} says nothing about what it does`).toBeGreaterThan(10);
      expect(USE_HEADING[what!.kind]).toBeTruthy();
      expect(usedLine(i.id)!.length).toBeGreaterThan(20);
    }
  });

  /**
   * **A physic that is also a food is offered as the physic.**
   *
   * Four of canon's items carry two of these at once -- `item_ashwagandha_tonic` heals *and* is
   * eaten. The order in `KIND_OF` decides, and it decides in favour of the reason somebody went to
   * the trouble of making it.
   */
  it('prefers the physic when a thing is both', () => {
    const both = items.find(
      (i) => i.affords.includes('heal') && i.affords.includes('eat') && !i.isPrototype
    );
    expect(both, 'canon no longer has an item that both heals and is eaten').toBeTruthy();
    expect(useOf(both!.id)!.kind).toBe('remedy');
  });

  /** Stuff is what you make things out of. Offering to eat a handful of reed fibre is the
      interface inventing an affordance canon did not give it. */
  it('never offers to use a raw material', () => {
    for (const m of materials) expect(useOf(m.id), `${m.id} was offered as usable`).toBeNull();
  });

  it('says nothing about a thing it has never heard of', () => {
    expect(useOf('item_not_a_thing')).toBeNull();
    expect(usedLine('item_not_a_thing')).toBeNull();
  });

  /** A prototype exists to be inherited from and is never offered to a player. */
  it('never offers a prototype', () => {
    for (const i of items.filter((x) => x.isPrototype)) expect(useOf(i.id)).toBeNull();
  });
});

describe('using it', () => {
  const remedy = items.find((i) => i.affords.includes('heal') && !i.isPrototype)!;

  it('spends a remedy', () => {
    const s = add(emptySatchel(), remedy.id, 2);
    expect(count(use(s, remedy.id), remedy.id)).toBe(1);
  });

  /**
   * **A shelter is not spent, and this is the most important test in the file.**
   *
   * You do not use up a tent by sleeping under it; you spend an evening raising it and it is yours
   * for the journey. A game that ate your tent the first night you pitched it would be teaching the
   * player never to press the button -- and it is the same fault `crafting.make` guards with `kept`
   * ingredients, which is worth guarding twice.
   */
  it('never spends a shelter', () => {
    const s = add(emptySatchel(), 'item_hide_tent', 1);
    expect(useOf('item_hide_tent')!.spends).toBe(false);
    expect(count(use(s, 'item_hide_tent'), 'item_hide_tent')).toBe(1);
  });

  it('does nothing with something not carried', () => {
    const s = emptySatchel();
    expect(use(s, remedy.id)).toBe(s);
  });

  it('never mutates the satchel it was given', () => {
    const s = add(emptySatchel(), remedy.id, 1);
    use(s, remedy.id);
    expect(count(s, remedy.id), 'use wrote through to the caller’s satchel').toBe(1);
  });

  /**
   * Easing is a fraction and is bounded, because it reaches `fatigue.ts` -- which holds four
   * invariants whose whole content is that tiredness never stops you. A value outside [0, 1] would
   * be the one way an item could produce a number that module does not expect.
   */
  it('eases by a sane fraction, and a shelter eases nothing', () => {
    for (const i of items.filter((x) => !x.isPrototype)) {
      const what = useOf(i.id);
      if (!what) continue;
      expect(what.eases).toBeGreaterThanOrEqual(0);
      expect(what.eases).toBeLessThanOrEqual(1);
      if (what.kind === 'shelter') expect(what.eases).toBe(0);
      else expect(what.eases, `${i.id} does nothing at all`).toBeGreaterThan(0);
    }
  });
});

describe('what is to hand', () => {
  it('lists nothing from an empty satchel', () => {
    expect(usableIn(emptySatchel())).toEqual([]);
  });

  /** Remedies first: a tired player wants one row at the top, not wherever the alphabet put it. */
  it('puts remedies before meals before shelters', () => {
    let s = emptySatchel();
    s = add(s, 'item_hide_tent', 1);
    s = add(s, 'item_flood_bread', 1);
    s = add(s, 'item_neem_salve', 1);
    expect(usableIn(s).map((u) => u.kind)).toEqual(['remedy', 'meal', 'shelter']);
  });

  it('ignores raw stuff sitting alongside', () => {
    let s = add(emptySatchel(), 'item_neem_salve', 1);
    s = add(s, materials[0]!.id, 4);
    expect(usableIn(s)).toHaveLength(1);
  });
});

describe('what you have built to sleep under', () => {
  /**
   * **The whole of "building", and it deliberately has no new save state behind it.**
   *
   * The obvious design is a set of tiles the player built on, which means a new field in `Journey`,
   * which means bumping `SAVE_VERSION` and discarding every existing journey -- for a mechanic
   * whose entire content is "the night went better".
   */
  it('is nothing until a tent is carried', () => {
    expect(shelterBuilt(emptySatchel())).toBeNull();
    expect(shelterBuilt(add(emptySatchel(), 'item_hide_tent', 1))).toBe('tent');
  });

  /**
   * Reports what is carried, not what kind of night it buys. `Shelter` is `game/night.ts`'s word,
   * and `content/` importing from `game/` would point the dependency arrow backwards through the
   * one seam this codebase keeps one-way.
   */
  it('does not name a night', () => {
    expect(shelterBuilt(add(emptySatchel(), 'item_hide_tent', 1))).not.toBe('camp');
  });

  /** A bedroll's worth of thing is not reported: a row promising what the kit already gives is noise. */
  it('ignores a mat, which is no better than the bedroll', () => {
    expect(shelterBuilt(add(emptySatchel(), 'item_reed_mat', 1))).toBeNull();
  });
});
