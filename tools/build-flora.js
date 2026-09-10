// Painted flora into the features sheet's grid.
//
// **The features sheet had no intake at all, and that is why this file exists.**
// `tools/build-features.js` *draws* all 38 of its frames in code -- ellipses, strokes, fills -- and
// there was no path by which a painted plant could reach it, the way `build-rims.js` gives one to
// the rim sheets. `docs/art-direction.md` says why that was fine for a long time: **generate
// textures, prompt silhouettes.** A hummock is a mass and a loop draws it well. A tree is a
// silhouette, and the rule's own failure list is *neem, palm, pine, mangrove* -- so the one thing
// the floating islands most needed was the one thing the generator could not give them.
//
// **Items are found, never assumed on a grid**, which is the difference between this and
// `build-rims.js`. A rim sheet is cells that tile, so its cells are a grid and finding the gutters
// is enough. A flora sheet is *objects with air around them*: they need not be evenly spaced, need
// not be the same size, and the sheet that arrived was two mangroves and two shrubs on one row with
// two root curtains centred under them. Asking for a grid would have rejected usable art. Scanning
// for content bands and then for items inside each band reads it exactly.
//
// Usage:  node tools/build-flora.js [--apply]
// Dry run by default: it reports what it would write and writes nothing.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'source');
const OUT = path.join(ROOT, 'assets');

/** Matches GRID in src/game/frames.ts and TILE in build-features.js. */
const CELL = 128;

/**
 * What the sheet holds, in frame order, and how each piece meets the world.
 *
 * `anchor` is the whole reason this is a table rather than a list. A plant **stands on** the ground,
 * so it is placed against the bottom of its cell and grows upward. A root curtain **hangs from**
 * rock above, so it is placed against the top and grows down. Getting that backwards would leave
 * every root floating with its frayed ends in the air and its cut ends in space.
 */
const PIECES = [
  { id: 'aero-mangrove-a', anchor: 'bottom' },
  { id: 'aero-mangrove-b', anchor: 'bottom' },
  { id: 'cushion-shrub-a', anchor: 'bottom' },
  { id: 'cushion-shrub-b', anchor: 'bottom' },
  { id: 'root-curtain-a', anchor: 'top' },
  { id: 'root-curtain-b', anchor: 'top' }
];

/** Source sheets, read in order; their items concatenate into `PIECES`. */
const SHEETS = ['sky-flora.png'];

/**
 * How tall a tree cell is, against the 128 a flora cell is wide.
 *
 * **A tree that reads at this scale cannot be square**, and the engine already has the contract for
 * one that isn't: `places`, `huts` and `landmarks` are all drawn `setOrigin(0.5, 1)` and allowed to
 * rise into the tile above. 128 x 176 is 32:44 at the same SCALE the rest of the art uses, and it
 * is what the source's own proportion asks for -- the aero-mangroves arrive at roughly 543 x 724,
 * which fits that box with two pixels to spare.
 *
 * Square would have worked and would have been wrong. Canon's tree *"plunges its roots into open
 * sky"*, and the roots are half its height: fitting them into a 128 box shrinks the canopy to
 * nothing, which is how the tree that shipped before ended up reading as a shrub.
 */
const TALL = { width: 128, height: 176 };

/** The trees, in frame order. All stand on the ground, so all are bottom-anchored. */
const TREES = [
  { id: 'aero-mangrove-1', anchor: 'bottom' },
  { id: 'aero-mangrove-2', anchor: 'bottom' },
  { id: 'aero-mangrove-3', anchor: 'bottom' },
  { id: 'aero-mangrove-4', anchor: 'bottom' }
];

/**
 * The two sheets this builds, because they differ only in cell size and contents.
 *
 * Kept as a table rather than two copies of `main`: the second sheet arrived wanting a taller cell
 * and nothing else, and a copy would have been two places to fix the next time the cut-out or the
 * resampler changed.
 */
const OUTPUTS = [
  { file: 'flora.png', cell: { width: CELL, height: CELL }, pieces: PIECES, from: SHEETS },
  // **`soft` keeps the drawn alpha instead of hardening it, and it is declared rather than
  // sniffed.** `ALPHA_FLOOR` at 200 exists because a keyed sheet arrives with a halo of
  // semi-transparent matte around every shape, and soft alpha on pixel art is a defect. It is
  // exactly wrong here: the mangroves are drawn with their roots fading out where they enter the
  // water, an alpha ramp running from 32 to 224, and hardening deleted most of it and flattened
  // the rest -- the trees came out 105 and 88 tall against the 155 and 140 they should be, because
  // the box shrank to the solid part.
  //
  // A heuristic could tell a broad gradient from a thin halo. `art-direction.md` records what
  // happened the last two times a pixel heuristic was trusted over a declaration here: both got it
  // wrong on two of five characters, and looking took a minute. The author knows whether they drew
  // a fade, so they say so.
  { file: 'trees.png', cell: TALL, pieces: TREES, from: ['sky-trees.png'], soft: true }
];

