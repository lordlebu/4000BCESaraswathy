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
// **The sheet carries sixteen shapes now rather than two, and a measurement is why.** A path is a
// route, and a route turns. Measured across the four maps at the default seed, **26% to 44% of
// every map's road tiles are an elbow, a junction, a dead end or a lone stone** -- on the Aravali
// that is 23 elbows, 26 tees and 10 stubs out of 135 tiles, 43.7% of the road. None of those shapes
// existed here, so `planRoad` fell every one of them through to the north-south run: an elbow drew
// a vertical bar that overshot north and never reached west, and the road broke at every turn it
// made.
//
// Sixteen is the full neighbour mask -- north, east, south and west, one bit each. It is **drawn
// rather than enumerated**, which is the part that matters: every frame is composed of half-runs,
// one for each direction the path leaves by, meeting a hub at the centre of the cell. A straight
// run is two opposite arms, drawn from the same hash against the same coordinates the frame it
// replaces used, so its edges are the ones that already tiled; an elbow is two perpendicular arms;
// a lone stone is the hub by itself. Nothing states where a run leaves the cell except the arm, and
// the arm states it once -- so the guarantee `BAND` and `MIDDLE` carry survives having eight times
// as many pieces.
//
// The straight run is **not** pixel-identical to the old one, and the difference is worth naming
// rather than glossing: every cell now carries a hub, a rounded patch of the same earth at the
// middle. A junction is a hole without it. On a straight run it is indistinguishable from what the
// two arms already put there, which is why it can be drawn unconditionally.
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

/** Which way the path leaves the cell. One bit each, in the order `frames.ts` reads them. */
const N = 1;
const E = 2;
const S = 4;
const W = 8;

/** Every combination of those four, which is the whole sheet's first row. */
const MASKS = 16;

/**
 * The three surfaces a run can be worn into, and the row each one occupies.
 *
 * **`ford` is here rather than in a sheet of its own, and that is the whole design.** A crossing has
 * to join the road exactly -- same band, same centre, same sixteen shapes -- and the only way to be
 * certain of that is to draw it with the same `drawArm` against the same `BAND` and `MIDDLE`. A
 * separate sheet would have to be *kept* aligned; this one cannot drift, because there is nowhere
 * for it to disagree.
 *
 * It is stones rather than planks, and canon decides that: the Nomad Ground is sited at a **ford**,
 * and a bridge would contradict it. Stones set in a shallow crossing are what people add to a ford
 * without turning it into something else -- the walker still wades through `river` at its own cost,
 * which is unchanged. The art says "this is where it is crossed", which is true.
 */
const SURFACE = { walked: 0, verge: 1, ford: 2 };
const SURFACES = 3;

/**
 * How many pieces: the sixteen masks once per surface.
 *
 * `ROAD_PIECES` in `frames.ts` carries this number and `roadFrame` computes the index from the
 * layout below, so it is a contract with that function rather than a preference.
 */
const PIECES = MASKS * SURFACES;

/**
 * Sixteen columns and two rows, rather than one strip of thirty-two.
 *
 * Phaser indexes a spritesheet left-to-right and then top-to-bottom, so wrapping changes no frame
 * number -- and a 4,096-pixel strip is a texture some machines decline in one piece. One row per
 * surface, in `SURFACE` order: walked, verge, ford -- which is exactly what
 * `surface * 16 + mask` addresses.
 */
const COLUMNS = MASKS;
const ROWS = PIECES / COLUMNS;

/**
 * How wide the path is, in pixels of the authored cell, and where its centre sits.
 *
 * **These two constants are the whole reason this file exists.** A run only tiles if it leaves the
 * cell at the same width and the same centre in every frame; stating them once and drawing all
 * thirty-two frames from them makes that true by construction rather than by inspection.
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

/**
 * The ford's stones, cooler and greener than the path's dry earth because they are wet.
 *
 * There is deliberately **no fill between them**: the gaps are left transparent so the river draws
 * through, which is what makes a line of stones read as standing *in* water rather than as a grey
 * road laid over it. `underfoot` in `scenePlan` puts the crossing above the river tile and below the
 * walker, so what shows between the stones is the water he is stepping over.
 */
const WET = hex('#7d8a86');
const WET_LIT = hex('#9aa7a2');
const WET_DARK = hex('#5c6865');
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

const half = (BAND - 1) / 2;

