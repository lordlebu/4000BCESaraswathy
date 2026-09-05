// The layer the traveller walks *into*.
//
// Everything else on the map is drawn below the player, so he slides over a flat picture. This
// builds the sheet that goes above him: grass, reeds, paddy, and a low fence. Standing in it, his
// legs disappear behind the blades and the world stops being a diagram.
//
// Three constraints, and they are what make it safe rather than a mess:
//
//   * **Short.** Nothing reaches higher than about half the player's 40px frame. Grass to the knee
//     reads as depth; grass to the chest reads as losing the character. The figure staying legible
//     is the constraint every other art decision here has already bent around.
//   * **Sparse.** A handful of blades per tile, not a lawn. These sit on *top* of ground that is
//     already textured, and two busy layers cancel each other out.
//   * **Rooted.** Blades grow from the bottom edge of the cell, so a column of tiles joins up into
//     a continuous field instead of a grid of floating tufts.
//
// The art is generated rather than prompted. Blades of grass are a handful of vertical runs a few
// pixels wide -- describing that to an image model and then resampling it back down to 32 pixels
// is a lossy round trip to reach something a loop states exactly. The prompted approach is right
// for a banyan tree and wrong for this.
//
// Two frames per variant, the second with the tips pushed one pixel sideways. That is the whole
// animation: `WorldScene` alternates them on a per-tile phase offset so a field ripples rather
// than blinking in unison.
//
//   node tools/build-overdraw.js
//
// CommonJS, like everything in tools/ -- see tools/package.json.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets');

const CELL = 32;

/**
 * The grid moved to 128 (`src/game/tileTextures.ts`), and this art is generated rather than drawn.
 *
 * The blades are still *authored* at 32 and upscaled by whole pixels afterwards, rather than being
 * generated at 128 directly. Every constant in the drawing code below is a literal count of pixels
 * -- `CELL - 13` for a fence rail, `x += 6` for its posts, a blade root three pixels up -- so
 * raising CELL alone would keep the arithmetic and shrink the result to a quarter of its intended
 * height against the new tile. Rewriting all of it in proportional terms is a change with no
 * visible payoff: this art is a handful of vertical runs, and a whole-pixel upscale of a hard-edged
 * shape is lossless.
 *
 * When the painted decor layer replaces this (Asset 5), it arrives at 128 natively and this goes.
 */
const SCALE = 4;

/** Nearest-neighbour, whole pixels only. Lossless for hard-edged art; wrong for anything painted. */
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

/** Two frames per variant: at rest, and leaning. */
const FRAMES = 2;

/**
 * How many differently-scattered versions of each plant the sheet carries.
 *
 * One is not enough. A single scatter repeated across a field puts every blade at the same offset
 * in every cell, and the eye assembles those into hard vertical stripes -- the same failure as
 * huts baked into a ground tile, arriving by a different route. Three is enough to break the
 * pattern; the scene picks between them per tile.
 */
const SCATTERS = 3;

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

// --- a deterministic scatter ---------------------------------------------

/**
 * A small integer hash. Same shape as `src/world/rng.ts` uses: the sheet must be byte-identical
 * from one build to the next, so nothing here may reach for Math.random.
 */
function hash(...parts) {
  let h = 2166136261;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return (h >>> 0);
}

// --- the plants -----------------------------------------------------------

const hex = (value) => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5, 7), 16)
];

/**
 * Every variant, keyed by the biome it grows on.
 *
 * Colours are sampled from the built terrain sheet rather than invented, one step darker than the
 * ground so a blade reads against it without becoming a silhouette. `height` is the tallest a
 * blade may reach, in pixels from the bottom of the cell -- the number that keeps the player's
 * head clear.
 */
