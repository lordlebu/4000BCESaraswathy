// The buildings that are bigger than a tile.
//
// **A fifth contract, and the reason is measurement rather than taste.** `places` is 128 x 160 --
// one tile wide, bottom-anchored -- and the seventeen frames on it are drawn for that. The temple
// is not: its art is 448 x 731, and forced into 128 wide the seven shikhara spires merge into one
// lumpy ridge, the carved bands on the drum vanish, and the plinth courses become a single grey
// stripe. You can still tell it is a pale ruin. You cannot tell it is a temple.
//
// So these get their own sheets at their own cell sizes, which is the call `trees` already made
// when it left the flora sheet because "the flora cell is square and this tree cannot be".
//
// **Nothing in the engine has to change for a bigger building.** `WorldScene` draws an anchored
// sprite with `add.image(...)` and `setOrigin(0.5, 1)` and never calls `setDisplaySize`, so the
// sheet's cell size *is* the on-screen size. A wider cell is a wider building, for free. What it
// costs instead is two things worth knowing: a sprite three tiles tall covers three rows above its
// anchor, and one two tiles wide overhangs half a tile either side of its column.
//
// CommonJS, like everything in tools/.

const fs = require('fs');
const path = require('path');
const { encodePng } = require('./sprite-png.js');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'source');
const OUT = path.join(ROOT, 'assets');

/**
 * What to build, and the cell each one draws at.
 *
 * **Cell aspect matches the source art's aspect**, so nothing squashes. The temple's art is
 * 1:1.63 and 256 x 416 is 1:1.625 -- under half a percent out. The windmill's is 1:1.90 and
 * 256 x 480 is 1:1.875.
 *
 * Sizes are whole tiles and useful fractions of one: the grid is 128, so 256 is two columns and
 * 416 is three and a quarter rows.
 */
const JOBS = [
  {
    name: 'monuments',
    source: 'temple-ruins.png',
    cells: 3,
    width: 256,
    height: 416,
    colours: 24,
    /**
     * Bottom-anchored: the plinth sits on the bottom edge and the building rises into the tiles
     * above. The three variants are different heights on purpose -- a standing temple, a collapsed
     * one, a bare plinth -- so each is placed against the *bottom* of the cell rather than scaled
     * to fill it, which is what keeps them the same building at three stages rather than three
     * buildings.
     */
    anchor: 'bottom'
  }
  // **The windmill was the second job here and is not any more.** It asked a painter for six cells
  // of one mill at fifteen degrees apart, and what came back had the tower at `y 79-709`
  // pixel-identically in all six -- six copies of one position, with the rotation the sheet existed
  // for simply absent. `tools/build-windmill.js` takes one wheel and turns it here instead, which
  // is fewer things for a painter to get right and a source that can be re-stepped at any angle.
];

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
 * Drop the background: transparent, magenta of any brightness, and the black matte.
 *
 * **Magenta of any brightness is the correction.** The first version tested `r > 180 && b > 180`,
 * which is right for `#FF00FF` and wrong for what actually arrives -- the temple sheet's key
 * measured `144,1,145`, a magenta dimmed by whatever the generator did on the way out. Keying on
 * the *hue* rather than the brightness catches both, and nothing in a bone-and-lichen building is
 * magenta at any brightness.
 *
 * The black cut is deliberately tight at 24. It was 40 first and that ate the shadow inside the
 * temple's arches, which is the depth that makes a doorway read as a doorway.
 */
function isBackground(img, x, y) {
  const p = (y * img.width + x) * 4;
  const [r, g, b, a] = [img.data[p], img.data[p + 1], img.data[p + 2], img.data[p + 3]];
  if (a < 40) return true;
  if (g < 95 && r > 85 && b > 85 && Math.abs(r - b) < 70) return true;
  return r < 24 && g < 24 && b < 24;
}

/** The drawn box inside one cell of the source grid. */
function contentBox(img, cell, cells) {
  const cw = img.width / cells;
  const ox = Math.round(cell * cw);
  let top = null, bot = null, left = null, right = null;
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < cw; x += 1) {
      if (isBackground(img, ox + x, y)) continue;
      if (top === null) top = y;
      bot = y;
      if (left === null || x < left) left = x;
      if (right === null || x > right) right = x;
    }
  }
  if (top === null) return null;
  return { ox: ox + left, oy: top, w: right - left + 1, h: bot - top + 1 };
}

