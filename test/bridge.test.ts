// The plank bridge sheet, and the assertions the road sheet would have failed.
//
// **A tiling run has exactly three obligations** and the rejected road sheet broke all three: every
// cell's run must be the *same width*, *centred the same*, and must reach the cell border on the
// axis it runs along, so that any two cells laid side by side join without a step. That sheet came
// back at 25%-81% of its box with centres from 24% to 72% and not one cell touching an edge, and it
// was replaced by a code-drawn one because no builder can invent where a run was meant to leave a
// cell.
//
// The bridge source is a different case: its cells agreed with each other to about one per cent and
// were merely drawn ~4.5% short of their borders, which `tools/build-bridge.js` corrects by cropping
// to the run and resampling it to fill the cell. These assertions are what makes that claim checkable
// rather than a story about it.
//
// Every number here is exact rather than a tolerance, because after the builder they are exact --
// the band is 52 px in all four frames and centred on 64 in all four. A threshold would be inventing
// slack that the pipeline does not actually need.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { ROAD_PIECES, TRACK_PIECES, BRIDGE_PIECES } from '../src/game/frames';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';
import { planPlanks, planScene } from '../src/game/scenePlan';
import { isWalkable } from '../src/world/generate';
import { stepCost, CROSSING_ON_FOOT } from '../src/content/species';
import { DEFAULT_SEED } from '../src/ui/seed';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

function decode(file: string): { width: number; height: number; data: Buffer } {
  const buf = readFileSync(file);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const channels = buf[25] === 6 ? 4 : 3;
  const chunks: Buffer[] = [];
  let at = 8;
  while (at < buf.length) {
    const len = buf.readUInt32BE(at);
    if (buf.toString('ascii', at + 4, at + 8) === 'IDAT') chunks.push(buf.subarray(at + 8, at + 8 + len));
    at += len + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      if (filter === 1) line[i] = (line[i] + a) & 255;
      else if (filter === 2) line[i] = (line[i] + b) & 255;
      else if (filter === 3) line[i] = (line[i] + ((a + b) >> 1)) & 255;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    for (let x = 0; x < width; x += 1) {
      const from = x * channels;
      const to = (y * width + x) * 4;
      out[to] = line[from];
      out[to + 1] = line[from + 1];
      out[to + 2] = line[from + 2];
      out[to + 3] = channels === 4 ? line[from + 3] : 255;
    }
    prev = line;
  }
  return { width, height, data: out };
}

const sheet = decode(join(ASSETS, 'bridge.png'));
const CELL = sheet.height;
const FRAMES = sheet.width / CELL;

const inked = (f: number, x: number, y: number) => sheet.data[(y * sheet.width + f * CELL + x) * 4 + 3] >= 128;

/** The columns and rows of one frame that carry any ink. */
function extent(f: number) {
  let l = -1, r = -1, t = -1, b = -1;
  for (let x = 0; x < CELL; x += 1) {
    for (let y = 0; y < CELL; y += 1) if (inked(f, x, y)) { if (l < 0) l = x; r = x; break; }
  }
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) if (inked(f, x, y)) { if (t < 0) t = y; b = y; break; }
  }
  return { l, r, t, b, w: r - l + 1, h: b - t + 1 };
}

describe('the bridge is on the crossing contract', () => {
  it('is four square frames, the same sheet shape as the rail and the road', () => {
    expect(CELL, 'the cell must be square or a north-south run cannot meet an east-west one').toBe(128);
    expect(FRAMES).toBe(4);
    expect(FRAMES, 'the three run sheets have to stay interchangeable in shape').toBe(TRACK_PIECES);
    expect(TRACK_PIECES).toBe(ROAD_PIECES);
  });

  it('alternates north-south and east-west, in the order planTrack indexes', () => {
    // Read from the art rather than assumed: `build-bridge.js` refuses a sheet whose cells arrive in
    // another order, because silently mislabelling them is how a walking sprite once played a figure
    // facing west while it slid east.
    for (const f of [0, 2]) expect(extent(f).h, `frame ${f} should run north-south`).toBe(CELL);
    for (const f of [1, 3]) expect(extent(f).w, `frame ${f} should run east-west`).toBe(CELL);
  });
});

