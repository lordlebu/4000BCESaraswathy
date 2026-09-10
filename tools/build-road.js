// The worn path, drawn as ground rather than as scenery.
//
// **The same fourth contract the railway uses**, and `build-track.js`'s header is the argument:
// flat, tile-filling, no offset, drawn below the player, and placed by a flag on the tile rather
// than by what the ground is made of. A road belongs to a *route*, not to a kind of ground, and it
// has to sit exactly on the cell so a run of tiles joins into a line.
//
// **Generated rather than prompted, and this one was prompted first.** A painted sheet was asked
// for and came back as eight pictures of a road instead of eight tiles cut from one grid: no cell
// reached any edge, the crossing width ran from 25% to 81% of its content box and the centre line
// from 24% to 72%, so no two pieces could join. It is kept at
// `assets/source/dump/road-runs-misaligned-rejected.png` and the post-mortem is in
// `docs/art-brief.md` under Asset 2f.
//
// That failure is the argument for drawing it here. The one property a tiling run must have --
// **leave the cell at a fixed width, on a fixed centre, in every frame** -- is the property a loop
// gets right by construction and a prompt has to be talked into. `BAND` and `MIDDLE` below are
// literally that guarantee: there is nowhere for a frame to disagree.
//
// It is a placeholder in the sense the crystal cluster is: if painted art arrives that does tile,
// it replaces this and nothing else changes, because the sheet's shape is the contract rather than
// the pixels. What it is not is a stand-in for something missing -- a worn path is repeating
// geometry with a rule, the same case `build-overdraw.js` states, and arithmetic gets it right
// first time.
//
// CommonJS, like everything in tools/.

const fs = require('fs');
const path = require('path');
const { encodePng } = require('./sprite-png.js');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets');

/** Authored at 32 and upscaled, matching `build-track.js` and `build-overdraw.js`. */
const CELL = 32;
const SCALE = 4;

/** How many pieces. Two runs, each freshly walked or half grown over. Matches `TRACK_PIECES`. */
const PIECES = 4;

/**
 * How wide the path is, in pixels of the authored cell, and where its centre sits.
 *
 * **These two constants are the whole reason this file exists.** A run only tiles if it leaves the
 * cell at the same width and the same centre in every frame; stating them once and drawing all
 * four frames from them makes that true by construction rather than by inspection.
 *
 * Eleven of thirty-two is a third of the cell, which is what the corrected prompt in
 * `docs/art-brief.md` asks a painter for. Wide enough at 32 pixels to read as something walked
 * rather than scratched, narrow enough that the ground it is worn into is still the thing you see.
 */
const BAND = 11;
const MIDDLE = CELL / 2;

const hex = (s) => [
  parseInt(s.slice(1, 3), 16),
  parseInt(s.slice(3, 5), 16),
  parseInt(s.slice(5, 7), 16)
];

/**
 * Four earths and a stone, warm and desaturated.
 *
 * Pulled toward the grounds this is drawn over rather than toward a photograph of a track: it sits
 * on `plains`, `hills` and `coast`, and a path in a colour none of them contain reads as a decal.
 * `docs/art-direction.md` records the measurement behind that -- two grounds under ~25 apart in RGB
 * stop being tellable apart, and the inverse holds, so an overlay wants to be *near* its ground.
 */
const EARTH = hex('#8a7654');
const EARTH_LIT = hex('#9c8763');
const EARTH_DARK = hex('#6f5e42');
const STONE = hex('#8d8880');
const WEED = hex('#5b6b47');

/**
 * A cheap deterministic hash, so a rebuild produces the same sheet byte for byte.
 *
 * The same reason `world/rng.ts` exists: `Math.random()` here would mean the asset changed every
 * time somebody ran the builder, and a binary that changes for no reason is a binary nobody can
 * review.
 */
