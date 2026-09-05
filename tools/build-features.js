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
 * Authored at 32, upscaled to the 128 grid. Same bargain and same reasoning as
 * `build-overdraw.js` -- the drawing constants here are literal pixel counts (`OFFSET` below is
 * seven of them), so the art is generated at its authored size and scaled by whole pixels after.
 */
const SCALE = 4;

/** Nearest-neighbour, whole pixels only. See build-overdraw.js. */
function upscale(src, width, height, factor) {
  const outW = width * factor;
  const out = Buffer.alloc(outW * height * factor * 4);
  for (let y = 0; y < height * factor; y += 1) {
    const sy = Math.floor(y / factor);
    for (let x = 0; x < outW; x += 1) {
      const sx = Math.floor(x / factor);
      const s = (sy * width + sx) * 4;
      const d = (y * outW + x) * 4;
      out[d] = src[s];
      out[d + 1] = src[s + 1];
      out[d + 2] = src[s + 2];
      out[d + 3] = src[s + 3];
    }
  }
  return out;
}

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

/**
 * A snow-laden pine: taller than the hill pine, and white on every upward face.
 *
 * **Bigger on purpose.** The hill pine tops out at row 6; this reaches row 4, the ceiling this
 * layer allows, because a snowfield has nothing else standing on it -- no hedgerow, no scrub, no
 * second storey of vegetation. A tree that reads as ordinary among hills is the only vertical
 * thing for a hundred tiles up here, and it should look it.
 *
 * The snow is drawn as the *lit* rows rather than as a separate pass: on a conifer the load sits
 * on the upper surface of each tier, which is exactly the row the hill pine already lightens. So
 * this is the same loop with white where the highlight was, which is both simpler and more
 * correct than dusting a green tree afterwards.
 */
function snowPine(side) {
  const pixels = canvas();
  const cx = Math.round(CELL / 2 + side * OFFSET);
  const needle = hex('#31473e');
  const load = hex('#e8eef2');
  const shade = hex('#c3ced6');

  // Trunk first, so the tiers sit over it.
  fill(pixels, cx, CELL - 5, cx, CELL - 1, hex('#403326'));

  // **Widening downward, which the hill pine does not.** That one starts at width 1 at its base
  // and grows as it climbs, so it draws a cone standing on its point -- an upside-down tree that
  // has been on the sheet since it was written and reads as odd the moment anything else stands
  // beside it. Here the width is a function of depth from the tip, which is the shape a conifer
  // actually has.
  const top = 4;                 // the ceiling this layer allows
  const bottom = CELL - 6;
  const height = bottom - top;
  for (let y = top; y <= bottom; y += 1) {
    const t = (y - top) / height;          // 0 at the tip, 1 at the skirt
    const half = Math.round(1 + t * 6);
    // Snow rides the top of each tier; the rows under it are needles in shadow. Drawing the load
    // as the lit row rather than as a separate dusting pass is both simpler and truer -- on a
    // conifer that is exactly where it sits.
    const tier = (y - top) % 4;
    if (tier === 0) {
      fill(pixels, cx - half, y, cx + half, y, load);
    } else if (tier === 1) {
      fill(pixels, cx - half + 1, y, cx + half - 1, y, shade);
    } else {
      fill(pixels, cx - half, y, cx + half, y, needle);
    }
  }
  return pixels;
}

/**
 * A big shard of crystal jutting out of the ground, with sparkles.
 *
 * **Moved here from the decor sheet, and the move is the point.** Decor is what lies *on* the
 * ground -- pebbles, litter, a shell -- drawn below the traveller and capped at a third of a cell.
 * Crystal that low is gravel. A shard is a thing you walk *past*, which is this layer's whole
 * definition: tall, offset to one side so it never sits behind the figure, and rare enough that
 * meeting one is an event.
 *
 * One shard rather than a cluster. Three of a height read as a rock garden; one big one leaning
 * out of the turf reads as something the ground did.
 *
 * **Every coordinate here is an integer**, which is not fussiness: `fill` steps by whole pixels
 * from wherever it is given, so a fractional start lands between pixels and `plot` drops most of
 * them. The first version of this passed fractions in and came out as scattered dots.
 */
