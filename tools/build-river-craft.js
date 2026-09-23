/**
 * The river bridge sheet and the dugout, from `assets/source/`.
 *
 *   node tools/build-river-craft.js
 *
 * **The bridge: one overhead image in, eight frames out.** The source is a three-tile span, east to
 * west, flat and shadowless (see `tools/draw-river-art.py` for why). This cuts it into the frames
 * `riverBridgeFrame` names -- start, middle, end and a one-tile single, east-west, then the same
 * four north-south -- by slicing, and turning a quarter for north-south.
 *
 * **Then it gives the bridge its height, after turning, which is the reason this is a builder at
 * all.** A shadow drawn into the source would turn with it and fall east on every north-south
 * bridge. So the light is applied here, from the north as it is for the islands and the river banks:
 *
 *   - a south face: the structure repeated a few pixels lower, darkened, under itself -- the beam
 *     edge of the deck, the south face of each footing and post;
 *   - a cast shadow: the structure's silhouette dropped further south and a little east, softened,
 *     laid on the water.
 *
 * Both are computed on the whole three-tile run before it is cut, so the shadow continues from one
 * piece into the next instead of stopping at every cell edge.
 *
 * **The dugout** is copied through with its magenta keyed out. It is three-quarter art that the game
 * flips rather than turns, so it keeps the shading it was drawn with.
 */

const fs = require('node:fs');
const path = require('node:path');
const { decodePng, encodePng } = require('./sprite-png.js');
const { isBackground } = require('./build-monuments.js');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'source');
const OUT = path.join(ROOT, 'assets');
const T = 128;

/** How far a bridge's south face drops, in pixels: the thickness of the beams. */
const FACE = 6;
/** How far south its shadow falls: how high the deck stands above the water. */
const LIFT = 18;
/**
 * How far east it falls as well. Light from due north drops a north-south bridge's shadow along its
 * own length, under its own deck, and the bridge read as flat -- looked at on the first build. A
 * little from the west, as most top-down games light their scenes, puts a shadow beside it too.
 */
const DRIFT = 8;
/** How dark the shadow is at its densest, 0 to 1. */
const SHADOW = 0.62;
/** The shadow's colour: the same ink the island shadow and the river bank use. */
const INK = [12, 26, 44];

/** An image as `{ width, height, data }`, RGBA. */
function blank(width, height) {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

function keyed(img) {
  const out = blank(img.width, img.height);
  out.data.set(img.data);
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      if (isBackground(img, x, y)) out.data[(y * img.width + x) * 4 + 3] = 0;
    }
  }
  return out;
}

function crop(img, x0, y0, w, h) {
  const out = blank(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const from = ((y0 + y) * img.width + (x0 + x)) * 4;
      const to = (y * w + x) * 4;
      for (let c = 0; c < 4; c += 1) out.data[to + c] = img.data[from + c];
    }
  }
  return out;
}

/** A quarter turn clockwise: west becomes north, so a span's start stays its start. */
function turn(img) {
  const out = blank(img.height, img.width);
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      const from = (y * img.width + x) * 4;
      const tx = img.height - 1 - y;
      const ty = x;
      const to = (ty * out.width + tx) * 4;
      for (let c = 0; c < 4; c += 1) out.data[to + c] = img.data[from + c];
    }
  }
  return out;
}

/** `top` over `under`, source-over, in place on `under`. */
function over(under, top, dx = 0, dy = 0) {
  for (let y = 0; y < top.height; y += 1) {
    for (let x = 0; x < top.width; x += 1) {
      const ux = x + dx;
      const uy = y + dy;
      if (ux < 0 || uy < 0 || ux >= under.width || uy >= under.height) continue;
      const s = (y * top.width + x) * 4;
      const d = (uy * under.width + ux) * 4;
      const sa = top.data[s + 3] / 255;
      if (sa === 0) continue;
      const da = under.data[d + 3] / 255;
      const oa = sa + da * (1 - sa);
      for (let c = 0; c < 3; c += 1) {
        under.data[d + c] = Math.round((top.data[s + c] * sa + under.data[d + c] * da * (1 - sa)) / oa);
      }
      under.data[d + 3] = Math.round(oa * 255);
    }
  }
}