function decodePng(file) {
  const buf = fs.readFileSync(file);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const depth = buf[24];
  const colour = buf[25];
  if (depth !== 8 || (colour !== 6 && colour !== 2)) {
    throw new Error(`${path.basename(file)}: expected 8-bit RGB or RGBA, got depth ${depth} type ${colour}`);
  }
  const channels = colour === 6 ? 4 : 3;
  const parts = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    if (buf.toString('ascii', off + 4, off + 8) === 'IDAT') parts.push(buf.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(parts));
  const stride = width * channels;
  const rows = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? rows[y * stride + x - channels] : 0;
      const up = y > 0 ? rows[(y - 1) * stride + x] : 0;
      const upLeft = x >= channels && y > 0 ? rows[(y - 1) * stride + x - channels] : 0;
      let v = raw[pos + x];
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
  // Normalise to RGBA so everything downstream has one shape.
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = rows[i * channels];
    data[i * 4 + 1] = rows[i * channels + 1];
    data[i * 4 + 2] = rows[i * channels + 2];
    data[i * 4 + 3] = channels === 4 ? rows[i * channels + 3] : 255;
  }
  return { width, height, data };
}

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


function isKey(data, i) {
  const r = data[i * 4];
  const g = data[i * 4 + 1];
  const b = data[i * 4 + 2];
  // Not a brightness test. The first version of this asked for r and b above 170, which is true of
  // the flat background and false of the *shadow* the model paints under each south face -- magenta
  // blended most of the way to black, around rgb(140,15,130). That left 4,341 lilac pixels along the
  // base of every wall, invisible against the source and obvious over grass.
  //
  // What all of it shares is the structure of magenta rather than its value: red and blue close to
  // each other, green far below both. No stone, moss or foliage in these sheets does that -- their
  // green sits between red and blue, or above them.
  // Magenta's signature is structural: red and blue close to each other, green well below both.
  // No stone, moss or foliage in these sheets does that -- their green sits between red and blue,
  // or above them, which makes this difference negative rather than large.
  const chroma = Math.min(r, b) - g;
  // **Relative, not a fixed number, and that is the whole trick.** A flat threshold of 45 caught
  // the bright background and missed the shadow under every south face, because magenta blended
  // toward black keeps its *proportions* and loses its magnitude: rgb(75,29,62) is unmistakably
  // magenta and has a chroma of 33. Scaling the bar with the pixel's own brightness catches the
  // shadow at any depth while still ignoring anything whose green is not genuinely suppressed.
  if (chroma > 14 && chroma > 0.22 * Math.max(r, b) && Math.abs(r - b) < 60) return true;
  // The other background. Both sheets are painted with the brief's "warm paper undertone", and the
  // model puts a band of that bare paper under the south row where the ground would be -- correct
  // in a painting, wrong in an overlay, where it lands as a bright cream halo under every treeline
  // instead of the shadow it is standing in for. It survived the magenta key because it is not
  // magenta: 4.5% of the treeline sheet, all of it along that one edge.
  //
  // Paper is light, warm and nearly neutral. Foliage and stone in these sheets are darker than this
  // or clearly coloured, so the bound can stay tight.
  return r > 205 && g > 198 && b > 168 && Math.abs(r - g) < 30 && r - b > 12;
}

/**
 * Does this sheet carry real transparency already, rather than a chroma-key backdrop?
 */
function hasAlpha(data, width, height) {
  for (let i = 0; i < width * height; i += 1) {
    if (data[i * 4 + 3] < 250) return true;
  }
  return false;
}

/**
 * Snap a sheet that already has alpha to hard edges, and drop the matte halo with them.
 *
 * **Soft alpha on pixel art is a defect, not a feature**, so this is not a compromise. A sheet cut
 * from its background by a model arrives with a band of partial alpha around every shape, and that
 * band carries the colour it was cut *from*: measured on the sheet that shipped, 1,952 of its
 * 33,111 semi-transparent pixels were saturated red or orange, which is a red rim around every
 * boulder once it is drawn over grass. Nothing in this art is red.
 *
 * Recolouring them is what `key`'s de-fringe does for magenta, and it can do that because it knows
 * exactly which colour contaminated them. Here it does not, so the honest move is to drop the band:
 * an edge one pixel tighter, and no halo at any alpha.
 */
