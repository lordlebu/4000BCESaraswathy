// The painted animals, and the door they come in through.
//
// **A folder rather than a list, so art lands without a code change.** Every other sheet in this
// game is a named import wired into `loadTileSheets`, which is right for the terrain atlas -- it is
// one file whose frames are a contract. An overworld animal is not: it is a handful of still
// pictures, and the person drawing them should be able to drop PNGs in and see them in the game.
//
// So `assets/wanderers/<engine id>-<facing>.png` is the whole convention --
// `sivatherium-right.png`, named after the species id the bundle already uses, the same rule
// `src/ui/plates/` keeps and for the same reason: a name that has to be registered somewhere is a
// name that will be registered wrong.
//
// **Four facings, and a species may ship fewer.** `tools/build-wanderers.js` cuts right, left,
// down and up out of one sheet, but `facingArt` falls back along a chain -- an animal with only a
// right view is drawn facing right whichever way it is walking, which is better than not drawn.
// A bare `<id>.png` with no facing suffix still works and answers for every direction, because
// that was the convention before the sheets arrived and breaking it would strand anything painted
// to it.
//
// Until a file exists, `wandererMarkerKey` draws a stand-in. That is what let the whale ship before
// it was painted: the quest, the circuit and the browser check were all real while the picture was
// provisional, and the day the painting arrived nothing but the picture changed.

// Which way an animal is drawn is the same question as which way a person is drawn, so it is the
// same type -- `player.ts` already owns `Facing` and a second identical union here would be a
// second thing to keep in step.
import type { Facing } from './player';

export type { Facing };

/**
 * Every painted wanderer, keyed `<id>` or `<id>-<facing>`.
 *
 * `eager` for the reason `src/ui/art.ts` gives: the scene decides during `create` whether to draw a
 * painting or the stand-in, and a promise cannot be answered then. Vite resolves the URL at build
 * time and fetches the bytes only if the texture is actually loaded.
 */
const files = import.meta.glob<string>('../../assets/wanderers/*.{png,webp}', {
  eager: true,
  query: '?url',
  import: 'default'
});

const byName = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const file = path.split('/').pop() ?? '';
  byName.set(file.replace(/\.[^.]+$/, ''), url);
}

/**
 * What to draw this animal with, facing this way, or null while it is still a stand-in.
 *
 * **Falls back rather than failing.** Down and up borrow the side view before they borrow nothing,
 * and left borrows right -- a four-legged animal seen from behind at 80 pixels is not so different
 * from one seen from the side, and an animal drawn the wrong way round is still an animal met. The
 * order is deliberate: the nearest view first, then the side, then the species' single unfacinged
 * file if it has one.
 */
export function facingArt(speciesId: string, facing: Facing): string | null {
  const chain: string[] =
    facing === 'left'
      ? [`${speciesId}-left`, `${speciesId}-right`]
      : facing === 'right'
        ? [`${speciesId}-right`, `${speciesId}-left`]
        : [`${speciesId}-${facing}`, `${speciesId}-right`, `${speciesId}-left`];
  for (const name of [...chain, speciesId]) {
    const url = byName.get(name);
    if (url) return url;
  }
  return null;
}

/** Whether this species has any painting at all. What the scene asks before reaching for a mark. */
export function hasPaintedArt(speciesId: string): boolean {
  return facingArt(speciesId, 'right') !== null;
}

/** The texture key one facing is loaded under. Distinct from the stand-in's key. */
export function paintedKey(speciesId: string, facing: Facing): string {
  return `wanderer-art:${speciesId}:${facing}`;
}

/**
 * Queue every painting this species has.
 *
 * Called from `preload`, because Phaser cannot load a texture during `create` and have it ready in
 * the same frame. A facing that falls back to another file is loaded under its own key pointing at
 * the same URL, so the scene never has to know which views were actually drawn.
 */
export function loadWandererArt(scene: Phaser.Scene, speciesIds: readonly string[]): void {
  for (const id of speciesIds) {
    for (const facing of ['right', 'left', 'down', 'up'] as const) {
      const url = facingArt(id, facing);
      if (!url) continue;
      const key = paintedKey(id, facing);
      if (scene.textures.exists(key)) continue;
      scene.load.image(key, url);
    }
  }
}

/**
 * Every species that has a painting today. Used by `preload`, which runs before the map is known.
 *
 * Derived from the filenames rather than from a list, so a species is loadable the moment its art
 * is on disk -- which is the whole point of the folder being the interface.
 */
export function paintedWandererIds(): string[] {
  const ids = new Set<string>();
  for (const name of byName.keys()) {
    ids.add(name.replace(/-(right|left|down|up)$/, ''));
  }
  return [...ids];
}
