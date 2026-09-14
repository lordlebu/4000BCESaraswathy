// How an act is graded, and the one property that must survive every future tuning pass.
//
// What these guard, in order of how expensive the fault would be:
//
//   * **a poorly prepared act can never leave a player worse off than the plain click** -- this is
//     the "gathering never gives nothing" ruling, and putting any kind of test in front of a
//     material is precisely the change that would quietly undo it;
//   * the grade comes from things a player *decided* -- what they carry and when they came -- and
//     never from timing, which is the whole of this layer's rewrite;
//   * gestures are keyed off `won_from` and nothing else, so a beedu manta is stalked, a reed is
//     stooped over and a sawfish is fished for;
//   * an animal that is not there cannot be followed, with a reason a player can act on.

import { describe, expect, it } from 'vitest';
import {
  type Preparation,
  attemptLine,
  gradeOf,
  settle
} from '../src/content/activity';
import {
  GESTURE_WANTS,
  blockedReason,
  gestureFor,
  gestureLine,
  momentFavours
} from '../src/content/gestures';
import type { Material } from '../src/content/making';
import type { Taking } from '../src/content/nodes';

const material = (over: Partial<Material> = {}): Material =>
  ({
    id: 'material_test',
    name: 'Reed fibre',
    classes: ['fibre'],
    foundIn: ['wetlands'],
    rarity: 'common',
    renews: 'fast',
    wonFrom: ['river-reed'],
    description: 'A test material.',
    ...over
  }) as Material;

const isAnimal = (id: string) => id.startsWith('beast-') || id.startsWith('fish-');
const isWater = (id: string) => id.startsWith('fish-');

/** A preparation, defaulting to the middle case so a test states only what it is about. */
const prep = (over: Partial<Preparation> = {}): Preparation => ({
  wants: 'cut',
  equipped: false,
  favourable: false,
  ...over
});

const ALL_GESTURES = ['stoop', 'stalk', 'work', 'fish', 'rest'] as const;
/** The four that come off a tile and therefore always name a material. */
const TAKING_GESTURES = ['stoop', 'stalk', 'work', 'fish'] as const;

describe('which gesture a material asks for', () => {
  it('reads won_from and nothing else', () => {
    expect(gestureFor(material({ wonFrom: ['river-reed'] }), isAnimal, isWater)).toBe('stoop');
    expect(gestureFor(material({ wonFrom: ['beast-manta'] }), isAnimal, isWater)).toBe('stalk');
    expect(gestureFor(material({ wonFrom: [] }), isAnimal, isWater)).toBe('work');
  });

  /**
   * **Class is deliberately not consulted, and this is the guard for that.**
   *
   * Keying on class looks richer -- `bone` and `hide` obviously mean an animal -- but it
   * disagrees with `won_from` on real canon entities, and `won_from` is the field the lint
   * checks. A bone with no living source is something you dig out of the ground, and that is
   * the honest answer rather than an awkward case.
   */
  it('does not let a class overrule an absent source', () => {
    const fossilBone = material({ classes: ['bone'], wonFrom: [] });
    expect(gestureFor(fossilBone, isAnimal)).toBe('work');

    const plantOil = material({ classes: ['oil'], wonFrom: ['sesame'] });
    expect(gestureFor(plantOil, isAnimal)).toBe('stoop');
  });

  it('stalks anything with an animal among its sources', () => {
    const both = material({ wonFrom: ['river-reed', 'beast-manta'] });
    expect(gestureFor(both, isAnimal, isWater)).toBe('stalk');
  });

  /**
   * **Water is tested before animal, and this is the guard for the order.**
   *
   * Everything fished is also an animal, so testing the broader predicate first makes `fish`
   * unreachable -- and it would fail silently, as a sawfish stalked across a riverbed.
   */
  it('fishes for a water species rather than stalking it', () => {
    expect(gestureFor(material({ wonFrom: ['fish-sawfish'] }), isAnimal, isWater)).toBe('fish');
  });

  /** An older caller that knows nothing about water still gets the behaviour it always had. */
  it('falls back to stalking when no water predicate is given', () => {
    expect(gestureFor(material({ wonFrom: ['fish-sawfish'] }), isAnimal)).toBe('stalk');
  });
});

