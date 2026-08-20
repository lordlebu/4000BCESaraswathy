// The masks that stop the map being a grid.
//
// Every tile is an opaque square, so where two biomes meet there is a straight line and a
// staircase. Nothing in `endgame.png` has either. This builds the sheet that fixes it: a set of
// **alpha masks**, each one a soft irregular gradient that fades from solid along one edge of the
// cell to nothing before it reaches the far side.
//
// The scene draws them as a second pass. For a tile whose northern neighbour is plains, it stamps
// *the plains texture* over the tile through the north mask -- so plains bleeds down into the cell
// along a torn edge instead of stopping at the boundary. The mask is the shape of the bleed; the
// texture is whatever the neighbour happens to be. That is why one small set of masks covers every
// pair of biomes, rather than needing art per combination.
//
// Generated rather than prompted, for the same reason the grass is. A soft irregular gradient is
// something a loop states exactly, and an image model would hand back a picture *of* a gradient at
// the wrong size with a border drawn round it. What an image model is good at -- a banyan tree --
// this is the opposite of.
//
// Three things make the result read as torn rather than as a fade:
//
//   * **Value noise along the edge**, so the depth of the bleed varies from 40% to 100% of its
//     nominal reach. A constant depth is a soft straight line, which is still a straight line.
//   * **A curve on the falloff.** Linear alpha looks like a printing error; this eases out, so the
//     bleed is strong where it starts and thins quickly.
//   * **Variants.** Four per edge, chosen per tile from the world seed. One mask repeated along a
//     coastline puts an identical tear on every cell of it, which is a grid again by another route.
//
// The corners are deliberately *not* handled by their own masks. Two adjacent edge masks overlap
// in the corner and their alpha compounds, which is what a corner should look like -- and a
// dedicated corner set would be four more variants per configuration for a case the eye reads as
// "the bleed is a bit deeper here".
//
//   node tools/build-edges.js
//
// CommonJS, like everything in tools/ -- see tools/package.json.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets');

/** Matches GRID in src/game/frames.ts. */
const CELL = 128;

/**
 * How many differently-torn versions of each edge the sheet carries.
 *
 * Four, for the reason `build-overdraw.js` needed three scatters: one shape repeated along a
 * boundary is a pattern, and a pattern on a boundary is the grid the whole layer exists to hide.
 * Four is enough that a coastline of a dozen tiles does not visibly repeat.
 */
const VARIANTS = 4;

/** North, east, south, west -- the order the scene indexes with. */
const EDGES = ['n', 'e', 's', 'w'];

/**
 * How far into the cell the bleed reaches, as a fraction of it.
 *
 * A third. Enough that the boundary is genuinely gone; little enough that the tile is still mostly
 * its own biome, which matters because the biome under the player is what the journal is
 * describing. A half looked better in isolation and made a wetland tile read as plains.
 */
const REACH = 0.34;

// --- PNG out --------------------------------------------------------------