function noise(a, b, salt) {
  let h = (a * 374761393 + b * 668265263 + salt * 2246822519) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * One piece of path.
 *
 * `eastWest` turns the run through ninety degrees; `overgrown` is the same path after fewer feet
 * have been down it -- grass closing from both sides, the earth broken up. Both are wanted on one
 * map: the walk between two points of interest is used, and the far end of a tour is not.
 */
function roadFrame(eastWest, overgrown) {
  const px = Buffer.alloc(CELL * CELL * 4);
  const set = (x, y, colour, alpha) => {
    if (x < 0 || x >= CELL || y < 0 || y >= CELL) return;
    const p = (y * CELL + x) * 4;
    px[p] = colour[0];
    px[p + 1] = colour[1];
    px[p + 2] = colour[2];
    px[p + 3] = alpha;
  };
  // Along the run, across it. One pair of names for both orientations, so the two cannot drift --
  // `build-track.js` makes the same call for the same reason.
  const put = (along, across, colour, alpha) =>
    eastWest ? set(along, across, colour, alpha) : set(across, along, colour, alpha);

  const half = (BAND - 1) / 2;

  for (let along = 0; along < CELL; along += 1) {
    // **The edge wanders, the width does not.** A band with two straight sides reads as a painted
    // stripe, so each side is nudged a pixel in or out along the run -- but the two nudges are
    // independent and average to nothing, so the run still leaves the cell at BAND and joins its
    // neighbour. The wander is what makes it look walked; the average is what makes it tile.
    const wobbleLeft = noise(along, 0, overgrown ? 3 : 1) % 3 === 0 ? 1 : 0;
    const wobbleRight = noise(along, 1, overgrown ? 4 : 2) % 3 === 0 ? 1 : 0;

    for (let d = -half - 1; d <= half + 1; d += 1) {
      const across = MIDDLE + d;
      const outside = d < -half + wobbleLeft || d > half - wobbleRight;

      // The fringe: one pixel of half-strength earth outside the wandering edge, which is what
      // stops the path having an outline. Never outside the band's own width, so it costs nothing
      // at the seam.
      if (outside) {
        if (Math.abs(d) <= half && noise(along, d, 11) % 2 === 0) {
          put(along, across, EARTH_DARK, 110);
        }
        continue;
      }

      // Packed earth, mottled rather than flat. Three tones on a hash, weighted toward the middle
      // tone so the other two read as wear rather than as a pattern.
      const roll = noise(along, d, overgrown ? 7 : 5) % 10;
      const colour = roll < 2 ? EARTH_LIT : roll < 4 ? EARTH_DARK : EARTH;

      // Worn hardest down the middle, which is where feet go. The centre is opaque and the edges
      // let the ground beneath show through, so the path sits *in* the grass rather than on it.
      const fade = Math.abs(d) / (half + 1);
      const alpha = Math.round(255 - fade * fade * 120);
      put(along, across, colour, alpha);
    }

    // A loose stone every so often, and never two in a row.
    if (noise(along, 2, 13) % 9 === 0) {
      const d = (noise(along, 3, 17) % (BAND - 4)) - Math.floor((BAND - 4) / 2);
      put(along, MIDDLE + d, STONE, 235);
    }
  }

  if (overgrown) {
    // Grass closing in from both sides. It eats into the band rather than sitting beside it --
    // that is the difference between a path going back to meadow and a path with a verge -- and it
    // stops two pixels short of the cell edge so the run still meets its neighbour cleanly.
    for (let along = 1; along < CELL - 1; along += 1) {
      const reach = noise(along, 4, 23) % 4;
      for (let g = 0; g < reach; g += 1) {
        put(along, MIDDLE - half + g, WEED, 220);
        put(along, MIDDLE + half - g, WEED, 220);
      }
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
  // Order: walked north-south, walked east-west, overgrown north-south, overgrown east-west.
  // `roadFrame` in `frames.ts` computes the index from that order, so it is a contract with this
  // loop rather than a preference. It is `trackFrame`'s order, deliberately: the two sheets are
  // interchangeable in shape so one planner draws both.
  const frames = [
    roadFrame(false, false),
    roadFrame(true, false),
    roadFrame(false, true),
    roadFrame(true, true)
  ];

  const sheetWidth = CELL * PIECES;
  const sheet = Buffer.alloc(sheetWidth * CELL * 4);
  frames.forEach((frame, index) => {
    const ox = index * CELL;
    for (let y = 0; y < CELL; y += 1) {
      const from = y * CELL * 4;
      const to = (y * sheetWidth + ox) * 4;
      frame.copy(sheet, to, from, from + CELL * 4);
    }
  });

  const big = upscale(sheet, sheetWidth, CELL, SCALE);
  const file = path.join(OUT, 'road.png');
  fs.writeFileSync(file, encodePng(sheetWidth * SCALE, CELL * SCALE, big));
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`road: ${PIECES} frames of ${CELL * SCALE}x${CELL * SCALE}, ${kb} KB`);
  console.log(`  band ${BAND}/${CELL} of the cell, centred on ${MIDDLE} in every frame`);
  console.log('  order: north-south, east-west, north-south overgrown, east-west overgrown');
}

main();
