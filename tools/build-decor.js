// The small things scattered across the ground.
//
// `endgame.png` holds roughly forty discrete objects in one screen: lily pads, lotus flowers, reed
// clumps at three sizes, scattered rocks, a snail, low bushes, a pot. None of them centred in a
// cell, none on the same beat. The shipped game has generated grass and a tree on one tile in
// twelve, all of it grid-aligned, which is why the map reads as empty next to the target.
//
// This is the sheet that fills it. It is a *third* layer with a third contract, and the three are
// worth stating together because getting them confused is how this part of the renderer tangles:
//
//   * **overdraw** is what the traveller wades *into*. Rooted at the bottom edge, never above the
//     halfway line, drawn over him so his legs disappear into it.
//   * **features** are the rare tall things he walks *past*. One tile in twelve, offset to one
//     side so they never sit behind him.
//   * **decor** -- this file -- is what lies *on* the ground. Small, dense, several to a tile, and
//     drawn below him, so he walks over a stone rather than behind it.
//
// That last point is what makes decor safe to place anywhere in the cell including dead centre,
// and it is the whole reason it can be dense where the other two cannot. Nothing here may stand
// tall enough to read as an object he should be occluded by: the ceiling is a third of the cell,
// against overdraw's half and features' seven-eighths.
//
// **Generated rather than prompted, and that is a considered choice rather than a shortcut.**
// `build-features.js` recorded the rule the hard way: simple masses -- an anthill, a boulder,
// stepping stones, driftwood -- came out fine from a loop, while a neem tree drawn with ellipses
// produced a green disc on a stick and wanted real art. Everything in this file is in the first
// category. A lily pad is an ellipse with a notch; a pebble is a blob with one lighter edge. There
// is no version of describing that to an image model that beats stating it.
//
//   node tools/build-decor.js
//
// CommonJS, like everything in tools/ -- see tools/package.json.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets');

/** Matches GRID in src/game/frames.ts. Drawn at full size, unlike overdraw and features. */
const CELL = 128;

/**
 * Nothing may rise above this row.
 *
 * A third of the cell. Decor is drawn *below* the traveller, so a tall piece does not hide him --
 * it does something worse and reads as ground he should be standing behind. Keeping it low is what
 * keeps the layer legible as scatter rather than as scenery.
 */
const CEILING = Math.round(CELL * 0.66);

/** Variants per prop, so a shoreline of pads is not one pad repeated. */
const VARIANTS = 3;

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
 * FNV-1a with a murmur3 finaliser, the same as `tools/build-edges.js`.
 *
 * The avalanche is not optional and the reason is written up there: without it, keys differing only
 * in a trailing index return nearly equal values, and every variant of a prop comes out the same
 * shape. That cost two rebuilds on the edge masks; it is copied here rather than rediscovered.
 */
function hash(...parts) {
  let h = 2166136261;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= 0x2c;
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

const unit = (...parts) => hash(...parts) / 4294967296;
/** A float in [lo,hi). */
const between = (lo, hi, ...parts) => lo + (hi - lo) * unit(...parts);

// --- drawing --------------------------------------------------------------

const hex = (v) => [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];

const canvas = () => Buffer.alloc(CELL * CELL * 4);

function plot(pixels, x, y, colour, alpha = 255) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || x >= CELL || y < CEILING || y >= CELL) return;
  const p = (y * CELL + x) * 4;
  pixels[p] = colour[0];
  pixels[p + 1] = colour[1];
  pixels[p + 2] = colour[2];
  pixels[p + 3] = alpha;
}

/**
 * A rounded mass with a slightly irregular rim.
 *
 * The wobble is what stops eight pebbles reading as eight copies of one ellipse. It is a function
 * of the angle and the seed, so it is stable across a rebuild.
 */
