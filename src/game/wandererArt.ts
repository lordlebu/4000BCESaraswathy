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
// All four facings are required for a species to appear on the map.
import type { Facing } from './player';

export type { Facing };

/**
 * Every painted wanderer, keyed `<id>-<facing>`.
 *
 * Vite resolves the URLs at build time. The scene preloads the species that live on its map.
 */
const files = import.meta.glob<string>('../../assets/wanderers/*.{png,webp}', {
  eager: true,
  query: '?url&no-inline',
  import: 'default'
});

const byName = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const file = path.split('/').pop() ?? '';
  byName.set(file.replace(/\.[^.]+$/, ''), url);
}

export function facingArt(speciesId: string, facing: Facing): string | null {
  return byName.get(`${speciesId}-${facing}`) ?? null;
}

/** The texture key one facing is loaded under. */
export function paintedKey(speciesId: string, facing: Facing): string {
  return `wanderer-art:${speciesId}:${facing}`;
}

/**
 * The steps of a walk, for a facing that was painted as one: the still view first, then
 * `<id>-<facing>-walk1`, `-walk2`... Empty when only a still was painted, which is every animal so
 * far -- the Sinauli wagon's sheet of 4 October 2026 is the first that walks.
 */
export function walkArt(speciesId: string, facing: Facing): string[] {
  const still = byName.get(`${speciesId}-${facing}`);
  if (!still) return [];
  const steps: string[] = [];
  for (let n = 1; byName.has(`${speciesId}-${facing}-walk${n}`); n += 1) steps.push(byName.get(`${speciesId}-${facing}-walk${n}`)!);
  return steps.length > 0 ? [still, ...steps] : [];
}

/** The texture key one step of a walk is loaded under. Step 0 is the still, under `paintedKey`. */
export function walkKey(speciesId: string, facing: Facing, step: number): string {
  return step === 0 ? paintedKey(speciesId, facing) : `${paintedKey(speciesId, facing)}:${step}`;
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
      if (!url) throw new Error(`Missing artwork for ${id} facing ${facing}`);
      const key = paintedKey(id, facing);
      if (!scene.textures.exists(key)) scene.load.image(key, url);
      // And the steps of its walk, when it was painted walking.
      walkArt(id, facing).forEach((step, n) => {
        const stepKey = walkKey(id, facing, n);
        if (n > 0 && !scene.textures.exists(stepKey)) scene.load.image(stepKey, step);
      });
    }
  }
}
