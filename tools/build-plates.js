// Turn whatever an image model hands back into a plate the game can use.
//
// Three tools are generating these in parallel and they disagree about almost everything: ChatGPT
// returns a 1254px square PNG, Gemini a 2048px square PNG weighing 8 MB, Grok a 788x1176 **portrait
// JPEG** with its own name painted in the corner. Asking a person to reconcile that by hand, forty
// times, is how a queue stops being worked.
//
// So the rule is: **drop the file in `assets/source/plates/` under any name and run this.** It
// derives the id, squares the image, crops the corner a watermark sits in, resizes, and writes
// `src/ui/plates/<engine-id>.png`.
//
//   node tools/build-plates.js            # build everything not already built
//   node tools/build-plates.js --force    # rebuild all of them
//   node tools/build-plates.js --list     # what it would do, without doing it
//
// CommonJS, like everything in tools/ -- see tools/package.json.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const RAW = path.join(ROOT, 'assets', 'source', 'plates');
const OUT = path.join(ROOT, 'src', 'ui', 'plates');

/**
 * What a plate is displayed at, doubled for a high-density screen, rounded up.
 *
 * The panel floats it at 7.5em against roughly 16px text, so about 120 CSS pixels, and 384 covers
 * a 2x display with room over. The sources are 1254-2048px and 2.6-8.4 MB; the whole point of this
 * step is that fifty-six plates should be a sensible download rather than a third of a gigabyte.
 */
const SIZE = 384;

/**
 * The two things this builds.
 *
 * **A portrait is a plate of a person.** Everything hard here -- decoding whatever PNG a tool
 * emitted, finding and stripping a painted frame, squaring, quantising, resampling -- is identical
 * for a watercolour of a fox and a watercolour of a fisher, and the plate pipeline has already been
 * burned into shape by three tools disagreeing about all of it. Writing a second copy for people
 * would mean fixing the next border-detection bug twice, and the two copies would drift.
 *
 * So the differences are named here and nothing else changes: where the raws are, where the built
 * files go, how big, and the word a filename may carry.
 *
 * Portraits are smaller because they are shown smaller -- about 96 CSS pixels beside the words a
 * person is saying, so 256 covers a 2x screen with the same margin 384 gives a plate at 120.
 */
const KINDS = {
  plate: { raw: RAW, out: OUT, size: SIZE, word: 'plate', label: 'plate' },
  portrait: {
    raw: path.join(ROOT, 'assets', 'source', 'portraits'),
    out: path.join(ROOT, 'src', 'ui', 'portraits'),
    size: 256,
    word: 'portrait',
    label: 'portrait'
  },
  /**
   * An activity scene: the painting at the top of the activity modal.
   *
   * **The one that is not square.** A plate is one animal standing still and a portrait is a face,
   * both of which want a square; a scene is a pair of hands at work with the ground around them,
   * and cropping that to a square throws away the work. `aspect` is width over height, and the
   * modal crops to 4:3 in CSS, so building to 4:3 means nothing is lost twice.
   *
   * There are exactly three -- stoop, stalk, work -- so unlike the plate queue this set can be
   * finished. A gesture with no painting still opens and plays.
   */
  scene: {
    raw: path.join(ROOT, 'assets', 'source', 'scenes'),
    out: path.join(ROOT, 'src', 'ui', 'scenes'),
    size: 512,
    aspect: 4 / 3,
    word: 'scene',
    label: 'activity scene'
  }
};

/**
 * The most of the bottom edge the squaring step is allowed to throw away, as a fraction.
 *
 * Two of the three tools sign their work in a bottom corner -- Grok in words, Gemini with a small
 * sparkle -- so discarding that strip is worth doing **when it is free**, which is exactly when the
 * source is taller than it is wide. Squaring a portrait has to drop that height regardless, so
 * dropping it off the bottom removes the signature at no cost.
 *
 * It is emphatically not worth doing otherwise, and the first version of this file learned that the
 * expensive way. Cropping a tenth off an already-square image forces a twentieth off each side to
 * stay square, and on the first real plate that took the camel's feet clean off. A watermark is a
 * few hundred pixels in a corner; feet are the picture.
 *
 * So a square or landscape source is left alone, and a tool that signs a square image gets fixed by
 * asking it not to -- see the per-tool notes in docs/plate-prompts.md.
 */
const CROP_BOTTOM = 0.1;