function blob(pixels, cx, cy, rx, ry, colour, seed, wobble = 0.18) {
  for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry) + 1; y += 1) {
    for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx) + 1; x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const a = Math.atan2(dy, dx);
      // Two lobes of wobble, so the rim is irregular rather than merely oval.
      const r =
        1 +
        wobble * (unit(seed, 'w', Math.round(a * 3)) - 0.5) +
        wobble * 0.5 * (unit(seed, 'v', Math.round(a * 7)) - 0.5);
      if (dx * dx + dy * dy <= r * r) plot(pixels, x, y, colour);
    }
  }
}

/** A short stroke, for stems and reed blades. */
function stroke(pixels, x0, y0, x1, y1, width, colour) {
  const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) + 1;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    for (let w = 0; w < width; w += 1) plot(pixels, x + w - (width - 1) / 2, y, colour);
  }
}

/**
 * The contact shadow every prop gets.
 *
 * A soft ellipse under the mass, drawn first so the prop sits on top of it. Without one, a stone
 * reads as floating over the ground rather than resting on it -- and `docs/art-brief.md` now
 * *requires* ambient shading under a mass, where the old direction forbade it. This is that rule,
 * applied to the smallest things on the map.
 */
function shadow(pixels, cx, cy, rx, ry) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      // Darkest at the centre, gone at the rim.
      plot(pixels, x, y, [26, 32, 30], Math.round(70 * (1 - d)));
    }
  }
}

// --- the props ------------------------------------------------------------

/**
 * Every prop, keyed by the ground it lies on.
 *
 * Colours are pulled toward each biome rather than invented, so a stone on the hills is hill-brown
 * and a pad on the river is river-green. `docs/art-brief.md` keeps the palette; these sit one or
 * two steps off it.
 */
const PROPS = [
  // --- water and wetland ---
  { id: 'lily-pad', biomes: ['river', 'wetland'], draw: pad('#4f7d52', '#638f5f') },
  { id: 'lotus', biomes: ['wetland'], draw: flower('#4f7d52', '#d9a8bd', '#f0dca8') },
  { id: 'reed-tuft', biomes: ['wetland', 'river'], draw: tuft('#5c7a4a', 3, 5) },
  { id: 'marsh-stone', biomes: ['wetland', 'river'], draw: stones('#7d8478', '#949a8e', 3) },

  // --- open ground ---
  { id: 'pebbles', biomes: ['plains', 'hills', 'coast', 'settlement'], draw: stones('#8a8375', '#a19a8a', 4) },
  { id: 'wildflower', biomes: ['plains'], draw: flower('#6d8a48', '#e0c56a', '#f2e6b8') },
  { id: 'clover', biomes: ['plains', 'settlement'], draw: patch('#6f9048', 5) },
  { id: 'twig', biomes: ['plains', 'forest', 'hills'], draw: twig('#6b5741') },

  // --- forest floor ---
  { id: 'leaf-litter', biomes: ['forest'], draw: patch('#6a5a38', 6) },
  { id: 'mushroom', biomes: ['forest'], draw: mushroom('#8a6b4a', '#c9b28c') },
  { id: 'forest-stone', biomes: ['forest'], draw: stones('#6f7466', '#868b7a', 3) },

  // --- hills and high ground ---
  { id: 'scree', biomes: ['hills', 'mountains'], draw: stones('#87826f', '#9c9784', 6) },
  { id: 'boulder-small', biomes: ['hills', 'mountains'], draw: boulder('#7f7a68', '#98937f') },

  // --- dry ground ---
  { id: 'desert-stone', biomes: ['desert'], draw: stones('#a08a63', '#b6a179', 3) },
  { id: 'dry-brush', biomes: ['desert'], draw: tuft('#8f8055', 3, 3) },

  // --- shore ---
  { id: 'shell', biomes: ['coast'], draw: shell('#d9c6a4', '#efe2c6') },
  { id: 'driftwood-small', biomes: ['coast'], draw: twig('#9a8c74') }
];

