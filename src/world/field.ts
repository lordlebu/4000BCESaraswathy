// Scalar fields (elevation, moisture) over the tile grid.
//
// ## Why this file exists
//
// The vanilla prototype built every field by smoothing white noise seven times with a 3x3 box
// blur. Repeated box blur is a low-pass filter: each pass pulls every cell toward the mean, and
// after seven passes the field no longer spans 0–1 but a thin band around 0.5. Measured on seed
// `jambhudweepa-evening`, elevation spanned 0.094–0.478 — while `classifyBiome` wanted > 0.64 for
// hills and > 0.78 for mountains. No tile ever qualified, so hills, mountains and desert could not
// exist, `highTiles` was always empty, and `carveRiver` was never called. Nearly half the bestiary
// (48 mountain creatures, 30 desert, 21 hills) was unreachable in play.
//
// The fix is two-part and both parts matter:
//
//   1. Build terrain from **octaves of value noise** rather than blurred white noise. Interpolating
//      a coarse lattice gives smooth, large-scale shapes with the range intact; adding finer, quieter
//      octaves puts detail back without flattening anything.
//   2. **Normalise afterwards** anyway. Summed octaves land near the middle by the central limit
//      theorem, so an explicit rescale to 0–1 is what actually guarantees the classifier's upper
//      thresholds are reachable, whatever we change upstream.

import type { Random } from './rng';

export type Field = number[][];

/** Smoothstep. Interpolating a lattice linearly leaves visible creases along the cell edges. */
function ease(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * One octave of value noise: a random lattice at `cellSize` spacing, smoothly interpolated up to
 * the full grid. Larger `cellSize` means broader, calmer shapes.
 */
function valueNoise(width: number, height: number, random: Random, cellSize: number): Field {
  const cols = Math.ceil(width / cellSize) + 1;
  const rows = Math.ceil(height / cellSize) + 1;
  const lattice: Field = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => random())
  );

  const field: Field = [];
  for (let y = 0; y < height; y += 1) {
    const row: number[] = [];
    const gy = y / cellSize;
    const y0 = Math.floor(gy);
    const ty = ease(gy - y0);
    for (let x = 0; x < width; x += 1) {
      const gx = x / cellSize;
      const x0 = Math.floor(gx);
      const tx = ease(gx - x0);
      const top = lerp(lattice[y0]![x0]!, lattice[y0]![x0 + 1]!, tx);
      const bottom = lerp(lattice[y0 + 1]![x0]!, lattice[y0 + 1]![x0 + 1]!, tx);
      row.push(lerp(top, bottom, ty));
    }
    field.push(row);
  }
  return field;
}

/**
 * Sum several octaves of value noise, each half the size and half the amplitude of the last.
 * `baseCell` sets the scale of the largest features — roughly "how many tiles across is a range".
 */
export function fractalField(
  width: number,
  height: number,
  random: Random,
  { octaves = 4, baseCell = 12, persistence = 0.5 } = {}
): Field {
  const field: Field = Array.from({ length: height }, () => new Array<number>(width).fill(0));
  let amplitude = 1;
  let cellSize = baseCell;
  let total = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    const layer = valueNoise(width, height, random, Math.max(1, cellSize));
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        field[y]![x]! += layer[y]![x]! * amplitude;
      }
    }
    total += amplitude;
    amplitude *= persistence;
    cellSize /= 2;
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      field[y]![x]! /= total;
    }
  }
  return field;
}

/**
 * Rescale a field to span exactly 0–1.
 *
 * This is the guardrail against the original bug. Whatever the field's natural range turns out to
 * be, the classifier's thresholds are all reachable after this runs. A flat field (every cell
 * identical) has no range to stretch, so it is returned as a uniform 0.5 rather than dividing by
 * zero.
 */
export function normalize(field: Field): Field {
  let min = Infinity;
  let max = -Infinity;
  for (const row of field) {
    for (const value of row) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  const span = max - min;
  if (span < 1e-9) return field.map((row) => row.map(() => 0.5));
  return field.map((row) => row.map((value) => (value - min) / span));
}

/**
 * A highland spine: a wandering chain of peaks with radial falloff, added to the elevation field.
 *
 * Without this, thresholding smooth noise scatters mountains as isolated specks wherever the field
 * happens to top out. A spine gives the map a backbone for rivers to run off and gives the player
 * something legible to navigate by — which is the actual design goal in `docs/world-generator.md`.
 */
export function highlandSpine(
  width: number,
  height: number,
  random: Random,
  { peaks = 6, radius = 7, strength = 0.55 } = {}
): Field {
  const field: Field = Array.from({ length: height }, () => new Array<number>(width).fill(0));

  // Start the ridge inside the eastern two-thirds — the west edge is pulled down into the Tethyan
  // sea, so a spine over there would drown.
  let px = width * (0.45 + random() * 0.4);
  let py = height * (0.15 + random() * 0.7);
  let angle = random() * Math.PI * 2;

  for (let peak = 0; peak < peaks; peak += 1) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const distance = Math.hypot(x - px, y - py);
        if (distance > radius) continue;
        // Cosine falloff: flat-topped near the peak, feathered at the rim, no hard circle edge.
        const falloff = 0.5 * (1 + Math.cos((distance / radius) * Math.PI));
        field[y]![x]! = Math.max(field[y]![x]!, falloff * strength);
      }
    }
    // Wander rather than turn sharply, so the peaks read as one range.
    angle += (random() - 0.5) * 1.1;
    const stride = radius * (0.55 + random() * 0.4);
    px = Math.max(1, Math.min(width - 2, px + Math.cos(angle) * stride));
    py = Math.max(1, Math.min(height - 2, py + Math.sin(angle) * stride));
  }

  return field;
}
