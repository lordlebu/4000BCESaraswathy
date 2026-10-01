// The build squeezes every painting it ships. The promise is that no pixel changes.
//
// `tools/squeeze-png.js` checks its own output before handing it back, so a fault there ships the
// original rather than a wrong picture. That guard is what makes it safe; this is what says the
// squeezing still happens at all, and that the guard is not quietly handing back every original.

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
interface Decoded {
  width: number;
  height: number;
  colour: number;
  pixels: Buffer;
}
const { squeeze, decode, rgbaOf } = createRequire(import.meta.url)('../tools/squeeze-png.js') as {
  squeeze: (png: Buffer) => Buffer;
  decode: (png: Buffer) => Decoded | null;
  rgbaOf: (image: Decoded) => Buffer | null;
};

// The ground every journey opens on, a painted animal with a transparent edge, and a small sheet.
const SAMPLES = ['assets/terrain.png', 'assets/wanderers/vasuki-indicus-down.png', 'assets/varuna-overworld.png'];

// The ground sheet takes a few seconds to squeeze; the suite runs thirty files at once and a test
// that holds a core that long is how an unrelated generation test on the same machine times out.
const cache = new Map<string, Buffer>();
function squeezedOnce(file: string): Buffer {
  if (!cache.has(file)) cache.set(file, squeeze(readFileSync(join(ROOT, file))));
  return cache.get(file)!;
}

describe('squeezing a painting', () => {
  for (const file of SAMPLES) {
    it(`leaves every pixel of ${file} as it was`, () => {
      const original = readFileSync(join(ROOT, file));
      const squeezed = squeezedOnce(file);
      expect(squeezed.length).toBeLessThanOrEqual(original.length);
      const before = decode(original)!;
      const after = decode(squeezed)!;
      expect([after.width, after.height]).toEqual([before.width, before.height]);
      expect(rgbaOf(after)!.equals(rgbaOf(before)!)).toBe(true);
    });
  }

  it('actually makes the ground smaller, rather than handing the original back', () => {
    // Measured at 1,610 KB to 1,316 KB. A guard that rejected every result would pass the test
    // above and save nothing; this is the one that notices.
    const original = readFileSync(join(ROOT, 'assets/terrain.png'));
    expect(squeezedOnce('assets/terrain.png').length).toBeLessThan(original.length * 0.9);
  });

  it('hands back anything that is not a PNG it understands, unchanged', () => {
    const notAPng = Buffer.from('this is not a picture');
    expect(squeeze(notAPng)).toBe(notAPng);
  });
});