/** A lily pad: a flat disc with a wedge cut out of it. */
function pad(dark, light) {
  return (px, seed) => {
    const cx = CELL / 2;
    const cy = CELL * 0.82;
    const rx = between(CELL * 0.16, CELL * 0.22, seed, 'rx');
    const ry = rx * 0.62;
    blob(px, cx, cy, rx, ry, hex(dark), seed + 'pad');
    blob(px, cx, cy - ry * 0.18, rx * 0.72, ry * 0.6, hex(light), seed + 'inner', 0.14);
    // The notch, which is what makes it a pad rather than a coin.
    const a = between(0, Math.PI * 2, seed, 'notch');
    stroke(px, cx, cy, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 3, hex('#3d5f42'));
  };
}

/** A flower: a low stem, a few petals, a centre. */
function flower(stem, petal, heart) {
  return (px, seed) => {
    const cx = CELL / 2 + between(-6, 6, seed, 'fx');
    const base = CELL * 0.9;
    const top = base - between(CELL * 0.1, CELL * 0.15, seed, 'h');
    shadow(px, cx, base, 7, 3);
    stroke(px, cx, base, cx, top, 3, hex(stem));
    const n = 5;
    const r = between(5, 8, seed, 'petal');
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2 + unit(seed, 'rot');
      blob(px, cx + Math.cos(a) * r, top + Math.sin(a) * r * 0.7, r * 0.72, r * 0.6, hex(petal), seed + i, 0.25);
    }
    blob(px, cx, top, r * 0.42, r * 0.36, hex(heart), seed + 'heart', 0.1);
  };
}

/** A tuft of short blades, rooted low. */
function tuft(colour, width, count) {
  return (px, seed) => {
    const cx = CELL / 2 + between(-8, 8, seed, 'tx');
    const base = CELL * 0.92;
    shadow(px, cx, base, 9, 3);
    for (let i = 0; i < count; i += 1) {
      const lean = between(-9, 9, seed, 'lean', i);
      const h = between(CELL * 0.1, CELL * 0.18, seed, 'h', i);
      stroke(px, cx + lean * 0.3, base, cx + lean, base - h, width, hex(colour));
    }
  };
}

/** A scatter of small stones. */
function stones(dark, light, count) {
  return (px, seed) => {
    for (let i = 0; i < count; i += 1) {
      const cx = between(CELL * 0.28, CELL * 0.72, seed, 'sx', i);
      const cy = between(CELL * 0.76, CELL * 0.94, seed, 'sy', i);
      const r = between(4, 8, seed, 'sr', i);
      shadow(px, cx, cy + r * 0.5, r * 1.25, r * 0.55);
      blob(px, cx, cy, r, r * 0.78, hex(dark), seed + 'st' + i);
      // One lighter edge, which is the whole of the modelling and enough at this size.
      blob(px, cx - r * 0.22, cy - r * 0.24, r * 0.55, r * 0.42, hex(light), seed + 'lt' + i, 0.12);
    }
  };
}

/** One larger rounded rock. */
function boulder(dark, light) {
  return (px, seed) => {
    const cx = CELL / 2 + between(-8, 8, seed, 'bx');
    const cy = CELL * 0.84;
    const r = between(11, 15, seed, 'br');
    shadow(px, cx, cy + r * 0.55, r * 1.35, r * 0.5);
    blob(px, cx, cy, r, r * 0.8, hex(dark), seed + 'bo');
    blob(px, cx - r * 0.25, cy - r * 0.28, r * 0.5, r * 0.36, hex(light), seed + 'bl', 0.12);
  };
}

/** A low patch of ground cover -- clover, leaf litter. */
function patch(colour, count) {
  return (px, seed) => {
    for (let i = 0; i < count; i += 1) {
      const cx = between(CELL * 0.3, CELL * 0.7, seed, 'px', i);
      const cy = between(CELL * 0.78, CELL * 0.94, seed, 'py', i);
      const r = between(3, 6, seed, 'pr', i);
      blob(px, cx, cy, r, r * 0.7, hex(colour), seed + 'pa' + i, 0.3);
    }
  };
}

