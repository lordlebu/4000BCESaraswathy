/**
 * The Aravali strait's traffic, cut from the owner's paintings and sized for the map.
 *
 *   node tools/build-strait.js
 *
 * **Three paintings in, named frames out**, into `assets/strait/`, one PNG a frame, which
 * `src/game/straitArt.ts` globs -- the same arrangement the wandering animals have, so a repainted
 * frame needs no code.
 *
 *   assets/source/strait/painted/ship-kelpfang.png   the outrigger, one view facing right
 *   assets/source/strait/painted/fishing-sheet.png   twenty frames: side right and left, two ends
 *   assets/source/strait/painted/fishing-front.png   the bow-on view, white and madder
 *   assets/source/strait/painted/kite-sheet.png      sixteen frames: four facings, two streamers
 *   assets/source/strait/whale-calf-back.png         drawn in code (`draw-strait-art.py`), magenta
 *   assets/source/strait/whale-spout.png             likewise
 *
 * **Every figure is opaque over a faint glow**, so the cut is an alpha threshold (200) and every
 * frame floods as one piece -- measured on all three sheets on 3 October 2026. Frames are found by
 * flooding rather than cut on a grid, then read top to bottom in bands of 150 pixels and left to
 * right, which is the order the sheets were painted in.
 *
 * **Shrunk by averaging, not by picking.** The paintings are high resolution in a pixel style, with
 * no grid to sample on -- the run lengths measured 2 to 7 pixels with no peak -- so the commonest
 * colour per block (the dugout's rule) turns their soft shading to noise. A box average on
 * premultiplied colour, then a hard alpha edge at 110, is what the moving mock-up was built with and
 * what was looked at.
 *
 * Sizes, against a 128-pixel tile: the outrigger 384 wide (three tiles), the fishing boats' side
 * views about 176 (a tile and a half, the dugout's length), their end views matched to the side
 * views' scale and the bow-on view to the stern view's beam, the kites about 104 across.
 */

const fs = require('node:fs');
const path = require('node:path');
const { decodePng, encodePng } = require('./sprite-png.js');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'source', 'strait');
const PAINTED = path.join(SRC, 'painted');
const OUT = path.join(ROOT, 'assets', 'strait');

/** The alpha a figure's pixel has; the glow behind them is below it. */
const SOLID = 200;
/** The alpha a shrunk pixel must reach to be kept: the hard edge. */
const KEEP = 110;

function blank(width, height) {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

/** Every connected figure on a sheet, as boxes, in painting order. */
function figures(img, minPixels = 400) {
  const { width, height, data } = img;
  const seen = new Uint8Array(width * height);
  const out = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (seen[i] || data[i * 4 + 3] < SOLID) continue;
      const stack = [i];
      seen[i] = 1;
      let n = 0, x0 = x, x1 = x, y0 = y, y1 = y;
      while (stack.length) {
        const j = stack.pop();
        const cx = j % width, cy = (j - cx) / width;
        n += 1;
        if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const k = ny * width + nx;
            if (!seen[k] && data[k * 4 + 3] >= SOLID) { seen[k] = 1; stack.push(k); }
          }
        }
      }
      if (n >= minPixels) out.push({ x0, y0, x1, y1 });
    }
  }
  return out.sort((a, b) => Math.floor(a.y0 / 150) - Math.floor(b.y0 / 150) || a.x0 - b.x0);
}

/** One figure, with the glow dropped: solid where it was solid, clear everywhere else. */
function cut(img, box) {
  const w = box.x1 - box.x0 + 1, h = box.y1 - box.y0 + 1;
  const out = blank(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const s = ((box.y0 + y) * img.width + box.x0 + x) * 4, o = (y * w + x) * 4;
      if (img.data[s + 3] < SOLID) continue;
      out.data[o] = img.data[s]; out.data[o + 1] = img.data[s + 1]; out.data[o + 2] = img.data[s + 2]; out.data[o + 3] = 255;
    }
  }
  return out;
}

