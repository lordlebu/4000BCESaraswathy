// The tall things: trees, an anthill, a bee colony, stepping stones.
//
// A second sheet rather than more frames on `overdraw.png`, because features obey a different rule
// and keeping them in one file would mean one test could no longer state either rule cleanly.
//
// The overdraw rule is *nothing above row 16 of 32* -- grass to the knee reads as depth, grass to
// the chest loses the character behind it. A tree breaks that by definition, so features get their
// own bargain instead:
//
//   * **They may reach row 4**, near the top of the cell.
//   * **They are offset toward one side**, never centred, so a traveller standing on the tile is
//     beside the trunk rather than behind it. `OFFSET` is how far from centre the mass sits.
//   * **They are rare** -- roughly one tile in twelve -- so the map has trees rather than a forest
//     of obstructions.
//
// The offset is the part doing the work. A centred tree at this height would hide the player
// completely for as long as he stood there; a tree pushed to the edge covers his shoulder at worst
// and reads as something he is walking past.
//
// **The shapes here are placeholders.** Grass was right to generate -- a blade is a one-pixel
// vertical run and a loop states it exactly. A tree is not: it is a silhouette, and drawing one
// with ellipses produces a green disc on a stick. The anthill, boulder, stepping stones, driftwood
// and cactus came out fine because they *are* simple masses; the neem, palm, pine, mangrove and
// bee colony want prompted art, using the recipe that produced the landmarks.
//
// What this file settles is the *placement contract* -- the offset, the ceiling, the per-biome
// assignment and the tests around them -- so that swapping in better art is a file drop rather
// than a redesign.
//
//   node tools/build-features.js
//
// CommonJS, like everything in tools/ -- see tools/package.json.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets');
const CELL = 32;

/**
 * How far from the cell's centre a feature's mass sits, in pixels.
 *
 * The whole safety argument rests on this. Alternating sides per variant means a run of tiles does
 * not build a wall down one edge of the map.
 */
const OFFSET = 7;

/** The highest row a feature may touch. Grass stops at 16; a tree is allowed most of the cell. */
const CEILING = 4;

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

// --- drawing --------------------------------------------------------------

const hex = (value) => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5, 7), 16)
];

function canvas() {
  return Buffer.alloc(CELL * CELL * 4);
}

function plot(pixels, x, y, colour) {
  if (x < 0 || x >= CELL || y < CEILING || y >= CELL) return;
  const p = (y * CELL + x) * 4;
  pixels[p] = colour[0];
  pixels[p + 1] = colour[1];
  pixels[p + 2] = colour[2];
  pixels[p + 3] = 255;
}

function fill(pixels, x0, y0, x1, y1, colour) {
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) plot(pixels, x, y, colour);
}

/** A rounded mass, the shape every canopy in this sheet is built from. */
function blob(pixels, cx, cy, rx, ry, colour) {
  for (let y = -ry; y <= ry; y += 1) {
    for (let x = -rx; x <= rx; x += 1) {
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) > 1.05) continue;
      plot(pixels, cx + x, cy + y, colour);
    }
  }
}

/** A broad-canopy tree: trunk, dark mass, lighter crown. Neem, tamarind, date palm all share it. */
function tree(spec, side) {
  const pixels = canvas();
  const cx = CELL / 2 + side * OFFSET;
  const trunk = hex(spec.trunk);
  const dark = hex(spec.dark);
  const light = hex(spec.light);
  const base = CELL - 1;
  // Trunk first, so the canopy overlaps it rather than the other way round.
  fill(pixels, cx - 1, base - spec.trunkHeight, cx + 1, base, trunk);
  if (spec.palm) {
    // A palm is fronds radiating from the top of a bare trunk, not a mass.
    const top = base - spec.trunkHeight;
    for (const [dx, dy] of [[-6, 1], [-4, -2], [0, -4], [4, -2], [6, 1], [-3, 3], [3, 3]]) {
      for (let i = 1; i <= 3; i += 1) {
        plot(pixels, cx + Math.round((dx * i) / 3), top + Math.round((dy * i) / 3), i > 2 ? light : dark);
      }
    }
  } else {
    const cy = base - spec.trunkHeight - spec.canopyR + 2;
    blob(pixels, cx, cy, spec.canopyR + 1, spec.canopyR, dark);
    blob(pixels, cx - 1, cy - 1, spec.canopyR - 2, spec.canopyR - 2, light);
  }
  return pixels;
}

/** A narrow conifer: a stack of shrinking bands. */
function pine(side) {
  const pixels = canvas();
  const cx = CELL / 2 + side * OFFSET;
  const dark = hex('#3c5a4a');
  const light = hex('#55765f');
  fill(pixels, cx, CELL - 4, cx, CELL - 1, hex('#4a3b2c'));
  let width = 1;
  for (let y = CELL - 5; y >= 6; y -= 1) {
    fill(pixels, cx - width, y, cx + width, y, (y % 4 === 0) ? light : dark);
    if (y % 3 === 0) width += 1;
    if (width > 5) width = 5;
  }
  return pixels;
}

