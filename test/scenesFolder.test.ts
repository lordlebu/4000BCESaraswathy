// What is allowed to sit in src/ui/scenes/.
//
// **The folder is a build output, and it is now being added to by hand.** `src/ui/scenes.ts` globs
// it, so whatever lands here ships — and both halves of that have already gone wrong once each in
// the plates folder, which is why its own guard exists:
//
//   * A **raw** straight from an image model is 1–2 MB rather than ~130 KB, and truecolour rather
//     than palettised. It renders perfectly. Nothing tells you. The download just grows.
//     `stoop-high.png` (then `stoop-mountains.png`) arrived that way at 1.7 MB and came out of the builder at 129 KB.
//   * A file named after something no gesture asks for matches nothing, throws nothing, and quietly
//     keeps drawing the fallback. That has happened three times across the art folders.
//
// Neither failure is visible in the game, in a type, or in a lint. This is the only thing that can
// see them, so it is worth the twenty lines — and it is worth more now than when the art was coming
// through one pipeline, because a person dropping a file straight in is exactly the case it catches.

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import biomes from '../data/biomes.json';
import { GROUND_GROUP, NIGHT_MOMENTS, sceneNames } from '../src/ui/scenes';
import { SHELTER_ORDER } from '../src/game/night';

const SCENES = join(__dirname, '..', 'src', 'ui', 'scenes');

/**
 * The ceiling for a built scene, in kilobytes.
 *
 * The set sits between 101 and 162 at 512×384, and the builder picks whichever of indexed or
 * truecolour came out smaller, so there is no encoding that should double it. 300 is comfortably
 * clear of a real scene and nowhere near a raw — this is a "something is wrong" bound, not a budget
 * to optimise against.
 */
const MAX_KB = 300;

/** What the builder emits. A scene that is not this shape did not come through it. */
const WIDTH = 512;
const HEIGHT = 384;

/** The gestures a scene can be of. `rest` is the fourth that no material asks for. */
const GESTURES = ['stoop', 'stalk', 'work', 'fish', 'rest'];

/**
 * What a `rest-` variant may narrow by: the kinds of night `night.ts` ranks, read from it rather
 * than copied -- the copy here missed `dugout` the day a night afloat was painted.
 */
const SHELTERS: readonly string[] = SHELTER_ORDER;

/** What any gesture may narrow by: canon's process words, and the ground under foot. */
const PROCESSES = [
  'knapping', 'smelting', 'grinding', 'casting', 'pressing', 'carving', 'weaving', 'spinning',
  'retting', 'tanning', 'boatbuilding', 'purifying', 'firing', 'cooking', 'brewing', 'drying',
  'gathering'
];
const BIOMES = (biomes as { id: string }[]).map((b) => b.id);
/** Groups of ground that share a painting -- `stoop-high` for every climbing biome. */
const GROUPS = [...new Set(Object.values(GROUND_GROUP))];
/**
 * What following an animal asks for: `stalk-follow`, the act with no animal in it, which
 * `ActivityModal` draws with the animal's plate inset. Asked by name there, not by `sceneFor`.
 */
const ACTS = ['follow'];
/** A night at a moment: `none-midnight`, `camp-dawn`. Only `rest` asks for these. */
const NIGHTS = SHELTERS.flatMap((s) => NIGHT_MOMENTS.map((m) => `${s}-${m}`));
/**
 * A night painted for its ground: `bedroll-snow-midnight`, `bedroll-high-dawn`. Asked of `sceneNames`
 * itself, over every shelter, moment and biome, so the guard knows exactly the names a night looks
 * up and no more.
 */
const GROUND_NIGHTS = new Set(
  SHELTERS.flatMap((shelter) =>
    [undefined, ...NIGHT_MOMENTS].flatMap((moment) =>
      BIOMES.flatMap((ground) => sceneNames('rest', shelter, moment, ground).map((n) => n.replace(/^rest-/, '')))
    )
  )
);

const files = readdirSync(SCENES).filter((f) => /\.(png|webp|jpe?g)$/i.test(f));

/** Read a PNG's width, height and colour type without decoding it. */
function header(file: string) {
  const buf = readFileSync(join(SCENES, file));
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    colourType: buf[25]
  };
}