const PLANTS = [
  // Long grass on open ground. The commonest thing in the world, so the quietest.
  { id: 'grass-plains', blades: 7, height: 11, width: 1, dark: '#5a8963', light: '#7fa471', lean: 1 },
  // Reeds stand taller and stiffer, and they are the reason wetland reads as wet.
  { id: 'reeds-wetland', blades: 5, height: 15, width: 1, dark: '#3f6f6a', light: '#5d8f84', lean: 1 },
  // Paddy: shorter, denser, planted in rough rows rather than scattered.
  { id: 'paddy-settlement', blades: 9, height: 9, width: 1, dark: '#6d7a44', light: '#93a05c', lean: 1, rows: true },
  // Rushes at a river edge, sparser than marsh reeds.
  { id: 'rushes-river', blades: 4, height: 13, width: 1, dark: '#4a7d70', light: '#6b9a86', lean: 2 },
  // Sun-barley: canon's crop of the open plains, taller than grass and topped with seed.
  { id: 'barley-plains', blades: 6, height: 13, width: 1, dark: '#8a8548', light: '#c2b26a', lean: 1, seed: true },
  // Sagebrush: low, grey-green, rounded rather than bladed.
  { id: 'sagebrush-plains', blades: 8, height: 6, width: 1, dark: '#6f7a62', light: '#8d9a7e', lean: 0 },
  // Ferns on the forest floor, arching rather than upright.
  { id: 'ferns-forest', blades: 6, height: 9, width: 1, dark: '#3d6b47', light: '#57895d', lean: 2 },
  // Pepper vine, thin and climbing. Canon puts it in both forest and hills.
  { id: 'vine-forest', blades: 4, height: 12, width: 1, dark: '#40704a', light: '#5f8f5a', lean: 2 },
  // Salt grass on the shore: sparse and bent by wind, so every blade leans the same way.
  { id: 'saltgrass-coast', blades: 5, height: 8, width: 1, dark: '#9a9370', light: '#b6ae87', lean: 2 },
  // Scholar's moss, flat against hill stone.
  // Moss crusts the stone rather than growing out of it, so it is drawn flat and rooted low. The
  // `flat` flag keeps its blades on the bottom rows instead of scattering them up the cell, which
  // is what made a three-pixel plant ten pixels tall.
  { id: 'moss-hills', blades: 11, height: 3, width: 1, dark: '#6d7f79', light: '#87968c', lean: 0, flat: true },
  // Saltbush, the one thing that grows on the dunes.
  { id: 'saltbush-desert', blades: 5, height: 5, width: 1, dark: '#9c8f72', light: '#b5a888', lean: 0 }
];

/**
 * Draw one blade: a vertical run that may lean by a pixel near the tip.
 *
 * `root` is how far up the cell the blade starts. Rooting every blade on the bottom row is the
 * obvious choice and it is wrong -- the field then has a visible floor at every tile boundary, and
 * a column of tiles reads as horizontal bands. Varying the root scatters that edge away.
 */
function blade(pixels, x, root, height, lean, colour, frame) {
  for (let i = 0; i < height; i += 1) {
    const y = CELL - 1 - root - i;
    // Only the top third leans, and only on the second frame. A blade bending along its whole
    // length reads as sliding sideways rather than swaying.
    const bend = frame === 1 && i > height * 0.66 ? lean : 0;
    const px = x + bend;
    if (px < 0 || px >= CELL || y < 0) continue;
    const p = (y * CELL + px) * 4;
    pixels[p] = colour[0];
    pixels[p + 1] = colour[1];
    pixels[p + 2] = colour[2];
    pixels[p + 3] = 255;
  }
}

function plantFrame(plant, frame, scatter) {
  const pixels = Buffer.alloc(CELL * CELL * 4);
  const dark = hex(plant.dark);
  const light = hex(plant.light);
  for (let n = 0; n < plant.blades; n += 1) {
    // Scatter across the cell width. Rows-mode clamps to a coarse grid so paddy reads as planted.
    const raw = hash(plant.id, 'x', scatter, n) % CELL;
    const x = plant.rows ? Math.floor(raw / 6) * 6 + (n % 2) : raw;
    // Vary the height so the field has a top edge rather than a hairline.
    // How far up the cell this blade is planted. Spreading the roots is what stops a column of
    // tiles reading as stacked bands with a seam between each one.
    // A flat plant keeps its roots on the ground; everything else spreads them up the cell so a
    // column of tiles does not read as stacked bands.
    const root = plant.flat ? hash(plant.id, 'r', scatter, n) % 2 : hash(plant.id, 'r', scatter, n) % 9;
    // `height` is measured from the ground, not from the root, so raising a blade's root does not
    // also raise its tip. Getting that wrong put tips at row 9 of 32 -- half way up the tile and
    // straight across the player's chest -- while every constant here still read as safe.
    const reach = plant.height - (hash(plant.id, 'h', scatter, n) % 4);
    const height = Math.max(2, reach - root);
    // A minority of blades catch the light. Two tones is all a 32px cell can carry.
    const colour = hash(plant.id, 'c', scatter, n) % 3 === 0 ? light : dark;
    blade(pixels, x, root, height, plant.lean, colour, frame);
    // Barley carries a seed-head: one lighter pixel beside the tip, which is what separates a
    // crop from grass at this size.
    if (plant.seed) {
      const tipY = CELL - 1 - root - height;
      const p = (tipY * CELL + Math.min(CELL - 1, x + 1)) * 4;
      if (tipY >= 0) {
        pixels[p] = light[0];
        pixels[p + 1] = light[1];
        pixels[p + 2] = light[2];
        pixels[p + 3] = 255;
      }
    }
  }
  return pixels;
}

