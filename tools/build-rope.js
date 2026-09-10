// The rope crossing, from painted art, in the track sheet's own shape.
//
// **A second sheet rather than a second flag.** `crossing.ts` made the rail/rope distinction a
// derivation on purpose -- both are `Tile.track`, and `railSpan` decides which stretch is which,
// so "a second flag would be a second thing to keep true". What was missing is that the *drawing*
// never asked: `planTrack` drew the iron sheet from the beach to the far island, so the rope
// ladder up an island's flank was rendered as railway. This builds the sheet the other half wants.
//
// Frame order is `trackFrame`'s, unchanged -- north-south, east-west, then the same two worn --
// so the plan picks a sheet and keeps its index arithmetic.
//
// CommonJS, like everything in tools/ -- see tools/package.json.

const fs = require('fs');
const path = require('path');
const { encodePng } = require('./sprite-png.js');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'source');
const OUT = path.join(ROOT, 'assets');

/** Matches CELL and SCALE in build-track.js: 32 pixels of art, blown up four times. */
const CELL = 32;
const SCALE = 4;
const PIECES = 4;

/** How many colours the sheet is snapped to. The rail sheet draws in five; hemp needs a few more. */
const COLOURS = 14;

// --- PNG ------------------------------------------------------------------
// The same hand-rolled decoder the other builders carry, for the same reason: no dependency.

function decodePng(file) {
  const buf = fs.readFileSync(file);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const depth = buf[24];
  const colour = buf[25];
  if (depth !== 8 || (colour !== 6 && colour !== 2)) {
    throw new Error(`${path.basename(file)}: expected 8-bit RGB or RGBA, got depth ${depth} type ${colour}`);
  }
  const zlib = require('node:zlib');
  const chunks = [];
  let at = 8;
  while (at < buf.length) {
    const len = buf.readUInt32BE(at);
    const type = buf.toString('ascii', at + 4, at + 8);
    if (type === 'IDAT') chunks.push(buf.subarray(at + 8, at + 8 + len));
    at += len + 12;
  }
  const raw = zlib.inflateSync(Buffer.concat(chunks));
  const channels = colour === 6 ? 4 : 3;
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

/**
 * Drop the background: transparent pixels, painted magenta, and the black matte behind them.
 *
 * The sheet arrived with real alpha *and* magenta gutters *and* black inside the cells, which is
 * three backgrounds for one drawing. Rather than guess which one the model meant, everything that
 * is not warm and opaque goes: hemp and timber are warm, and the three backgrounds are not.
 */
function cutOut(img) {
  const out = Buffer.alloc(img.width * img.height * 4);
  for (let i = 0; i < img.width * img.height; i += 1) {
    const r = img.data[i * 4], g = img.data[i * 4 + 1], b = img.data[i * 4 + 2], a = img.data[i * 4 + 3];
    if (a < 160) continue;
    if (r > 170 && b > 170 && g < 110) continue;  // magenta, and its speckle
    if (r < 30 && g < 30 && b < 30) continue;     // the black matte
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = 255;
  }
  return out;
}

/**
 * The square this cell contributes, centred in it.
 *
 * **A run tile has to be square and the art is not**, and cropping to the *content* would be
 * wrong here in a way it is right for the rim sheets. A rim is a band and its content box is the
 * band; a run is a line that crosses the whole tile, so cropping to the ink and stretching would
 * make the rope as wide as the tile. Taking the cell's shorter side, centred, keeps the run
 * spanning edge to edge and keeps its width the fraction of the tile the artist drew.
 */
function centredSquare(cell) {
  const side = Math.min(cell.w, cell.h);
  return {
    x: cell.x + Math.floor((cell.w - side) / 2),
    y: cell.y + Math.floor((cell.h - side) / 2),
    side
  };
}

/** Most common colour per block, which is what keeps pixel art crisp. A mean makes it hazy. */
function resample(src, srcW, box, out) {
  const dst = Buffer.alloc(out * out * 4);
  const step = box.side / out;
  for (let y = 0; y < out; y += 1) {
    for (let x = 0; x < out; x += 1) {
      const tally = new Map();
      let opaque = 0, seen = 0;
      for (let sy = Math.floor(y * step); sy < Math.floor((y + 1) * step); sy += 1) {
        for (let sx = Math.floor(x * step); sx < Math.floor((x + 1) * step); sx += 1) {
          const i = ((box.y + sy) * srcW + box.x + sx) * 4;
          seen += 1;
          if (src[i + 3] < 128) continue;
          opaque += 1;
          const key = (src[i] << 16) | (src[i + 1] << 8) | src[i + 2];
          tally.set(key, (tally.get(key) ?? 0) + 1);
        }
      }
      // A block that is mostly background stays background, so the rope keeps a hard edge.
      if (!seen || opaque * 2 < seen) continue;
      let best = 0, most = -1;
      for (const [key, n] of tally) if (n > most) { most = n; best = key; }
      const to = (y * out + x) * 4;
      dst[to] = (best >> 16) & 255;
      dst[to + 1] = (best >> 8) & 255;
      dst[to + 2] = best & 255;
      dst[to + 3] = 255;
    }
  }
  return dst;
}

/** Snap onto one small palette, shared across the four frames so they are lit alike. */
function quantise(buf, maxColours) {
  const tally = new Map();
  for (let i = 0; i < buf.length; i += 4) {
    if (buf[i + 3] === 0) continue;
    const key = (buf[i] << 16) | (buf[i + 1] << 8) | buf[i + 2];
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  const palette = [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColours)
    .map(([key]) => [(key >> 16) & 255, (key >> 8) & 255, key & 255]);
  if (!palette.length) return palette;
  for (let i = 0; i < buf.length; i += 4) {
    if (buf[i + 3] === 0) continue;
    let best = palette[0], near = Infinity;
    for (const c of palette) {
      const d = (buf[i] - c[0]) ** 2 + (buf[i + 1] - c[1]) ** 2 + (buf[i + 2] - c[2]) ** 2;
      if (d < near) { near = d; best = c; }
    }
    buf[i] = best[0]; buf[i + 1] = best[1]; buf[i + 2] = best[2];
  }
  return palette;
}

function upscale(src, width, height, factor) {
  const w = width * factor, h = height * factor;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const from = (Math.floor(y / factor) * width + Math.floor(x / factor)) * 4;
      src.copy(out, (y * w + x) * 4, from, from + 4);
    }
  }
  return out;
}

