// Who can be walked, and what happens when the answer is nonsense.
//
// The scene names one character in four places until it is told otherwise, and the id it is told
// arrives from a URL or a save -- so both can be stale, mistyped, or name somebody who has since
// been retired. None of those may throw: a bad `?as=` should hand you Varuna and a working game,
// not a blank page.
//
// Runs under Node, which is only possible because characters.ts imports no Phaser. What it
// cannot see is whether the sheet actually loads, which is `e2e/travellers.spec.ts`.

import { describe, expect, it } from 'vitest';
import { CHARACTERS, characterFor, everyCharacter } from '../src/game/characters';

describe('the cast', () => {
  it('holds every traveller the build makes a sheet for', () => {
    // Kept in step with `tools/characters.json` by hand, which is the join this test guards: the
    // manifest builds the art and this map loads it, and neither knows about the other.
    expect(everyCharacter().map((c) => c.key)).toEqual([
      'varuna',
      'guyuk',
      'mithra',
      'malacite',
      'mehtar'
    ]);
  });

  it('gives each one a name worth printing', () => {
    for (const art of everyCharacter()) {
      expect(art.name, art.key).toMatch(/^[A-Z]/);
      expect(art.name).not.toBe(art.key);
    }
  });

  it('gives each one a distinct texture key', () => {
    const keys = everyCharacter().map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('points each one at its own sheet', () => {
    // Two characters sharing a URL would draw the same person under two names, which is the sort
    // of copy-paste slip that looks right in a diff.
    const urls = everyCharacter().map((c) => c.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('names the map key the same as the texture key', () => {
    // `characterFor` looks up by the map key and the scene draws with `art.key`; if they differed
    // a lookup would succeed and then draw somebody else.
    for (const [id, art] of Object.entries(CHARACTERS)) expect(art.key).toBe(id);
  });
});

describe('characterFor', () => {
  it('finds somebody real', () => {
    expect(characterFor('guyuk').name).toBe('Guyuk');
  });

  it('falls back to Varuna rather than throwing', () => {
    // The whole point. This arrives from `?as=` and from a save, and neither is trustworthy.
    expect(characterFor('nobody').key).toBe('varuna');
    expect(characterFor('').key).toBe('varuna');
    expect(characterFor(null).key).toBe('varuna');
    expect(characterFor(undefined).key).toBe('varuna');
  });

  it('is not fooled by an inherited property', () => {
    // A plain object lookup answers `toString` and `constructor` too, and a save is parsed JSON:
    // `?as=constructor` must not return a function where a character is expected.
    expect(characterFor('toString').key).toBe('varuna');
    expect(characterFor('constructor').key).toBe('varuna');
    expect(characterFor('__proto__').key).toBe('varuna');
  });
});
