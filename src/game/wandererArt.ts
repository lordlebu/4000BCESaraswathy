// The painted animals, and the door they come in through.
//
// **A folder rather than a list, so art lands without a code change.** Every other sheet in this
// game is a named import wired into `loadTileSheets`, which is right for the terrain atlas -- it is
// one file whose frames are a contract. An overworld animal is not: it is one still picture per
// species, and the person drawing it should be able to drop a PNG in and see it in the game.
//
// So `assets/wanderers/<engine id>.png` is the whole convention. `narmada-walking-whale.png`, named
// after the species id the bundle already uses -- the same rule `src/ui/plates/` keeps, and for the
// same reason: a name that has to be registered somewhere is a name that will be registered wrong.
//
// Until a file exists, `wandererMarkerKey` draws a stand-in. That is deliberate and it is what let
// the whale ship before it was painted: the quest, the circuit and the browser check are all real
// while the picture is provisional, and the day the painting arrives nothing but the picture
// changes. `hasPaintedArt` is what the two halves agree on.

/**
 * Every painted wanderer, keyed by species id.
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

const byId = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  const file = path.split('/').pop() ?? '';
  const name = file.replace(/\.[^.]+$/, '');
  byId.set(name, url);
}

/** The URL of the painting for this species, or null while it is still a stand-in. */
export function paintedWanderer(speciesId: string): string | null {
  return byId.get(speciesId) ?? null;
}

/** The texture key a painted wanderer is loaded under. Distinct from the stand-in's key. */
export function paintedKey(speciesId: string): string {
  return `wanderer-art:${speciesId}`;
}

/**
 * Queue the paintings this map needs.
 *
 * Called from `preload`, because Phaser cannot load a texture during `create` and have it ready in
 * the same frame. A species with no painting queues nothing and falls through to the stand-in.
 */
export function loadWandererArt(scene: Phaser.Scene, speciesIds: readonly string[]): void {
  for (const id of speciesIds) {
    const url = paintedWanderer(id);
    if (!url) continue;
    const key = paintedKey(id);
    if (scene.textures.exists(key)) continue;
    scene.load.image(key, url);
  }
}

/** Every species that has a painting today. Used by `preload`, which runs before the map is known. */
export function paintedWandererIds(): string[] {
  return [...byId.keys()];
}