/**
 * One half-run: from the edge the path leaves by, in to the centre of the cell.
 *
 * **The arm is the unit rather than the frame, and that is what makes sixteen shapes safe.** Every
 * arm is drawn by the same loop against the same `BAND` and `MIDDLE`, so a tee and a straight leave
 * their shared edge at the identical width on the identical centre. There is no frame in this sheet
 * that has its own opinion about where a run meets its neighbour.
 *
 * `along` runs from the cell edge toward the middle and `across` is the width of the band, exactly
 * as they did when there were two frames. Which of those is x and which is y is the only thing the
 * direction changes -- and the wander is keyed on the *map* coordinate rather than on the distance
 * travelled, so the two halves of a straight run are the same pixels they always were.
 */
function drawArm(set, dir, surface) {
  const overgrown = surface === SURFACE.verge;
  const vertical = dir === N || dir === S;
  // Where this arm starts and ends, walking inward. The hub covers the centre itself.
  const from = dir === N || dir === W ? 0 : MIDDLE;
  const to = dir === N || dir === W ? MIDDLE : CELL;

  const put = (along, across, colour, alpha) =>
    vertical ? set(across, along, colour, alpha) : set(along, across, colour, alpha);

  // **A ford is the same arm with the earth taken out of it.** Stones across the full band, gaps
  // left transparent, and the run leaves the cell at `BAND` on `MIDDLE` exactly as the walked
  // surface does -- so a road tile and a ford tile join with nothing to reconcile.
  //
  // **A stone is forced at both ends of the arm**, whatever the stride lands on. Without that, two
  // adjacent ford tiles can both open on a gap and the crossing shows a one-pixel break at the
  // seam -- the same class of fault the misaligned painted sheet had, arriving by arithmetic
  // instead of by hand.
  if (surface === SURFACE.ford) {
    for (let along = from; along < to; along += 1) {
      const atSeam = along === from || along === to - 1;
      // Three pixels of stone then one of water, which at a band of eleven reads as set stones
      // rather than as a dashed line.
      if (!atSeam && along % 4 === 3) continue;
      for (let d = -half; d <= half; d += 1) {
        const across = MIDDLE + d;
        // The stones are rounded off at the band's edges, so the crossing narrows into the water
        // rather than ending in two square corners.
        if (Math.abs(d) === half && !atSeam && along % 4 !== 0) continue;
        const roll = noise(along, d, 23) % 10;
        const colour = roll < 3 ? WET_LIT : roll < 5 ? WET_DARK : WET;
        // Wet stone is darker where the water stands against it, which is the outside edge.
        const fade = Math.abs(d) / (half + 1);
        put(along, across, colour, Math.round(255 - fade * fade * 70));
      }
    }
    return;
  }

  for (let along = from; along < to; along += 1) {
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

    if (overgrown) {
      // Grass closing in from both sides. It eats into the band rather than sitting beside it --
      // that is the difference between a path going back to meadow and a path with a verge -- and
      // it stops short of the cell edge so the run still meets its neighbour cleanly.
      if (along > 0 && along < CELL - 1) {
        const reach = noise(along, 4, 23) % 4;
        for (let g = 0; g < reach; g += 1) {
          put(along, MIDDLE - half + g, WEED, 220);
          put(along, MIDDLE + half - g, WEED, 220);
        }
      }
    }
  }
}

/**
 * The hub: the square of ground at the middle of the cell where the arms meet.
 *
 * **Drawn for every mask including the empty one**, and that is deliberate rather than tidy. An
 * elbow leaves one quadrant of the centre uncovered -- neither arm reaches past the middle on its
 * own axis -- so without a hub a corner has a notch bitten out of its inside edge. A lone tile
 * without one is nothing at all.
 *
 * **It is drawn first and the arms go over it, and getting that order wrong was visible.** Painted
 * last, the hub *replaced* the arms across an eleven-pixel circle at the middle of every cell, and
 * because its alpha falls off radially where the arm's falls off across the band, it wrote 202
 * where the arm had written 255. On a straight run that is a lighter notch once per tile: a road
 * composited over its own map came out looking like a dashed line, which is how it was caught.
 * Underneath, a straight run's arms cover it completely and it costs nothing.
 */
