// Turn generated terrain and object art into game-ready assets.
//
// The sister script to build-sprite-sheet.js, and it exists because terrain needs a different
// sampler. That script resolves each output pixel to the *most common* colour in its source block,
// which is right for a character filling its cell and wrong for sparse texture on flat ground: a
// grass tuft covering 40% of a block always loses to the base colour, so a whole meadow's worth of
// detail vanishes. Two plains tiles were regenerated before the sampler was the suspect; the art
// had been fine both times.
//
// So the terrain path keeps the minority instead. If enough of a block is *not* the tile's base
// colour, the most common non-base colour wins. `--threshold` is that "enough" (default 0.22).
//
// Objects -- huts, landmarks, points of interest -- go through the same sampler but keep their
// alpha and are bottom-anchored in a taller cell, so they can be drawn standing on a tile.
//
//   node tools/build-terrain.js
//
// CommonJS, like everything in tools/ -- see tools/package.json.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'source');
const OUT = path.join(ROOT, 'assets');
const SOLID = 128;

// --- PNG ------------------------------------------------------------------

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

  const chunks = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    if (buf.toString('ascii', off + 4, off + 8) === 'IDAT') chunks.push(buf.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }

  const raw = zlib.inflateSync(Buffer.concat(chunks));
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

// --- sampling -------------------------------------------------------------

/** Quantise to 5 bits per channel so compression noise votes together. */
const key = (r, g, b) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

/** The image's single most common opaque colour -- the tile's "base". */
function baseColour(img) {
  const tally = new Map();
  for (let i = 0; i < img.width * img.height; i += 1) {
    if (img.data[i * 4 + 3] < SOLID) continue;
    const k = key(img.data[i * 4], img.data[i * 4 + 1], img.data[i * 4 + 2]);
    tally.set(k, (tally.get(k) || 0) + 1);
  }
  let best = null;
  let seen = -1;
  for (const [k, n] of tally) if (n > seen) { seen = n; best = k; }
  return best;
}

/**
 * One output pixel, preserving minority detail.
 *
 * Tally the block; if the share of pixels that are *not* the base colour clears `threshold`,
 * take the most common non-base colour. Otherwise take the base. That is the whole difference
 * from a plain mode filter, and it is what keeps a grass tuft alive at 32x32.
 */
function sampleBlock(img, x0, y0, x1, y1, base, threshold) {
  const tally = new Map();
  let opaque = 0;
  let total = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      total += 1;
      const p = (y * img.width + x) * 4;
      if (img.data[p + 3] < SOLID) continue;
      opaque += 1;
      const k = key(img.data[p], img.data[p + 1], img.data[p + 2]);
      const e = tally.get(k);
      if (e) { e.n += 1; e.r += img.data[p]; e.g += img.data[p + 1]; e.b += img.data[p + 2]; }
      else tally.set(k, { n: 1, r: img.data[p], g: img.data[p + 1], b: img.data[p + 2] });
    }
  }
  if (!total || opaque * 2 < total) return null;

  let nonBase = null;
  let nonBaseCount = 0;
  for (const [k, e] of tally) {
    if (k === base) continue;
    nonBaseCount += e.n;
    if (!nonBase || e.n > nonBase.n) nonBase = e;
  }
  const pick = nonBase && nonBaseCount / opaque >= threshold ? nonBase : tally.get(base) || nonBase;
  if (!pick) return null;
  return [Math.round(pick.r / pick.n), Math.round(pick.g / pick.n), Math.round(pick.b / pick.n)];
}

/**
 * One output pixel, averaged. The painted path.
 *
 * `sampleBlock` above exists because a 32-pixel cell makes each output pixel a ~64x64 block of
 * source, and a mean over that much painting is mud -- so it picks one colour and keeps minority
 * detail alive. At 128 a block is ~16x16 and that reasoning inverts: picking one colour per block
 * posterises a gradient into flat steps, which is exactly the thing the painted direction is
 * trying not to look like. A mean is right when the block is small.
 *
 * Alpha is averaged rather than thresholded, so a painted edge stays soft instead of stair-stepping
 * -- which matters for the objects, not the ground.
 */
function averageBlock(img, x0, y0, x1, y1) {
  let r = 0, g = 0, b = 0, a = 0, n = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const p = (y * img.width + x) * 4;
      const alpha = img.data[p + 3];
      // Weight colour by alpha so transparent pixels do not drag the edge toward black.
      r += img.data[p] * alpha;
      g += img.data[p + 1] * alpha;
      b += img.data[p + 2] * alpha;
      a += alpha;
      n += 1;
    }
  }
  if (!n || a === 0) return null;
  return [Math.round(r / a), Math.round(g / a), Math.round(b / a), Math.round(a / n)];
}

