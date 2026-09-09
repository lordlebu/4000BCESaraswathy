// Turn a chroma-keyed 4x4 rim sheet into the strip the engine indexes.
//
// A *rim* is the edge of something: the rock face where a height terrace drops away, or the wall of
// trees where a forest stops. Phase 07 established that a ground texture cannot carry either -- a
// top-down tile shows what the ground is made of, and both a slope and a forest edge are properties
// of the *boundary* between two tiles. So they are drawn as a separate overlay along that boundary,
// which is what this builds.
//
// **Why the input looks like that.** Every image model tried produced good art or a good container,
// never both. Asked for a transparent 2048x128 strip:
//
//   * Grok returned the right strip and filled 64% of it with one flat hex -- it read "rock colour
//     around #8f8a76" as an instruction to fill rather than to tint, so there was no rock in it.
//   * ChatGPT returned real alpha and correct frame order, but floating in a mostly empty canvas.
//   * Gemini returned by far the best painting and ignored both transparency and the strip: a 4x4
//     grid on a solid magenta ground.
//
// Rather than keep re-rolling the prompt and risk losing the art that works, the prompt now *asks*
// for what Gemini reliably does -- 4x4 on pure #FF00FF -- and the container problem moves here,
// where it is deterministic. Keying a known background out is a fixed amount of arithmetic; getting
// a model to paint stone is not.
//
// Usage:  node tools/build-rims.js [--apply]
// Dry run by default: it reports what it would write and writes nothing.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'source');
const OUT = path.join(ROOT, 'assets');

/** Cell size of the sheet this feeds, matching TILE in build-terrain.js and GRID in frames.ts. */
const CELL = 128;

/** Frames per direction. Matches EDGE_VARIANTS in frames.ts and VARIANTS in build-edges.js. */
const VARIANTS = 4;

/**
 * Row order of the source grid, and therefore frame order of the output strip.
 *
 * `frames.ts` indexes `EDGE_ORDER.indexOf(edge) * EDGE_VARIANTS + variant`, so this must stay
 * n, e, s, w -- the same order `build-edges.js` writes and `cliffFrame` reads.
 */
const ROWS = ['n', 'e', 's', 'w'];

/**
 * How deep each direction's art reaches into the cell, as a fraction.
 *
 * **Not symmetric, and that is the whole look.** A reference sheet of nine different materials --
 * sand, mossy stone, ice, basalt, a wooden palisade, dirt, gravel, granite, crystal -- drew the
 * same asymmetry every time: the north edge is a thin lip because you are looking down at where the
 * ground breaks, and the south edge is a tall face because you are seeing the wall itself. Drawing
 * all four the same makes a flat outline rather than a ledge.
 *
 * South is deliberately more than a third, so the face overhangs the tile below it. A rim that
 * stops at its own cell boundary reads as a line painted on the ground instead of a thing standing
 * on it.
 */
const DEPTH = { n: 0.20, e: 0.22, s: 0.48, w: 0.22 };

/**
 * The six corner and cap pieces, in sheet order, appended after the sixteen edge frames.
 *
 * **A corner frame replaces both edge bands on its tile rather than covering the join between
 * them.** `place` lays the south band across the full cell width and the east band down the full
 * cell height, so on a corner tile those two already overlap -- there is no gap to fill, and what
 * is wrong is that two pieces of rock texture meet in a T-junction instead of turning. So each of
 * these cells has to be a whole corner of rock, carrying the lip along one side *and* the tall face
 * down the other. See `docs/props-and-rims-plan.md`.
 *
 * Order is a contract with `frames.ts`, the same way `ROWS` is: appended, never inserted, because
 * the engine indexes by position.
 */
const CORNERS = ['outer-se', 'outer-sw', 'inner-se', 'inner-sw', 'cap-e', 'cap-w'];

