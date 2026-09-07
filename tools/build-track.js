// The railway, drawn as ground rather than as scenery.
//
// **Its own sheet, and the three existing layers say why none of them fit.** Overdraw is what the
// traveller wades into and may not reach above half the cell -- `frames.test.ts` refuses anything
// taller, and it refused these. Features are the rare tall things he walks past, one tile in
// twelve and offset to one side. Decor lies flat and can go anywhere, which is right, but it is
// keyed by biome and scattered at a sub-tile offset, and a rail is neither: it belongs to a
// *route* rather than to a kind of ground, and it must sit exactly on the cell so a run of tiles
// joins into a line.
//
// So this is a fourth thing with a fourth contract: **flat, tile-filling, no offset, drawn below
// the player, and placed by `Tile.track` rather than by what the ground is made of.**
//
// Generated rather than prompted, following the rule `build-overdraw.js` states and
// `docs/art-brief.md` records: two parallel rails and a ladder of sleepers is repeating geometry a
// loop states exactly, and describing it to an image model then resampling to 32 pixels is a lossy
// round trip to reach something arithmetic gets right first time. The signal post and the carriage
// are painted because those have character; this has a rule.
//
// CommonJS, like everything in tools/.

const fs = require('fs');
const path = require('path');
const { encodePng } = require('./sprite-png.js');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets');

/**
 * Authored at 32 and upscaled, matching `build-overdraw.js`.
 *
 * The rails are drawn at the size the arithmetic is legible at and enlarged on the way out, rather
 * than drawn large and shrunk -- which is the whole reason a generated asset beats a prompted one
 * here.
 */
const CELL = 32;
const SCALE = 4;

/** How many pieces. Two runs, each sound or overgrown. */
const PIECES = 4;

const hex = (s) => [
  parseInt(s.slice(1, 3), 16),
  parseInt(s.slice(3, 5), 16),
  parseInt(s.slice(5, 7), 16)
];

const IRON = hex('#6d5646');
const RUST = hex('#8a4b2a');
const TIMBER = hex('#4f4034');
const WEED = hex('#5b6b47');

/**
 * One piece of line.
 *
 * `eastWest` turns the run through ninety degrees; `overgrown` is the same track after nobody has
 * run on it for a lifetime -- sleepers missing, grass up through the four-foot. Both maps that use
 * this need both: the Aravali strait crossing is kept, and the sunk cutting is not.
 */
function railFrame(eastWest, overgrown) {
  const px = Buffer.alloc(CELL * CELL * 4);
  const set = (x, y, colour) => {
    if (x < 0 || x >= CELL || y < 0 || y >= CELL) return;
    const p = (y * CELL + x) * 4;
    px[p] = colour[0];
    px[p + 1] = colour[1];
    px[p + 2] = colour[2];
    px[p + 3] = 255;
  };
  // Along the run, across it. Writing both directions through one pair of names keeps the two
  // orientations from drifting apart, which is what a second copy of this loop would do.
  const put = (along, across, colour) =>
    eastWest ? set(along, across, colour) : set(across, along, colour);

  // Gauge: far enough apart to read as two lines at 32 pixels, near enough that the carriage
  // plainly spans them.
  const rails = [CELL / 2 - 4, CELL / 2 + 3];

  // Sleepers first, so the rails lie on top of them as they do on the ground.
  for (let along = 1; along < CELL; along += 5) {
    if (overgrown && along % 10 === 6) continue;
    for (let across = CELL / 2 - 7; across <= CELL / 2 + 6; across += 1) {
      put(along, across, TIMBER);
    }
  }

  for (const rail of rails) {
    for (let along = 0; along < CELL; along += 1) {
      // Rust in patches rather than evenly. A line that is uniformly orange reads as painted;
      // iron rusts where the water sits.
      put(along, rail, (along + rail) % 7 < 3 ? RUST : IRON);
    }
  }

  if (overgrown) {
    // Grass up the four-foot, which is the thing that says nothing has run here in years.
    for (let along = 2; along < CELL; along += 3) {
      const height = 2 + ((along * 7) % 3);
      const across = CELL / 2 - 1 + (along % 2 ? 1 : 0);
      for (let g = 0; g < height; g += 1) put(along, across - g, WEED);
    }
  }
  return px;
}

function upscale(src, width, height, factor) {
  const out = Buffer.alloc(width * factor * height * factor * 4);
  const stride = width * factor * 4;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const from = (y * width + x) * 4;
      for (let dy = 0; dy < factor; dy += 1) {
        for (let dx = 0; dx < factor; dx += 1) {
          const to = (y * factor + dy) * stride + (x * factor + dx) * 4;
          src.copy(out, to, from, from + 4);
        }
      }
    }
  }
  return out;
}

function main() {
  // Order: sound north-south, sound east-west, overgrown north-south, overgrown east-west.
  // `frames.ts` computes the index from that order, so it is a contract rather than a preference.
  const frames = [
    railFrame(false, false),
    railFrame(true, false),
    railFrame(false, true),
    railFrame(true, true)
  ];

  const sheet = Buffer.alloc(CELL * PIECES * CELL * 4);
  const sheetWidth = CELL * PIECES;
  frames.forEach((frame, index) => {
    const ox = index * CELL;
    for (let y = 0; y < CELL; y += 1) {
      const from = y * CELL * 4;
      const to = (y * sheetWidth + ox) * 4;
      frame.copy(sheet, to, from, from + CELL * 4);
    }
  });

  const big = upscale(sheet, sheetWidth, CELL, SCALE);
  const file = path.join(OUT, 'track.png');
  fs.writeFileSync(file, encodePng(sheetWidth * SCALE, CELL * SCALE, big));
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`track: ${PIECES} frames of ${CELL * SCALE}x${CELL * SCALE}, ${kb} KB`);
  console.log('  order: north-south, east-west, north-south overgrown, east-west overgrown');
}

main();