function harden(data, width, height, soft = false) {
  const floor = soft ? FADE_FLOOR : ALPHA_FLOOR;
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const alpha = data[i * 4 + 3];
    if (alpha < floor) continue;
    out[i * 4] = data[i * 4];
    out[i * 4 + 1] = data[i * 4 + 1];
    out[i * 4 + 2] = data[i * 4 + 2];
    // **Soft sheets keep their alpha; everything else is forced opaque.** Flattening a drawn
    // gradient to 255 is not a tidy-up, it is deleting the drawing.
    out[i * 4 + 3] = soft ? alpha : 255;
  }
  return out;
}

/** How opaque a pixel must be to survive `harden`. Below this it is matte, not art. */
const ALPHA_FLOOR = 200;

/**
 * The floor for a sheet that was *drawn* with soft alpha, rather than left with a matte halo.
 *
 * Low enough to keep a deliberate gradient and high enough to drop encoder noise. See `SOFT` in
 * `OUTPUTS` for why this is declared per sheet rather than sniffed.
 */
const FADE_FLOOR = 8;

/**
 * Replace the key colour with real transparency, and de-fringe what is left.
 *
 * The de-fringe is the part that matters. Anti-aliased art over magenta leaves a pink halo one to
 * three pixels wide around every edge, and simply keying the exact background out keeps it -- so
 * the rim ships with a lilac outline that is invisible in the source and obvious over grass. Any
 * pixel keeping its alpha but sitting next to a keyed one gets pulled away from magenta in
 * proportion to how much of it was magenta to begin with.
 */
function key(cell, width, height) {
  const out = Buffer.from(cell);
  for (let i = 0; i < width * height; i += 1) {
    if (isKey(cell, i)) {
      out[i * 4] = 0;
      out[i * 4 + 1] = 0;
      out[i * 4 + 2] = 0;
      out[i * 4 + 3] = 0;
    }
  }
  // De-fringe: for every surviving pixel touching a keyed one, undo the magenta it was blended with.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (out[i * 4 + 3] === 0) continue;
      let touchesKey = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (out[(ny * width + nx) * 4 + 3] === 0) touchesKey = true;
      }
      if (!touchesKey) continue;
      const r = out[i * 4];
      const g = out[i * 4 + 1];
      const b = out[i * 4 + 2];
      // Magenta contaminates red and blue but not green, so the green channel says what the pixel's
      // true brightness was, and the excess in red/blue over it is the halo to remove.
      const excess = Math.min(r, b) - g;
      if (excess <= 8) continue;
      out[i * 4] = Math.max(0, r - excess);
      out[i * 4 + 2] = Math.max(0, b - excess);
      // Partly-keyed pixels should be partly transparent, or the outline stays hard.
      out[i * 4 + 3] = Math.max(0, 255 - Math.min(255, excess * 3));
    }
  }
  return out;
}


// --- finding the items -----------------------------------------------------

/**
 * Runs of lines holding art along one axis.
 *
 * A far looser bar than a rim's depth crop uses, for the same reason `contentRuns` in
 * `build-rims.js` needs one: the question here is "is this line empty", not "is this line part of
 * the mass". A couple of stray specks still must not bridge two items, hence not zero.
 */
function runs(cell, width, height, axis, floor = 24) {
  const opaque = (x, y) => cell[(y * width + x) * 4 + 3] > floor;
  const outer = axis === 'y' ? height : width;
  const inner = axis === 'y' ? width : height;
  const need = Math.max(3, Math.round(inner * 0.004));
  const has = (i) => {
    let n = 0;
    for (let j = 0; j < inner; j += 1) {
      const x = axis === 'y' ? j : i;
      const y = axis === 'y' ? i : j;
      if (opaque(x, y) && (n += 1) >= need) return true;
    }
    return false;
  };
  const out = [];
  let start = null;
  for (let i = 0; i < outer; i += 1) {
    if (has(i)) {
      if (start === null) start = i;
    } else if (start !== null) {
      out.push([start, i]);
      start = null;
    }
  }
  if (start !== null) out.push([start, outer]);
  // A speck between two plants is not a plant.
  return out.filter(([a, b]) => b - a > outer / 40);
}