describe('what an act asks you to be carrying', () => {
  it('names an affordance for every gesture that takes something', () => {
    for (const gesture of TAKING_GESTURES) {
      expect(GESTURE_WANTS[gesture], `${gesture} asks for nothing`).not.toBeNull();
    }
  });

  /**
   * **A night must never need an item, and this is why it is a test rather than a comment.**
   *
   * The bedroll is in the kit from the first step precisely so a night can never be lost for want
   * of a thing to hold. Giving `rest` a want would put the one unavoidable act in the game behind
   * an object, and `gradeOf` would then grade an empty-handed traveller `clumsy` for sleeping.
   */
  it('asks nothing of a night', () => {
    expect(GESTURE_WANTS.rest).toBeNull();
    expect(gradeOf(prep({ wants: null, equipped: false, favourable: true }))).toBe('clean');
  });
});

describe('whether the moment is with you', () => {
  it('waits on the animal for a stalk and a cast', () => {
    for (const gesture of ['stalk', 'fish'] as const) {
      expect(momentFavours(gesture, 'feeding')).toBe(true);
      expect(momentFavours(gesture, 'hunting')).toBe(false);
      expect(momentFavours(gesture, 'calling')).toBe(false);
      // Nothing watching you is a good moment, not an unknown one.
      expect(momentFavours(gesture, null)).toBe(true);
    }
  });

  it('waits on the hands for a stoop and a turn at the ground', () => {
    for (const gesture of ['stoop', 'work'] as const) {
      expect(momentFavours(gesture, null, { spent: false })).toBe(true);
      expect(momentFavours(gesture, null, { spent: true })).toBe(false);
      // A routine has no business changing how a rock or a reed goes.
      expect(momentFavours(gesture, 'hunting', { spent: false })).toBe(true);
    }
  });

  it('waits on the roof for a night', () => {
    expect(momentFavours('rest', null, { sheltered: true })).toBe(true);
    expect(momentFavours('rest', null, { sheltered: false })).toBe(false);
  });
});

describe('how an act is graded', () => {
  /**
   * The whole rule, as a table. A player has to be able to hold this in their head, so if it ever
   * needs more than four rows to state it has stopped being the thing that was designed.
   */
  it('grades on both halves, one half, or neither', () => {
    expect(gradeOf(prep({ equipped: true, favourable: true }))).toBe('clean');
    expect(gradeOf(prep({ equipped: true, favourable: false }))).toBe('fair');
    expect(gradeOf(prep({ equipped: false, favourable: true }))).toBe('fair');
    expect(gradeOf(prep({ equipped: false, favourable: false }))).toBe('clumsy');
  });

  /**
   * **No clock, and this is the guard that keeps it that way.**
   *
   * The grade used to come from three beats on a timing track. Everything this module now exports
   * is a pure function of a plain object, which is what makes the whole layer testable without
   * simulating time -- and what makes it impossible to reintroduce a reflex test without changing
   * a signature somebody has to look at.
   */
  it('is a pure function of what the player brought', () => {
    const p = prep({ equipped: true, favourable: true });
    expect(gradeOf(p)).toBe(gradeOf({ ...p }));
  });
});

describe('what can be attempted', () => {
  it('refuses a stalk when the animal is only sign, and says why', () => {
    const why = blockedReason('stalk', 'resting', 'Beedu manta');
    expect(why).toBeTruthy();
    // The reason is the teaching: it has to send the player back at a better hour.
    expect(why).toMatch(/not here/i);

    expect(blockedReason('stalk', 'feeding', 'Beedu manta')).toBeNull();
  });

  it('never blocks ground or plants, whatever the hour', () => {
    for (const routine of ['resting', 'sheltering', 'feeding'] as const) {
      expect(blockedReason('stoop', routine, null)).toBeNull();
      expect(blockedReason('work', routine, null)).toBeNull();
    }
  });
});

