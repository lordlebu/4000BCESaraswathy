// What a camp is drawn from: each kind's own props, the owner's art of 1 October 2026.
//
// Built by `tools/build-camps.py` from the owner's prop sheets into `assets/camps/<kind>-<n>.png`,
// numbered left to right as the sheet painted them. Which piece is which differs by kind -- the
// drovers' first piece is the thorn fold, which lies on the ground under everything else -- so the
// layout is stated here once rather than guessed from sizes.
//
// **The old camp art is kept, and used.** Every camp is still built round the travel-node fire ring
// it was drawn with before, and the old yurt stands in for the kind's own shelter in about one camp
// in three, so two camps of one kind do not look alike. When a camp strikes, its ring is left cold
// on the ground for a few days. The owner's direction, 2 October 2026: keep the generic camp art.

import type { CampKind } from '../content/encampments';

const urls = import.meta.glob<string>('../../assets/camps/*.png', { eager: true, query: '?url', import: 'default' });

/** Texture key for one piece. */
export const campKey = (kind: CampKind, n: number): string => `camp-${kind}-${n}`;

/** Every piece, for the scene to load: texture key and url. */
export function campPieces(): { key: string; url: string }[] {
  return Object.entries(urls).map(([path, url]) => {
    const name = path.split('/').pop()!.replace(/\.png$/, '');
    return { key: `camp-${name}`, url };
  });
}

export interface CampLayout {
  /** The kind's own shelter: the piece the old yurt sometimes stands in for. */
  shelter: number;
  /** Things set about the fire. */
  extras: number[];
  /** A piece that lies on the ground under the rest, when the kind has one. */
  ground: number | null;
}

export const CAMP_LAYOUT: Readonly<Record<CampKind, CampLayout>> = {
  adventurers: { shelter: 1, extras: [2, 3], ground: null }, // lean-to; packs, a hide rack
  dacoits: { shelter: 1, extras: [2, 3], ground: null }, // hide shelter; salt sacks, a tethering post
  pilgrims: { shelter: 1, extras: [2, 3], ground: null }, // cloth shelter; a pole of strips, a cairn and lamp
  drovers: { shelter: 2, extras: [3], ground: 1 } // felt tent; a rack of skins; the thorn fold underneath
};

/** About one camp in three is pitched round the old yurt instead of the kind's own shelter. */
export const YURT_ONE_IN = 3;

/** How many days a struck camp's cold ring stays on the ground. */
export const ASHES_DAYS = 3;

/**
 * Ground a way in crosses as footprints rather than a worn strip: churned mud, prints in snow and sand.
 * Everything else -- grass, hills, the lanes -- is worn into a thin line. See `drawTrodden`.
 */
export const PRINTED_GROUND: ReadonlySet<string> = new Set(['wetland', 'coast', 'snow', 'desert']);

/**
 * Ground a way crosses that would otherwise stop you, or nearly: water, a sea crossing, mountain,
 * lava, open sky. Nobody wears a path into a river. The way is still shown there -- the owner's
 * ruling -- as the same thin line in a neutral pale colour and barely there, so it reads as "the way
 * goes on across" rather than as something drawn on the water.
 */
export const CROSSED_GROUND: ReadonlySet<string> = new Set([
  'river',
  'sea',
  'mountains',
  'lava_field',
  'sky_water',
  'open_sky',
  'sky_underside',
  'underworld'
]);

/** The one colour a way is shown in over `CROSSED_GROUND`, whatever the ground is. */
export const CROSSED_COLOUR = 0xe8e0d0;

/**
 * The colour a way is worn into a tile, from the colour of the tile itself.
 *
 * **Coloured by the ground, not painted on it** -- the owner's note on the first cut, a brown line
 * that sat on top of grass and snow alike. The scene passes the painted tile's own average colour
 * (`groundColourAt`), not `data/biomes.json`'s: that colour is the flat placeholder the art replaced,
 * and a way tinted from it was green on yellow grass and vanished on the swamp. Worn ground is the same ground, packed down: darker and a
 * little duller. Prints in mud or snow go deeper than a strip worn through grass, which is meant to
 * be barely there.
 */
export function troddenColour(ground: string | number, printed: boolean): number {
  const n = typeof ground === 'number' ? ground : Number.parseInt(ground.replace('#', ''), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  // Darker, and pulled a little toward its own grey so it reads as packed rather than shaded.
  const keep = printed ? 0.55 : 0.78;
  const grey = (r + g + b) / 3;
  const shade = (c: number) => Math.round((c * 0.85 + grey * 0.15) * keep);
  return (shade(r) << 16) | (shade(g) << 8) | shade(b);
}
