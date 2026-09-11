/**
 * The plank bridge, on the crossing's four-frame contract.
 *
 * **The sheet shape is `track.png`'s, exactly, and that is the point.** 512 x 128, four frames,
 * north-south then east-west then the same two worn. `planTrack` picks a sheet by name and does its
 * index arithmetic the same way whatever it picked, which is how `rope.png` shipped without an
 * engine change. A fifth format here would be a fifth thing to keep in step.
 *
 * **What this intake does that the road's could not.** The first painted road sheet was rejected
 * outright: its four cells disagreed with *each other* -- 25% to 81% of their box, centres anywhere
 * from 24% to 72% -- and no amount of cropping invents where a run was meant to leave a cell, so
 * that sheet was replaced by a code-drawn one. This sheet is a different case and it is worth being
 * precise about the difference, because "the art was wrong again" would be the easy and false
 * reading:
 *
 *   north-south runs   237 and 239 px wide, both exactly 693 px long
 *   east-west runs     280 and 275 px tall, both exactly 518 px long
 *   centres            49.3% to 50.3% across every cell
 *
 * They agree with each other to about one per cent. What they are not is edge-to-edge: each run
 * stops ~15 px short at both ends of a 724 px cell, about 2%, and the two orientations disagree on
 * how wide the bridge is by 15%. Both are *corrections*, not inventions -- crop to the run and
 * resample it to fill the cell, and pick one band width for both orientations -- which is exactly
 * what a builder is for.
 *
 * A ~2% stretch along the run is invisible. Normalising 43.6% and 38.7% to one shared band moves
 * each about 6%, also invisible, and it is the only thing that makes a north-south run meet an
 * east-west one at a corner without a step.
 *
 * **Nothing draws this yet, deliberately.** The only gap on the islands is one tile wide, which is
 * a plank, and a bridge stamped where there is nothing to span is the `lava_field` fault this repo
 * already records -- art, species and four points of interest for a biome that generated zero tiles
 * on every seed. Art banked and unused is fine. Art wired to nothing is the bug.
 *
 *   node tools/build-bridge.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { decodePng, contentBox, resample, quantise, encodePng } = require('./build-monuments.js');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'source', 'bridge-runs.png');
const OUT = path.join(ROOT, 'assets', 'bridge.png');

/** One tile, matching `track.png` and `rope.png`. */
const CELL = 128;
const FRAMES = 4;

/**
 * How wide the bridge is across its run, in pixels of the 128 cell.
 *
 * **One number for both orientations, which is the whole repair.** The source draws north-south at
 * 43.6% of its cell and east-west at 38.7% -- a 15% disagreement that would step at any corner
 * where the two meet. 52 of 128 is 41%, the mean of the two, so each moves about 6% and neither
 * moves visibly.
 *
 * It is wider than the road's 25-29% band on purpose: a road is a worn path and a bridge is a
 * structure with rails on it, and the source draws it that way.
 */
const BAND = 52;

function main() {
  const img = decodePng(SRC);
  const cellWidth = img.width / FRAMES;

  const drawings = [];
  const report = [];

  for (let i = 0; i < FRAMES; i += 1) {
    const box = contentBox(img, i, FRAMES);
    if (!box) throw new Error(`bridge-runs.png: cell ${i} is empty`);

    // **Orientation is read from the art, never assumed from the index.** The frame order this
    // sheet has to produce is north-south, east-west, north-south worn, east-west worn, and a
    // sheet that arrived in a different order would otherwise be silently mislabelled -- which is
    // exactly how a walking sprite once played a figure facing west while it slid east.
    const eastWest = box.w > box.h;

    const target = eastWest
      ? { w: CELL, h: BAND, x: 0, y: Math.round((CELL - BAND) / 2) }
      : { w: BAND, h: CELL, x: Math.round((CELL - BAND) / 2), y: 0 };

    const drawn = resample(img, box, target.w, target.h);
    const cell = Buffer.alloc(CELL * CELL * 4);
    for (let y = 0; y < target.h; y += 1) {
      for (let x = 0; x < target.w; x += 1) {
        const from = (y * target.w + x) * 4;
        const to = ((target.y + y) * CELL + target.x + x) * 4;
        drawn.copy(cell, to, from, from + 4);
      }
    }
    drawings.push(cell);
    // How far short of its cell the run was drawn, which is the correction being applied. Not the
    // downsample factor -- the first version of this line reported that and read as an alarming
    // "-81.5%" when the actual repair is four and a half per cent.
    const runInSource = eastWest ? box.w : box.h;
    const cellInSource = eastWest ? cellWidth : img.height;
    report.push(
      `  frame ${i}: ${eastWest ? 'east-west' : 'north-south'}  source ${box.w}x${box.h}` +
        ` -> ${target.w}x${target.h}` +
        `  run drawn ${((100 * runInSource) / cellInSource).toFixed(1)}% of its cell,` +
        ` stretched ${(100 * (cellInSource / runInSource - 1)).toFixed(1)}% to reach both edges`
    );
  }

  const expected = ['north-south', 'east-west', 'north-south', 'east-west'];
  report.forEach((line, i) => {
    if (!line.includes(expected[i])) {
      throw new Error(
        `bridge-runs.png: cell ${i} is a ${line.includes('east-west') ? 'east-west' : 'north-south'} ` +
          `run where a ${expected[i]} one was expected. The four frames are NS, EW, NS worn, EW worn ` +
          `-- the order track.png and rope.png use, and the order planTrack indexes.`
      );
    }
  });

  const colours = quantise(drawings, 18);

  const width = CELL * FRAMES;
  const sheet = Buffer.alloc(width * CELL * 4);
  drawings.forEach((pixels, i) => {
    for (let y = 0; y < CELL; y += 1) {
      for (let x = 0; x < CELL; x += 1) {
        const from = (y * CELL + x) * 4;
        const to = (y * width + i * CELL + x) * 4;
        pixels.copy(sheet, to, from, from + 4);
      }
    }
  });

  fs.writeFileSync(OUT, encodePng(width, CELL, sheet));
  const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
  console.log(`bridge: ${FRAMES} frames of ${CELL}x${CELL}, ${colours} colours, ${kb} KB`);
  report.forEach((line) => console.log(line));
  console.log(`  band ${BAND} px of ${CELL} (${((100 * BAND) / CELL).toFixed(0)}%), the same in both orientations`);
}

main();
