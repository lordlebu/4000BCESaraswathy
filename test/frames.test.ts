// The frame arithmetic, and the constraint that keeps the player visible.
//
// `frames.ts` is deliberately free of Phaser so this can run under Node. Everything here is about
// the sheets agreeing with the builders that wrote them -- an index that drifts does not throw,
// it draws the wrong thing, which is the failure mode that cost the Stepped Quarry a release.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import {
  FENCE_FRAME,
  OVERDRAW_PLANTS,
  OVERDRAW_REST,
  OVERDRAW_SCATTERS,
  overdrawFrame,
  swayFrame
} from '../src/game/frames';

/** Width and height of a PNG, read straight from its IHDR. */
function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('the overdraw sheet and the code agree', () => {
  it('has exactly the frames the layout claims', () => {
    // rest scatters + leaning scatters + one fence. If build-overdraw.js grows a plant and this
    // is not updated, the fence index silently points at a blade of grass.
    const { width, height } = pngSize('assets/overdraw.png');
    expect(height).toBe(32);
    expect(width / 32).toBe(FENCE_FRAME + 1);
    expect(OVERDRAW_REST).toBe(OVERDRAW_PLANTS.length * OVERDRAW_SCATTERS);
  });

  it('pairs every rest frame with a leaning one inside the sheet', () => {
    const frames = pngSize('assets/overdraw.png').width / 32;
    for (let rest = 0; rest < OVERDRAW_REST; rest += 1) {
      expect(swayFrame(rest)).toBeLessThan(frames);
      expect(swayFrame(rest)).not.toBe(rest);
    }
  });

  it('grows something on the four biomes that have art, and nothing elsewhere', () => {
    for (const biome of ['plains', 'wetland', 'settlement', 'river'] as const) {
      expect(overdrawFrame(biome, 0)).not.toBeNull();
    }
    // Forest is the busiest tile in the set; sea and mountains are not places you wade through.
    for (const biome of ['forest', 'sea', 'mountains', 'desert', 'coast'] as const) {
      expect(overdrawFrame(biome, 0)).toBeNull();
    }
  });

  it('keeps every scatter inside its own plant', () => {
    // A scatter index that leaked into the next plant would put reeds on the plains.
    for (let plant = 0; plant < OVERDRAW_PLANTS.length; plant += 1) {
      const biome = (['plains', 'wetland', 'settlement', 'river'] as const)[plant]!;
      for (let scatter = 0; scatter < 12; scatter += 1) {
        const frame = overdrawFrame(biome, scatter)!;
        expect(Math.floor(frame / OVERDRAW_SCATTERS)).toBe(plant);
      }
    }
  });
});

/** The topmost opaque row of each frame, decoded from the sheet itself. */
function frameTops(file: string): number[] {
  const buf = readFileSync(file);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const chunks: Buffer[] = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    if (buf.toString('ascii', off + 4, off + 8) === 'IDAT') chunks.push(buf.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * 4;
  const rows = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? rows[y * stride + x - 4] : 0;
      const up = y > 0 ? rows[(y - 1) * stride + x] : 0;
      const upLeft = x >= 4 && y > 0 ? rows[(y - 1) * stride + x - 4] : 0;
      let v = raw[pos + x]!;
      if (filter === 1) v += left;
      else if (filter === 2) v += up;
      else if (filter === 3) v += (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        v += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      rows[y * stride + x] = v & 0xff;
    }
    pos += stride;
  }
  const tops: number[] = [];
  for (let frame = 0; frame < width / 32; frame += 1) {
    let top = 32;
    for (let y = 0; y < height; y += 1) {
      for (let x = frame * 32; x < (frame + 1) * 32; x += 1) {
        if (rows[y * stride + x * 4 + 3]! >= 128 && y < top) top = y;
      }
    }
    tops.push(top);
  }
  return tops;
}

describe('the overdraw cannot swallow the traveller', () => {
  it('draws nothing in the top half of a tile', () => {
    // The rule the whole layer rests on. It is drawn *over* the player, so art that reaches his
    // head makes him vanish behind grass. Nothing may start above row 16 of 32 -- grass to the
    // knee reads as depth, grass to the chest reads as losing the character.
    //
    // Measured off the built sheet, not trusted from the builder's constants, because the point
    // is to catch a future edit to build-overdraw.js that raises a height past what is safe.
    const tallest = Math.min(...frameTops('assets/overdraw.png'));
    expect(tallest, 'topmost opaque row across every overdraw frame').toBeGreaterThanOrEqual(16);
  });
});