/** Every item on a sheet, in reading order: bands top to bottom, items left to right. */
/**
 * Cut the widest item at its thinnest column, until there are as many items as the manifest wants.
 *
 * **Because two trees touching is a drawing, not a defect.** `findItems` separates by clear
 * columns, which is the right rule and is defeated the moment two canopies overlap by a pixel: the
 * fourth aero-mangrove sheet came back with items three and four joined into one box 1,063 wide,
 * and the builder faithfully squashed that pair into a single 128-wide cell.
 *
 * `build-rims.js` solved the mirror image of this and its lesson transfers whole: it merges bands
 * smallest-gap-first **only until the count matches**, because a fixed threshold welded two rows
 * whose gutter happened to be narrower than another row's internal break. So this splits
 * widest-first and only until the count matches, rather than cutting anywhere a column looks thin.
 *
 * The cut goes at the emptiest interior column, which for two overlapping trees is the seam
 * between them. Kept away from the outer fifth of the box on each side: the thinnest column of a
 * *single* item is usually just inside its own edge, and cutting there would shave a sliver off
 * one tree rather than separate two.
 */
function splitWidest(items, cell, width, wanted) {
  const coverage = (box, x) => {
    let n = 0;
    for (let y = box.y0; y <= box.y1; y += 1) if (cell[(y * width + x) * 4 + 3] > FADE_FLOOR) n += 1;
    return n;
  };

  while (items.length < wanted) {
    let widest = 0;
    for (let i = 1; i < items.length; i += 1) {
      if (items[i].x1 - items[i].x0 > items[widest].x1 - items[widest].x0) widest = i;
    }
    const box = items[widest];
    const span = box.x1 - box.x0;
    const margin = Math.floor(span / 5);
    if (span < 8) break;

    let cut = box.x0 + margin;
    let thinnest = Infinity;
    for (let x = box.x0 + margin; x <= box.x1 - margin; x += 1) {
      const n = coverage(box, x);
      if (n < thinnest) {
        thinnest = n;
        cut = x;
      }
    }

    // Tighten each half vertically: the two things either side of a seam rarely share an extent.
    const half = (x0, x1) => {
      let y0 = box.y1;
      let y1 = box.y0;
      for (let x = x0; x <= x1; x += 1) {
        for (let y = box.y0; y <= box.y1; y += 1) {
          if (cell[(y * width + x) * 4 + 3] <= FADE_FLOOR) continue;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
      return { x0, x1, y0, y1 };
    };

    items.splice(widest, 1, half(box.x0, cut), half(cut + 1, box.x1));
    console.log(`    split the widest item at column ${cut} (${thinnest} opaque pixels there)`);
  }
  return items;
}

function findItems(cell, width, height, floor = 24) {
  const items = [];
  for (const [y0, y1] of runs(cell, width, height, 'y', floor)) {
    const strip = Buffer.alloc(width * (y1 - y0) * 4);
    cell.copy(strip, 0, y0 * width * 4, y1 * width * 4);
    for (const [x0, x1] of runs(strip, width, y1 - y0, 'x', floor)) {
      // Tighten vertically inside this item: two items sharing a band need not share its extent.
      const box = Buffer.alloc((x1 - x0) * (y1 - y0) * 4);
      for (let y = 0; y < y1 - y0; y += 1) {
        const from = ((y0 + y) * width + x0) * 4;
        cell.copy(box, y * (x1 - x0) * 4, from, from + (x1 - x0) * 4);
      }
      const tight = runs(box, x1 - x0, y1 - y0, 'y', floor);
      if (tight.length === 0) continue;
      items.push({
        x0,
        x1,
        y0: y0 + tight[0][0],
        y1: y0 + tight[tight.length - 1][1]
      });
    }
  }
  return items;
}

/**
 * Transparent sheets get their matte halo dropped; chroma-keyed ones get keyed.
 *
 * The same fork `build-rims.js` makes, and for the same measured reasons. Art cut from its
 * background by a model carries a band of partial alpha holding the colour it was cut *from*, which
 * lands as a coloured rim around every shape over ground -- and soft alpha on pixel art is a defect
 * rather than a feature, so `harden` dropping that band costs nothing. A sheet with no alpha at all
 * is a magenta grid instead, and `key` handles it.
 */
function cutOut(img, soft = false) {
  return hasAlpha(img.data, img.width, img.height)
    ? harden(img.data, img.width, img.height, soft)
    : key(img.data, img.width, img.height);
}

/**
 * Box-average a source rectangle into a smaller one, alpha-weighted.
 *
 * Alpha-weighted for the reason the rim builder is: sampling colour from fully transparent pixels
 * drags every edge toward black, which on a plant is a dark outline around every leaf.
 */
function resample(src, sw, box, outW, outH) {
  const out = Buffer.alloc(outW * outH * 4);
  const bw = box.x1 - box.x0;
  const bh = box.y1 - box.y0;
  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const sx0 = box.x0 + Math.floor((x * bw) / outW);
      const sx1 = Math.max(box.x0 + Math.floor(((x + 1) * bw) / outW), sx0 + 1);
      const sy0 = box.y0 + Math.floor((y * bh) / outH);
      const sy1 = Math.max(box.y0 + Math.floor(((y + 1) * bh) / outH), sy0 + 1);
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let weight = 0;
      let n = 0;
      for (let sy = sy0; sy < sy1; sy += 1) {
        for (let sx = sx0; sx < sx1; sx += 1) {
          const i = sy * sw + sx;
          const alpha = src[i * 4 + 3];
          r += src[i * 4] * alpha;
          g += src[i * 4 + 1] * alpha;
          b += src[i * 4 + 2] * alpha;
          a += alpha;
          weight += alpha;
          n += 1;
        }
      }
      const p = (y * outW + x) * 4;
      if (weight === 0) continue;
      out[p] = Math.round(r / weight);
      out[p + 1] = Math.round(g / weight);
      out[p + 2] = Math.round(b / weight);
      // Hard alpha out, matching what went in.
      out[p + 3] = a / n > 110 ? 255 : 0;
    }
  }
  return out;
}

