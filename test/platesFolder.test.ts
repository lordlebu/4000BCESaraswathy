// What is allowed to sit in src/ui/plates/.
//
// The folder is a build output, and `src/ui/plates.ts` globs it — so whatever is in here ships,
// keyed by file name. Both halves of that have already gone wrong:
//
//   * A plate filed under the **canon** id (`fauna_scythian_wild_ass`) instead of the engine id
//     (`scythian-wild-ass`) matches nothing, throws nothing, and quietly keeps drawing the
//     silhouette. That cost several rounds the first time.
//   * A **raw** straight from an image model, dropped here instead of `assets/source/plates/`,
//     is 2–8 MB rather than ~100 KB and is named `Gemini_plate-desert-fox.png`, which no species
//     will ever ask for. It ships the megabytes and draws nothing. That has happened twice.
//
// Neither failure is visible in the game, in a type, or in a lint. This test is the only thing
// that can see them, so it is worth the twenty lines.

import { describe, expect, it } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import speciesBundle from '../data/canon/species.json';
import { engineId } from '../src/content/canon';

const PLATES = join(__dirname, '..', 'src', 'ui', 'plates');

/**
 * The ceiling for a built plate, in kilobytes.
 *
 * The four built so far land between 90 and 108 KB at 384px, and the build picks whichever of
 * indexed or truecolour came out smaller, so there is no encoding that should double it. 250 is
 * comfortably clear of a real plate and nowhere near a raw, which is the distinction being drawn:
 * this is a "something is wrong" bound, not a budget to optimise against.
 */
const MAX_KB = 250;

const known = new Set(
  [...speciesBundle.fauna, ...speciesBundle.flora].map((s: { id: string }) => engineId(s.id))
);

const plates = readdirSync(PLATES).filter((f) => /\.(png|webp|jpe?g)$/i.test(f));

describe('src/ui/plates holds built plates and nothing else', () => {
  it('has species to draw plates for at all, so the checks below mean something', () => {
    // Guards the guard. If the bundle ever stops loading, `known` is empty, every name below is
    // "unknown", and the failure would look like an art problem rather than a data one.
    expect(known.size).toBeGreaterThan(200);
  });

  it.runIf(plates.length > 0).each(plates)('%s is named after a real species', (file) => {
    const id = file.replace(/\.[^.]+$/, '');
    expect(
      known.has(id),
      `\`${id}\` is not an engine id any species carries, so nothing will ever look it up. ` +
        `If this is a raw from an image model, it belongs in assets/source/plates/ — see the ` +
        `README in this folder.`
    ).toBe(true);
  });

  it.runIf(plates.length > 0).each(plates)('%s is a built plate, not a raw', (file) => {
    const kb = statSync(join(PLATES, file)).size / 1024;
    expect(
      kb,
      `${Math.round(kb)} KB. A built plate is around 100; a raw from an image model is thousands. ` +
        `Run \`node tools/build-plates.js\` against assets/source/plates/ instead of copying here.`
    ).toBeLessThan(MAX_KB);
  });
});
