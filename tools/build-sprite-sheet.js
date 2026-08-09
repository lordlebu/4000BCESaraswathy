// Turn a generated sprite sheet into a clean, small, crisp game asset.
//
// Image models hand back pixel art that is not really pixel art: the figures are upscaled and
// compressed, so a 381x262 sheet arrives with 27,000 distinct colours and one-pixel colour runs.
// They also draw the *transparency checkerboard* as opaque grey squares, so the file has an alpha
// channel in which nothing is actually transparent.
//
// This script fixes both, and is deliberately reproducible so a re-generated sheet can be dropped
// in and rebuilt rather than hand-edited:
//
//   1. Key out the checkerboard by flood-filling inward from the border. Matching grey by colour
//      alone would also erase the character's grey beard; flooding from the edge cannot reach it,
//      because the figure encloses it.
//   2. Find each sprite's bounding box from what survives.
//   3. Resample each frame to its true pixel grid taking the **most common** colour in each block
//      rather than the average. Averaging is what made the first attempt look hazy — a mode keeps
//      edges hard and throws the compression noise away.
//   4. Emit one tidy sheet with real transparency, every frame in a uniform cell, bottom-centred
//      so the game can anchor the figure by its feet.
//
// CommonJS, like everything in tools/ — see tools/package.json.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// --- PNG in ---------------------------------------------------------------

function decodePng(file) {
  const buf = fs.readFileSync(file);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (buf[24] !== 8 || buf[25] !== 6) {
    throw new Error(`${file}: expected 8-bit RGBA, got depth ${buf[24]} type ${buf[25]}`);
  }

  const chunks = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    if (buf.toString('ascii', off + 4, off + 8) === 'IDAT') {
      chunks.push(buf.subarray(off + 8, off + 8 + len));
    }
    off += 12 + len;
  }

  const raw = zlib.inflateSync(Buffer.concat(chunks));
  const stride = width * 4;
  const data = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? data[y * stride + x - 4] : 0;
      const up = y > 0 ? data[(y - 1) * stride + x] : 0;
      const upLeft = x >= 4 && y > 0 ? data[(y - 1) * stride + x - 4] : 0;
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
      data[y * stride + x] = v & 0xff;
    }
    pos += stride;
  }
  return { width, height, data };
}

// --- PNG out --------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, body) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([len, typed, crc]);
}

function encodePng(width, height, data) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none. The images are tiny; this compresses fine.
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// --- Cleaning -------------------------------------------------------------

/** The checkerboard is grey; the artwork is not (except the beard, which the flood cannot reach). */
function looksLikeCheckerboard(r, g, b) {
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (spread > 26) return false;
  const lum = (r + g + b) / 3;
  return Math.abs(lum - 48) < 30 || Math.abs(lum - 120) < 34;
}

/** Does the sheet already have real transparency? Then there is nothing to key. */
function hasRealTransparency(img) {
  const { data } = img;
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 128) clear += 1;
  // A sheet of separated figures is mostly empty space; a few stray soft pixels are not.
  return clear > data.length / 4 / 5;
}

/**
 * Flood inward from every border pixel, clearing the checkerboard as it goes.
 *
 * This is a fallback for sheets that arrive with the transparency checkerboard painted on as
 * opaque grey. It is imperfect by nature — the greys in the artwork are near enough to the
 * checkerboard greys that an aggressive threshold bites into the figures and a timid one leaves
 * a halo. A sheet with genuine alpha skips this entirely and comes out cleaner.
 */
function keyOutBackground(img) {
  const { width, height, data } = img;
  const clear = new Uint8Array(width * height);
  const queue = [];

  const consider = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (clear[i]) return;
    const p = i * 4;
    if (!looksLikeCheckerboard(data[p], data[p + 1], data[p + 2])) return;
    clear[i] = 1;
    queue.push(x, y);
  };

  for (let x = 0; x < width; x += 1) {
    consider(x, 0);
    consider(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    consider(0, y);
    consider(width - 1, y);
  }
  while (queue.length) {
    const y = queue.pop();
    const x = queue.pop();
    consider(x + 1, y);
    consider(x - 1, y);
    consider(x, y + 1);
    consider(x, y - 1);
  }

  // The checker meets the art through a soft compressed edge, which leaves a grey halo. Two
  // passes of "greyish and touching cleared space" takes the fringe off without biting into
  // the figure.
  for (let pass = 0; pass < 2; pass += 1) {
    const edge = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = y * width + x;
        if (clear[i]) continue;
        const touching =
          (x > 0 && clear[i - 1]) ||
          (x < width - 1 && clear[i + 1]) ||
          (y > 0 && clear[i - width]) ||
          (y < height - 1 && clear[i + width]);
        if (!touching) continue;
        const p = i * 4;
        if (looksLikeCheckerboard(data[p], data[p + 1], data[p + 2])) edge.push(i);
      }
    }
    for (const i of edge) clear[i] = 1;
  }

  for (let i = 0; i < clear.length; i += 1) if (clear[i]) data[i * 4 + 3] = 0;
  return img;
}