/**
 * Corners are cropped to their own art, not to a band and not to the whole cell.
 *
 * A band is cropped back to one edge because it is a strip. A corner is not a strip -- it occupies
 * two edges at once and the turn between them sits in the middle -- so it is cropped to the
 * bounding box of everything opaque in the cell instead, and that box is scaled to fill the frame.
 *
 * **Taking the whole cell instead is what a first pass did, and it broke both seams.** Painted
 * corners arrive with air around them: measured on the sheet that shipped, 62-74% of each cell was
 * empty and the art floated clear of every side. Resampled whole, the rock stopped short of the
 * cell boundary -- 0px deep at the left and right columns where a straight south band is 62 -- so a
 * corner meeting a run showed a gap in the wall *and* a step down in its height. Cropping to the
 * art pushes the arms back out to the edges, where the band next door is waiting for them.
 */

/**
 * These are a ceiling, not a target. The art decides, up to this.
 *
 * The prompt asked for an eighth on the lip edges and two fifths on the face; the paintings came
 * back at roughly two and a half times that on the lips. Cropping them back to the number in the
 * prompt would throw away boulders the model deliberately drew, so the crop follows the art and
 * these only stop a frame from running away.
 *
 * The ceiling exists because a rim that reaches too far stops reading as an edge: the north lip is
 * supposed to be a glimpse of the break, and at half a cell it becomes a second ground texture
 * covering the tile it sits on. South is allowed nearly half, because that one *is* a wall and has
 * to overhang the cell below it.
 */

/** Sheets to build: source file in assets/source, output name in assets. */
const SHEETS = [
  // `corners` is optional and names a 3x2 grid of the six pieces in `CORNERS` order, magenta
  // or already transparent.
  // Absent, the sheet is built with sixteen edge frames exactly as before -- which is what ships
  // today, and why this is safe to have in place before the art exists.
  { id: 'cliffs', from: 'cliff-edges.png', to: 'cliffs.png', corners: 'cliff-corners.png' },
  { id: 'treeline', from: 'Gemini_tree-rim2.png', to: 'treeline.png' }
];

// --- PNG ------------------------------------------------------------------
// Same hand-rolled decoder/encoder as the other builders, for the same reason: no dependency, and
// these sheets are written once and read by a test.

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

// --- keying ---------------------------------------------------------------

/**
 * Is this pixel the chroma-key background?
 *
 * A tolerance band rather than an equality test on #FF00FF. The generated sheets are not exactly
 * that: sampling found #fe01fa, #fd00fb, #fd00f9 and several hundred neighbours, because the model
 * paints rather than fills. The test is structural instead -- red and blue both high, green low --
 * which no stone or foliage colour in these sheets comes near.
 */
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

// --- geometry -------------------------------------------------------------

/**
 * Box-average a source rectangle down into a `CELL`-wide band of the given height.
 *
 * Averaging rather than nearest, and alpha-weighted: sampling colour from fully transparent pixels
 * drags the edges toward black, which on a rim is a dark outline around every boulder.
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
      out[p + 3] = Math.round(a / n);
    }
  }
  return out;
}

/**
 * How far a line has to be covered before it counts as art rather than stray pixels.
 *
 * A single speck must not set the depth. Two cliff frames measured a full 512 -- the whole cell --
 * on the strength of a handful of loose pixels near the far edge, when the map of what was actually
 * opaque showed a band a fifth that deep. Requiring a twelfth of the line to be covered ignores the
 * specks and still catches a genuinely ragged boulder edge.
 */
const LINE_COVERAGE = 1 / 12;

/**
 * Runs of lines that hold art, along one axis of a keyed image.
 *
 * **The grid is found, not assumed, and that is the third container problem to move in here.** The
 * prompt asks for a 4 x 4 grid and every sheet so far has delivered four rows of four cells -- but
 * not on exact quarters. One arrived with its rows at y 25-144, 209-515, 604-818 and 842-1176 in a
 * 1240-tall image, so three of the four straddled a quarter cut and every extracted cell was part
 * of one row plus part of the next. The sheet before it happened to sit inside its quarters and
 * hid the assumption entirely.
 *
 * Asking a model to hit exact pixel boundaries has failed on layout twice already (2x3 versus 3x2,
 * and art floating clear of its own cell edges). Finding the gutters is arithmetic.
 */