/**
 * How flat a line of pixels has to be, as a standard deviation in 0-255, to read as paper rather
 * than picture. Measured: a painted margin sits at 2-3, the flattest real sky in these four plates
 * at 3, and anything pictorial at 12 or above. 6 is the gap.
 */
const FLAT_SD = 6;

/**
 * How closely the four edge colours must agree before a flat margin is called a border.
 *
 * This is the whole safeguard, and it is why the check looks at all four edges rather than each on
 * its own. Flatness alone does not mean margin: the dromedary has 43px of flat pale sky along its
 * top and the macaque 36px, and cropping either would take the picture. What no plate has by
 * accident is *four* flat edges that are all the same colour -- that is a frame, and the fox came
 * back with one despite the brief forbidding it in as many words.
 *
 * Measured: the fox's four edges read 248, 247, 246, 247. A spread of 6 accepts that comfortably
 * and rejects any plate whose sky merely happens to be pale.
 */
const BORDER_TOLERANCE = 6;

/**
 * The least of a side a border must claim to be worth stripping, as a fraction.
 *
 * The rule crops uniformly, by the *shallowest* of the four edges, so that it can never cut into
 * the picture on the tightest side. The cost of that choice is that an asymmetric frame reduces to
 * its thinnest corner: the cloud antelope measured 50/22/35/3 and duly had 3 pixels of a 1024px
 * image removed, which is a rebuild for nothing.
 *
 * Below one percent there is no frame worth the name, so say so and leave the plate alone. This is
 * about honest reporting as much as pixels -- a build line reading "3px border stripped" invites
 * the belief that a frame was dealt with when it was not.
 */
const MIN_BORDER = 0.01;

/**
 * The most of a side a border may claim, as a fraction.
 *
 * A backstop, not a tuning knob. A real frame is a few percent; if this rule ever wants a fifth of
 * the picture it has misread something, and losing the trim is far cheaper than losing the plate.
 */
const MAX_BORDER = 0.15;

/** Files a tool prefixes or suffixes its name onto, stripped when working out the id. */
const TOOL_NOISE = /^(chatgpt|gemini|grok|dalle|midjourney|firefly)[ _-]*/i;

// --- PNG ------------------------------------------------------------------

function decodePng(buf) {
  if (buf.readUInt32BE(1) !== 0x504e470d) return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const depth = buf[24];
  const colour = buf[25];
  if (depth !== 8 || (colour !== 6 && colour !== 2)) return { unsupported: `depth ${depth}, colour type ${colour}` };
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

  // Flatten to opaque RGB. A plate is a small scene, not a cut-out, so alpha is meaningless here --
  // and Gemini returns RGBA with a fully opaque cream field anyway.
  const data = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 3] = rows[i * channels];
    data[i * 3 + 1] = rows[i * channels + 1];
    data[i * 3 + 2] = rows[i * channels + 2];
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

/**
 * Encode with a filter chosen per row, which on a painting is the difference between a usable file
 * and an unusable one.
 *
 * The other writers in `tools/` emit filter 0 -- None -- on every row, and that is fine for them:
 * they write flat pixel art where whole runs of a row are one colour and deflate eats it. A
 * watercolour has no runs, so unfiltered it compressed to 595 KB for a single 512px plate. Fifty-six
 * of those is thirty-three megabytes of download for the decorative half of a side panel.
 *
 * The standard heuristic picks, for each row, whichever of the five filters gives the smallest sum
 * of absolute byte values -- the one most likely to leave deflate a low-entropy row.
 */
function filterRows(width, height, rgb, bpp) {
  const stride = width * bpp;
  const out = Buffer.alloc((stride + 1) * height);
  const candidate = Buffer.alloc(stride);
  let prev = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const row = rgb.subarray(y * stride, (y + 1) * stride);
    let bestType = 0;
    let bestScore = Infinity;
    let best = null;

    for (let type = 0; type < 5; type += 1) {
      let score = 0;
      for (let x = 0; x < stride; x += 1) {
        const a = x >= bpp ? row[x - bpp] : 0;
        const b = prev[x];
        const c = x >= bpp ? prev[x - bpp] : 0;
        let v;
        if (type === 0) v = row[x];
        else if (type === 1) v = row[x] - a;
        else if (type === 2) v = row[x] - b;
        else if (type === 3) v = row[x] - ((a + b) >> 1);
        else {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          v = row[x] - (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
        }
        candidate[x] = v & 0xff;
        // Signed magnitude: a byte near 0 or near 255 is a small delta either way.
        score += candidate[x] < 128 ? candidate[x] : 256 - candidate[x];
      }
      if (score < bestScore) {
        bestScore = score;
        bestType = type;
        best = Buffer.from(candidate);
      }
    }

    out[y * (stride + 1)] = bestType;
    best.copy(out, y * (stride + 1) + 1);
    prev = row;
  }
  return out;
}