/** A box average on premultiplied colour, then the hard edge. */
function shrink(img, factor) {
  const width = Math.max(1, Math.round(img.width * factor));
  const height = Math.max(1, Math.round(img.height * factor));
  const out = blank(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.floor(x / factor), x1 = Math.min(img.width, Math.max(x0 + 1, Math.floor((x + 1) / factor)));
      const y0 = Math.floor(y / factor), y1 = Math.min(img.height, Math.max(y0 + 1, Math.floor((y + 1) / factor)));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy < y1; sy += 1) {
        for (let sx = x0; sx < x1; sx += 1) {
          const i = (sy * img.width + sx) * 4, al = img.data[i + 3] / 255;
          r += img.data[i] * al; g += img.data[i + 1] * al; b += img.data[i + 2] * al; a += al; n += 1;
        }
      }
      const alpha = (a / n) * 255;
      if (alpha < KEEP || a === 0) continue;
      const o = (y * width + x) * 4;
      out.data[o] = r / a; out.data[o + 1] = g / a; out.data[o + 2] = b / a; out.data[o + 3] = 255;
    }
  }
  return out;
}

/** The widest solid row in the bottom two fifths: a hull's beam. */
function beam(img) {
  let best = 0;
  for (let y = Math.floor(img.height * 0.6); y < img.height; y += 1) {
    let n = 0;
    for (let x = 0; x < img.width; x += 1) if (img.data[(y * img.width + x) * 4 + 3] > 0) n += 1;
    best = Math.max(best, n);
  }
  return best;
}

/** Magenta keyed out, for the code-drawn whale. */
function keyed(img) {
  const out = blank(img.width, img.height);
  out.data.set(img.data);
  for (let i = 0; i < out.data.length; i += 4) {
    const [r, g, b] = [out.data[i], out.data[i + 1], out.data[i + 2]];
    if (r > 200 && b > 200 && g < 60) out.data[i + 3] = 0;
  }
  return out;
}

const written = [];
/**
 * Where each frame is held, written to `assets/strait.json` for the scene, the way the windmill's
 * boss offset is: a number the builder measured, kept where the game reads it, never typed twice.
 *
 *   - `x`, `y`: the anchor, in the frame's own pixels -- for a boat the middle of its hull at the
 *     bottom, so a fluttering sail does not slide the hull sideways between frames;
 *   - `nose`: for a kite, where the rope ties on, the tip it points with.
 */
const manifest = {};

function solid(img, x, y) {
  return img.data[(y * img.width + x) * 4 + 3] > 0;
}

/** The middle of the widest solid row near the bottom: where a hull sits on the water. */
function hullAnchor(img) {
  let best = { n: -1, mid: img.width / 2 };
  for (let y = Math.floor(img.height * 0.6); y < img.height; y += 1) {
    let n = 0, sum = 0;
    for (let x = 0; x < img.width; x += 1) if (solid(img, x, y)) { n += 1; sum += x; }
    if (n > best.n) best = { n, mid: sum / Math.max(1, n) };
  }
  return { x: Math.round(best.mid), y: img.height };
}

/** The pixel a kite points with: the furthest solid one in its facing, nearest the middle line. */
function nose(img, facing) {
  let pick = null;
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      if (!solid(img, x, y)) continue;
      const score = facing === 'right' ? x : facing === 'left' ? -x : facing === 'down' ? y : -y;
      const off = facing === 'right' || facing === 'left' ? Math.abs(y - img.height / 2) : Math.abs(x - img.width / 2);
      if (!pick || score > pick.score || (score === pick.score && off < pick.off)) pick = { x, y, score, off };
    }
  }
  return { x: pick.x, y: pick.y };
}

