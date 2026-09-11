// The windmill sheets, and the one assertion that would have caught what went wrong.
//
// **A sheet of six cells arrived where all six were the same picture.** It was asked for as "the
// same mill in each cell, the blades turning fifteen degrees between them", and what came back had
// the tower at `y 79-709` pixel-identically in every cell and the sails in the same place too --
// six copies of one position, with the rotation the sheet existed for simply absent. Nothing in
// this repository could have said so: the file was the right size, the right cell count and the
// right colour depth, and every test passed.
//
// The rotation is done in `tools/build-windmill.js` now, from a single painted wheel, so that
// failure cannot come back the same way. It could come back a *different* way -- a rotation of
// zero, a step of zero, a source that is radially symmetric -- and all three produce the same
// symptom, which is why the assertion is on the symptom rather than on the arithmetic.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { inflateSync } from 'node:zlib';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

/** Decode an 8-bit RGBA PNG far enough to compare pixels. The builders carry their own copy of
 *  this for the same reason: no dependency is worth adding to read four bytes a pixel. */
function decode(file: string): { width: number; height: number; data: Buffer } {
  const buf = readFileSync(file);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const colour = buf[25];
  const channels = colour === 6 ? 4 : 3;
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

const blades = decode(join(ASSETS, 'windmill-blades.png'));
const tower = decode(join(ASSETS, 'windmill-tower.png'));
const CELL = blades.height;
const STEPS = blades.width / CELL;

/** Every drawn pixel of one frame, as a set of coordinates. */
function inked(frame: number): Set<number> {
  const on = new Set<number>();
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) {
      const p = (y * blades.width + frame * CELL + x) * 4;
      if (blades.data[p + 3] >= 128) on.add(y * CELL + x);
    }
  }
  return on;
}

function differs(a: number, b: number): number {
  const A = inked(a);
  const B = inked(b);
  let d = 0;
  for (const i of A) if (!B.has(i)) d += 1;
  for (const i of B) if (!A.has(i)) d += 1;
  return d / Math.max(1, A.size + B.size);
}

describe('the blade sheet is twelve positions, not twelve copies', () => {
  it('holds a whole quarter turn', () => {
    expect(STEPS, 'a four-sail wheel repeats every 90 degrees, so the loop is twelve 7.5 degree steps').toBe(12);
    expect(blades.height, 'the cell must be square or the wheel is an ellipse as it turns').toBe(CELL);
  });

  it('never repeats a frame', () => {
    // **The assertion the six-cell sheet would have failed.** Not "are they different arrays" --
    // every pair must differ, because a sheet with two identical positions stutters exactly there.
    for (let a = 0; a < STEPS; a += 1) {
      for (let b = a + 1; b < STEPS; b += 1) {
        expect(differs(a, b), `frames ${a} and ${b} are the same picture`).toBeGreaterThan(0.01);
      }
    }
  });

  it('turns by an even step rather than jumping', () => {
    // Consecutive frames should differ by *similar* amounts. A sheet where one step is four times
    // another is a wheel that lurches, which is what an unevenly authored sequence looks like and
    // is invisible in a still.
    const steps: number[] = [];
    for (let i = 0; i < STEPS; i += 1) steps.push(differs(i, (i + 1) % STEPS));
    const lo = Math.min(...steps);
    const hi = Math.max(...steps);
    expect(hi / lo, `steps range ${lo.toFixed(3)}..${hi.toFixed(3)} -- the wheel lurches`).toBeLessThan(2.2);
  });

  it('keeps the hub still while the sails move', () => {
    // The wheel turns *on* the boss, so the middle of the cell must stay put across the loop while
    // the rim changes. If the whole frame moves, the builder cropped each rotation to its own
    // content and the mill will wobble on its mount.
    const mid = Math.floor(CELL / 2);
    const r = Math.max(2, Math.floor(CELL * 0.06));
    for (let i = 1; i < STEPS; i += 1) {
      let same = 0;
      let total = 0;
      for (let y = mid - r; y <= mid + r; y += 1) {
        for (let x = mid - r; x <= mid + r; x += 1) {
          const a = (y * blades.width + 0 * CELL + x) * 4;
          const b = (y * blades.width + i * CELL + x) * 4;
          total += 1;
          if ((blades.data[a + 3] >= 128) === (blades.data[b + 3] >= 128)) same += 1;
        }
      }
      expect(same / total, `frame ${i}: the hub does not sit where frame 0's hub sits`).toBeGreaterThan(0.85);
    }
  });
});

describe('the tower is the standing half', () => {
  it('is one tile wide and two tall, bottom-anchored', () => {
    // Nothing calls `setDisplaySize` on an anchored sprite, so a sheet's cell size *is* its size on
    // screen -- 128 x 256 is two tiles tall at the game's 128-pixel tile.
    expect(tower.width).toBe(128);
    expect(tower.height).toBe(256);
    let lowest = -1;
    for (let y = tower.height - 1; y >= 0 && lowest < 0; y -= 1) {
      for (let x = 0; x < tower.width; x += 1) {
        if (tower.data[(y * tower.width + x) * 4 + 3] >= 128) { lowest = y; break; }
      }
    }
    expect(lowest, 'the tower floats: its lowest ink is not on the bottom edge').toBeGreaterThan(tower.height - 3);
  });

  it('carries no sails of its own', () => {
    // The wheel is a separate sprite. If the tower sheet were ever rebuilt from a source that had
    // blades painted on, there would be two wheels on the mill and only one of them would turn.
    //
    // **The signal was measured before the threshold was picked**, which is the rule
    // `docs/testing.md` carries and which the first version of this assertion broke. That version
    // compared the hub row against the very bottom row and expected the hub to be narrower --
    // wrong, because the tower is a cone standing on a flight of steps, so the bottom row is the
    // *narrowest* thing on it (76 px against a widest of 123) and the ratio came out at 2.37.
    //
    // Against the widest point instead, the profile is: 43 px at 15% of the height, 83 at the hub,
    // 123 at 87%. So the hub row is **0.67 of the building's widest**. The painted wheel is 981
    // source pixels across against the tower's 668, so a sheet with sails on it would put the hub
    // row past the widest point entirely -- over 1.0. Two thirds against over one is a gap worth
    // asserting in the middle of.
    const widthAt = (y: number) => {
      let l = -1, r = -1;
      for (let x = 0; x < tower.width; x += 1) {
        if (tower.data[(y * tower.width + x) * 4 + 3] >= 128) { if (l < 0) l = x; r = x; }
      }
      return l < 0 ? 0 : r - l + 1;
    };
    let widest = 0;
    for (let y = 0; y < tower.height; y += 1) widest = Math.max(widest, widthAt(y));
    const hub = widthAt(Math.round(tower.height * 0.44));
    expect(hub / widest, 'the hub row is as wide as the whole building — sails may be painted on').toBeLessThan(0.9);
  });
});
