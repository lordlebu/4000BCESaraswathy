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
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
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

/**
 * Every traveller's sheet actually carries a walk, rather than four copies of a standing pose.
 *
 * **Reported from play: "the other three graphics are broken".** The art was replaced wholesale
 * and rebuilt through `tools/build-characters.js`, which slices by finding separated figures --
 * so a source sheet whose figures touch, or whose rows are ordered differently, produces a sheet
 * that is the right *size* and the wrong *content*. The build reports "ok" either way.
 *
 * This reads the built PNGs, which is the only thing that can tell the difference. It is the same
 * reasoning `frames.test.ts` gives for measuring sheets rather than trusting the builder.
 */
describe('the built sheets', () => {
  const CELL = { width: 26, height: 40 };
  const WALK_FRAMES = 16;

  /** Decode a PNG far enough to compare pixels. Only handles what our own builder writes. */
  function pixels(file: string): { width: number; height: number; data: Buffer } {
    const buf = readFileSync(file);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const chunks: Buffer[] = [];
    let at = 8;
    while (at < buf.length) {
      const len = buf.readUInt32BE(at);
      const type = buf.toString('ascii', at + 4, at + 8);
      if (type === 'IDAT') chunks.push(buf.subarray(at + 8, at + 8 + len));
      at += 12 + len;
    }
    const raw = inflateSync(Buffer.concat(chunks));
    // Undo the per-row filter. The builder writes filter 0 (none) on every row.
    const stride = width * 4;
    const data = Buffer.alloc(height * stride);
    for (let y = 0; y < height; y += 1) {
      raw.copy(data, y * stride, y * (stride + 1) + 1, (y + 1) * (stride + 1));
    }
    return { width, height, data };
  }

  const frameKey = (img: ReturnType<typeof pixels>, f: number): string => {
    const parts: number[] = [];
    for (let y = 0; y < CELL.height; y += 1) {
      for (let x = 0; x < CELL.width; x += 1) {
        const i = (y * img.width + f * CELL.width + x) * 4;
        parts.push(img.data[i]!, img.data[i + 1]!, img.data[i + 2]!, img.data[i + 3]!);
      }
    }
    return parts.join(',');
  };

  for (const character of everyCharacter()) {
    it(`${character.key} has four distinct frames in every facing`, () => {
      const img = pixels(`assets/${character.key}-overworld.png`);
      expect(img.width % CELL.width, 'the sheet is not a whole number of cells wide').toBe(0);
      expect(img.height, 'the sheet is not one cell tall').toBe(CELL.height);
      expect(img.width / CELL.width, 'the sheet is short of frames').toBeGreaterThanOrEqual(
        WALK_FRAMES
      );

      // Four facings of four. A repeated frame is a walk that stutters; four identical frames is
      // a traveller who slides along with their feet still, which is what a moonwalk looks like.
      for (let facing = 0; facing < 4; facing += 1) {
        const seen = new Set<string>();
        for (let f = 0; f < 4; f += 1) seen.add(frameKey(img, facing * 4 + f));
        expect(
          seen.size,
          `${character.key} facing ${facing} repeats a frame -- the walk will stutter`
        ).toBe(4);
      }
    });

    it(`${character.key} moves its feet as it walks`, () => {
      const img = pixels(`assets/${character.key}-overworld.png`);
      // Centre of mass of the bottom rows: the feet. A cycle that never shifts them is a figure
      // being slid across the ground rather than walking on it.
      const feet = (f: number): number => {
        let sum = 0;
        let n = 0;
        for (let y = CELL.height - 9; y < CELL.height; y += 1) {
          for (let x = 0; x < CELL.width; x += 1) {
            const i = (y * img.width + f * CELL.width + x) * 4;
            if (img.data[i + 3]! > 128) {
              sum += x;
              n += 1;
            }
          }
        }
        return n === 0 ? 0 : sum / n;
      };

      for (let facing = 0; facing < 4; facing += 1) {
        const across = [0, 1, 2, 3].map((f) => feet(facing * 4 + f));
        const sway = Math.max(...across) - Math.min(...across);
        expect(
          sway,
          `${character.key} facing ${facing} never shifts its feet across the cycle`
        ).toBeGreaterThan(0.25);
      }
    });
  }
});