describe('src/ui/scenes holds built scenes and nothing else', () => {
  it('has scenes at all, so the checks below mean something', () => {
    // Guards the guard. An empty folder makes every `each` below vacuous, and the failure would
    // read as "all clear" rather than as a missing folder.
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s is named after something a gesture asks for', (file) => {
    // A trailing `.<digits>` is a take number, not part of the name: `rest-roof.2.png` is a second
    // painting of the same night and `art.ts` picks between the takes on a seeded hash. Strip it
    // before parsing, or the variant reads as `roof.2` and a legal file fails as an unknown
    // shelter kind. Three places have to know about takes -- the loader, the builder's `idFor`
    // and this guard -- and for a while only the loader did.
    const name = file.replace(/\.[^.]+$/, '').replace(/\.\d+$/, '');
    const [gesture, ...rest] = name.split('-');
    const variant = rest.join('-');
    expect(
      GESTURES.includes(gesture!),
      `\`${gesture}\` is not a gesture, so nothing will ever look this up. ` +
        `Scenes are named <gesture> or <gesture>-<variant>.`
    ).toBe(true);
    if (variant) {
      expect(
        [...SHELTERS, ...NIGHTS, ...PROCESSES, ...BIOMES, ...GROUPS, ...ACTS].includes(variant) ||
          (gesture === 'rest' && GROUND_NIGHTS.has(variant)),
        `\`${variant}\` is not a shelter kind, a canon process, a biome or a ground group, so ` +
          `sceneFor('${gesture}', …) will never ask for it and this file will never draw.`
      ).toBe(true);
    }
  });

  it.each(files)('%s is a built scene, not a raw', (file) => {
    const kb = statSync(join(SCENES, file)).size / 1024;
    expect(
      kb,
      `${Math.round(kb)} KB. A built scene is around 130; a raw from an image model is thousands. ` +
        `Drop it in assets/source/scenes/ and run \`node tools/build-plates.js --scenes\` instead ` +
        `of copying it here.`
    ).toBeLessThan(MAX_KB);
  });

  it.each(files)('%s came out of the builder, at the builder’s size', (file) => {
    const { width, height, colourType } = header(file);
    expect({ width, height }, `${width}x${height}. The builder emits ${WIDTH}x${HEIGHT}.`).toEqual({
      width: WIDTH,
      height: HEIGHT
    });
    // Colour type 3 is palettised. A raw is 2 (truecolour) or 6 (truecolour with alpha), and is
    // where most of the excess weight lives even when the pixel dimensions happen to be right.
    expect(
      colourType,
      `colour type ${colourType}. The builder palettises to 3; a raw is 2 or 6.`
    ).toBe(3);
  });
});

/**
 * **A raw named for an underscored biome must build under that name.**
 *
 * Three biomes carry an underscore -- `sky_island`, `sky_underside`, `lava_field` -- and the scene
 * kind used to hyphenate, so a raw saved as `Gemini_scene-stoop-sky_island.png` built as
 * `stoop-sky-island.png`: not a biome, no painting drawn, and the folder guard above failing on a
 * file somebody had named correctly.
 */
describe('the builder names a scene the way sceneFor asks for it', () => {
  const { idFor, KINDS } = createRequire(import.meta.url)('../tools/build-plates.js') as {
    idFor: (file: string, word?: string, keepUnderscores?: boolean) => string;
    KINDS: Record<string, { word: string; keepUnderscores?: boolean }>;
  };
  const built = (file: string) => idFor(file, KINDS.scene!.word, KINDS.scene!.keepUnderscores);

  it.each([
    ['Gemini_scene-stoop-sky_island.png', 'stoop-sky_island'],
    ['ChatGPT_scene-work-lava_field.png', 'work-lava_field'],
    ['scene-stalk-firing.png', 'stalk-firing'],
    ['Grok_scene-work.png', 'work'],
    ['Gemini_scene-rest-roof.2.png', 'rest-roof.2']
  ])('%s builds as %s', (raw, id) => {
    expect(built(raw)).toBe(id);
  });
});
