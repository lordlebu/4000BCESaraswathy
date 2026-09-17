// What is allowed to sit in src/ui/scenes/.
//
// **The folder is a build output, and it is now being added to by hand.** `src/ui/scenes.ts` globs
// it, so whatever lands here ships — and both halves of that have already gone wrong once each in
// the plates folder, which is why its own guard exists:
//
//   * A **raw** straight from an image model is 1–2 MB rather than ~130 KB, and truecolour rather
//     than palettised. It renders perfectly. Nothing tells you. The download just grows.
//     `stoop-mountains.png` arrived that way at 1.7 MB and came out of the builder at 129 KB.
//   * A file named after something no gesture asks for matches nothing, throws nothing, and quietly
//     keeps drawing the fallback. That has happened three times across the art folders.
//
// Neither failure is visible in the game, in a type, or in a lint. This is the only thing that can
// see them, so it is worth the twenty lines — and it is worth more now than when the art was coming
// through one pipeline, because a person dropping a file straight in is exactly the case it catches.

import { describe, expect, it } from 'vitest';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import biomes from '../data/biomes.json';

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

/** What a `rest-` variant may narrow by: the six kinds of night `night.ts` ranks. */
const SHELTERS = ['palace', 'settlement', 'roof', 'camp', 'tent', 'bedroll', 'none'];

/** What any gesture may narrow by: canon's process words, and the ground under foot. */
const PROCESSES = [
  'knapping', 'smelting', 'grinding', 'casting', 'pressing', 'carving', 'weaving', 'spinning',
  'retting', 'tanning', 'boatbuilding', 'purifying', 'firing', 'cooking', 'brewing', 'drying',
  'gathering'
];
const BIOMES = (biomes as { id: string }[]).map((b) => b.id);

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
        [...SHELTERS, ...PROCESSES, ...BIOMES].includes(variant),
        `\`${variant}\` is not a shelter kind, a canon process or a biome, so ` +
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
