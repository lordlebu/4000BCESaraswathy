// Playing a gesture out, and the one property that must survive every future tuning pass.
//
// What these guard, in order of how expensive the fault would be:
//
//   * a minigame can never leave a player worse off than the click it replaced -- this is the
//     "gathering never gives nothing" ruling, and putting a skill test in front of a material is
//     precisely the change that would quietly undo it;
//   * the three gestures are keyed off `won_from` and nothing else, so a beedu manta is stalked
//     and a reed is stooped over;
//   * an animal that is not there cannot be followed, with a reason a player can act on.

import { describe, expect, it } from 'vitest';
import {
  BEATS,
  begin,
  press,
  timeout,
  isOver,
  gradeOf,
  settle,
  attemptLine
} from '../src/content/activity';
import {
  gestureFor,
  difficultyOf,
  blockedReason,
  gestureLine,
  DIFFICULTY_BY_RARITY
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

const isAnimal = (id: string) => id.startsWith('beast-');
const roll = (salt: string) => salt.length * 137;

describe('which gesture a material asks for', () => {
  it('reads won_from and nothing else', () => {
    expect(gestureFor(material({ wonFrom: ['river-reed'] }), isAnimal)).toBe('stoop');
    expect(gestureFor(material({ wonFrom: ['beast-manta'] }), isAnimal)).toBe('stalk');
    expect(gestureFor(material({ wonFrom: [] }), isAnimal)).toBe('work');
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
    expect(gestureFor(both, isAnimal)).toBe('stalk');
  });
});

describe('how hard an attempt is', () => {
  it('rises with rarity', () => {
    const c = difficultyOf(material({ rarity: 'common' }), 'stoop', null);
    const r = difficultyOf(material({ rarity: 'rare' }), 'stoop', null);
    const m = difficultyOf(material({ rarity: 'mythic' }), 'stoop', null);
    expect(r).toBeGreaterThan(c);
    expect(m).toBeGreaterThan(r);
  });

  it('adds the animal’s alertness, but only when stalking', () => {
    const m = material({ rarity: 'common', wonFrom: ['beast-manta'] });
    const feeding = difficultyOf(m, 'stalk', 'feeding');
    const hunting = difficultyOf(m, 'stalk', 'hunting');
    expect(hunting).toBeGreaterThan(feeding);

    // A routine has no business changing how hard a rock is.
    expect(difficultyOf(m, 'work', 'hunting')).toBe(DIFFICULTY_BY_RARITY.common);
  });

  it('never leaves [0, 1], whatever is added', () => {
    const d = difficultyOf(material({ rarity: 'mythic' }), 'stalk', 'calling');
    expect(d).toBeLessThanOrEqual(1);
    expect(d).toBeGreaterThanOrEqual(0);
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

describe('playing a run', () => {
  it('is over after exactly BEATS presses, and ignores more', () => {
    let a = begin('stoop', 0.3, roll);
    expect(isOver(a)).toBe(false);
    for (let i = 0; i < BEATS; i += 1) a = press(a, a.bands[i]!);
    expect(isOver(a)).toBe(true);
    expect(a.beats).toHaveLength(BEATS);

    const after = press(a, 0.5);
    expect(after.beats, 'a press after the run changed it').toHaveLength(BEATS);
  });

  it('grades a perfect, a partial and an empty run', () => {
    let clean = begin('stoop', 0.3, roll);
    for (let i = 0; i < BEATS; i += 1) clean = press(clean, clean.bands[i]!);
    expect(gradeOf(clean)).toBe('clean');

    let none = begin('stoop', 0.3, roll);
    for (let i = 0; i < BEATS; i += 1) none = timeout(none);
    expect(gradeOf(none)).toBe('clumsy');

    let some = begin('stoop', 0.3, roll);
    some = press(some, some.bands[0]!);
    some = timeout(some);
    some = timeout(some);
    expect(gradeOf(some)).toBe('fair');
  });

  it('deals a band that fits on the track', () => {
    for (const difficulty of [0, 0.5, 1]) {
      const a = begin('work', difficulty, roll);
      for (const band of a.bands) {
        expect(band).toBeGreaterThanOrEqual(0);
        expect(band + a.width, 'a band runs off the end of the track').toBeLessThanOrEqual(1);
      }
    }
  });

  it('is harder to hit when it is harder', () => {
    expect(begin('stoop', 1, roll).width).toBeLessThan(begin('stoop', 0, roll).width);
  });
});

describe('what you leave with', () => {
  const promised: Taking[] = [{ material: material(), count: 1 }];

  /**
   * **The floor. This is the most important test in the file.**
   *
   * "Gathering never gives nothing" is a design ruling with a named guard in `nodes.test.ts`,
   * and a minigame is exactly the change that would undo it by accident -- a missed beat reads
   * so naturally as an empty hand that somebody will eventually write it that way.
   *
   * So this asserts the property on the *worst possible run*: every beat missed, at the hardest
   * difficulty, for every gesture. The player still leaves with what the tile promised before
   * any of this existed.
   */
  it('never gives less than the plain click did, however badly it goes', () => {
    for (const gesture of ['stoop', 'stalk', 'work'] as const) {
      let a = begin(gesture, 1, roll);
      for (let i = 0; i < BEATS; i += 1) a = timeout(a);
      expect(gradeOf(a)).toBe('clumsy');

      const got = settle(a, promised);
      expect(got, `${gesture} lost the player a material`).toHaveLength(promised.length);
      for (let i = 0; i < got.length; i += 1) {
        expect(
          got[i]!.count,
          `${gesture} handed back less than the tile promised`
        ).toBeGreaterThanOrEqual(promised[i]!.count);
      }
    }
  });

  it('pays a clean run more than a clumsy one', () => {
    let clean = begin('stoop', 0.3, roll);
    for (let i = 0; i < BEATS; i += 1) clean = press(clean, clean.bands[i]!);

    let clumsy = begin('stoop', 0.3, roll);
    for (let i = 0; i < BEATS; i += 1) clumsy = timeout(clumsy);

    expect(settle(clean, promised)[0]!.count).toBeGreaterThan(settle(clumsy, promised)[0]!.count);
  });

  it('does not mutate what it was promised', () => {
    let a = begin('stoop', 0.3, roll);
    for (let i = 0; i < BEATS; i += 1) a = press(a, a.bands[i]!);
    settle(a, promised);
    expect(promised[0]!.count, 'settle wrote through to the caller’s array').toBe(1);
  });

  it('carries an empty promise through without inventing anything', () => {
    let a = begin('stoop', 0, roll);
    for (let i = 0; i < BEATS; i += 1) a = press(a, a.bands[i]!);
    expect(settle(a, [])).toEqual([]);
  });
});

describe('what the journal is told', () => {
  it('writes a distinct line per gesture and grade, and never says failure', () => {
    const seen = new Set<string>();
    for (const gesture of ['stoop', 'stalk', 'work'] as const) {
      for (const grade of ['clean', 'fair', 'clumsy'] as const) {
        const line = attemptLine(gesture, grade, material());
        expect(line.length, 'an empty line reached the journal').toBeGreaterThan(10);
        // A clumsy run is the *old* behaviour, not a loss. If this vocabulary ever appears the
        // ruling has been reversed in prose even if the numbers still hold.
        expect(line, 'a clumsy run was written up as a failure').not.toMatch(
          /\bfail|nothing|empty[- ]handed|lost it\b/i
        );
        seen.add(line);
      }
    }
    expect(seen.size, 'two gestures share a line').toBe(9);
  });

  it('says what the gesture is before it is played', () => {
    for (const gesture of ['stoop', 'stalk', 'work'] as const) {
      expect(gestureLine(gesture, 'Reed fibre').length).toBeGreaterThan(20);
    }
  });
});