/**
 * A fence, in the piece that fits the tile.
 *
 * **There used to be exactly one frame: two horizontal rails spanning the cell.** That is a
 * bottom rail and nothing else -- no vertical, no corner -- so the placement code could only
 * honestly draw it along a settlement's southern edge, and did. Measured on the built maps, that
 * left about 88% of a settlement's perimeter unfenced: seventeen boundary tiles against two
 * fences on Lothal, and four on Dwarka.
 *
 * So a fence is now a small set of pieces chosen by which neighbours are outside, the same way
 * `build-edges.js` picks a biome blend. `sides` is a bitmask -- north 1, east 2, south 4, west 8 --
 * and sixteen frames covers every combination including the lone post at 0.
 *
 * The rails run *inside* the tile edge rather than on it, so two fenced tiles meeting at a corner
 * join instead of crossing. Posts sit at the corners of each run and every six pixels along it,
 * which is what made the original read as built rather than grown.
 */
function fenceFrame(sides) {
  const pixels = Buffer.alloc(CELL * CELL * 4);
  const post = hex('#5c4634');
  const rail = hex('#7a5c44');
  const set = (x, y, colour) => {
    if (x < 0 || x >= CELL || y < 0 || y >= CELL) return;
    const p = (y * CELL + x) * 4;
    pixels[p] = colour[0];
    pixels[p + 1] = colour[1];
    pixels[p + 2] = colour[2];
    pixels[p + 3] = 255;
  };

  // How far in from the left and right edges a run stops. Far enough that two tiles' rails do not
  // touch and read as one thick line; near enough that the fence still bounds this tile.
  const IN = 3;

  /**
   * **Every run lives in the bottom half of the cell, and that is not a style choice.**
   *
   * This sheet is drawn *over* the traveller, and `test/frames.test.ts` holds it to starting no
   * higher than row 16 of 32: grass to the knee reads as depth, grass to the chest reads as
   * losing the character. A fence is taller than grass and would swallow him outright.
   *
   * The first attempt put the north run near the top edge, where a north fence belongs in plan
   * view. It looked right in a sheet viewer and failed that test on the first build. So the four
   * runs are **stacked inside the lower band** rather than placed at the tile's four edges: north
   * at the top of the band, south at the bottom, verticals spanning it. On the map that reads as
   * a fence seen from slightly above, which is the projection everything else here already uses.
   */
  const BAND = CELL >> 1;
  const HIGH = 7;                 // a run's full height, band-sized rather than tile-sized
  const northTop = BAND + 1;
  const southTop = CELL - HIGH - 1;

  /** A run of two rails with posts standing along it. `y` is the top of the run. */
  const horizontal = (y) => {
    for (let x = IN; x < CELL - IN; x += 1) {
      set(x, y + 2, rail);
      set(x, y + 5, rail);
    }
    for (let x = IN; x < CELL - IN; x += 6) {
      for (let d = 0; d < HIGH; d += 1) set(x, y + d, post);
    }
    // A post at the far end, so a run does not stop in mid-air.
    for (let d = 0; d < HIGH; d += 1) set(CELL - IN - 1, y + d, post);
  };

  /**
   * A run seen edge-on.
   *
   * **Not a rotation of the horizontal piece**, and that is the whole difficulty of drawing a
   * fence in a top-down game: a rail running away from the viewer foreshortens to almost nothing,
   * so it is posts with short rail segments between them. Rotating the side view would lay a rail
   * flat across the ground.
   */
  const vertical = (x) => {
    for (let y = northTop; y < CELL - 1; y += 1) {
      set(x, y, rail);
      set(x + 1, y, rail);
    }
    for (let y = northTop; y < CELL - 1; y += 5) {
      for (let d = 0; d < 4; d += 1) {
        set(x, y + d, post);
        set(x + 1, y + d, post);
      }
    }
  };

  if (sides & 4) horizontal(southTop);       // south, where the single frame always was
  if (sides & 1) horizontal(northTop);       // north
  if (sides & 8) vertical(IN);               // west
  if (sides & 2) vertical(CELL - IN - 2);    // east

  // A settlement tile enclosed on no side still gets a marker post -- a gate, or the end of a
  // run. Without it an isolated fenced tile would draw nothing at all.
  if (sides === 0) {
    for (let d = 0; d < HIGH + 4; d += 1) set(CELL >> 1, CELL - 2 - d, post);
  }
  return pixels;
}