// --- colour ---------------------------------------------------------------

/** How many colours an indexed plate gets. 256 is the most an 8-bit PNG can index. */
const PALETTE = 256;

/**
 * Reduce to a 256-colour palette by median cut, then dither.
 *
 * Truecolour was costing 250 KB a plate, which is fifty-six plates at fourteen megabytes for the
 * decorative half of a side panel. The saving is structural rather than clever: an indexed pixel is
 * one byte instead of three before deflate even starts.
 *
 * It is also the right *kind* of loss for this art. The style block asks for muted, low-saturation
 * pigment, so a plate genuinely occupies a small corner of the colour cube, and 256 wells chosen
 * from where its pixels actually are will land close to all of them. What indexing ruins is a wide
 * smooth gradient, and Floyd-Steinberg is here for that case -- it trades a visible band for noise,
 * which at 120 displayed pixels is invisible.
 *
 * The caller keeps whichever encoding came out smaller, so a plate this suits badly stays
 * truecolour and costs nothing but the attempt.
 */
function quantise(rgb, width, height) {
  // Bucket to 5 bits a channel first. Median cut over 147k individual pixels is slow and pointless;
  // over the few thousand distinct colours that survive a 32-level bucket it is instant, and the
  // dither still maps against the full-precision original.
  const counts = new Map();
  for (let i = 0; i < width * height; i += 1) {
    const key = ((rgb[i * 3] >> 3) << 10) | ((rgb[i * 3 + 1] >> 3) << 5) | (rgb[i * 3 + 2] >> 3);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const colours = [];
  for (const [key, n] of counts) {
    colours.push([((key >> 10) & 31) * 8 + 4, ((key >> 5) & 31) * 8 + 4, (key & 31) * 8 + 4, n]);
  }

  const boxes = [colours];
  while (boxes.length < PALETTE) {
    // Split whichever box is worst -- widest spread, weighted by how many pixels sit in it. Going
    // on width alone spends the palette on a handful of outlying speckles.
    let pick = -1;
    let worst = 0;
    for (let i = 0; i < boxes.length; i += 1) {
      if (boxes[i].length < 2) continue;
      const score = spread(boxes[i]).range * Math.log2(1 + weight(boxes[i]));
      if (score > worst) {
        worst = score;
        pick = i;
      }
    }
    if (pick < 0) break;

    const axis = spread(boxes[pick]).axis;
    const sorted = boxes[pick].slice().sort((a, b) => a[axis] - b[axis]);
    const half = weight(sorted) / 2;
    let acc = 0;
    let cut = 1;
    for (let i = 0; i < sorted.length - 1; i += 1) {
      acc += sorted[i][3];
      if (acc >= half) {
        cut = i + 1;
        break;
      }
    }
    boxes.splice(pick, 1, sorted.slice(0, cut), sorted.slice(cut));
  }

  const palette = boxes.map((box) => {
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (const c of box) {
      r += c[0] * c[3];
      g += c[1] * c[3];
      b += c[2] * c[3];
      n += c[3];
    }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  });

  // Floyd-Steinberg, serpentine. Alternating the direction stops the error dragging one way and
  // leaving a diagonal grain across the paper.
  const work = Float32Array.from(rgb);
  const indices = Buffer.alloc(width * height);
  for (let y = 0; y < height; y += 1) {
    const leftToRight = y % 2 === 0;
    for (let k = 0; k < width; k += 1) {
      const x = leftToRight ? k : width - 1 - k;
      const p = (y * width + x) * 3;
      const best = nearest(palette, work[p], work[p + 1], work[p + 2]);
      indices[y * width + x] = best;
      const err = [
        work[p] - palette[best][0],
        work[p + 1] - palette[best][1],
        work[p + 2] - palette[best][2]
      ];
      const ahead = leftToRight ? 1 : -1;
      spill(work, width, height, x + ahead, y, err, 7 / 16);
      spill(work, width, height, x - ahead, y + 1, err, 3 / 16);
      spill(work, width, height, x, y + 1, err, 5 / 16);
      spill(work, width, height, x + ahead, y + 1, err, 1 / 16);
    }
  }
  return { palette, indices };
}

function weight(box) {
  let n = 0;
  for (const c of box) n += c[3];
  return n;
}

function spread(box) {
  let axis = 0;
  let range = 0;
  for (let a = 0; a < 3; a += 1) {
    let lo = 255;
    let hi = 0;
    for (const c of box) {
      if (c[a] < lo) lo = c[a];
      if (c[a] > hi) hi = c[a];
    }
    // Weight green the way the eye does, so a green box splits before an equally wide blue one.
    const r = (hi - lo) * (a === 0 ? 1.0 : a === 1 ? 1.4 : 0.6);
    if (r > range) {
      range = r;
      axis = a;
    }
  }
  return { axis, range };
}

function nearest(palette, r, g, b) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < palette.length; i += 1) {
    const dr = r - palette[i][0];
    const dg = g - palette[i][1];
    const db = b - palette[i][2];
    const d = dr * dr * 2 + dg * dg * 4 + db * db;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function spill(work, width, height, x, y, err, f) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const p = (y * width + x) * 3;
  work[p] += err[0] * f;
  work[p + 1] += err[1] * f;
  work[p + 2] += err[2] * f;
}