/**
 * Resample a source region into a cell. Objects sit on the bottom edge; tiles fill the cell.
 *
 * `painted` switches the sampler and keeps real alpha. See `averageBlock`.
 */
function resample(img, box, cell, threshold, anchorBottom, painted) {
  const base = baseColour(img);
  const srcW = box.x1 - box.x0 + 1;
  const srcH = box.y1 - box.y0 + 1;
  const scale = anchorBottom ? Math.min(cell.width / srcW, cell.height / srcH) : 1;
  const drawW = anchorBottom ? Math.max(1, Math.round(srcW * scale)) : cell.width;
  const drawH = anchorBottom ? Math.max(1, Math.round(srcH * scale)) : cell.height;
  const offsetX = anchorBottom ? Math.floor((cell.width - drawW) / 2) : 0;
  const offsetY = anchorBottom ? cell.height - drawH : 0;

  const out = Buffer.alloc(cell.width * cell.height * 4);
  for (let y = 0; y < drawH; y += 1) {
    for (let x = 0; x < drawW; x += 1) {
      const sx0 = box.x0 + Math.floor((x * srcW) / drawW);
      const sx1 = box.x0 + Math.max(Math.floor(((x + 1) * srcW) / drawW), Math.floor((x * srcW) / drawW) + 1);
      const sy0 = box.y0 + Math.floor((y * srcH) / drawH);
      const sy1 = box.y0 + Math.max(Math.floor(((y + 1) * srcH) / drawH), Math.floor((y * srcH) / drawH) + 1);
      const colour = painted
        ? averageBlock(img, sx0, sy0, sx1, sy1)
        : sampleBlock(img, sx0, sy0, sx1, sy1, base, threshold);
      if (!colour) continue;
      const p = ((y + offsetY) * cell.width + x + offsetX) * 4;
      out[p] = colour[0];
      out[p + 1] = colour[1];
      out[p + 2] = colour[2];
      out[p + 3] = painted ? colour[3] : 255;
    }
  }
  return out;
}

/** Snap onto one small palette so the result is genuinely flat pixel art. */
function quantise(buf, maxColours) {
  const tally = new Map();
  for (let p = 0; p < buf.length; p += 4) {
    if (buf[p + 3] < SOLID) continue;
    const k = ((buf[p] >> 4) << 8) | ((buf[p + 1] >> 4) << 4) | (buf[p + 2] >> 4);
    const e = tally.get(k);
    if (e) { e.n += 1; e.r += buf[p]; e.g += buf[p + 1]; e.b += buf[p + 2]; }
    else tally.set(k, { n: 1, r: buf[p], g: buf[p + 1], b: buf[p + 2] });
  }
  const palette = [...tally.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, maxColours)
    .map((e) => [Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)]);
  if (!palette.length) return palette;
  for (let p = 0; p < buf.length; p += 4) {
    if (buf[p + 3] < SOLID) { buf[p + 3] = 0; continue; }
    buf[p + 3] = 255;
    let best = palette[0];
    let bestD = Infinity;
    for (const c of palette) {
      const dr = buf[p] - c[0];
      const dg = buf[p + 1] - c[1];
      const db = buf[p + 2] - c[2];
      const d = dr * dr + dg * dg + db * db;
      if (d < bestD) { bestD = d; best = c; }
    }
    buf[p] = best[0];
    buf[p + 1] = best[1];
    buf[p + 2] = best[2];
  }
  return palette;
}

/** The opaque bounding box of an object sprite, ignoring a soft halo. */
function contentBox(img) {
  let x0 = img.width;
  let y0 = img.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      if (img.data[(y * img.width + x) * 4 + 3] < SOLID) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/** Separate opaque islands, left to right -- how a multi-figure sheet is sliced. */
function findSprites(img, minArea = 400) {
  const seen = new Uint8Array(img.width * img.height);
  const boxes = [];
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      const start = y * img.width + x;
      if (seen[start] || img.data[start * 4 + 3] < SOLID) continue;
      const box = { x0: x, y0: y, x1: x, y1: y, area: 0 };
      const stack = [start];
      seen[start] = 1;
      while (stack.length) {
        const i = stack.pop();
        const cx = i % img.width;
        const cy = (i - cx) / img.width;
        box.x0 = Math.min(box.x0, cx);
        box.y0 = Math.min(box.y0, cy);
        box.x1 = Math.max(box.x1, cx);
        box.y1 = Math.max(box.y1, cy);
        box.area += 1;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= img.width || ny >= img.height) continue;
            const ni = ny * img.width + nx;
            if (seen[ni] || img.data[ni * 4 + 3] < SOLID) continue;
            seen[ni] = 1;
            stack.push(ni);
          }
        }
      }
      if (box.area >= minArea) boxes.push(box);
    }
  }
  return boxes.sort((a, b) => a.x0 - b.x0);
}