/**
 * Resample a box to a target size, taking the **most common** colour per block.
 *
 * A mean is what made an early character sheet look hazy -- `build-sprite-sheet.js` records it --
 * and the same applies here: averaging a carved moulding against its shadow gives mud, while the
 * modal colour keeps an edge an edge.
 */
function resample(img, box, tw, th) {
  const out = Buffer.alloc(tw * th * 4);
  const sx = box.w / tw;
  const sy = box.h / th;
  for (let y = 0; y < th; y += 1) {
    for (let x = 0; x < tw; x += 1) {
      const tally = new Map();
      let clear = 0;
      let total = 0;
      for (let j = Math.floor(y * sy); j < Math.ceil((y + 1) * sy); j += 1) {
        for (let i = Math.floor(x * sx); i < Math.ceil((x + 1) * sx); i += 1) {
          const gx = box.ox + i;
          const gy = box.oy + j;
          if (gx >= img.width || gy >= img.height) continue;
          total += 1;
          if (isBackground(img, gx, gy)) { clear += 1; continue; }
          const p = (gy * img.width + gx) * 4;
          const [r, g, b] = [img.data[p], img.data[p + 1], img.data[p + 2]];
          const key = `${r >> 3},${g >> 3},${b >> 3}`;
          const seen = tally.get(key) || { n: 0, r: 0, g: 0, b: 0 };
          seen.n += 1; seen.r += r; seen.g += g; seen.b += b;
          tally.set(key, seen);
        }
      }
      const to = (y * tw + x) * 4;
      if (total === 0 || clear > total * 0.5 || tally.size === 0) { out[to + 3] = 0; continue; }
      let best = null;
      for (const seen of tally.values()) if (!best || seen.n > best.n) best = seen;
      out[to] = Math.round(best.r / best.n);
      out[to + 1] = Math.round(best.g / best.n);
      out[to + 2] = Math.round(best.b / best.n);
      out[to + 3] = 255;
    }
  }
  return out;
}

/**
 * Snap every frame to one shared palette, by **median cut**.
 *
 * **Popularity was tried first and wrecked the marble.** Taking the top N colours by count keeps
 * the bright cream a temple is mostly made of and throws the mid-tones away, so the warm greys and
 * the lichen collapse and what is left is near-white against near-black -- the exact "hole in the
 * screen" `docs/art-brief.md` warns the marble must not become. It looked like the art's fault and
 * was not.
 *
 * Median cut splits the colour *volume* rather than counting heads, so a tone that is rare but far
 * from everything else keeps a slot. The rule generalises past this sheet: **a popularity palette
 * ruins any subject that is mostly one colour**, which is most buildings.
 */
function quantise(frames, colours) {
  const pixels = [];
  for (const frame of frames) {
    for (let p = 0; p < frame.length; p += 4) {
      if (frame[p + 3] < 128) continue;
      pixels.push([frame[p], frame[p + 1], frame[p + 2]]);
    }
  }
  if (pixels.length === 0) return 0;

  let boxes = [pixels];
  while (boxes.length < colours) {
    let pick = -1, widest = -1, channel = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let c = 0; c < 3; c += 1) {
        let lo = 255, hi = 0;
        for (const px of box) { if (px[c] < lo) lo = px[c]; if (px[c] > hi) hi = px[c]; }
        if (hi - lo > widest) { widest = hi - lo; pick = i; channel = c; }
      }
    });
    if (pick < 0 || widest <= 0) break;
    const box = boxes[pick].slice().sort((a, b) => a[channel] - b[channel]);
    const mid = Math.floor(box.length / 2);
    boxes.splice(pick, 1, box.slice(0, mid), box.slice(mid));
  }

  const palette = boxes.filter((b) => b.length > 0).map((box) => {
    const sum = box.reduce((a, px) => [a[0] + px[0], a[1] + px[1], a[2] + px[2]], [0, 0, 0]);
    return sum.map((v) => Math.round(v / box.length));
  });

  for (const frame of frames) {
    for (let p = 0; p < frame.length; p += 4) {
      if (frame[p + 3] < 128) continue;
      let best = palette[0], near = Infinity;
      for (const c of palette) {
        const d = (c[0] - frame[p]) ** 2 + (c[1] - frame[p + 1]) ** 2 + (c[2] - frame[p + 2]) ** 2;
        if (d < near) { near = d; best = c; }
      }
      frame[p] = best[0]; frame[p + 1] = best[1]; frame[p + 2] = best[2];
    }
  }
  return palette.length;
}