/** An anthill: a cone of red earth with a dark mouth. */
function anthill(side) {
  const pixels = canvas();
  const cx = CELL / 2 + side * OFFSET;
  const earth = hex('#8a5a3c');
  const shade = hex('#6d452e');
  for (let i = 0; i < 9; i += 1) {
    const w = 7 - Math.floor(i * 0.7);
    fill(pixels, cx - w, CELL - 1 - i, cx + w, CELL - 1 - i, i > 5 ? shade : earth);
  }
  plot(pixels, cx, CELL - 9, hex('#3a2418'));
  return pixels;
}

/**
 * A bee colony: comb slabs hanging on a trunk, with a few bees adrift.
 *
 * Canon has no beekeeping, but wild comb on a forest trunk is a thing a naturalist would stop and
 * write down -- which is the whole activity of this game.
 */
function beeColony(side) {
  const pixels = canvas();
  const cx = CELL / 2 + side * OFFSET;
  const bark = hex('#4a3a2a');
  const comb = hex('#c9a24e');
  const combDark = hex('#a07f36');
  fill(pixels, cx - 2, 8, cx + 2, CELL - 1, bark);
  for (const [dy, w] of [[12, 4], [17, 5], [22, 4]]) {
    blob(pixels, cx + 4, dy, w, 2, comb);
    blob(pixels, cx + 4, dy + 1, w - 1, 1, combDark);
  }
  for (const [dx, dy] of [[9, 10], [11, 15], [8, 20]]) plot(pixels, cx + dx, dy, hex('#2b2118'));
  return pixels;
}

/** Stepping stones across water: three flat slabs, read as a crossing. */
function steppingStones() {
  const pixels = canvas();
  const stone = hex('#8c8c8e');
  const shade = hex('#6d6d70');
  for (const [cx, cy] of [[8, 24], [16, 19], [24, 25]]) {
    blob(pixels, cx, cy, 4, 2, stone);
    blob(pixels, cx, cy + 1, 3, 1, shade);
  }
  return pixels;
}

/** Driftwood or a fallen log: one horizontal bleached mass. */
function log(spec) {
  const pixels = canvas();
  const body = hex(spec.body);
  const shade = hex(spec.shade);
  blob(pixels, CELL / 2, CELL - 6, 11, 3, body);
  blob(pixels, CELL / 2, CELL - 5, 10, 1, shade);
  return pixels;
}

/** A boulder: a rounded grey mass, low and solid. */
function boulder() {
  const pixels = canvas();
  blob(pixels, CELL / 2, CELL - 7, 8, 6, hex('#8a8590'));
  blob(pixels, CELL / 2 - 2, CELL - 9, 5, 3, hex('#a09aa6'));
  return pixels;
}

/** A mangrove: arching prop roots under a low canopy. */
function mangrove(side) {
  const pixels = canvas();
  const cx = CELL / 2 + side * OFFSET;
  const root = hex('#6a5240');
  const dark = hex('#4a6b4e');
  const light = hex('#638a63');
  for (const dx of [-6, -3, 0, 3, 6]) {
    for (let i = 0; i < 7; i += 1) {
      plot(pixels, cx + dx + Math.round((dx * i) / 14), CELL - 1 - i, root);
    }
  }
  blob(pixels, cx, CELL - 13, 9, 5, dark);
  blob(pixels, cx - 1, CELL - 15, 6, 3, light);
  return pixels;
}

/** A cactus: one column with two arms. The desert's silhouette. */
function cactus(side) {
  const pixels = canvas();
  const cx = CELL / 2 + side * OFFSET;
  const body = hex('#4e7a52');
  const light = hex('#679067');
  fill(pixels, cx - 2, 9, cx + 2, CELL - 1, body);
  fill(pixels, cx - 1, 9, cx - 1, CELL - 1, light);
  fill(pixels, cx - 6, 16, cx - 3, 18, body);
  fill(pixels, cx - 6, 13, cx - 5, 17, body);
  fill(pixels, cx + 3, 20, cx + 6, 22, body);
  fill(pixels, cx + 5, 16, cx + 6, 21, body);
  return pixels;
}

/** A stand of bamboo: several thin verticals of varying height. */
function bamboo(side) {
  const pixels = canvas();
  const cx = CELL / 2 + side * OFFSET;
  const stalk = hex('#7c8f4a');
  const light = hex('#9aab63');
  const heights = [18, 24, 14, 21, 16];
  heights.forEach((h, i) => {
    const x = cx - 4 + i * 2;
    fill(pixels, x, CELL - h, x, CELL - 1, i % 2 === 0 ? stalk : light);
    // Nodes, which is what makes bamboo read as bamboo rather than as reeds.
    for (let y = CELL - h + 3; y < CELL - 1; y += 5) plot(pixels, x, y, hex('#5f6d38'));
  });
  return pixels;
}