function contentRuns(cell, width, height, axis) {
  const opaque = (x, y) => cell[(y * width + x) * 4 + 3] > 24;
  const outer = axis === 'y' ? height : width;
  const inner = axis === 'y' ? width : height;
  // **A far looser bar than `LINE_COVERAGE`, on purpose.** That constant asks "is this line part of
  // the mass of the art", which is the right question for a depth crop and the wrong one here: a
  // gutter is magenta all the way across, so anything at all makes a line content. Reusing the
  // twelfth split the four narrow east strips into five bands, because a row crossing them is only
  // about a twelfth covered and flickers either side of the bar. A couple of stray specks still
  // must not bridge two cells, hence not zero.
  const need = Math.max(3, Math.round(inner * 0.01));
  const has = (i) => {
    let n = 0;
    for (let j = 0; j < inner; j += 1) {
      const x = axis === 'y' ? j : i;
      const y = axis === 'y' ? i : j;
      if (opaque(x, y) && (n += 1) >= need) return true;
    }
    return false;
  };
  const runs = [];
  let start = null;
  for (let i = 0; i < outer; i += 1) {
    if (has(i)) {
      if (start === null) start = i;
    } else if (start !== null) {
      runs.push([start, i]);
      start = null;
    }
  }
  if (start !== null) runs.push([start, outer]);
  // Join runs separated by a hairline. A cell whose art has a thin waist reads as two runs, and a
  // real gutter between two cells is far wider than that.
  const joined = [];
  for (const run of runs) {
    const last = joined[joined.length - 1];
    if (last && run[0] - last[1] < outer / 60) last[1] = run[1];
    else joined.push([...run]);
  }
  // Ignore slivers: a stray mark between two cells is not a cell.
  return joined.filter(([a, b]) => b - a > outer / 40);
}

/**
 * Slice a keyed sheet into `rows` x `cols` cell rectangles, by its own gutters where it has them.
 *
 * Falls back to even division per axis when the run count does not match what is expected, and says
 * so, because a silently wrong slice is the failure this whole function exists to stop.
 */
function findGrid(cell, width, height, rows, cols, note) {
  const bands = contentRuns(cell, width, height, 'y');
  let yRanges;
  if (bands.length === rows) {
    yRanges = bands;
  } else {
    note(`found ${bands.length} row bands, expected ${rows} -- falling back to even rows`);
    yRanges = Array.from({ length: rows }, (_, r) => [
      Math.round((r * height) / rows),
      Math.round(((r + 1) * height) / rows)
    ]);
  }
  return yRanges.map(([y0, y1], r) => {
    const strip = Buffer.alloc(width * (y1 - y0) * 4);
    cell.copy(strip, 0, y0 * width * 4, y1 * width * 4);
    const groups = contentRuns(strip, width, y1 - y0, 'x');
    let xRanges;
    if (groups.length === cols) {
      xRanges = groups;
    } else {
      note(`row ${r}: found ${groups.length} cells, expected ${cols} -- falling back to even columns`);
      xRanges = Array.from({ length: cols }, (_, c) => [
        Math.round((c * width) / cols),
        Math.round(((c + 1) * width) / cols)
      ]);
    }
    return xRanges.map(([x0, x1]) => ({ x0, x1, y0, y1 }));
  });
}

/**
 * The bounding box of everything opaque in a cell.
 *
 * Find where the art really is rather than trusting the layout it was asked for. Every sheet so
 * far has painted approximately the depth it was asked for and never exactly, so neither the
 * request nor a fixed fraction is the right crop.
 *
 * It uses `LINE_COVERAGE` as a floor, so a stray speck near a corner of the canvas cannot drag the
 * box out to the full cell and undo the crop. Two cliff frames once measured the whole cell on the
 * strength of a handful of loose pixels near the far edge, when what was actually opaque was a band
 * a fifth that deep.
 */
function contentBox(cell, width, height) {
  const opaque = (x, y) => cell[(y * width + x) * 4 + 3] > 24;
  const needCol = Math.max(2, Math.round(height * LINE_COVERAGE));
  const needRow = Math.max(2, Math.round(width * LINE_COVERAGE));
  const colHas = (x) => {
    let n = 0;
    for (let y = 0; y < height; y += 1) if (opaque(x, y) && (n += 1) >= needCol) return true;
    return false;
  };
  const rowHas = (y) => {
    let n = 0;
    for (let x = 0; x < width; x += 1) if (opaque(x, y) && (n += 1) >= needRow) return true;
    return false;
  };
  let x0 = 0;
  let x1 = width;
  let y0 = 0;
  let y1 = height;
  while (x0 < width - 1 && !colHas(x0)) x0 += 1;
  while (x1 > x0 + 1 && !colHas(x1 - 1)) x1 -= 1;
  while (y0 < height - 1 && !rowHas(y0)) y0 += 1;
  while (y1 > y0 + 1 && !rowHas(y1 - 1)) y1 -= 1;
  return { x0, x1, y0, y1 };
}

