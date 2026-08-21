// The frame arithmetic, and the constraint that keeps the player visible.
//
// `frames.ts` is deliberately free of Phaser so this can run under Node. Everything here is about
// the sheets agreeing with the builders that wrote them -- an index that drifts does not throw,
// it draws the wrong thing, which is the failure mode that cost the Stepped Quarry a release.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import {
  GRID,
  EDGE_ORDER,
  EDGE_VARIANTS,
  blends,
  edgeMaskFrame,
  DECOR_ORDER,
  DECOR_CELL,
  DECOR_VARIANTS,
  DECOR_BY_BIOME,
  decorFrame,
  decorCount,
  TILE_VARIANTS,
  TERRAIN_ORDER,
  tileFrame,
  FEATURES,
  FEATURE_RARITY,
  OVERDRAW_PLANTS,
  PRINTS_FRAME,
  SPLASH_FRAME,
  OVERDRAW_REST,
  OVERDRAW_SCATTERS,
  overdrawFrame,
  ROW_SLOT,
  depthFor,
  featureFrame,
  swayFrame,
  traceFrameFor
} from '../src/game/frames';

/** Width and height of a PNG, read straight from its IHDR. */
function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}


/**
 * How many frames a sheet holds.
 *
 * Width alone is not the answer any more. Sheets wrap into rows once a strip would pass WebGL's
 * 8,192-pixel texture limit -- `overdraw.png` shipped at 8,832 and every sprite drawn from it
 * rendered black, because the upload had failed and nothing said so. Counting both axes is what
 * makes these assertions independent of that layout.
 */
function frameCount(file: string, cellWidth = GRID, cellHeight = GRID): number {
  const { rows, width, height, stride } = decode(file);
  const columns = width / cellWidth;
  const capacity = columns * (height / cellHeight);

  // Count cells that hold anything, rather than dividing the width. Wrapping pads the sheet out to
  // a full rectangle, so capacity is an upper bound and the tail of the last row is empty -- and a
  // test that trusted capacity would pass whatever the builder emitted.
  let used = 0;
  for (let i = 0; i < capacity; i += 1) {
    const ox = (i % columns) * cellWidth;
    const oy = Math.floor(i / columns) * cellHeight;
    let any = false;
    for (let y = 0; y < cellHeight && !any; y += 1) {
      for (let x = 0; x < cellWidth; x += 1) {
        if (rows[(oy + y) * stride + (ox + x) * 4 + 3]! > 0) { any = true; break; }
      }
    }
    if (any) used += 1;
  }
  return used;
}

describe('every sheet is built to the same grid', () => {
  it('agrees with GRID, and with itself', () => {
    // The one place the grid size is asserted rather than derived. Six sheets are written by three
    // different builders; a scale changed in one and forgotten in another draws a quarter-size
    // tile with no error anywhere, which is exactly what happened when the grid moved to 128.
    for (const sheet of ['terrain', 'landmarks', 'overdraw', 'features', 'edges', 'decor']) {
      const { width, height } = pngSize(`assets/${sheet}.png`);
      // Decor is the one sheet on a half-tile cell -- see DECOR_CELL.
      const cell = sheet === 'decor' ? DECOR_CELL : GRID;
      expect(width % cell, `${sheet}.png is not a whole number of cells wide`).toBe(0);
      expect(height % cell, `${sheet}.png is not a whole number of cells tall`).toBe(0);
      // And inside what a GPU will actually upload -- see `frameCount`.
      expect(width, `${sheet}.png is too wide for WebGL`).toBeLessThanOrEqual(8192);
      expect(height, `${sheet}.png is too tall for WebGL`).toBeLessThanOrEqual(8192);
    }
    // Places stand taller than their tile, huts sit inside one; both keep their ratio to it.
    expect(pngSize('assets/places.png').height).toBe((GRID / 32) * 40);
    expect(pngSize('assets/huts.png').height).toBe((GRID / 32) * 22);
  });

  it('carries every biome at every variant', () => {
    // Frame order is biome-major: all four crops of sea, then of coast. A sheet built without
    // --variants, or code expecting a different order, silently paints the wrong ground.
    const frames = frameCount('assets/terrain.png');
    expect(frames).toBe(TERRAIN_ORDER.length * TILE_VARIANTS);

    const seen = new Set<number>();
    for (const biome of TERRAIN_ORDER) {
      for (let v = 0; v < TILE_VARIANTS; v += 1) {
        const f = tileFrame(biome, v);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThan(frames);
        seen.add(f);
      }
    }
    expect(seen.size, 'every biome/variant pair should be its own frame').toBe(frames);
  });

  it('wraps the variant, and defaults to the first crop', () => {
    // The scene hands in a raw tile hash. And the edge blend calls it with no variant at all,
    // which must land on the biome's first frame rather than drifting.
    const frames = frameCount('assets/terrain.png');
    for (const n of [0, 4, 5, 4294967295]) {
      expect(tileFrame('plains', n)).toBeLessThan(frames);
    }
    expect(tileFrame('plains')).toBe(tileFrame('plains', 0));
    expect(tileFrame('plains', TILE_VARIANTS)).toBe(tileFrame('plains', 0));
  });
});