function drawHub(set, surface, lone) {
  const overgrown = surface === SURFACE.verge;
  // The ford's hub is a single wide stone: a crossing turns in the water at most once, and a
  // mottled patch there would read as silt rather than as something set down to be stood on.
  if (surface === SURFACE.ford) {
    for (let y = MIDDLE - half; y <= MIDDLE + half; y += 1) {
      for (let x = MIDDLE - half; x <= MIDDLE + half; x += 1) {
        const reach = Math.hypot(x - MIDDLE, y - MIDDLE);
        if (reach > half + 0.5) continue;
        const roll = noise(x, y, 29) % 10;
        const colour = roll < 3 ? WET_LIT : roll < 5 ? WET_DARK : WET;
        const fade = reach / (half + 1);
        set(x, y, colour, Math.round((lone ? 200 : 255) - fade * fade * 70));
      }
    }
    return;
  }
  for (let y = MIDDLE - half - 1; y <= MIDDLE + half + 1; y += 1) {
    for (let x = MIDDLE - half - 1; x <= MIDDLE + half + 1; x += 1) {
      const dx = x - MIDDLE;
      const dy = y - MIDDLE;
      // A rounded patch rather than a square. A square hub shows its own corners at a bend, which
      // reads as a paving slab somebody dropped at the turn.
      const reach = Math.hypot(dx, dy);
      if (reach > half + 0.5) continue;

      const roll = noise(x, y, overgrown ? 8 : 6) % 10;
      const colour = roll < 2 ? EARTH_LIT : roll < 4 ? EARTH_DARK : EARTH;
      const fade = reach / (half + 1);
      // A lone stone is fainter all over -- somewhere a path passed once rather than a junction
      // hundreds of feet have rounded off.
      const floor = lone ? 150 : 255;
      set(x, y, colour, Math.round(floor - fade * fade * 120));
    }
  }
  if (!lone && noise(MIDDLE, MIDDLE, 19) % 2 === 0) {
    set(MIDDLE + 1, MIDDLE - 2, STONE, 235);
  }
}

/**
 * One piece of path: whichever arms this mask has, and the hub they meet at.
 *
 * `mask` is the neighbour bitmask and `overgrown` is the verge. Composed rather than special-cased,
 * so adding a seventeenth shape is impossible and getting one wrong is impossible with it.
 */
function roadFrame(mask, surface) {
  const px = Buffer.alloc(CELL * CELL * 4);
  const set = (x, y, colour, alpha) => {
    if (x < 0 || x >= CELL || y < 0 || y >= CELL) return;
    const p = (y * CELL + x) * 4;
    px[p] = colour[0];
    px[p + 1] = colour[1];
    px[p + 2] = colour[2];
    px[p + 3] = alpha;
  };

  // The hub first: the arms are the run and must win wherever they reach. See `drawHub`.
  drawHub(set, surface, mask === 0);
  for (const dir of [N, E, S, W]) {
    if (mask & dir) drawArm(set, dir, surface);
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
  // Order: mask 0 to 15 walked, then mask 0 to 15 with a verge, wrapped into two rows of sixteen.
  // `roadFrame` in `frames.ts` computes the index from exactly that, so this loop is a contract
  // with that function rather than a preference.
  const frames = [];
  for (let surface = 0; surface < SURFACES; surface += 1) {
    for (let mask = 0; mask < MASKS; mask += 1) frames.push(roadFrame(mask, surface));
  }

  const sheetWidth = CELL * COLUMNS;
  const sheetHeight = CELL * ROWS;
  const sheet = Buffer.alloc(sheetWidth * sheetHeight * 4);
  frames.forEach((frame, index) => {
    const ox = (index % COLUMNS) * CELL;
    const oy = Math.floor(index / COLUMNS) * CELL;
    for (let y = 0; y < CELL; y += 1) {
      const from = y * CELL * 4;
      const to = ((oy + y) * sheetWidth + ox) * 4;
      frame.copy(sheet, to, from, from + CELL * 4);
    }
  });

  const big = upscale(sheet, sheetWidth, sheetHeight, SCALE);
  const file = path.join(OUT, 'road.png');
  fs.writeFileSync(file, encodePng(sheetWidth * SCALE, sheetHeight * SCALE, big));
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`road: ${PIECES} frames of ${CELL * SCALE}x${CELL * SCALE}, ${kb} KB`);
  console.log(`  band ${BAND}/${CELL} of the cell, centred on ${MIDDLE} in every frame`);
  console.log(`  layout: ${COLUMNS} columns x ${ROWS} rows -- masks 0..15 per surface: walked, verge, ford`);
}

main();