/** A separable box blur of an alpha mask, twice, which is close enough to Gaussian at this size. */
function blurMask(mask, width, height, r) {
  let a = Float32Array.from(mask);
  for (let pass = 0; pass < 2; pass += 1) {
    const b = new Float32Array(a.length);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let sum = 0;
        let n = 0;
        for (let k = -r; k <= r; k += 1) {
          const xx = x + k;
          if (xx < 0 || xx >= width) continue;
          sum += a[y * width + xx];
          n += 1;
        }
        b[y * width + x] = sum / n;
      }
    }
    const c = new Float32Array(a.length);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let sum = 0;
        let n = 0;
        for (let k = -r; k <= r; k += 1) {
          const yy = y + k;
          if (yy < 0 || yy >= height) continue;
          sum += b[yy * width + x];
          n += 1;
        }
        c[y * width + x] = sum / n;
      }
    }
    a = c;
  }
  return a;
}

/**
 * Give a flat overhead run its height: shadow on the water, then the south face, then the top.
 */
function raise(flat) {
  const { width, height } = flat;
  const out = blank(width, height);

  // The cast shadow: the silhouette, dropped `LIFT` south and softened.
  const mask = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sy = y - LIFT;
      const sx = x - DRIFT;
      if (sy < 0 || sx < 0) continue;
      mask[y * width + x] = flat.data[(sy * width + sx) * 4 + 3] / 255;
    }
  }
  const soft = blurMask(mask, width, height, 3);
  for (let i = 0; i < soft.length; i += 1) {
    out.data[i * 4] = INK[0];
    out.data[i * 4 + 1] = INK[1];
    out.data[i * 4 + 2] = INK[2];
    out.data[i * 4 + 3] = Math.round(soft[i] * SHADOW * 255);
  }

  // The south face: the structure repeated lower, darkened, so only its south-facing edges show.
  const face = blank(width, height);
  face.data.set(flat.data);
  for (let i = 0; i < face.data.length; i += 4) {
    face.data[i] = Math.round(face.data[i] * 0.52);
    face.data[i + 1] = Math.round(face.data[i + 1] * 0.5);
    face.data[i + 2] = Math.round(face.data[i + 2] * 0.5);
  }
  for (let dy = FACE; dy >= 1; dy -= 1) over(out, face, 0, dy);

  over(out, flat);
  return out;
}

function buildBridge() {
  const source = keyed(decodePng(path.join(SRC, 'river-bridge.png')));
  if (source.width !== 3 * T || source.height !== T) {
    throw new Error(`river-bridge.png is ${source.width}x${source.height}; it must be ${3 * T}x${T}`);
  }
  // A one-tile span: the west footing's half and the east footing's half, meeting in the middle.
  const single = blank(T, T);
  over(single, crop(source, 0, 0, T / 2, T));
  over(single, crop(source, 2 * T + T / 2, 0, T / 2, T), T / 2, 0);

  const eastWest = raise(source);
  const northSouth = raise(turn(source));
  const frames = [
    crop(eastWest, 0, 0, T, T),
    crop(eastWest, T, 0, T, T),
    crop(eastWest, 2 * T, 0, T, T),
    raise(single),
    crop(northSouth, 0, 0, T, T),
    crop(northSouth, 0, T, T, T),
    crop(northSouth, 0, 2 * T, T, T),
    raise(turn(single))
  ];

  const sheet = blank(frames.length * T, T);
  frames.forEach((frame, i) => over(sheet, frame, i * T, 0));
  const file = path.join(OUT, 'river-bridge.png');
  fs.writeFileSync(file, encodePng(sheet.width, sheet.height, Buffer.from(sheet.data.buffer)));
  console.log(`river-bridge: ${frames.length} frames of ${T}x${T}, ${(fs.statSync(file).size / 1024).toFixed(1)} KB`);
}

function buildDugout() {
  const hull = keyed(decodePng(path.join(SRC, 'dugout.png')));
  const file = path.join(OUT, 'dugout.png');
  fs.writeFileSync(file, encodePng(hull.width, hull.height, Buffer.from(hull.data.buffer)));
  console.log(`dugout: ${hull.width}x${hull.height}, ${(fs.statSync(file).size / 1024).toFixed(1)} KB`);
}

buildBridge();
buildDugout();