function main() {
  const apply = process.argv.includes('--apply');
  const file = path.join(SRC, 'rope-runs.png');
  const img = decodePng(file);
  const cut = cutOut(img);
  const cw = Math.floor(img.width / PIECES);

  console.log(apply ? 'Building the rope sheet:' : 'Building the rope sheet (dry run, pass --apply to write):');
  console.log(`  rope-runs.png (${img.width}x${img.height}) -> ${PIECES} cells of ${cw}x${img.height}`);

  const frames = [];
  for (let i = 0; i < PIECES; i += 1) {
    const box = centredSquare({ x: i * cw, y: 0, w: cw, h: img.height });
    frames.push(resample(cut, img.width, box, CELL));
    console.log(`    frame ${i}: square ${box.side}x${box.side} at ${box.x},${box.y} -> ${CELL}x${CELL}`);
  }

  const small = Buffer.concat(frames);
  const palette = quantise(small, COLOURS);
  const span = CELL * CELL * 4;
  frames.forEach((frame, i) => small.copy(frame, 0, i * span, (i + 1) * span));

  const sheetWidth = CELL * PIECES;
  const sheet = Buffer.alloc(sheetWidth * CELL * 4);
  frames.forEach((frame, index) => {
    const ox = index * CELL;
    for (let y = 0; y < CELL; y += 1) {
      const from = y * CELL * 4;
      frame.copy(sheet, (y * sheetWidth + ox) * 4, from, from + CELL * 4);
    }
  });

  const big = upscale(sheet, sheetWidth, CELL, SCALE);
  const png = encodePng(sheetWidth * SCALE, CELL * SCALE, big);
  console.log(`  -> rope.png ${sheetWidth * SCALE}x${CELL * SCALE}, ${palette.length} colours, ${(png.length / 1024).toFixed(1)} KB`);
  console.log('  order: north-south, east-west, north-south worn, east-west worn');
  if (apply) fs.writeFileSync(path.join(OUT, 'rope.png'), png);
  else console.log('\n  Nothing written.');
}

main();
