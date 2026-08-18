// The frame arithmetic, and the constraint that keeps the player visible.
//
// `frames.ts` is deliberately free of Phaser so this can run under Node. Everything here is about
// the sheets agreeing with the builders that wrote them -- an index that drifts does not throw,
// it draws the wrong thing, which is the failure mode that cost the Stepped Quarry a release.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import {
  FEATURES,
  FEATURE_RARITY,
  OVERDRAW_PLANTS,
  PRINTS_FRAME,
  SPLASH_FRAME,
  OVERDRAW_REST,
  OVERDRAW_SCATTERS,
  overdrawFrame,
  featureFrame,
  swayFrame,
  traceFrameFor
} from '../src/game/frames';

/** Width and height of a PNG, read straight from its IHDR. */
function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('the overdraw sheet and the code agree', () => {
  it('has exactly the frames the layout claims', () => {
    // rest scatters + leaning scatters + fence + the two underfoot marks. If build-overdraw.js
    // grows a plant and this is not updated, the fence index silently points at a blade of grass.
    const { width, height } = pngSize('assets/overdraw.png');
    expect(height).toBe(32);
    expect(width / 32).toBe(SPLASH_FRAME + 1);
    expect(OVERDRAW_REST).toBe(OVERDRAW_PLANTS.length * OVERDRAW_SCATTERS);
  });

  it('pairs every rest frame with a leaning one inside the sheet', () => {
    const frames = pngSize('assets/overdraw.png').width / 32;
    for (let rest = 0; rest < OVERDRAW_REST; rest += 1) {
      expect(swayFrame(rest)).toBeLessThan(frames);
      expect(swayFrame(rest)).not.toBe(rest);
    }
  });

  it('grows something on every walkable ground but the bare three', () => {
    for (const biome of ['plains', 'wetland', 'settlement', 'river', 'forest', 'coast', 'hills', 'desert'] as const) {
      expect(overdrawFrame(biome, 0)).not.toBeNull();
    }
    // Sea is not walked on. Mountains is already the busiest tile in the set, and the landmark
    // tile stays bare so the destination standing on it is what the eye finds.
    for (const biome of ['sea', 'mountains', 'landmark'] as const) {
      expect(overdrawFrame(biome, 0)).toBeNull();
    }
  });

  it('leaves a mark on soft ground and none on hard', () => {
    // Restricting the trail is what keeps it meaningful: everywhere is decoration, sand and marsh
    // is evidence of where you went.
    expect(traceFrameFor('wetland')).toBe(SPLASH_FRAME);
    expect(traceFrameFor('river')).toBe(SPLASH_FRAME);
    expect(traceFrameFor('coast')).toBe(PRINTS_FRAME);
    expect(traceFrameFor('desert')).toBe(PRINTS_FRAME);
    for (const hard of ['mountains', 'hills', 'forest', 'settlement', 'plains'] as const) {
      expect(traceFrameFor(hard)).toBeNull();
    }
  });

  it('only ever grows a plant that belongs on that ground', () => {
    // A frame index that leaked past its plant's three scatters would put reeds on the plains.
    // Checked by name rather than by number so the assertion says what it means.
    const expected: Record<string, string[]> = {
      plains: ['grass-plains', 'barley-plains', 'sagebrush-plains'],
      wetland: ['reeds-wetland'],
      settlement: ['paddy-settlement'],
      river: ['rushes-river'],
      forest: ['ferns-forest', 'vine-forest'],
      coast: ['saltgrass-coast'],
      hills: ['moss-hills'],
      desert: ['saltbush-desert']
    };
    for (const [biome, allowed] of Object.entries(expected)) {
      for (let scatter = 0; scatter < 40; scatter += 1) {
        const frame = overdrawFrame(biome as never, scatter)!;
        const plant = OVERDRAW_PLANTS[Math.floor(frame / OVERDRAW_SCATTERS)]!;
        expect(allowed, `${biome} scatter ${scatter} grew ${plant}`).toContain(plant);
      }
    }
  });
});