// --- what to build --------------------------------------------------------

// Every biome in data/biomes.json, and the generated file each one came from. The winning
// candidate per tile was chosen by eye against the player sprite, then checked for seams.
const TILES = {
  sea: 'sea.png',
  coast: 'coast.png',
  plains: 'plains.png',
  forest: 'forest-canopy.png',
  wetland: 'wetland.png',
  hills: 'hills.png',
  mountains: 'mountains.png',
  desert: 'desert.png',
  river: 'river.png',
  settlement: 'settlement-ground.png',
  landmark: 'landmark-ground.png'
};

// The seven landmark kinds of data/landmarks.json, drawn as objects so the ground stays plain.
const LANDMARKS = {
  'great-banyan': 'landmark-great-banyan.png',
  'hot-spring': 'landmark-hot-spring.png',
  'shell-beach': 'landmark-shell-beach.png',
  'hill-shrine': 'landmark-hill-shrine.png',
  'standing-stones': 'landmark-standing-stones.png',
  'heron-pool': 'landmark-heron-pool.png',
  'salt-pan': 'landmark-salt-pan.png'
};

// Canon's authored places. Only the archaeological sites are drawn individually -- the rest of the
// 24 points of interest still use the diamond marker.
const PLACES = {
  'kavik-tower': 'poi-kavik-tower.png',
  'silted-granary': 'poi-silted-granary.png',
  'long-archive': 'poi-long-archive.png',
  'mooring-stones': 'poi-mooring-stones.png',
  'drowned-seawall': 'poi-drowned-seawall.png',
  'customs-house': 'poi-customs-house.png',
  'bone-midden': 'poi-bone-midden.png',
  'basalt-quarry': 'poi-stepped-quarry.png',
  // Kind markers, for the places that have no art of their own. Sixteen of canon's twenty-four
  // points of interest share five kinds, and a marker that says "an anomaly is here" carries more
  // than a diamond while claiming less than a wrong building would.
  'kind-eco-site': 'poi-eco-site.png',
  'kind-anomaly': 'poi-anomaly.png',
  'kind-settlement': 'poi-settlement.png',
  'kind-wilderness': 'poi-wilderness.png',
  'kind-travel-node': 'poi-travel-node.png'
};

/**
 * The grid, at 128.
 *
 * It was 32, because the previous art direction was pixel art. The consequence was that a tile
 * drawn at roughly 80 screen pixels on a 1280-wide viewport was a 2.5x upscale of its own art, and
 * the game shipped looking soft. 128 is four times the linear resolution and sixteen times the
 * pixels; from a 2048 source that is still a 16x reduction, so the detail exists to be taken.
 *
 * PLACE keeps its 32:40 ratio -- a tower stands taller than the tile it occupies -- and HUT keeps
 * 20:22, sitting inside a cell with ground showing around it. Both scale by the same factor as
 * TILE so every existing placement rule in `frames.ts` holds without arithmetic.
 */
const SCALE = 4;

/**
 * Crops per biome. Matches TILE_VARIANTS in src/game/frames.ts -- change one, change both.
 *
 * Four. Three still showed a beat on a large plain; eight is more sheet for a difference nobody
 * reported seeing.
 */
const TILE_VARIANTS = 4;
const TILE = { width: 32 * SCALE, height: 32 * SCALE };
const OBJECT = { width: 32 * SCALE, height: 32 * SCALE };
const PLACE = { width: 32 * SCALE, height: 40 * SCALE };
const HUT = { width: 20 * SCALE, height: 22 * SCALE };

/**
 * `painted` picks the averaging sampler and skips the palette snap.
 *
 * Quantising is what made the old sheets genuinely flat pixel art, and it is precisely wrong now:
 * snapping a watercolour wash to 48 colours reintroduces the banding the higher resolution was
 * bought to remove. `colours` is ignored when painted, rather than removed, because the figure
 * sheets built by `build-sprite-sheet.js` still want it.
 */