function write(name, img, hold = null) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${name}.png`);
  fs.writeFileSync(file, encodePng(img.width, img.height, Buffer.from(img.data.buffer)));
  written.push(`${name} ${img.width}x${img.height}`);
  manifest[name] = { width: img.width, height: img.height, ...(hold ?? hullAnchor(img)) };
}

function expect(list, n, what) {
  if (list.length !== n) throw new Error(`${what}: found ${list.length} figures, expected ${n}. Was the sheet repainted?`);
}

// The outrigger: one view, three tiles long.
{
  const sheet = decodePng(path.join(PAINTED, 'ship-kelpfang.png'));
  const found = figures(sheet);
  expect(found, 1, 'ship-kelpfang');
  const ship = cut(sheet, found[0]);
  write('ship-kelpfang', shrink(ship, 384 / ship.width));
}

// The fishing boats. Painting order: row 1 side right (white, white, madder, madder), row 2 side
// left (likewise), rows 3 and 4 the stern (white three, madder three, twice). Row 3 is used.
let sternBeam = 0;
{
  const sheet = decodePng(path.join(PAINTED, 'fishing-sheet.png'));
  const found = figures(sheet);
  expect(found, 20, 'fishing-sheet');
  const k = 176 / (found[0].x1 - found[0].x0 + 1);
  const at = (i) => shrink(cut(sheet, found[i]), k);
  const frames = {
    'fishing-white-right': [0, 1], 'fishing-madder-right': [2, 3],
    'fishing-white-left': [4, 5], 'fishing-madder-left': [6, 7],
    'fishing-white-up': [8, 9, 10], 'fishing-madder-up': [11, 12, 13]
  };
  for (const [name, list] of Object.entries(frames)) list.forEach((f, i) => write(`${name}-${i}`, at(f)));
  sternBeam = beam(at(8));
}

// The bow-on view: scaled so its beam is the stern view's, which is what makes the two the same
// boat seen from either end.
{
  const sheet = decodePng(path.join(PAINTED, 'fishing-front.png'));
  const found = figures(sheet);
  expect(found, 2, 'fishing-front');
  for (const [i, name] of [[0, 'fishing-white-down'], [1, 'fishing-madder-down']]) {
    const boat = cut(sheet, found[i]);
    write(`${name}-0`, shrink(boat, sternBeam / beam(boat)));
  }
}

// The kites. Painting order: right (turmeric, striped, turmeric, striped), down (turmeric two,
// striped two), left (turmeric two, striped two), up (turmeric two, striped two).
{
  const sheet = decodePng(path.join(PAINTED, 'kite-sheet.png'));
  const found = figures(sheet);
  expect(found, 16, 'kite-sheet');
  const k = 104 / (found[0].x1 - found[0].x0 + 1);
  const at = (i) => shrink(cut(sheet, found[i]), k);
  const frames = {
    'kite-turmeric-right': [0, 2], 'kite-striped-right': [1, 3],
    'kite-turmeric-down': [4, 5], 'kite-striped-down': [6, 7],
    'kite-turmeric-left': [8, 9], 'kite-striped-left': [10, 11],
    'kite-turmeric-up': [12, 13], 'kite-striped-up': [14, 15]
  };
  for (const [name, list] of Object.entries(frames)) {
    const facing = name.split('-').pop();
    list.forEach((f, i) => {
      const img = at(f);
      write(`${name}-${i}`, img, { x: Math.round(img.width / 2), y: Math.round(img.height / 2), nose: nose(img, facing) });
    });
  }
}

// The whale calf, drawn in code and keyed.
{
  const back = keyed(decodePng(path.join(SRC, 'whale-calf-back.png')));
  // The blowhole is the one patch of its colour, as `draw-strait-art.py` draws it.
  let hole = { x: Math.round(back.width * 0.78), y: 0 };
  for (let i = 0; i < back.data.length; i += 4) {
    if (back.data[i] === 40 && back.data[i + 1] === 46 && back.data[i + 2] === 54 && back.data[i + 3] > 0) {
      const p = i / 4;
      hole = { x: p % back.width, y: Math.floor(p / back.width) };
      break;
    }
  }
  write('whale-back', back, { x: Math.round(back.width / 2), y: back.height, blowhole: hole });
  const spout = keyed(decodePng(path.join(SRC, 'whale-spout.png')));
  write('whale-spout', spout, { x: Math.round(spout.width / 2), y: spout.height });
}

fs.writeFileSync(path.join(ROOT, 'assets', 'strait.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(written.join('\n'));
console.log(`${written.length} frames into assets/strait/`);