/** A lotus pad cluster: flat discs on standing water, no height at all. */
function lotusPads() {
  const pixels = canvas();
  const pad = hex('#4f7d5c');
  const light = hex('#679a6e');
  for (const [cx, cy, r] of [[9, 22, 4], [18, 26, 5], [24, 20, 3], [14, 18, 3]]) {
    blob(pixels, cx, cy, r, r - 1, pad);
    plot(pixels, cx, cy - 1, light);
  }
  return pixels;
}

/** A tussock: a dense hummock of marsh root. */
function tussock() {
  const pixels = canvas();
  const dark = hex('#5c7a52');
  const light = hex('#76946a');
  blob(pixels, CELL / 2, CELL - 6, 7, 5, dark);
  for (let i = 0; i < 9; i += 1) {
    const x = CELL / 2 - 6 + i * 1.5;
    fill(pixels, Math.round(x), CELL - 12, Math.round(x), CELL - 8, light);
  }
  return pixels;
}

/** A tulsi pot: sacred basil by a doorway. Small, domestic, unmistakably tended. */
function tulsiPot() {
  const pixels = canvas();
  const pot = hex('#9c6244');
  const leaf = hex('#4e7a4a');
  fill(pixels, 13, CELL - 6, 19, CELL - 1, pot);
  fill(pixels, 12, CELL - 7, 20, CELL - 6, hex('#b07452'));
  blob(pixels, 16, CELL - 10, 4, 4, leaf);
  return pixels;
}

/** A woodpile: stacked cut lengths, low and orderly. */
function woodpile() {
  const pixels = canvas();
  const end = hex('#8a6a48');
  const dark = hex('#654e35');
  for (let row = 0; row < 3; row += 1) {
    for (let i = 0; i < 5 - row; i += 1) {
      const x = 9 + i * 3 + row;
      const y = CELL - 3 - row * 3;
      fill(pixels, x, y - 1, x + 1, y, row % 2 === 0 ? end : dark);
    }
  }
  return pixels;
}

// --- what to build --------------------------------------------------------

/**
 * Every feature, in sheet order. `sides` is how many mirrored variants it carries: two for
 * anything with a trunk, so a run of tiles does not build a hedge down one side of the map.
 */
const FEATURES = [
  { id: 'neem-plains', sides: 2, draw: (s) => tree({ trunk: '#5a4632', dark: '#46703f', light: '#5f8c52', trunkHeight: 7, canopyR: 8 }, s) },
  { id: 'anthill-plains', sides: 2, draw: anthill },
  { id: 'bamboo-forest', sides: 2, draw: bamboo },
  { id: 'bees-forest', sides: 2, draw: beeColony },
  { id: 'log-forest', sides: 1, draw: () => log({ body: '#5e4a36', shade: '#4a3a2a' }) },
  { id: 'mangrove-wetland', sides: 2, draw: mangrove },
  { id: 'lotus-wetland', sides: 1, draw: lotusPads },
  { id: 'tussock-wetland', sides: 1, draw: tussock },
  { id: 'stones-river', sides: 1, draw: steppingStones },
  { id: 'palm-settlement', sides: 2, draw: (s) => tree({ trunk: '#6b5236', dark: '#5c7a3e', light: '#7a9a52', trunkHeight: 14, canopyR: 6, palm: true }, s) },
  { id: 'tulsi-settlement', sides: 1, draw: tulsiPot },
  { id: 'woodpile-settlement', sides: 1, draw: woodpile },
  { id: 'mangrove-coast', sides: 2, draw: mangrove },
  { id: 'driftwood-coast', sides: 1, draw: () => log({ body: '#a89880', shade: '#8b7c66' }) },
  { id: 'pine-hills', sides: 2, draw: pine },
  { id: 'boulder-hills', sides: 1, draw: boulder },
  { id: 'cactus-desert', sides: 2, draw: cactus }
];

function main() {
  const frames = [];
  const order = [];
  for (const feature of FEATURES) {
    for (let i = 0; i < feature.sides; i += 1) {
      // Side -1 leans left of centre, +1 right. A one-sided feature sits centred, which is safe
      // because everything one-sided here is low: a log, a boulder, pads on water.
      frames.push(feature.draw(feature.sides === 1 ? 0 : i === 0 ? -1 : 1));
      order.push(feature.id);
    }
  }

  const sheetWidth = CELL * frames.length;
  const sheet = Buffer.alloc(sheetWidth * CELL * 4);
  frames.forEach((frame, index) => {
    for (let y = 0; y < CELL; y += 1) {
      const from = y * CELL * 4;
      const to = (y * sheetWidth + index * CELL) * 4;
      frame.copy(sheet, to, from, from + CELL * 4);
    }
  });

  const file = path.join(OUT, 'features.png');
  fs.writeFileSync(file, encodePng(sheetWidth, CELL, sheet));
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`features: ${frames.length} frames of ${CELL}x${CELL}, ${kb} KB`);
  console.log(`  ${order.join(', ')}`);
}

main();