describe('the edge masks and the code agree', () => {
  it('has one frame per edge per variant, in the order the code indexes', () => {
    const frames = frameCount('assets/edges.png');
    expect(frames).toBe(EDGE_ORDER.length * EDGE_VARIANTS);
    // Every (edge, variant) lands on a distinct frame inside the sheet.
    const seen = new Set<number>();
    for (const edge of EDGE_ORDER) {
      for (let v = 0; v < EDGE_VARIANTS; v += 1) {
        const f = edgeMaskFrame(edge, v);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThan(frames);
        seen.add(f);
      }
    }
    expect(seen.size).toBe(frames);
  });

  it('wraps the variant rather than running off the sheet', () => {
    // The caller hands in a raw tile hash, not a number already reduced.
    const frames = frameCount('assets/edges.png');
    for (const n of [0, 3, 4, 17, 4294967295]) {
      expect(edgeMaskFrame('n', n)).toBeLessThan(frames);
      expect(edgeMaskFrame('w', n)).toBeLessThan(frames);
    }
  });

  it('blends land to land, and never land to water', () => {
    // A shore is a line and should stay one; a mountain should melt into the hills below it.
    expect(blends('plains', 'hills')).toBe(true);
    expect(blends('mountains', 'hills')).toBe(true);
    expect(blends('forest', 'wetland')).toBe(true);
    expect(blends('plains', 'sea')).toBe(false);
    expect(blends('sea', 'coast')).toBe(false);
    expect(blends('river', 'plains')).toBe(false);
    // Water to water is still water, and a tile never blends with its own kind.
    expect(blends('sea', 'river')).toBe(true);
    expect(blends('plains', 'plains')).toBe(false);
  });
});