/**
 * Bounding boxes of the opaque islands, ordered left-to-right then top-to-bottom.
 *
 * The alpha test is a threshold rather than "not zero" on purpose: upscaled art carries a soft
 * halo of barely-there pixels that can reach the canvas edge, and counting those as artwork makes
 * every bounding box the size of the whole image.
 */
const SOLID = 128;

function findSprites(img, minArea = 400) {
  const { width, height, data } = img;
  const seen = new Uint8Array(width * height);
  const boxes = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (seen[start] || data[start * 4 + 3] < SOLID) continue;
      const box = { x0: x, y0: y, x1: x, y1: y, area: 0 };
      const stack = [start];
      seen[start] = 1;
      while (stack.length) {
        const i = stack.pop();
        const cx = i % width;
        const cy = (i - cx) / width;
        box.x0 = Math.min(box.x0, cx);
        box.y0 = Math.min(box.y0, cy);
        box.x1 = Math.max(box.x1, cx);
        box.y1 = Math.max(box.y1, cy);
        box.area += 1;
        // Eight-way, so a diagonal join in the art does not split one figure into two sprites.
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const ni = ny * width + nx;
            if (seen[ni] || data[ni * 4 + 3] < SOLID) continue;
            seen[ni] = 1;
            stack.push(ni);
          }
        }
      }
      if (box.area >= minArea) boxes.push(box);
    }
  }

  boxes.sort((a, b) => (Math.abs(a.y0 - b.y0) > 20 ? a.y0 - b.y0 : a.x0 - b.x0));
  return boxes;
}

/** The most common colour in a source rectangle, ignoring transparency. Mode, not mean. */
function modeColour(img, x0, y0, x1, y1) {
  const { width, data } = img;
  const tally = new Map();
  let opaque = 0;
  let total = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      total += 1;
      const p = (y * width + x) * 4;
      if (data[p + 3] < 128) continue;
      opaque += 1;
      // Quantise to 5 bits per channel so compression noise collapses onto one entry.
      const key = ((data[p] >> 3) << 10) | ((data[p + 1] >> 3) << 5) | (data[p + 2] >> 3);
      const seen = tally.get(key);
      if (seen) {
        seen.n += 1;
        seen.r += data[p];
        seen.g += data[p + 1];
        seen.b += data[p + 2];
      } else {
        tally.set(key, { n: 1, r: data[p], g: data[p + 1], b: data[p + 2] });
      }
    }
  }
  if (!total || opaque * 2 < total) return null;

  let best = null;
  for (const entry of tally.values()) if (!best || entry.n > best.n) best = entry;
  if (!best) return null;
  return [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)];
}

/** Resample one sprite into a cell, bottom-centred so the figure can be anchored by the feet. */
function resample(img, box, cell) {
  const out = Buffer.alloc(cell.width * cell.height * 4);
  const srcW = box.x1 - box.x0 + 1;
  const srcH = box.y1 - box.y0 + 1;

  const scale = Math.min(cell.width / srcW, cell.height / srcH);
  const drawW = Math.max(1, Math.round(srcW * scale));
  const drawH = Math.max(1, Math.round(srcH * scale));
  const offsetX = Math.floor((cell.width - drawW) / 2);
  const offsetY = cell.height - drawH;

  for (let y = 0; y < drawH; y += 1) {
    for (let x = 0; x < drawW; x += 1) {
      const sx0 = box.x0 + Math.floor((x * srcW) / drawW);
      const sx1 = box.x0 + Math.max(Math.floor(((x + 1) * srcW) / drawW), Math.floor((x * srcW) / drawW) + 1);
      const sy0 = box.y0 + Math.floor((y * srcH) / drawH);
      const sy1 = box.y0 + Math.max(Math.floor(((y + 1) * srcH) / drawH), Math.floor((y * srcH) / drawH) + 1);
      const colour = modeColour(img, sx0, sy0, sx1, sy1);
      if (!colour) continue;
      const p = ((y + offsetY) * cell.width + x + offsetX) * 4;
      out[p] = colour[0];
      out[p + 1] = colour[1];
      out[p + 2] = colour[2];
      out[p + 3] = 255;
    }
  }
  return out;
}