/** Decode a PNG to raw RGBA rows. Enough of a decoder for sheets this builder writes. */
function decode(file: string): { rows: Buffer; width: number; height: number; stride: number } {
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
      const left = x >= 4 ? rows[y * stride + x - 4]! : 0;
      const up = y > 0 ? rows[(y - 1) * stride + x]! : 0;
      const upLeft = x >= 4 && y > 0 ? rows[(y - 1) * stride + x - 4]! : 0;
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
  return { rows, width, height, stride };
}

/** The topmost opaque row of each frame. */
function frameTops(file: string): number[] {
  const { rows, width, height, stride } = decode(file);
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

/** The horizontal centre of mass of each frame's opaque pixels. */
function frameCentroids(file: string): (number | null)[] {
  const { rows, width, height, stride } = decode(file);
  const out: (number | null)[] = [];
  for (let frame = 0; frame < width / 32; frame += 1) {
    let sum = 0;
    let n = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = frame * 32; x < (frame + 1) * 32; x += 1) {
        if (rows[y * stride + x * 4 + 3]! >= 128) {
          sum += x - frame * 32;
          n += 1;
        }
      }
    }
    out.push(n === 0 ? null : sum / n);
  }
  return out;
}

describe('the overdraw cannot swallow the traveller', () => {
  it('draws nothing in the top half of a tile', () => {
    // The rule the common layer rests on. It is drawn *over* the player, so art that reaches his
    // head makes him vanish behind grass. Nothing may start above row 16 of 32 -- grass to the
    // knee reads as depth, grass to the chest reads as losing the character.
    //
    // Measured off the built sheet, not trusted from the builder's constants, because the point
    // is to catch a future edit to build-overdraw.js that raises a height past what is safe.
    const tallest = Math.min(...frameTops('assets/overdraw.png'));
    expect(tallest, 'topmost opaque row across every overdraw frame').toBeGreaterThanOrEqual(16);
  });
});

describe('features may be tall because they stand aside', () => {
  // The trade this layer makes. Common overdraw stops at row 16 so it can never hide the player.
  // A tree cannot obey that and still be a tree, so it gets a different bargain: it may reach
  // row 4, but it must be offset toward one side of the tile and it must be rare. The player then
  // walks *past* it rather than behind it.
  //
  // These assert the two halves of that bargain, because breaking either one silently turns the
  // world into a set of obstructions the traveller keeps vanishing into.

  it('has a frame for every feature the code indexes', () => {
    const frames = pngSize('assets/features.png').width / 32;
    const claimed = Object.values(FEATURES).flatMap((f) => f.frames);
    expect(Math.max(...claimed)).toBe(frames - 1);
    // No frame claimed twice, and none left unclaimed.
    expect(new Set(claimed).size).toBe(claimed.length);
    expect(claimed.length).toBe(frames);
  });

  it('keeps anything tall away from the centre of its tile', () => {
    // Only tall frames need the offset. A boulder or a lotus pad sits centred and is harmless,
    // because it is below the player's waist wherever he stands.
    const tops = frameTops('assets/features.png');
    const centroids = frameCentroids('assets/features.png');
    const offenders: string[] = [];
    tops.forEach((top, i) => {
      if (top >= 16) return; // short enough not to matter
      const centre = centroids[i];
      if (centre === null) return;
      if (Math.abs(centre - 16) < 4) offenders.push(`frame ${i}: top ${top}, centre ${centre.toFixed(1)}`);
    });
    expect(offenders, 'tall features drawn across the middle of their tile').toEqual([]);
  });

  it('places a feature on roughly one eligible tile in twelve', () => {
    // Rarity is the other half of the bargain. Counted over a large sample rather than asserted
    // from the constant, so a change to the selection logic shows up here too.
    let hits = 0;
    const sample = 6000;
    for (let i = 0; i < sample; i += 1) {
      if (featureFrame('plains', i, 0) !== null) hits += 1;
    }
    expect(hits / sample).toBeCloseTo(1 / FEATURE_RARITY, 2);
  });

  it('offers nothing on ground with no features', () => {
    for (const bare of ['sea', 'mountains', 'landmark'] as const) {
      expect(featureFrame(bare, 0, 0)).toBeNull();
    }
  });
});