/**
 * The sub-rectangle of a source that becomes variant `v` of `variants`.
 *
 * A tile repeats every 128 screen pixels, and a repeat that regular is a grid by another name --
 * the edge blend removes the line between two biomes but does nothing about a field of one biome
 * stamping the same texture forty times. Four crops from different parts of the source break that
 * for nothing: the art is 1254-2048 across and a tile only needs one square of it.
 *
 * The crops overlap deliberately. Four disjoint quadrants would each be a quarter of the source,
 * losing any feature bigger than that and making each variant visibly less varied than the whole.
 * These are 70% squares stepped around the image, so each keeps most of the source's character
 * while starting somewhere else.
 */
function variantBox(img, v, variants) {
  if (variants === 1) return { x0: 0, y0: 0, x1: img.width - 1, y1: img.height - 1 };
  const size = Math.floor(Math.min(img.width, img.height) * 0.7);
  // Step around the image rather than tiling it: four corners of the remaining margin.
  const spanX = img.width - size;
  const spanY = img.height - size;
  const corners = [
    [0, 0],
    [spanX, 0],
    [spanX, spanY],
    [0, spanY]
  ];
  const [ox, oy] = corners[v % corners.length];
  return { x0: ox, y0: oy, x1: ox + size - 1, y1: oy + size - 1 };
}

function buildStrip(entries, cell, anchorBottom, threshold, colours, outFile, label, painted, variants = 1) {
  const names = Object.keys(entries);
  // Frame order is name-major: every variant of the first name, then of the second. `tileFrame`
  // in frames.ts mirrors this, and a test asserts the sheet is the width that implies.
  const sheetWidth = cell.width * names.length * variants;
  const sheet = Buffer.alloc(sheetWidth * cell.height * 4);
  names.forEach((name, nameIndex) => {
    const file = path.join(SRC, entries[name]);
    const img = decodePng(file);
    for (let v = 0; v < variants; v += 1) {
      const box = anchorBottom ? contentBox(img) : variantBox(img, v, variants);
      if (!box) throw new Error(`${entries[name]}: nothing opaque to place`);
      const frame = resample(img, box, cell, threshold, anchorBottom, painted);
      const index = nameIndex * variants + v;
      for (let y = 0; y < cell.height; y += 1) {
        const from = y * cell.width * 4;
        const to = (y * sheetWidth + index * cell.width) * 4;
        frame.copy(sheet, to, from, from + cell.width * 4);
      }
    }
  });
  const palette = painted ? null : quantise(sheet, colours);
  fs.writeFileSync(outFile, encodePng(sheetWidth, cell.height, sheet));
  const kb = (fs.statSync(outFile).size / 1024).toFixed(1);
  const how = painted ? 'painted' : `${palette.length} colours`;
  const count = variants > 1 ? `${names.length}x${variants} frames` : `${names.length} frames`;
  console.log(`${label}: ${count} of ${cell.width}x${cell.height}, ${how}, ${kb} KB`);
  console.log(`  order: ${names.join(', ')}`);
}

function main() {
  const arg = (name, fallback) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? Number(hit.split('=')[1]) : fallback;
  };
  const threshold = arg('threshold', 0.22);

  buildStrip(TILES, TILE, false, threshold, 48, path.join(OUT, 'terrain.png'), 'terrain', true, TILE_VARIANTS);
  buildStrip(LANDMARKS, OBJECT, true, threshold, 40, path.join(OUT, 'landmarks.png'), 'landmarks', true);
  buildStrip(PLACES, PLACE, true, threshold, 40, path.join(OUT, 'places.png'), 'places', true);

  // The huts arrive as one sheet of four separated figures, so they are sliced rather than listed.
  const hutsFile = path.join(SRC, 'huts.png');
  const huts = decodePng(hutsFile);
  const boxes = findSprites(huts);
  const sheetWidth = HUT.width * boxes.length;
  const sheet = Buffer.alloc(sheetWidth * HUT.height * 4);
  boxes.forEach((box, index) => {
    const frame = resample(huts, box, HUT, threshold, true, true);
    for (let y = 0; y < HUT.height; y += 1) {
      const from = y * HUT.width * 4;
      const to = (y * sheetWidth + index * HUT.width) * 4;
      frame.copy(sheet, to, from, from + HUT.width * 4);
    }
  });
  fs.writeFileSync(path.join(OUT, 'huts.png'), encodePng(sheetWidth, HUT.height, sheet));
  const kb = (fs.statSync(path.join(OUT, 'huts.png')).size / 1024).toFixed(1);
  console.log(`huts: ${boxes.length} frames of ${HUT.width}x${HUT.height}, painted, ${kb} KB`);
}

main();