describe('the overdraw sheet and the code agree', () => {
  it('has exactly the frames the layout claims', () => {
    // rest scatters + leaning scatters + fence + the two underfoot marks. If build-overdraw.js
    // grows a plant and this is not updated, the fence index silently points at a blade of grass.
    expect(frameCount('assets/overdraw.png')).toBe(SPLASH_FRAME + 1);
    expect(OVERDRAW_REST).toBe(OVERDRAW_PLANTS.length * OVERDRAW_SCATTERS);
  });

  it('pairs every rest frame with a leaning one inside the sheet', () => {
    const frames = frameCount('assets/overdraw.png');
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

/**
 * The topmost opaque row of each frame, as a fraction of the cell.
 *
 * A fraction rather than a row index, because the rules these feed are fractions: "nothing above
 * row 16 of 32" is *the top half*, and it means the same thing when a cell is 128. Returning raw
 * rows made the grid size leak into every assertion below.
 */
function frameTops(file: string): number[] {
  const { rows, width, height, stride } = decode(file);
  const cell = GRID;
  const columns = width / cell;
  const tops: number[] = [];
  for (let i = 0; i < columns * (height / cell); i += 1) {
    const ox = (i % columns) * cell;
    const oy = Math.floor(i / columns) * cell;
    let top = cell;
    for (let y = 0; y < cell; y += 1) {
      for (let x = 0; x < cell; x += 1) {
        if (rows[(oy + y) * stride + (ox + x) * 4 + 3]! >= 128 && y < top) top = y;
      }
    }
    // An empty padding cell has no top at all and must not drag the minimum down.
    if (top < cell) tops.push(top / cell);
  }
  return tops;
}

/** The horizontal centre of mass of each frame's opaque pixels. */
function frameCentroids(file: string): (number | null)[] {
  const { rows, width, height, stride } = decode(file);
  const cell = GRID;
  const columns = width / cell;
  const out: (number | null)[] = [];
  for (let i = 0; i < columns * (height / cell); i += 1) {
    const ox = (i % columns) * cell;
    const oy = Math.floor(i / columns) * cell;
    let sum = 0;
    let n = 0;
    for (let y = 0; y < cell; y += 1) {
      for (let x = 0; x < cell; x += 1) {
        if (rows[(oy + y) * stride + (ox + x) * 4 + 3]! >= 128) {
          sum += x;
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
    expect(tallest, 'topmost opaque row as a fraction of the cell').toBeGreaterThanOrEqual(0.5);
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
    const frames = frameCount('assets/features.png');
    const claimed = Object.values(FEATURES).flatMap((f) => f.frames);
    expect(Math.max(...claimed)).toBe(frames - 1);
    // No frame claimed twice, and none left unclaimed.
    expect(new Set(claimed).size).toBe(claimed.length);
    expect(claimed.length).toBe(frames);
  });

  it('keeps anything tall away from the centre of its tile', () => {
    // Only tall frames need the offset. A boulder or a lotus pad sits centred and is harmless,
    // because it is below the player's waist wherever he stands.
    // Both measures are fractions of the cell, so the bargain reads the same at any grid size:
    // "reaches into the top half" and "sits within an eighth of the centre line".
    const tops = frameTops('assets/features.png');
    const centroids = frameCentroids('assets/features.png');
    const offenders: string[] = [];
    tops.forEach((top, i) => {
      if (top >= 0.5) return; // short enough not to matter
      const centre = centroids[i];
      if (centre === null) return;
      const fromCentre = Math.abs(centre / GRID - 0.5);
      if (fromCentre < 0.125) {
        offenders.push(`frame ${i}: top ${top.toFixed(2)}, centre ${(centre / GRID).toFixed(2)}`);
      }
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

describe('the world stacks by row, not by layer', () => {
  // The bug this replaced: everything above the player had one depth and everything below had
  // another, so a plant a dozen rows south of him -- nearer the camera, and therefore behind him
  // -- still drew across his face. Depth is a global ordering and knows nothing about position.

  it('draws a lower row nearer the viewer than a higher one', () => {
    // The whole rule in one assertion. Anything on row 20 sits in front of anything on row 19,
    // whatever kind of thing each is.
    expect(depthFor(20, ROW_SLOT.undergrowth)).toBeGreaterThan(depthFor(19, ROW_SLOT.canopy));
  });

  it('puts the traveller between the undergrowth of his row and its canopy', () => {
    // Which is what lets grass on his own tile pass in front of his legs while the ground cover
    // he is standing on stays behind him.
    const row = 12;
    expect(depthFor(row, ROW_SLOT.walker)).toBeGreaterThan(depthFor(row, ROW_SLOT.undergrowth));
    expect(depthFor(row, ROW_SLOT.walker)).toBeLessThan(depthFor(row, ROW_SLOT.canopy));
  });

  it('shows a marker over the undergrowth but never over the traveller', () => {
    // Two regressions, in opposite directions, and the slot has to satisfy both.
    //
    // Markers were once on fixed depths of 3 and 4 while the row band started at 100, so grass
    // drew over four of the six markers on the Lothal map -- the Drowned Dockyard looked absent.
    // Fixing that by putting the slot above the canopy overcorrected: it went above the walker
    // too, so arriving at the banyan made the traveller disappear behind it.
    const row = 9;
    expect(depthFor(row, ROW_SLOT.marker)).toBeGreaterThan(depthFor(row, ROW_SLOT.undergrowth));
    expect(depthFor(row, ROW_SLOT.marker)).toBeLessThan(depthFor(row, ROW_SLOT.walker));
    // And still below the next row, so a marker never floats over ground nearer the camera.
    expect(depthFor(row, ROW_SLOT.marker)).toBeLessThan(depthFor(row + 1, ROW_SLOT.underfoot));
  });

  it('lets nothing but the canopy of his own tile cover the traveller', () => {
    // The rule the whole band exists to keep. Grass and trees on the tile he is standing on pass
    // in front of him -- that is the depth effect. Everything else on that tile is below him, and
    // nothing on the row above him is ever in front.
    const row = 12;
    const player = depthFor(row, ROW_SLOT.walker);
    for (const [name, slot] of Object.entries(ROW_SLOT)) {
      if (name === 'walker') continue;
      const own = depthFor(row, slot);
      if (name === 'canopy') expect(own, 'canopy should cover him').toBeGreaterThan(player);
      else expect(own, `${name} should not cover him`).toBeLessThan(player);
      expect(depthFor(row - 1, slot), `${name} a row behind`).toBeLessThan(player);
    }
  });

  it('leaves room inside a row for more kinds of thing', () => {
    // Every slot of a row must stay below the next row's first slot, or a third kind of sprite
    // added later would leak into the row in front.
    const slots = Object.values(ROW_SLOT);
    for (const slot of slots) {
      expect(depthFor(5, slot)).toBeLessThan(depthFor(6, Math.min(...slots)));
    }
  });

  it('keeps the whole band clear of the fog and the sky', () => {
    // A field map is 48 rows. The fog sits at 2000 and the sky at 3000, so the tallest row depth
    // must stay well under that -- otherwise grass draws over the fog and escapes the day's light,
    // which is exactly what happened when the band was introduced at 100 and fog was still at 10.
    expect(depthFor(48, ROW_SLOT.canopy)).toBeLessThan(2000);
  });
});

describe('the decor sheet and the code agree', () => {
  it('has one frame per prop per variant', () => {
    const frames = frameCount('assets/decor.png', DECOR_CELL, DECOR_CELL);
    expect(frames).toBe(DECOR_ORDER.length * DECOR_VARIANTS);

    const seen = new Set<number>();
    for (const prop of DECOR_ORDER) {
      for (let v = 0; v < DECOR_VARIANTS; v += 1) {
        const f = decorFrame(prop, v);
        expect(f, `${prop} variant ${v} has no frame`).not.toBeNull();
        expect(f!).toBeGreaterThanOrEqual(0);
        expect(f!).toBeLessThan(frames);
        seen.add(f!);
      }
    }
    expect(seen.size).toBe(frames);
  });

  it('only ever names a prop that is on the sheet', () => {
    // A typo in the per-biome table would silently draw nothing on that ground rather than throw.
    for (const [biome, props] of Object.entries(DECOR_BY_BIOME)) {
      for (const prop of props ?? []) {
        expect(DECOR_ORDER, `${biome} asks for ${prop}, which is not on the sheet`).toContain(prop);
      }
    }
  });

  it('leaves the water and the landmark bare', () => {
    // The same two exclusions the overdraw layer makes: sea is not walked on, and a landmark tile
    // stays clear so the thing standing on it is what the eye finds.
    expect(DECOR_BY_BIOME.sea).toBeUndefined();
    expect(DECOR_BY_BIOME.landmark).toBeUndefined();
  });

  it('wraps the variant rather than running off the sheet', () => {
    const frames = frameCount('assets/decor.png', DECOR_CELL, DECOR_CELL);
    for (const n of [0, 3, 4, 4294967295]) {
      expect(decorFrame('pebbles', n)!).toBeLessThan(frames);
    }
  });

  it('scatters one to three, and leaves a third of tiles empty', () => {
    // Counted over the range rather than asserted from the constant, so a change to the rolling
    // shows up here. Empty tiles matter: a prop on every tile is a texture, not a scatter.
    const tally = [0, 0, 0, 0];
    for (let i = 0; i < 6000; i += 1) tally[decorCount(i)] += 1;
    expect(tally[0] / 6000).toBeCloseTo(1 / 3, 1);
    expect(tally[1] / 6000).toBeCloseTo(1 / 3, 1);
    expect(tally[2]).toBeGreaterThan(0);
    expect(tally[3]).toBeGreaterThan(0);
    // Nothing above three, ever.
    expect(decorCount(5)).toBeLessThanOrEqual(3);
  });
});