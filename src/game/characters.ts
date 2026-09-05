// Who can be walked.
//
// **Deliberately free of Phaser**, unlike the rest of `game/`. This is a list of five people and a
// lookup, and putting it beside `player.ts` made it untestable: importing that file pulls in
// Phaser, which reaches for a real 2D canvas context on load and so runs under neither Node nor
// jsdom. The rule the project already keeps for `world/` and `content/` -- import neither React nor
// Phaser, so the tests exercise the code the game ships -- is worth keeping here for the same
// reason, because the interesting part is what happens when the id is nonsense.
//
// The sheets are imported rather than named as strings so the bundler fingerprints them, emits
// them, and fails the build if one is missing. A string path would go wrong silently at runtime,
// which is exactly how Mithra's sheet shipped unloaded for a month.

import varunaUrl from '../../assets/varuna-overworld.png';
import guyukUrl from '../../assets/guyuk-overworld.png';
import mithraUrl from '../../assets/mithra-overworld.png';
import malaciteUrl from '../../assets/malacite-overworld.png';
import mehtarUrl from '../../assets/mehtar-overworld.png';

export interface CharacterArt {
  /** Texture key, also the prefix for its animation keys. */
  key: string;
  /** Human name, for the journal and for debugging. */
  name: string;
  /** The built sheet, imported so the bundler fingerprints it and emits it. */
  url: string;
}

/**
 * Everybody who can be walked, in the order they are offered.
 *
 * **The URL belongs here, not in the scene.** It used to be a lone `import varunaUrl` in
 * `WorldScene.ts`, which is how the scene came to name `CHARACTERS.varuna` in four places -- and
 * why Mithra's sheet shipped for a month with nothing able to load it. The map said there were two
 * characters and the import said there was one.
 *
 * Kept in step with `tools/characters.json` by hand: that manifest builds the art and this loads
 * it, and neither knows about the other. `test/characters.test.ts` guards the join.
 */
export const CHARACTERS = {
  varuna: { key: 'varuna', name: 'Varuna', url: varunaUrl },
  guyuk: { key: 'guyuk', name: 'Guyuk', url: guyukUrl },
  mithra: { key: 'mithra', name: 'Mithra', url: mithraUrl },
  malacite: { key: 'malacite', name: 'Malacite', url: malaciteUrl },
  mehtar: { key: 'mehtar', name: 'Mehtar', url: mehtarUrl }
} as const satisfies Record<string, CharacterArt>;

export type CharacterId = keyof typeof CHARACTERS;

/** Every character, in the order they are offered. */
export function everyCharacter(): CharacterArt[] {
  return Object.values(CHARACTERS);
}

/**
 * The character an id names, or Varuna.
 *
 * **Never throws.** The id arrives from `?as=` or from a save, so it can be stale, mistyped, or
 * name somebody since retired; a bad one should hand you Varuna and a working game rather than a
 * blank page. Same rule `fieldMapFromUrl` follows for `?map=`.
 *
 * `Object.hasOwn` rather than a bare index, because a plain object also answers `toString` and
 * `constructor` -- and this id comes out of parsed JSON, so `?as=constructor` would otherwise
 * return a function where a character is expected.
 */
export function characterFor(id: string | null | undefined): CharacterArt {
  if (id && Object.hasOwn(CHARACTERS, id)) {
    return (CHARACTERS as Record<string, CharacterArt>)[id]!;
  }
  return CHARACTERS.varuna;
}