describe('the bridge tiles', () => {
  it('reaches both borders on the axis it runs along', () => {
    // **The road sheet's exact failure.** A run that stops short of its cell leaves a gap at every
    // seam, and the gap is the whole width of however far short it stopped.
    for (const f of [0, 2]) {
      const e = extent(f);
      expect(e.t, `frame ${f}: the run starts ${e.t} px below the top border`).toBe(0);
      expect(e.b, `frame ${f}: the run ends ${CELL - 1 - e.b} px above the bottom border`).toBe(CELL - 1);
    }
    for (const f of [1, 3]) {
      const e = extent(f);
      expect(e.l, `frame ${f}: the run starts ${e.l} px right of the left border`).toBe(0);
      expect(e.r, `frame ${f}: the run ends ${CELL - 1 - e.r} px left of the right border`).toBe(CELL - 1);
    }
  });

  it('is the same width in every frame and in both orientations', () => {
    // The source drew north-south at 43.6% of its cell and east-west at 38.7% -- a 15% disagreement
    // that would step at any corner where the two meet. The builder normalises both to one band, so
    // this is exact rather than approximate.
    const bands = [extent(0).w, extent(2).w, extent(1).h, extent(3).h];
    expect(new Set(bands).size, `bands differ: ${bands.join(', ')}`).toBe(1);
  });

  it('is centred, so a turn does not jog', () => {
    for (const f of [0, 2]) {
      const e = extent(f);
      expect(e.l + e.r + 1, `frame ${f} band is off-centre`).toBe(CELL);
    }
    for (const f of [1, 3]) {
      const e = extent(f);
      expect(e.t + e.b + 1, `frame ${f} band is off-centre`).toBe(CELL);
    }
  });

  it('has a worn variant that is a different picture from the fresh one', () => {
    // Frames 2 and 3 are the same runs weathered -- cracked boards, missing planks. If a sheet ever
    // arrived with the pair duplicated, the crossing would lose its variation silently, which is the
    // failure the windmill sheet actually shipped with.
    for (const [fresh, worn] of [[0, 2], [1, 3]]) {
      let differs = 0;
      for (let y = 0; y < CELL; y += 1) {
        for (let x = 0; x < CELL; x += 1) {
          const a = (y * sheet.width + fresh * CELL + x) * 4;
          const b = (y * sheet.width + worn * CELL + x) * 4;
          if (sheet.data[a] !== sheet.data[b] || sheet.data[a + 3] !== sheet.data[b + 3]) differs += 1;
        }
      }
      expect(differs / (CELL * CELL), `frames ${fresh} and ${worn} are the same picture`).toBeGreaterThan(0.02);
    }
  });
});

describe('the planks are on the map', () => {
  it('lays one across every island notch, on every seed', () => {
    // **The measurement that reversed the decision to park this sheet.** `docs/sky-buildings-plan.md`
    // said the only gap on the islands was one tile wide and used it to argue the bridge had
    // nothing to span. Counting instead of remembering found 9 to 19 notches a seed — holes in the
    // island top with island on both sides, which a walker had to go round for no visible reason.
    for (const seed of [DEFAULT_SEED, 'a', 'b', 'c', 'x']) {
      const { world } = buildFieldMap(fieldMaps.find((m) => m.id === 'field_map_aravali')!, { seed });
      const planks = world.tiles.flat().filter((t) => t.plank);
      expect(planks.length, `seed ${seed}: the islands have no planks at all`).toBeGreaterThan(0);
      for (const t of planks) {
        const left = world.tiles[t.y]?.[t.x - 1]?.biome === 'sky_island';
        const right = world.tiles[t.y]?.[t.x + 1]?.biome === 'sky_island';
        const up = world.tiles[t.y - 1]?.[t.x]?.biome === 'sky_island';
        const down = world.tiles[t.y + 1]?.[t.x]?.biome === 'sky_island';
        expect(
          (left && right) || (up && down),
          `seed ${seed}: the plank at ${t.x},${t.y} has sky on one side — that is a rim, not a notch`
        ).toBe(true);
      }
    }
  });

  it('makes the notch walkable, at the crossing&apos;s price rather than the grass&apos;s', () => {
    const { world } = buildFieldMap(fieldMaps.find((m) => m.id === 'field_map_aravali')!, { seed: DEFAULT_SEED });
    const plank = world.tiles.flat().find((t) => t.plank)!;
    expect(isWalkable(plank), 'a plank you cannot walk on is scenery').toBe(true);
    expect(stepCost(plank.biome), 'crossing a plank over open sky should cost what wading costs').toBe(
      CROSSING_ON_FOOT
    );
  });

  it('draws every plank exactly once, on a frame the sheet holds', () => {
    const { world } = buildFieldMap(fieldMaps.find((m) => m.id === 'field_map_aravali')!, { seed: DEFAULT_SEED });
    const drawn = planPlanks(world);
    expect(drawn.length, 'a plank is flagged and nothing draws it').toBe(
      world.tiles.flat().filter((t) => t.plank).length
    );
    expect(new Set(drawn.map((d) => `${d.x},${d.y}`)).size, 'a plank is drawn twice').toBe(drawn.length);
    for (const p of drawn) {
      expect(p.frame, `frame ${p.frame} is off the sheet`).toBeGreaterThanOrEqual(0);
      expect(p.frame, `frame ${p.frame} is off the sheet`).toBeLessThan(BRIDGE_PIECES);
    }
  });

  it('reaches the screen, which is the whole point of the change', () => {
    const scene = buildFieldMap(fieldMaps.find((m) => m.id === 'field_map_aravali')!, { seed: DEFAULT_SEED });
    const drawn = planScene(scene).filter((p) => p.sheet === 'bridge');
    expect(drawn.length, 'the planks are flagged but nothing draws them').toBe(
      scene.world.tiles.flat().filter((t) => t.plank).length
    );
  });
});
