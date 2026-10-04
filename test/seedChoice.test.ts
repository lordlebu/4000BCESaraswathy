// Which seed a visit starts on (`ui/seed.ts`, `chooseSeed`).
//
// **The owner's ruling, 4 October 2026: whoever starts the game starts on a random seed.** Every
// player used to begin on `jambhudweepa-evening`, so every first walk was the same map. A link still
// carries its world, the suites still measure the one fixed world, and coming back finds the walk
// left off, because the save is keyed by seed.

import { describe, expect, it } from 'vitest';
import { DEFAULT_SEED, chooseSeed } from '../src/ui/seed';

const fixed = () => 0.42;

describe('the seed a visit starts on', () => {
  it('is a fresh random one for somebody who has never been here', () => {
    const seed = chooseSeed({ query: null, automated: false, last: null, random: fixed });
    expect(seed).toMatch(/^[a-z]+-[a-z]+-\d{1,2}$/);
    expect(seed).not.toBe(DEFAULT_SEED);
    const other = chooseSeed({ query: null, automated: false, last: null, random: () => 0.91 });
    expect(other).not.toBe(seed);
  });

  it('is the one this browser last walked, so coming back finds the walk', () => {
    expect(chooseSeed({ query: null, automated: false, last: 'saffron-kiln-17', random: fixed })).toBe('saffron-kiln-17');
  });

  it('is the one a link carries, before anything else', () => {
    expect(chooseSeed({ query: 'shared-world', automated: false, last: 'saffron-kiln-17', random: fixed })).toBe('shared-world');
    expect(chooseSeed({ query: 'shared-world', automated: true, last: null, random: fixed })).toBe('shared-world');
  });

  it('is the fixed world under automation, which every suite measures', () => {
    expect(chooseSeed({ query: null, automated: true, last: 'saffron-kiln-17', random: fixed })).toBe(DEFAULT_SEED);
  });
});