/**
 * Place a resampled drawing into its cell, standing on the bottom edge.
 *
 * The three temple variants are different heights and **must not be scaled to match**: they are one
 * building at three stages, so the plinth has to land on the same line in all three or the ruin
 * appears to sink into the ground as it collapses. Each keeps its own proportions and is dropped
 * against the floor of the cell.
 */
function intoCell(drawing, dw, dh, cw, ch) {
  const out = Buffer.alloc(cw * ch * 4);
  const ox = Math.round((cw - dw) / 2);
  const oy = ch - dh;
  for (let y = 0; y < dh; y += 1) {
    for (let x = 0; x < dw; x += 1) {
      const X = ox + x, Y = oy + y;
      if (X < 0 || Y < 0 || X >= cw || Y >= ch) continue;
      drawing.copy(out, (Y * cw + X) * 4, (y * dw + x) * 4, (y * dw + x) * 4 + 4);
    }
  }
  return out;
}

function build(job) {
  const img = decodePng(path.join(SRC, job.source));
  const boxes = [];
  for (let c = 0; c < job.cells; c += 1) {
    const box = contentBox(img, c, job.cells);
    if (box === null) throw new Error(`${job.source}: cell ${c} is empty`);
    boxes.push(box);
  }

  // **Scale every frame by the same factor**, set by the tallest. A per-frame fit would make the
  // bare plinth as tall as the standing temple, which is three buildings rather than one ruin.
  const tallest = Math.max(...boxes.map((b) => b.h));
  const widest = Math.max(...boxes.map((b) => b.w));
  const scale = Math.min(job.width / widest, job.height / tallest);

  const drawn = boxes.map((box) => {
    const dw = Math.max(1, Math.round(box.w * scale));
    const dh = Math.max(1, Math.round(box.h * scale));
    return { data: resample(img, box, dw, dh), dw, dh };
  });

  const colours = quantise(drawn.map((d) => d.data), job.colours);
  const cells = drawn.map((d) => intoCell(d.data, d.dw, d.dh, job.width, job.height));

  const sheetWidth = job.width * job.cells;
  const sheet = Buffer.alloc(sheetWidth * job.height * 4);
  cells.forEach((cell, index) => {
    const ox = index * job.width;
    for (let y = 0; y < job.height; y += 1) {
      cell.copy(sheet, (y * sheetWidth + ox) * 4, y * job.width * 4, (y + 1) * job.width * 4);
    }
  });

  const file = path.join(OUT, `${job.name}.png`);
  fs.writeFileSync(file, encodePng(sheetWidth, job.height, sheet));
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`${job.name}: ${job.cells} frames of ${job.width}x${job.height}, ${colours} colours, ${kb} KB`);
  boxes.forEach((b, i) => {
    console.log(`  frame ${i}: source ${b.w}x${b.h} -> ${drawn[i].dw}x${drawn[i].dh}`);
  });
}

function main() {
  const only = process.argv[2];
  for (const job of JOBS) {
    if (only && job.name !== only) continue;
    build(job);
  }
}

// **The intake pieces are shared, not copied.** `build-windmill.js` needs the same decoder, the
// same background key and the same median-cut quantiser, and a second copy of any of them is a
// second place for the magenta-hue fix and the black cut at 24 to be got wrong. Exported rather
// than duplicated; `main` still runs when this file is invoked directly.
module.exports = { decodePng, isBackground, contentBox, resample, quantise, intoCell, encodePng };

if (require.main === module) main();