/**
 * A mark left underfoot: a pair of prints on dry ground, or a ring of displaced water on wet.
 *
 * Small and centred rather than rooted, because this is not a plant -- it belongs where the foot
 * landed, not where the tile begins. Drawn once per step and faded out by the scene, so it needs
 * no second frame.
 */
function traceFrame(kind) {
  const pixels = Buffer.alloc(CELL * CELL * 4);
  const colour = hex(kind === 'splash' ? '#cfe4ea' : '#6b5847');
  const set = (x, y) => {
    if (x < 0 || x >= CELL || y < 0 || y >= CELL) return;
    const p = (y * CELL + x) * 4;
    pixels[p] = colour[0];
    pixels[p + 1] = colour[1];
    pixels[p + 2] = colour[2];
    pixels[p + 3] = 255;
  };
  const cx = CELL / 2;
  const cy = CELL - 6;
  if (kind === 'splash') {
    // A broken ring, so it reads as water thrown outward rather than a drawn circle.
    const ring = [[-4, 0], [-3, -2], [0, -3], [3, -2], [4, 0], [3, 2], [0, 3], [-3, 2]];
    for (const [dx, dy] of ring) set(cx + dx, cy + dy);
    for (const [dx, dy] of [[-2, -1], [2, -1], [-2, 1], [2, 1]]) set(cx + dx, cy + dy);
  } else {
    // Two small prints, offset left and right of centre the way a stride lands.
    for (const [ox, oy] of [[-3, 0], [2, 2]]) {
      for (let dy = 0; dy < 3; dy += 1) {
        set(cx + ox, cy + oy + dy);
        set(cx + ox + 1, cy + oy + dy);
      }
    }
  }
  return pixels;
}

// --- build ----------------------------------------------------------------

/**
 * Sheets are laid out in rows, not one long strip.
 *
 * A strip of 69 frames at 128 pixels is 8,832 across, and WebGL's MAX_TEXTURE_SIZE is **8,192** on
 * ordinary hardware. Over that limit the upload fails with `INVALID_VALUE: texImage2D: width or
 * height out of range` and the texture is never created -- so every sprite drawn from it renders as
 * a black quad. Overdraw sits above the traveller, so the visible symptom was black patches across
 * the map and a player who disappeared under the grass on his own tile.
 *
 * It shipped that way: the strip was 2,208 wide while a cell was 32, and quadrupling the grid
 * quadrupled the width straight through the limit. Nothing warned, because a spritesheet's
 * dimensions are only a problem on the GPU.
 *
 * 4,096 is half the limit, which leaves room for the frame count to grow again. Phaser indexes a
 * spritesheet left-to-right then top-to-bottom, so wrapping changes no frame number and every
 * `*_ORDER` list in `frames.ts` still holds.
 */
const MAX_SHEET_WIDTH = 4096;

/** Rows and columns for `count` frames of `cellWidth`, wrapped to stay inside the limit. */
function sheetLayout(count, cellWidth) {
  const columns = Math.max(1, Math.min(count, Math.floor(MAX_SHEET_WIDTH / cellWidth)));
  return { columns, rows: Math.ceil(count / columns) };
}

function main() {
  // Frame order: every plant's rest frame, then every plant's lean frame, then the fence. Laying
  // it out that way means frame N and frame N + count are the two halves of one animation, which
  // is the arithmetic `frames.ts` relies on.
  const rest = [];
  const lean = [];
  for (const plant of PLANTS) {
    for (let s = 0; s < SCATTERS; s += 1) {
      rest.push(plantFrame(plant, 0, s));
      lean.push(plantFrame(plant, 1, s));
    }
  }
  // Sixteen fence pieces, indexed by the side mask, then the two underfoot traces.
  const fences = [];
  for (let sides = 0; sides < 16; sides += 1) fences.push(fenceFrame(sides));
  const frames = [...rest, ...lean, ...fences, traceFrame('prints'), traceFrame('splash')];

  // Against the *final* cell size: this art is authored at CELL and upscaled by SCALE on the way
  // out, so wrapping against CELL alone would still emit a strip four times over the limit.
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

  const file = path.join(OUT, 'overdraw.png');
  const big = upscale(sheet, sheetWidth, sheetHeight, SCALE);
  fs.writeFileSync(file, encodePng(sheetWidth * SCALE, sheetHeight * SCALE, big));
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`overdraw: ${frames.length} frames of ${CELL * SCALE}x${CELL * SCALE} in ${columns}x${rows}, ${kb} KB`);
  console.log(`  ${PLANTS.length} plants x ${SCATTERS} scatters at rest, the same leaning, then fence`);
  console.log(`  order: ${PLANTS.map((p) => p.id).join(', ')}`);
  console.log(`  then ${fences.length} fence pieces by side mask, footprints, splash`);
}

main();