function crystalShard(side) {
  const pixels = canvas();
  const cx = Math.round(CELL / 2 + side * OFFSET);
  // **Two seams, one per side.** This layer already draws each feature twice -- once leaning
  // left, once right -- so the pair costs nothing and a sky island turns up both aqua and ruby
  // crystal rather than one repeated colour.
  //
  // Saturated on purpose. An earlier pass had these as pale quartz, on the reasoning that a
  // bright crystal reads as loot in a naturalist's notebook -- which was reading the craft tree
  // as if it were the whole setting. It is a solarpunk world; the crystal is meant to be seen.
  const aqua = { body: '#3fa8a8', lit: '#79d6cf', deep: '#27706f', tip: '#d8f7f2' };
  const ruby = { body: '#b03a52', lit: '#e0708a', deep: '#7a2438', tip: '#f8d9e0' };
  const seam = side >= 0 ? aqua : ruby;
  const body = hex(seam.body);
  const lit = hex(seam.lit);
  const deep = hex(seam.deep);
  const tip = hex(seam.tip);

  const base = CELL - 2;
  const height = 24;          // to row 6: tall, and inside what this layer allows
  const lean = side >= 0 ? 1 : -1;

  for (let d = 0; d < height; d += 1) {
    const t = d / height;
    const y = base - d;
    // Wide at the ground, tapering to a point: the profile of a shard rather than a column.
    const half = Math.max(0, Math.round(5 * (1 - t * 0.86)));
    const shift = Math.round(lean * t * 3);
    fill(pixels, cx + shift - half, y, cx + shift + half, y, body);
    // One lit facet down the leaning side, and a dark one opposite, so the shard reads as flat
    // planes rather than a round spike. A highlight that wrapped would say "cylinder".
    if (half > 0) {
      fill(pixels, cx + shift - half, y, cx + shift - Math.max(0, half - 1), y, lit);
      if (t < 0.7) plot(pixels, cx + shift + half, y, deep);
    }
  }
  // The point.
  const top = base - height;
  fill(pixels, cx + Math.round(lean * 3), top, cx + Math.round(lean * 3), top + 2, tip);

  // Sparkles: single bright pixels off the shard, in a plus so each reads as a glint rather than
  // as dust. Placed by hand rather than randomly -- three is a constellation, and a scatter of
  // ten is snow on the lens.
  const glints = [
    { x: cx + lean * 6, y: base - 20 },
    { x: cx - lean * 5, y: base - 13 },
    { x: cx + lean * 7, y: base - 7 }
  ];
  for (const g of glints) {
    plot(pixels, g.x, g.y, tip);
    plot(pixels, g.x - 1, g.y, lit);
    plot(pixels, g.x + 1, g.y, lit);
    plot(pixels, g.x, g.y - 1, lit);
    plot(pixels, g.x, g.y + 1, lit);
  }

  // A couple of small offcuts at the foot, so the shard looks like it broke out of the ground
  // rather than being placed on it.
  fill(pixels, cx - lean * 4, base - 2, cx - lean * 3, base, deep);
  fill(pixels, cx + lean * 5, base - 1, cx + lean * 6, base, deep);
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
  { id: 'cactus-desert', sides: 2, draw: cactus },
  // The sub-biomes. A snowfield and a sky island each get one tall thing, which is the most
  // this layer ever gives a ground -- and on those two it is the only vertical there is.
  { id: 'pine-snow', sides: 2, draw: snowPine },
  { id: 'crystal-sky_island', sides: 2, draw: crystalShard }
];

/**
 * Sheets wrap into rows rather than running as one long strip.
 *
 * WebGL's MAX_TEXTURE_SIZE is 8,192 on ordinary hardware, and past it the upload fails silently --
 * see the note in `tools/build-overdraw.js`, where this actually bit. Phaser indexes a spritesheet
 * left-to-right then top-to-bottom, so wrapping changes no frame number.
 */
const MAX_SHEET_WIDTH = 4096;

/** Rows and columns for `count` frames of `cellWidth`, wrapped to stay inside the limit. */
function sheetLayout(count, cellWidth) {
  const columns = Math.max(1, Math.min(count, Math.floor(MAX_SHEET_WIDTH / cellWidth)));
  return { columns, rows: Math.ceil(count / columns) };
}

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

  // Against the *final* cell size: authored at CELL, upscaled by SCALE on the way out.
  const { columns, rows } = sheetLayout(frames.length, CELL * SCALE);
  const sheetWidth = CELL * columns;
  const sheetHeight = CELL * rows;
  const sheet = Buffer.alloc(sheetWidth * sheetHeight * 4);
  frames.forEach((frame, index) => {
    const ox = (index % columns) * CELL;
    const oy = Math.floor(index / columns) * CELL;
    for (let y = 0; y < CELL; y += 1) {
      const from = y * CELL * 4;
      const to = ((oy + y) * sheetWidth + ox) * 4;
      frame.copy(sheet, to, from, from + CELL * 4);
    }
  });

  const file = path.join(OUT, 'features.png');
  const big = upscale(sheet, sheetWidth, sheetHeight, SCALE);
  fs.writeFileSync(file, encodePng(sheetWidth * SCALE, sheetHeight * SCALE, big));
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`features: ${frames.length} frames of ${CELL * SCALE}x${CELL * SCALE} in ${columns}x${rows}, ${kb} KB`);
  console.log(`  ${order.join(', ')}`);
}

main();