let CRC_TABLE = null;
function crc(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

function encodePng(width, height, data) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const chunk = (type, body) => {
    const out = Buffer.alloc(body.length + 12);
    out.writeUInt32BE(body.length, 0);
    out.write(type, 4, 'ascii');
    body.copy(out, 8);
    out.writeInt32BE(crc(Buffer.concat([Buffer.from(type, 'ascii'), body])), body.length + 8);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// --- deterministic noise --------------------------------------------------

/**
 * Same FNV-1a shape as build-overdraw.js and src/world/rng.ts, plus a final avalanche.
 *
 * The avalanche is not decoration here, and leaving it off cost two rebuilds. FNV-1a folds each
 * byte in and multiplies, so two keys differing only in their **last** character -- which is
 * exactly what `('anchor', 64, 0)` and `('anchor', 64, 1)` are -- leave the high bits almost
 * untouched. Taking the whole 32 bits as a float then gives neighbouring anchors nearly equal
 * values: measured at 0.955, 0.951, 0.962, 0.959 across eight consecutive anchors, a spread of
 * under 3%. The masks came out with one pixel of variation along an entire edge and read as a
 * straight soft band, which looked like the noise being too weak and was really the hash.
 *
 * The other callers in tools/ get away without it because they hash *distinct words* -- a plant
 * name, a scatter index used as one of three -- rather than a run of consecutive integers.
 */
function hash(...parts) {
  let h = 2166136261;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    // Separator, so ('a','bc') and ('ab','c') are different keys.
    h ^= 0x2c;
    h = Math.imul(h, 16777619);
  }
  // Avalanche: mix the low bits up into the high ones. Murmur3's finaliser.
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

/** A hash as a float in [0,1). */
const unit = (...parts) => hash(...parts) / 4294967296;

/**
 * Smooth 1-D value noise along the edge, in [0,1).
 *
 * Random per pixel would be static, not a torn edge -- the tear has to wander over tens of pixels,
 * not jitter over one. So this samples a value every `wavelength` pixels and eases between them.
 *
 * **`wavelength` must divide the cell**, and the anchors wrap. Both matter: without wrapping, the
 * value at t=0 and the value at t=CELL differ, so a mask does not tile against a copy of itself
 * and every boundary shows a seam at the corner.
 */
function edgeNoise(variant, edge, t, wavelength, anchors) {
  const x = t / wavelength;
  const i = Math.floor(x);
  const f = x - i;
  // Smoothstep between the two anchors, so the joins are invisible.
  const ease = f * f * (3 - 2 * f);
  const a = unit(variant, edge, 'anchor', wavelength, i % anchors);
  const b = unit(variant, edge, 'anchor', wavelength, (i + 1) % anchors);
  return a + (b - a) * ease;
}

/**
 * Layered noise, rescaled to actually use its range.
 *
 * The naive sum of three octaves does not. Each is a mean-0.5 signal, so summing them with weights
 * that total 1 pulls hard toward 0.5 by the central limit theorem -- the first attempt here spanned
 * 0.642 to 0.692 across an entire edge, a 5% range, which is why the "torn" boundary measured one
 * pixel of variation and read as a straight soft band.
 *
 * Two fixes, and both were needed. Each octave is centred on zero before weighting, so they add
 * excursions rather than averaging toward the middle; and the result is normalised by the total
 * possible swing, so the output genuinely reaches both ends. This is the bug the `docs/testing.md`
 * lesson describes -- the instrument looked wrong before the signal was measured, and the signal
 * was the problem.
 */
function tornDepth(variant, edge, along) {
  // Wavelengths divide 128 so the wrap is exact. Long swell, mid ripple, short bite.
  const octaves = [
    { wavelength: 64, weight: 0.5 },
    { wavelength: 16, weight: 0.32 },
    { wavelength: 8, weight: 0.18 }
  ];
  let sum = 0;
  let total = 0;
  for (const { wavelength, weight } of octaves) {
    const anchors = CELL / wavelength;
    sum += (edgeNoise(variant, edge, along, wavelength, anchors) - 0.5) * weight;
    total += weight;
  }
  // sum is in [-total/2, +total/2]; map it back onto [0,1].
  return Math.min(1, Math.max(0, sum / total + 0.5));
}

// --- the masks ------------------------------------------------------------

/**
 * One mask: solid along `edge`, gone by `REACH` into the cell, with a torn boundary.
 *
 * Written as white pixels with varying alpha. The colour is irrelevant -- the scene tints these
 * with nothing and uses them only through a texture mask -- but a fully white RGB keeps the file
 * honest if anyone opens it, and costs nothing since the PNG compresses a constant channel away.
 */
function buildMask(variant, edge) {
  const pixels = Buffer.alloc(CELL * CELL * 4);

  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) {
      // `along` runs parallel to the edge, `into` is depth from it. Rotating the cell here rather
      // than generating four separate shapes is what keeps the four masks a matched set.
      let along;
      let into;
      if (edge === 'n') { along = x; into = y; }
      else if (edge === 's') { along = x; into = CELL - 1 - y; }
      else if (edge === 'w') { along = y; into = x; }
      else { along = y; into = CELL - 1 - x; }

      const wobble = tornDepth(variant, edge, along);

      // Depth of the bleed: 10%-100% of the nominal reach. The floor started at 40%, which
      // guaranteed a continuous band of at least that depth along every edge -- and a continuous
      // band is a line. Letting it fall almost to nothing is what makes the tile's own ground
      // actually break through in places, which is what reads as torn.
      const depth = CELL * REACH * (0.1 + 0.9 * wobble);

      let alpha = 0;
      if (into < depth) {
        const t = 1 - into / depth;
        // Eased rather than linear. t^1.6 holds the bleed strong near the edge and drops it away
        // quickly -- a linear ramp reads as a printing gradient rather than as one ground giving
        // way to another.
        alpha = Math.round(255 * Math.pow(t, 1.6));
      }

      const p = (y * CELL + x) * 4;
      pixels[p] = 255;
      pixels[p + 1] = 255;
      pixels[p + 2] = 255;
      pixels[p + 3] = alpha;
    }
  }
  return pixels;
}

function main() {
  // Frame order: all four variants of north, then east, south, west. `edgeMaskFrame` in frames.ts
  // mirrors this, and the test asserts the two agree.
  const frames = [];
  for (const edge of EDGES) {
    for (let v = 0; v < VARIANTS; v += 1) frames.push({ edge, variant: v });
  }

  const sheetWidth = CELL * frames.length;
  const sheet = Buffer.alloc(sheetWidth * CELL * 4);
  frames.forEach(({ edge, variant }, index) => {
    const frame = buildMask(variant, edge);
    for (let y = 0; y < CELL; y += 1) {
      const from = y * CELL * 4;
      const to = (y * sheetWidth + index * CELL) * 4;
      frame.copy(sheet, to, from, from + CELL * 4);
    }
  });

  const file = path.join(OUT, 'edges.png');
  fs.writeFileSync(file, encodePng(sheetWidth, CELL, sheet));
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`edges: ${frames.length} frames of ${CELL}x${CELL}, ${kb} KB`);
  console.log(`  ${EDGES.join(', ')} x ${VARIANTS} variants, reach ${Math.round(REACH * 100)}% of a cell`);
}

main();