/** Place a band of art against the correct edge of an otherwise empty cell. */
function place(band, bandW, bandH, edge) {
  const out = Buffer.alloc(CELL * CELL * 4);
  const ox = edge === 'e' ? CELL - bandW : 0;
  const oy = edge === 's' ? CELL - bandH : 0;
  for (let y = 0; y < bandH; y += 1) {
    const from = y * bandW * 4;
    const to = ((oy + y) * CELL + ox) * 4;
    band.copy(out, to, from, from + bandW * 4);
  }
  return out;
}

// --- build ----------------------------------------------------------------

function buildSheet({ id, from, to, corners }, apply) {
  const file = path.join(SRC, from);
  if (!fs.existsSync(file)) {
    console.log(`  ${id}: ${from} not found -- skipped`);
    return null;
  }
  const img = decodePng(file);
  // Key the whole sheet once, then find its gutters. Both have to happen before anything is sliced:
  // a gutter is only visible once the magenta is transparent.
  const wholeKeyed = key(img.data, img.width, img.height);
  const warnings = [];
  const grid = findGrid(wholeKeyed, img.width, img.height, ROWS.length, VARIANTS, (m) =>
    warnings.push(m)
  );
  const sheet = Buffer.alloc(CELL * VARIANTS * ROWS.length * CELL * 4);
  const sheetW = CELL * VARIANTS * ROWS.length;
  const report = [];

  ROWS.forEach((edge, row) => {
    const depths = [];
    for (let v = 0; v < VARIANTS; v += 1) {
      // Lift one cell out of the grid. It is cut from the already-keyed sheet, so gridlines drawn
      // between frames are gone before the gutters were measured rather than after.
      const rect = grid[row][v];
      const cellW = rect.x1 - rect.x0;
      const cellH = rect.y1 - rect.y0;
      const keyed = Buffer.alloc(cellW * cellH * 4);
      for (let y = 0; y < cellH; y += 1) {
        const from = ((rect.y0 + y) * img.width + rect.x0) * 4;
        wholeKeyed.copy(keyed, y * cellW * 4, from, from + cellW * 4);
      }

      // **Crop to where the art is, in both axes.** Along the named direction that is a depth
      // crop, capped so an over-painted frame cannot push a taller band than the engine expects.
      // Across it, the crop is what makes a run of bands join up at all.
      //
      // That second half was added when a sheet arrived with every frame floating inside its cell:
      // the south row spanned 5%..93% of its width and the east row's four variants started at 76,
      // 30, 64 and 28 per cent, so no frame touched the edge it is named for. Laid end to end that
      // is a gap in the wall at every tile boundary, and a strip that is not against its own side.
      // The sheet before it happened to touch at 1%..99% and hid the assumption completely.
      const content = contentBox(keyed, cellW, cellH);
      const horizontal = edge === 'n' || edge === 's';
      const across = Math.min(cellW, cellH);
      const span = horizontal ? content.y1 - content.y0 : content.x1 - content.x0;
      const limit = Math.round(DEPTH[edge] * across);
      const deep = Math.min(span || limit, limit);
      const box = horizontal
        ? {
            x0: content.x0,
            x1: content.x1,
            y0: edge === 'n' ? content.y0 : content.y1 - deep,
            y1: edge === 'n' ? content.y0 + deep : content.y1
          }
        : {
            y0: content.y0,
            y1: content.y1,
            x0: edge === 'w' ? content.x0 : content.x1 - deep,
            x1: edge === 'w' ? content.x0 + deep : content.x1
          };

      // The perpendicular axis is stretched to the whole cell -- that is the join. The named axis
      // keeps its measured proportion.
      const bandW = horizontal ? CELL : Math.max(1, Math.round((deep / across) * CELL));
      const bandH = horizontal ? Math.max(1, Math.round((deep / across) * CELL)) : CELL;
      const band = resample(keyed, cellW, box, bandW, bandH);
      const frame = place(band, bandW, bandH, edge);

      const index = row * VARIANTS + v;
      const ox = index * CELL;
      for (let y = 0; y < CELL; y += 1) {
        const fromRow = y * CELL * 4;
        frame.copy(sheet, (y * sheetW + ox) * 4, fromRow, fromRow + CELL * 4);
      }
      depths.push(horizontal ? bandH : bandW);
    }
    report.push(`${edge}: ${depths.join(', ')}px`);
  });

  // --- the corner and cap pieces, appended -------------------------------
  //
  // Absent, nothing changes and the sheet is the sixteen edge frames it has always been. Present,
  // six more frames go on the end in `CORNERS` order -- appended rather than inserted, because the
  // engine indexes by position and inserting would silently repaint every rim on the map.
  let frames = ROWS.length * VARIANTS;
  let wide = sheet;
  let wideW = sheetW;
  const cornerFile = corners ? path.join(SRC, corners) : null;
  if (cornerFile && fs.existsSync(cornerFile)) {
    const grid = decodePng(cornerFile);
    // Three across, two down. The edge sheets are 4x4 because they hold sixteen frames; six pieces
    // do not divide that way, and every generated sheet came back 3x2 whatever the prompt asked
    // for. Same call as the magenta background above: ask for what the model reliably does and put
    // the container problem here, where it is arithmetic.
    const cols = 3;
    const rows = 2;
    const cw = Math.floor(grid.width / cols);
    const ch = Math.floor(grid.height / rows);
    // **Only key a sheet that needs keying.** The key exists because image models will not hand
    // back transparency; when one does, running it anyway is pure damage. Measured on the sheet
    // that shipped: 0.6% of its opaque stone matches the "warm paper undertone" branch of `isKey`
    // and would be punched out as scattered white speckles. A rejected candidate painted in
    // near-white limestone lost most of every boulder the same way -- which read as a fault in the
    // art until the holes were traced back to here.
    const alreadyCut = (() => {
      for (let i = 0; i < grid.width * grid.height; i += 1) {
        if (grid.data[i * 4 + 3] < 250) return true;
      }
      return false;
    })();

    wideW = sheetW + CORNERS.length * CELL;
    wide = Buffer.alloc(wideW * CELL * 4);
    for (let y = 0; y < CELL; y += 1) {
      const fromRow = y * sheetW * 4;
      sheet.copy(wide, y * wideW * 4, fromRow, fromRow + sheetW * 4);
    }

    CORNERS.forEach((name, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cell = Buffer.alloc(cw * ch * 4);
      for (let y = 0; y < ch; y += 1) {
        for (let x = 0; x < cw; x += 1) {
          const si = ((row * ch + y) * grid.width + col * cw + x) * 4;
          const di = (y * cw + x) * 4;
          cell[di] = grid.data[si];
          cell[di + 1] = grid.data[si + 1];
          cell[di + 2] = grid.data[si + 2];
          cell[di + 3] = grid.data[si + 3];
        }
      }
      const keyed = alreadyCut ? cell : key(cell, cw, ch);
      const box = contentBox(keyed, cw, ch);

      // **Fit to width, keep the aspect, sit on the floor.** Stretching the box to a square is the
      // obvious move and it ruins the caps: theirs measures 433x202, so squaring it stands every
      // boulder up 2x taller than the ones in the wall it is ending. Scaling by width alone gives
      // the caps a 60px band -- within a pixel or two of the 62 a straight south face is -- and
      // costs the corner pieces a few empty rows at the top, where there is nothing drawn anyway.
      const boxW = box.x1 - box.x0;
      const boxH = box.y1 - box.y0;
      const tall = Math.min(CELL, Math.max(1, Math.round((boxH * CELL) / boxW)));
      const band = resample(keyed, cw, box, CELL, tall);
      // Against the bottom, the same edge `place` puts a south band against: a corner and the run
      // it continues have to stand on the same line or the wall visibly steps at the seam.
      const frame = place(band, CELL, tall, 's');

      // **A corner is baked over a south band; a cap is not.** The painted corners' two arms are
      // about equal thickness, but the game's are not -- a south face is 62px deep and an east face
      // 28 wide -- so a corner scaled to fit the cell lands a 34px horizontal arm against a 62px
      // band and the wall visibly steps down at every turn. No scaling fixes that: matching the
      // depth needs a 1.8x vertical stretch that stands every boulder up taller than the ones
      // beside it.
      //
      // So the band goes underneath and the corner supplies the turn on top. That is the whole
      // distinction between the two kinds of piece: **a corner turns the wall, so it needs the
      // wall; a cap ends the wall, so it replaces it.** Baking rather than stacking two sprites in
      // the scene is worth the arithmetic here -- measured, the stacked version put the cliff layer
      // at +69% blended pixels where this costs nothing over the corner quad already drawn.
      if (!name.startsWith('cap-')) {
        // **Pick the band variant by what it does at the open end.** The straight variants are
        // deliberately ragged -- two of the four carry no art at all in their leftmost column, and
        // that is what makes a run of them not read as one extruded strip. On a corner that
        // raggedness lands in the worst possible place: the open end is the one the neighbouring
        // tile's band has to meet, and picking blind put it at 41px against a 62px neighbour on
        // half the pieces. So the variant is chosen rather than hashed, by measuring coverage in
        // the column that matters.
        //
        // A corner whose vertical arm is on the right runs its horizontal arm out to the left, and
        // the other way round.
        const openX = name.endsWith('-se') ? 0 : CELL - 1;
        const depthAt = (variant, x) => {
          const base = (ROWS.indexOf('s') * VARIANTS + variant) * CELL;
          for (let y = 0; y < CELL; y += 1) {
            if (sheet[(y * sheetW + base + x) * 4 + 3] > 24) return CELL - y;
          }
          return 0;
        };
        let best = 0;
        for (let v = 1; v < VARIANTS; v += 1) {
          if (depthAt(v, openX) > depthAt(best, openX)) best = v;
        }
        const under = (ROWS.indexOf('s') * VARIANTS + best) * CELL;
        for (let y = 0; y < CELL; y += 1) {
          for (let x = 0; x < CELL; x += 1) {
            const f = (y * CELL + x) * 4;
            if (frame[f + 3] === 255) continue; // corner already covers this pixel outright
            const b = (y * sheetW + under + x) * 4;
            const ba = sheet[b + 3];
            if (ba === 0) continue;
            // Band under corner: standard source-over with the corner as the source.
            const ca = frame[f + 3];
            const outA = ca + (ba * (255 - ca)) / 255;
            if (outA === 0) continue;
            for (let k = 0; k < 3; k += 1) {
              frame[f + k] = Math.round(
                (frame[f + k] * ca + sheet[b + k] * ba * (1 - ca / 255)) / outA
              );
            }
            frame[f + 3] = Math.round(outA);
          }
        }
      }

      const ox = sheetW + index * CELL;
      for (let y = 0; y < CELL; y += 1) {
        const fromRow = y * CELL * 4;
        frame.copy(wide, (y * wideW + ox) * 4, fromRow, fromRow + CELL * 4);
      }
      report.push(`${name} ${tall}px${name.startsWith('cap-') ? '' : '+band'}`);
    });
    frames += CORNERS.length;
  } else if (corners) {
    console.log(`    (no ${corners} yet -- sixteen edge frames only)`);
  }

  const png = encodePng(wideW, CELL, wide);
  const kb = (png.length / 1024).toFixed(1);
  console.log(`  ${id}: ${from} (${img.width}x${img.height}) -> ${to} ${wideW}x${CELL}, ${frames} frames, ${kb} KB`);
  console.log(`    ${report.join('   ')}`);
  for (const w of warnings) console.log(`    ! ${w}`);
  if (apply) fs.writeFileSync(path.join(OUT, to), png);
  return png;
}

function main() {
  const apply = process.argv.includes('--apply');
  console.log(apply ? 'Building rim sheets:' : 'Building rim sheets (dry run, pass --apply to write):');
  for (const sheet of SHEETS) buildSheet(sheet, apply);
  if (!apply) console.log('\n  Nothing written.');
}

main();