/** A fallen twig or piece of driftwood. */
function twig(colour) {
  return (px, seed) => {
    const cx = CELL / 2 + between(-10, 10, seed, 'wx');
    const cy = CELL * 0.88;
    const len = between(12, 20, seed, 'wl');
    const a = between(-0.5, 0.5, seed, 'wa');
    const dx = Math.cos(a) * len;
    const dy = Math.sin(a) * len * 0.4;
    shadow(px, cx, cy + 3, len * 0.8, 3);
    stroke(px, cx - dx / 2, cy - dy / 2, cx + dx / 2, cy + dy / 2, 3, hex(colour));
    // One fork, so it reads as a twig rather than a dash.
    stroke(px, cx, cy, cx + dx * 0.3, cy - 5, 2, hex(colour));
  };
}

/** A cap on a short stalk. */
function mushroom(cap, stalk) {
  return (px, seed) => {
    const cx = CELL / 2 + between(-9, 9, seed, 'mx');
    const base = CELL * 0.9;
    const h = between(7, 11, seed, 'mh');
    const r = between(5, 8, seed, 'mr');
    shadow(px, cx, base, r * 1.2, 3);
    stroke(px, cx, base, cx, base - h, 3, hex(stalk));
    blob(px, cx, base - h, r, r * 0.6, hex(cap), seed + 'cap', 0.12);
  };
}

/** A shell: a small fan with ribs. */
function shell(dark, light) {
  return (px, seed) => {
    const cx = CELL / 2 + between(-10, 10, seed, 'hx');
    const cy = CELL * 0.87;
    const r = between(6, 9, seed, 'hr');
    shadow(px, cx, cy + 2, r * 1.2, 3);
    blob(px, cx, cy, r, r * 0.75, hex(dark), seed + 'sh', 0.1);
    for (let i = -2; i <= 2; i += 1) {
      stroke(px, cx, cy + r * 0.5, cx + i * r * 0.32, cy - r * 0.5, 1, hex(light));
    }
  };
}

// --- build ----------------------------------------------------------------

/**
 * Sheets wrap into rows rather than running as one long strip.
 *
 * WebGL's MAX_TEXTURE_SIZE is 8,192 on ordinary hardware. Past it the upload fails with
 * `INVALID_VALUE: texImage2D` and the texture is simply never created, so every sprite drawn from
 * it renders black -- see the note in `tools/build-overdraw.js`, where this actually bit.
 *
 * Phaser indexes a spritesheet left-to-right then top-to-bottom, so wrapping changes no frame
 * number and the `*_ORDER` lists in `frames.ts` are unaffected.
 */
const MAX_SHEET_WIDTH = 4096;

/** Rows and columns for `count` frames of `cellWidth`, wrapped to stay inside the limit. */
function sheetLayout(count, cellWidth) {
  const columns = Math.max(1, Math.min(count, Math.floor(MAX_SHEET_WIDTH / cellWidth)));
  return { columns, rows: Math.ceil(count / columns) };
}

function main() {
  const frames = [];
  for (const prop of PROPS) {
    for (let v = 0; v < VARIANTS; v += 1) frames.push({ prop, variant: v });
  }

  const { columns, rows } = sheetLayout(frames.length, CELL);
  const sheetWidth = CELL * columns;
  const sheetHeight = CELL * rows;
  const sheet = Buffer.alloc(sheetWidth * sheetHeight * 4);
  frames.forEach(({ prop, variant }, index) => {
    const px = canvas();
    prop.draw(px, `${prop.id}:${variant}`);
    const ox = (index % columns) * CELL;
    const oy = Math.floor(index / columns) * CELL;
    for (let y = 0; y < CELL; y += 1) {
      const from = y * CELL * 4;
      const to = ((oy + y) * sheetWidth + ox) * 4;
      px.copy(sheet, to, from, from + CELL * 4);
    }
  });

  const file = path.join(OUT, 'decor.png');
  fs.writeFileSync(file, encodePng(sheetWidth, sheetHeight, sheet));
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`decor: ${frames.length} frames of ${CELL}x${CELL} in ${columns}x${rows}, ${kb} KB`);
  console.log(`  ${PROPS.length} props x ${VARIANTS} variants`);
  console.log(`  order: ${PROPS.map((p) => p.id).join(', ')}`);
}

main();