/**
 * Snap the whole sheet onto one small shared palette.
 *
 * Resampling alone is not enough. Each output pixel averages a slightly different patch of a noisy
 * source, so a 32x48 frame lands with ~400 distinct colours — technically small, but it still
 * reads as a photograph of pixel art rather than pixel art. Collapsing to a couple of dozen
 * colours makes the blocks genuinely flat, and a tight palette is what the cozy colour e-ink
 * direction is asking for anyway.
 *
 * One palette across every frame, so the character does not shift hue when he turns around.
 */
function quantise(sheet, maxColours) {
  const tally = new Map();
  for (let p = 0; p < sheet.length; p += 4) {
    if (sheet[p + 3] < SOLID) continue;
    // Bucket coarsely first so near-identical noise votes together.
    const key = ((sheet[p] >> 4) << 8) | ((sheet[p + 1] >> 4) << 4) | (sheet[p + 2] >> 4);
    const seen = tally.get(key);
    if (seen) {
      seen.n += 1;
      seen.r += sheet[p];
      seen.g += sheet[p + 1];
      seen.b += sheet[p + 2];
    } else {
      tally.set(key, { n: 1, r: sheet[p], g: sheet[p + 1], b: sheet[p + 2] });
    }
  }

  const palette = [...tally.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, maxColours)
    .map((e) => [Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)]);
  if (!palette.length) return palette;

  for (let p = 0; p < sheet.length; p += 4) {
    if (sheet[p + 3] < SOLID) {
      // Anything not solidly opaque becomes fully clear: pixel art has no soft edges, and a halo
      // of half-transparent pixels is what makes a sprite look blurry against the map.
      sheet[p + 3] = 0;
      continue;
    }
    sheet[p + 3] = 255;
    let best = palette[0];
    let bestDistance = Infinity;
    for (const c of palette) {
      const dr = sheet[p] - c[0];
      const dg = sheet[p + 1] - c[1];
      const db = sheet[p + 2] - c[2];
      const d = dr * dr + dg * dg + db * db;
      if (d < bestDistance) {
        bestDistance = d;
        best = c;
      }
    }
    sheet[p] = best[0];
    sheet[p + 1] = best[1];
    sheet[p + 2] = best[2];
  }
  return palette;
}

// --- Run ------------------------------------------------------------------

function main() {
  const [, , inputArg, outputArg, wArg, hArg] = process.argv;
  // Comma-separated inputs become consecutive frames in the order given, which is how the
  // directional frames are assembled from one file per facing.
  const inputs = (inputArg || 'Varuna_new.png')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const output = outputArg || path.join('assets', 'varuna-sheet.png');
  const cell = { width: Number(wArg) || 24, height: Number(hArg) || 32 };

  const frames = [];
  for (const input of inputs) {
    const img = decodePng(input);
    console.log(`Read ${input} — ${img.width}x${img.height}`);

    if (hasRealTransparency(img)) {
      console.log('  real transparency, nothing to key out');
    } else {
      console.log('  no real transparency: assuming a painted-on checkerboard and keying it out');
      keyOutBackground(img);
    }

    const boxes = findSprites(img);
    console.log(
      `  ${boxes.length} figure(s): ${boxes
        .map((b) => `${b.x1 - b.x0 + 1}x${b.y1 - b.y0 + 1}`)
        .join(', ')}`
    );
    for (const box of boxes) frames.push(resample(img, box, cell));
  }

  const sheetWidth = cell.width * frames.length;
  const sheet = Buffer.alloc(sheetWidth * cell.height * 4);
  frames.forEach((frame, index) => {
    for (let y = 0; y < cell.height; y += 1) {
      const from = y * cell.width * 4;
      const to = (y * sheetWidth + index * cell.width) * 4;
      frame.copy(sheet, to, from, from + cell.width * 4);
    }
  });

  const palette = quantise(sheet, Number(process.env.SPRITE_COLOURS) || 22);
  console.log(`Quantised to ${palette.length} colours`);

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, encodePng(sheetWidth, cell.height, sheet));
  const size = fs.statSync(output).size;
  console.log(
    `Wrote ${output} — ${frames.length} frames of ${cell.width}x${cell.height}, ${(size / 1024).toFixed(1)} KB`
  );
}

main();