function png(width, height, bitDepth, colourType, raw, plte) {
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
  ihdr[8] = bitDepth;
  ihdr[9] = colourType;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    ...(plte ? [chunk('PLTE', plte)] : []),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/**
 * Encode both ways and keep the smaller file.
 *
 * Which one wins is a property of the picture rather than of the pipeline, so there is nothing to
 * decide here and no flag to get wrong. Indexed usually wins by a wide margin on this art.
 */
function encodePng(width, height, rgb) {
  const direct = png(width, height, 8, 2, filterRows(width, height, rgb, 3));

  const { palette, indices } = quantise(rgb, width, height);
  const plte = Buffer.alloc(palette.length * 3);
  palette.forEach((c, i) => {
    plte[i * 3] = c[0];
    plte[i * 3 + 1] = c[1];
    plte[i * 3 + 2] = c[2];
  });
  const paletted = png(width, height, 8, 3, filterRows(width, height, indices, 1), plte);

  return paletted.length < direct.length ? paletted : direct;
}

// --- shaping --------------------------------------------------------------

/** Mean and standard deviation of one row or column, in greyscale. */
function lineStats(img, kind, i) {
  const n = kind === 'row' ? img.width : img.height;
  let sum = 0;
  const vals = new Float64Array(n);
  for (let k = 0; k < n; k += 1) {
    const p = (kind === 'row' ? i * img.width + k : k * img.width + i) * 3;
    const v = (img.data[p] + img.data[p + 1] + img.data[p + 2]) / 3;
    vals[k] = v;
    sum += v;
  }
  const mean = sum / n;
  let variance = 0;
  for (let k = 0; k < n; k += 1) variance += (vals[k] - mean) ** 2;
  return { mean, sd: Math.sqrt(variance / n) };
}

/** How many pixels inward from one edge stay flat. */
function flatDepth(img, kind, fromEnd) {
  const span = kind === 'row' ? img.height : img.width;
  const limit = Math.floor(span * MAX_BORDER);
  let depth = 0;
  for (let k = 0; k < limit; k += 1) {
    const i = fromEnd ? span - 1 - k : k;
    if (lineStats(img, kind, i).sd >= FLAT_SD) break;
    depth = k + 1;
  }
  return depth;
}

/**
 * How much painted border to strip, or zero -- which is the usual and expected answer.
 *
 * Hard requirement 2 in docs/plate-prompts.md is "no border or frame", because the panel draws its
 * own and a painted one inside it reads as a picture of a picture. Gemini ignored it and returned
 * the desert fox floating in a cream frame, so the rule needs enforcing here as well as asking.
 *
 * The test is deliberately conjunctive: all four edges flat, *and* all four the same colour. Either
 * half alone would eat a sky. See BORDER_TOLERANCE.
 */
function borderInset(img) {
  const edges = [
    { ...lineStats(img, 'row', 0), depth: flatDepth(img, 'row', false) },
    { ...lineStats(img, 'row', img.height - 1), depth: flatDepth(img, 'row', true) },
    { ...lineStats(img, 'col', 0), depth: flatDepth(img, 'col', false) },
    { ...lineStats(img, 'col', img.width - 1), depth: flatDepth(img, 'col', true) }
  ];
  if (edges.some((e) => e.depth === 0)) return 0;

  const means = edges.map((e) => e.mean);
  if (Math.max(...means) - Math.min(...means) > BORDER_TOLERANCE) return 0;

  // The shallowest edge, so the crop never cuts into the picture on the tightest side.
  //
  // The known limit, and it is a real one: a frame that is much thicker on some edges than others
  // collapses to its thinnest. The monsoon crane came back framed 149/167/40/2 and gets nothing --
  // it also fails the colour test at a spread of 8.3, so both halves reject it, but even passing
  // them would have bought two pixels. Fixing that properly means flood-filling the paper colour
  // inward from the corners rather than measuring whole rows, and the plate that makes that
  // dangerous is already in the set: a white egret on cream paper is exactly what such a fill
  // leaks into. Left alone deliberately; a re-roll with the frame clause is cheaper and safer.
  const inset = Math.min(...edges.map((e) => e.depth));
  return inset >= Math.min(img.width, img.height) * MIN_BORDER ? inset : 0;
}

/**
 * The square to take, biased upward, dropping the bottom edge only when that costs nothing.
 *
 * The bias is not centring. The brief asks for the animal filling the frame with habitat below it,
 * so in a portrait the subject sits above the middle and a centred crop takes its head off. Coming
 * a third of the way down keeps the head and drops ground, which is the right trade at 120
 * displayed pixels.
 *
 * See CROP_BOTTOM for why a square source is returned whole.
 */
function squareBox(width, height, inset = 0, aspect = 1) {
  // Everything below works on the picture inside any painted frame, then shifts back out by the
  // inset at the end. Doing it this way keeps the squaring rule identical whether a border was
  // found or not.
  const innerWidth = width - inset * 2;
  const innerHeight = height - inset * 2;
  // `aspect` is width/height of the wanted crop. 1 is a plate and keeps the original behaviour
  // exactly; 4/3 is an activity scene, which is landscape because it holds a pair of hands at work
  // rather than one animal standing still.
  const side = Math.min(innerWidth, Math.round(innerHeight * aspect));
  const tall = Math.round(side / aspect);
  const x = inset + Math.round((innerWidth - side) / 2);

  // Vertical slack is whatever squaring already has to discard, and it is the entire budget: spend
  // up to CROP_BOTTOM of it on the bottom edge, then place the square a third of the way down what
  // is left. `Math.min` is the rule, not a guard against a silly number — a square or landscape
  // source has zero slack, so it is returned whole with nothing trimmed, which is the point.
  const slack = innerHeight - tall;
  const trimmed = Math.min(slack, Math.round(innerHeight * CROP_BOTTOM));
  const y = inset + Math.round((slack - trimmed) / 3);
  return { x, y, side, tall, trimmed, inset };
}

/** Box-average down to SIZE. A mean is right here: this is a painting, not pixel art. */
function resample(src, box, size = SIZE, height = size) {
  const out = Buffer.alloc(size * height * 3);
  const step = box.side / size;
  // A square crop steps identically on both axes; a 4:3 one does not, so the vertical step comes
  // from the box's own height rather than being assumed equal.
  const stepY = (box.tall ?? box.side) / height;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sx0 = box.x + Math.floor(x * step);
      const sy0 = box.y + Math.floor(y * stepY);
      const sx1 = box.x + Math.max(Math.floor((x + 1) * step), Math.floor(x * step) + 1);
      const sy1 = box.y + Math.max(Math.floor((y + 1) * stepY), Math.floor(y * stepY) + 1);
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let sy = sy0; sy < sy1; sy += 1) {
        for (let sx = sx0; sx < sx1; sx += 1) {
          const p = (sy * src.width + sx) * 3;
          r += src.data[p];
          g += src.data[p + 1];
          b += src.data[p + 2];
          n += 1;
        }
      }
      const d = (y * size + x) * 3;
      out[d] = Math.round(r / n);
      out[d + 1] = Math.round(g / n);
      out[d + 2] = Math.round(b / n);
    }
  }
  return out;
}