// --- build -----------------------------------------------------------------

function main() {
  const apply = process.argv.includes('--apply');
  console.log(apply ? 'Building flora sheets:' : 'Building flora sheets (dry run, pass --apply to write):');
  for (const out of OUTPUTS) buildSheet(out, apply);
  if (!apply) console.log('\n  Nothing written.');
}

function buildSheet({ file, cell, pieces, from, soft = false }, apply) {
  const frames = [];
  for (const name of from) {
    const path_ = path.join(SRC, name);
    if (!fs.existsSync(path_)) {
      console.log(`  ${name} not found -- skipped`);
      continue;
    }
    const img = decodePng(path_);
    const cut = cutOut(img, soft);
    const found = findItems(cut, img.width, img.height, soft ? FADE_FLOOR : 24);
    // Only ever splits *up to* the count the manifest wants, and only when the finder came up
    // short -- see `splitWidest`. A sheet whose items separate cleanly never reaches it.
    const items = splitWidest(found, cut, img.width, pieces.length);
    const how = items.length === found.length ? '' : ` (${found.length} found, split to ${items.length})`;
    console.log(`  ${name} (${img.width}x${img.height}) -> ${items.length} items${how}`);
    for (const box of items) {
      const bw = box.x1 - box.x0;
      const bh = box.y1 - box.y0;
      // Fit inside the cell, keeping the aspect. A plant that is wider than tall stays wider than
      // tall: stretching it to a square is what turned a cap into a 2x-tall boulder in the rim
      // builder, and a cushion shrub is exactly that shape.
      const scale = Math.min(cell.width / bw, cell.height / bh);
      const w = Math.max(1, Math.round(bw * scale));
      const h = Math.max(1, Math.round(bh * scale));
      frames.push({ art: resample(cut, img.width, box, w, h), w, h });
    }
  }

  if (frames.length !== pieces.length) {
    console.log(`\n  ! found ${frames.length} items, expected ${pieces.length} -- check the source sheet`);
  }

  const count = Math.min(frames.length, pieces.length);
  const sheetW = cell.width * count;
  const sheet = Buffer.alloc(sheetW * cell.height * 4);
  for (let i = 0; i < count; i += 1) {
    const { art, w, h } = frames[i];
    const piece = pieces[i];
    // Centred across, and against the edge the piece meets the world at.
    const ox = i * cell.width + Math.round((cell.width - w) / 2);
    const oy = piece.anchor === 'top' ? 0 : cell.height - h;
    for (let y = 0; y < h; y += 1) {
      const fromRow = y * w * 4;
      art.copy(sheet, ((oy + y) * sheetW + ox) * 4, fromRow, fromRow + w * 4);
    }
    console.log(`    ${piece.id.padEnd(17)} ${w}x${h}  anchored ${piece.anchor}`);
  }

  const png = encodePng(sheetW, cell.height, sheet);
  console.log(`  -> ${file} ${sheetW}x${cell.height}, ${count} frames, ${(png.length / 1024).toFixed(1)} KB`);
  if (apply) fs.writeFileSync(path.join(OUT, file), png);
}

main();