describe('what you leave with', () => {
  const promised: Taking[] = [{ material: material(), count: 1 }];

  /**
   * **The floor. This is the most important test in the file.**
   *
   * "Gathering never gives nothing" is a design ruling with a named guard in `nodes.test.ts`, and
   * grading an act is exactly the change that would undo it by accident -- an unprepared traveller
   * reads so naturally as an empty hand that somebody will eventually write it that way.
   *
   * So this asserts the property on the *worst possible preparation*: nothing carried, nothing in
   * your favour, for every gesture. The player still leaves with what the tile promised before any
   * of this existed.
   */
  it('never gives less than the plain click did, however unprepared', () => {
    for (const gesture of TAKING_GESTURES) {
      const grade = gradeOf(prep({ wants: GESTURE_WANTS[gesture] }));
      expect(grade).toBe('clumsy');

      const got = settle(grade, promised);
      expect(got, `${gesture} lost the player a material`).toHaveLength(promised.length);
      for (let i = 0; i < got.length; i += 1) {
        expect(
          got[i]!.count,
          `${gesture} handed back less than the tile promised`
        ).toBeGreaterThanOrEqual(promised[i]!.count);
      }
    }
  });

  it('pays a prepared traveller more than an unprepared one', () => {
    expect(settle('clean', promised)[0]!.count).toBeGreaterThan(
      settle('clumsy', promised)[0]!.count
    );
    // The middle case is the old behaviour, not a half-measure: only a clean act pays extra.
    expect(settle('fair', promised)[0]!.count).toBe(settle('clumsy', promised)[0]!.count);
  });

  it('does not mutate what it was promised', () => {
    settle('clean', promised);
    expect(promised[0]!.count, 'settle wrote through to the caller’s array').toBe(1);
  });

  it('carries an empty promise through without inventing anything', () => {
    expect(settle('clean', [])).toEqual([]);
  });
});

describe('what the journal is told', () => {
  it('writes a distinct line per gesture and grade, and never says failure', () => {
    const seen = new Set<string>();
    for (const gesture of ALL_GESTURES) {
      for (const grade of ['clean', 'fair', 'clumsy'] as const) {
        const line = attemptLine(gesture, grade, gesture === 'rest' ? null : material());
        expect(line.length, 'an empty line reached the journal').toBeGreaterThan(10);
        // A clumsy act is the *old* behaviour, not a loss. If this vocabulary ever appears the
        // ruling has been reversed in prose even if the numbers still hold.
        expect(line, 'a clumsy act was written up as a failure').not.toMatch(
          /\bfail|nothing|empty[- ]handed|lost it\b/i
        );
        seen.add(line);
      }
    }
    expect(seen.size, 'two gestures share a line').toBe(ALL_GESTURES.length * 3);
  });

  it('says what the gesture is before it is played', () => {
    for (const gesture of ALL_GESTURES) {
      expect(gestureLine(gesture, 'Reed fibre').length).toBeGreaterThan(20);
    }
  });

  /**
   * **No line may promise a rhythm, a beat or a moment to hit.**
   *
   * The prose outlived the mechanic once already: three `rest` lines sat unreachable for months
   * because the caller had no material to pass. This is the reverse hazard -- a sentence that
   * still describes a timing track nobody can play. "Cut with the rhythm, not against it" was
   * exactly that, and this is what caught it.
   */
  it('never tells the player to press in time with anything', () => {
    for (const gesture of ALL_GESTURES) {
      expect(gestureLine(gesture, 'Reed fibre')).not.toMatch(/\brhythm|beat|time it|press\b/i);
    }
  });
});