/**
 * `Gemini_plate-caravan-dromedary.png` -> `caravan-dromedary`.
 *
 * The separator after `plate` is required, and that is not fussiness. It was `[ _-]*`, which
 * matches zero separators, so it happily ate the first five letters of any species whose own name
 * begins with those letters -- `plateau-wolf.png` came back as `au-wolf`. That went unnoticed on
 * the way in, because the raw was `ChatGPTplate-plateau-wolf.png` and the `plate-` there does have
 * its separator; it surfaced the moment the sweep asked whether an already-built `plateau-wolf.png`
 * was named after itself, decided it was not, and moved a finished plate back into the intake.
 *
 * Canon has three species this would hit, all of them on the Narmada Plateau.
 */
function idFor(file, word = 'plate') {
  return path
    .basename(file, path.extname(file))
    .replace(TOOL_NOISE, '')
    .replace(new RegExp(`^${word}[ _-]+`, 'i'), '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Move raws that were dropped in the output folder into the intake, and say so.
 *
 * `src/ui/plates/` is the obvious place to put a plate -- it is where plates live, it is what
 * `plates.ts` reads, and its README used to say to put them there. Three batches in a row have
 * landed in it. At that point it stops being a mistake anyone is making and starts being a design
 * problem: the tool should accept art wherever it is sensibly put, not require a folder to be
 * memorised.
 *
 * The test is exact rather than heuristic. A built plate is named precisely its engine id, so
 * `idFor(name) === name` for everything this script writes, and anything else in there came from
 * an image model. `ChatGPT plate-cliff-swift.png` fails that; `cliff-swift.png` passes it.
 *
 * test/platesFolder.test.ts still fails on a raw left in the output folder. This does not replace
 * that -- it is the fix, and the test is the net for when someone copies a file in without
 * running the build at all.
 */
function sweepMisplaced(kind = KINDS.plate) {
  if (!fs.existsSync(kind.out)) return [];
  const moved = [];
  for (const file of fs.readdirSync(kind.out)) {
    if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
    const base = path.basename(file, path.extname(file));
    if (idFor(file, kind.word) === base) continue; // already built

    fs.mkdirSync(kind.raw, { recursive: true });
    const to = path.join(kind.raw, file);
    if (fs.existsSync(to)) {
      console.log(`  !  ${file} is in the output folder and already in the intake. Delete one.`);
      continue;
    }
    fs.renameSync(path.join(kind.out, file), to);
    moved.push(file);
  }
  if (moved.length) {
    console.log(`  ~  moved ${moved.length} raw${moved.length > 1 ? 's' : ''} out of ${path.relative(ROOT, kind.out)} into ${path.relative(ROOT, kind.raw)}:`);
    for (const f of moved) console.log(`       ${f}`);
    console.log('');
  }
  return moved;
}

function main() {
  const kind = process.argv.includes('--portraits') ? KINDS.portrait : KINDS.plate;
  sweepMisplaced(kind);

  if (!fs.existsSync(kind.raw)) {
    console.log(`Nothing to do: ${path.relative(ROOT, kind.raw)} does not exist.`);
    console.log(`Drop generated ${kind.label}s there under any name and run this again.`);
    return;
  }
  fs.mkdirSync(kind.out, { recursive: true });

  const force = process.argv.includes('--force');
  const listOnly = process.argv.includes('--list');

  // Build one id rather than the folder, so a re-crop does not touch anything already settled.
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice('--only='.length) : null;

  /**
   * An explicit crop in source pixels: `--crop=x,y,size`.
   *
   * **Framing is the one fault the build could not repair, and this is why it now can.** Cropping
   * in on a face means guessing where the face is -- but that is only true when nobody says. A
   * person looking at the picture can say, and then it is arithmetic. Two portraits have been lost
   * to framing that were otherwise wanted, which is a poor trade against one flag.
   *
   * Replaces the automatic squaring entirely, border detection included: an explicit box is a
   * statement about this image, and having a rule second-guess it would defeat the point. Use it
   * with `--only` and `--force`, and record the numbers in docs/portrait-prompts.md -- the raws are
   * gitignored, so an unrecorded crop cannot be reproduced.
   */
  const cropArg = process.argv.find((a) => a.startsWith('--crop='));
  let crop = null;
  if (cropArg) {
    const [x, y, side] = cropArg.slice('--crop='.length).split(',').map(Number);
    if (![x, y, side].every((n) => Number.isFinite(n) && n >= 0) || side <= 0) {
      console.log('  !  --crop wants three numbers: --crop=x,y,size (source pixels)');
      process.exitCode = 1;
      return;
    }
    crop = { x, y, side, trimmed: 0, inset: 0 };
    if (!only) {
      console.log('  !  --crop applies to one image; pass --only=<id> as well');
      process.exitCode = 1;
      return;
    }
  }
  const files = fs.readdirSync(kind.raw).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  if (files.length === 0) {
    console.log(`No images in ${path.relative(ROOT, kind.raw)}.`);
    return;
  }

  // Work out every id first, so a clash is reported before anything is written rather than being
  // resolved by whichever file happened to sort last. Three tools are generating the same subject
  // in parallel, so this is the normal case and not an edge one: without the check, running the
  // build silently replaced the plate that had been chosen with whichever name sorted lower.
  const claims = new Map();
  for (const file of files.sort()) {
    const id = idFor(file, kind.word);
    if (!id) continue;
    if (!claims.has(id)) claims.set(id, []);
    claims.get(id).push(file);
  }
  const contested = new Set();
  for (const [id, sources] of claims) {
    if (sources.length < 2) continue;
    contested.add(id);
    console.log(`  !  ${id}: ${sources.length} sources claim this ${kind.label} --`);
    for (const f of sources) console.log(`       ${f}`);
    console.log('       Keep the one you want and move the rest to assets/source/dump/.');
  }

  let built = 0;
  let skipped = 0;
  for (const file of files.sort()) {
    const id = idFor(file, kind.word);
    if (contested.has(id)) continue;
    if (only && id !== only) continue;
    const dest = path.join(kind.out, `${id}.png`);
    const rel = path.relative(ROOT, dest);

    if (!id) {
      console.log(`  ?  ${file} -> could not work out an id from that name`);
      continue;
    }
    if (listOnly) {
      console.log(`  .  ${file} -> ${rel}`);
      continue;
    }
    if (fs.existsSync(dest) && !force) {
      skipped += 1;
      continue;
    }

    const buf = fs.readFileSync(path.join(kind.raw, file));
    const img = decodePng(buf);
    if (!img) {
      // JPEG and WebP need a decoder this project does not have, and will not be adding one:
      // dependencies here must justify themselves, and the fix is upstream and free.
      console.log(`  !  ${file} -> not a PNG. Re-export it as PNG; see docs/plate-prompts.md.`);
      continue;
    }
    if (img.unsupported) {
      console.log(`  !  ${file} -> unsupported PNG (${img.unsupported}). Re-save as 8-bit RGB or RGBA.`);
      continue;
    }

    if (crop && (crop.x + crop.side > img.width || crop.y + crop.side > img.height)) {
      console.log(`  !  ${file} -> crop runs past the edge of a ${img.width}x${img.height} image`);
      continue;
    }
    const aspect = kind.aspect ?? 1;
    const box = crop ?? squareBox(img.width, img.height, borderInset(img), aspect);
    const tall = Math.round(kind.size / aspect);
    fs.writeFileSync(dest, encodePng(kind.size, tall, resample(img, box, kind.size, tall)));
    const kb = (fs.statSync(dest).size / 1024).toFixed(0);
    const notes = [];
    if (crop) notes.push(`cropped to ${crop.x},${crop.y} +${crop.side}`);
    if (box.inset) notes.push(`${box.inset}px border stripped`);
    if (box.trimmed) notes.push(`bottom ${box.trimmed}px dropped`);
    const trim = notes.length ? `, ${notes.join(', ')}` : '';
    console.log(`  ok ${file}  ${img.width}x${img.height} -> ${kind.size}x${kind.size}${trim}  ${kb} KB  ${rel}`);
    built += 1;
  }

  if (!listOnly) {
    console.log('');
    const parts = [`${built} built`];
    if (skipped) parts.push(`${skipped} already there (--force to redo them)`);
    if (contested.size) parts.push(`${contested.size} skipped over a name clash`);
    console.log(`${parts.join(', ')}.`);
    if (contested.size) process.exitCode = 1;
  }
}

// Exported so test/plateEncoder.test.ts can round-trip the encoder without running the build.
// Everything else here is I/O; these three are the arithmetic worth guarding.
module.exports = { encodePng, filterRows, quantise, squareBox, borderInset, idFor, SIZE, CROP_BOTTOM, KINDS };

if (require.main === module) main();
