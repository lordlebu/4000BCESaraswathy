/**
 * The windmill: one tower, one blade wheel, and the rotation done here rather than by a painter.
 *
 * **Why this is not a job in `build-monuments.js`.** It was, and the sheet it produced was wrong in
 * the one way that mattered: six cells asked for at fifteen degrees apart came back with the tower
 * at `y 79-709` *pixel-identically in every cell* and the sails in the same place in all six. Six
 * copies of one position. Asking a second time for the same thing is asking for the same failure,
 * so the ask changed instead -- **hand over one wheel and rotate it here**, which is fewer things
 * for a painter to get right and a source that can be re-stepped at any angle later.
 *
 * **And rotating at build time rather than at run time is the whole point.** Phaser can spin a
 * sprite, and it was the obvious first answer. This game draws at integer scale with `NEAREST`
 * filtering -- that is the look -- and an arbitrary runtime rotation resamples straight off that
 * grid, so the sail edges crawl as they turn. Rotating here means every frame is snapped to the
 * shared palette once, at build time, and the renderer only ever blits an axis-aligned sprite.
 *
 * **Twelve frames is arithmetic, not taste.** A four-sail wheel is identical every 90 degrees, so
 * the loop only has to cover 90: twelve frames is 7.5 degrees a step, which on a mill turning at
 * `BLADE_PERIOD` reads as continuous. Raising it costs only file size, and the source supports it.
 *
 * Sources are in `assets/source/`, tracked, because this script reads them -- the rule the walking
 * sprites had to learn when a documented rebuild only ran on the one machine holding the art.
 *
 *   node tools/build-windmill.js
 */

const fs = require('node:fs');
const path = require('node:path');
const {
  decodePng,
  isBackground,
  contentBox,
  resample,
  quantise,
  intoCell,
  encodePng
} = require('./build-monuments.js');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'assets', 'source');
const OUT = path.join(ROOT, 'assets');

/** The tower's cell. Two tiles tall at the game's 128-pixel tile, bottom-anchored like every other
 *  standing sprite -- nothing calls `setDisplaySize`, so this *is* its size on screen. */
const TOWER_W = 128;
const TOWER_H = 256;

/** The wheel's cell, square because it rotates inside it. Sized against the tower's face rather
 *  than against its own source resolution -- the wheel arrives 981 pixels across and the tower 668,
 *  which would make the sails wider than the mill if either were believed. */
const BLADE = 96;

/** How many positions to cut the quarter-turn into. */
const STEPS = 12;

/**
 * Where the wheel mounts, as a fraction of the tower's cell.
 *
 * **Measured approximately and then corrected by eye, and the second half is the one that settled
 * it.** Finding the boss automatically was tried three ways -- darkest compact blob, most disc-like
 * connected component, densest brass cluster -- and each found something else on the building: the
 * cupola windows, the arched window, the doorway, then the brass cross-bracing around the boss
 * rather than the boss. The bracing estimate put it at 46.5%, 40.7%, the crude one at 44.9%, and a
 * first guess of 33.5% mounted the wheel a clear head above the boss -- the tower's own brass ring
 * was left showing underneath it, which is what made the error obvious the moment it was drawn.
 *
 * `tools/preview-windmill.js` is how it was settled and how to re-settle it: it composites the two
 * sheets at a given offset so the answer is visible rather than argued. This is the same lesson the
 * character sheets already cost -- two pixel heuristics got the profile rows wrong on two of five
 * travellers, and looking took a minute and was right.
 */
const BOSS = { x: 0.49, y: 0.44 };

/** Rotate an RGBA image about its own centre. Nearest-neighbour on purpose: the downsample below
 *  takes the most common colour per block, so smoothing here would only feed it invented colours. */
function rotate(img, radians) {
  const { width, height, data } = img;
  const out = Buffer.alloc(width * height * 4);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const cos = Math.cos(-radians);
  const sin = Math.sin(-radians);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const sx = Math.round(cx + dx * cos - dy * sin);
      const sy = Math.round(cy + dx * sin + dy * cos);
      const to = (y * width + x) * 4;
      if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
      const from = (sy * width + sx) * 4;
      out[to] = data[from];
      out[to + 1] = data[from + 1];
      out[to + 2] = data[from + 2];
      out[to + 3] = data[from + 3];
    }
  }
  return { width, height, data: out };
}

/** The furthest drawn pixel from the image centre -- the radius that has to survive a rotation. */
function drawnRadius(img) {
  const cx = (img.width - 1) / 2;
  const cy = (img.height - 1) / 2;
  let max = 0;
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      if (isBackground(img, x, y)) continue;
      const r = Math.hypot(x - cx, y - cy);
      if (r > max) max = r;
    }
  }
  return max;
}

function buildTower() {
  const img = decodePng(path.join(SOURCE, 'windmill-tower.png'));
  const box = contentBox(img, 0, 1);
  const scale = Math.min(TOWER_W / box.w, TOWER_H / box.h);
  const dw = Math.max(1, Math.round(box.w * scale));
  const dh = Math.max(1, Math.round(box.h * scale));
  const drawn = resample(img, box, dw, dh);
  const colours = quantise([drawn], 22);   // mutates in place and hands back the palette size
  const sheet = intoCell(drawn, dw, dh, TOWER_W, TOWER_H);
  const file = path.join(OUT, 'windmill-tower.png');
  fs.writeFileSync(file, encodePng(TOWER_W, TOWER_H, sheet));
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`windmill-tower: 1 frame of ${TOWER_W}x${TOWER_H}, ${colours} colours, ${kb} KB`);
  console.log(`  source ${box.w}x${box.h} -> ${dw}x${dh}`);
  return { dw, dh };
}

function buildBlades() {
  const img = decodePng(path.join(SOURCE, 'windmill-wheel.png'));

  // **One box for every frame, and it is centred on the image rather than on the ink.** Cropping
  // each rotation to its own content would re-centre it, and the wheel would wobble on the hub
  // instead of turning on it. The box is the circle the sails sweep, squared off.
  const radius = drawnRadius(img);
  const half = Math.min(img.width, img.height) / 2;
  if (radius > half) {
    throw new Error(
      `windmill-wheel.png: the sails reach ${radius.toFixed(0)} px from centre but the image only ` +
        `allows ${half.toFixed(0)} -- rotating it would clip the tips. Re-export with a margin.`
    );
  }
  const cx = (img.width - 1) / 2;
  const cy = (img.height - 1) / 2;
  const side = Math.ceil(radius) * 2;
  const box = {
    ox: Math.round(cx - side / 2),
    oy: Math.round(cy - side / 2),
    w: side,
    h: side
  };

  const drawings = [];
  for (let i = 0; i < STEPS; i += 1) {
    const radians = (Math.PI / 2) * (i / STEPS);
    drawings.push(resample(rotate(img, radians), box, BLADE, BLADE));
  }
  const colours = quantise(drawings, 22);   // one shared palette across all twelve

  const frames = drawings;
  const sheetWidth = BLADE * STEPS;
  const sheet = Buffer.alloc(sheetWidth * BLADE * 4);
  frames.forEach((pixels, i) => {
    for (let y = 0; y < BLADE; y += 1) {
      for (let x = 0; x < BLADE; x += 1) {
        const from = (y * BLADE + x) * 4;
        const to = (y * sheetWidth + i * BLADE + x) * 4;
        pixels.copy(sheet, to, from, from + 4);
      }
    }
  });
  const file = path.join(OUT, 'windmill-blades.png');
  fs.writeFileSync(file, encodePng(sheetWidth, BLADE, sheet));
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`windmill-blades: ${STEPS} frames of ${BLADE}x${BLADE}, ${colours} colours, ${kb} KB`);
  console.log(`  sails reach ${radius.toFixed(0)} px of an allowed ${half.toFixed(0)}`);
  console.log(`  step ${(90 / STEPS).toFixed(1)} degrees, loop closes at 90`);
}

/**
 * Write the numbers the game needs beside the sheets that carry them.
 *
 * **The boss offset must not be typed twice.** The game has to know where on the tower the wheel
 * mounts, and that is this builder's number -- a copy of it in `frames.ts` would be a second place
 * for it to be right, which is the same shape as `routable` drifting two biomes behind
 * `isWalkable` and going unnoticed for a whole round. The builder computes it, the builder writes
 * it, and `frames.ts` imports it.
 */
function writeManifest() {
  const file = path.join(OUT, 'windmill.json');
  const manifest = {
    tower: { width: TOWER_W, height: TOWER_H },
    blade: BLADE,
    steps: STEPS,
    boss: BOSS,
    note: 'Written by tools/build-windmill.js. Do not hand-edit -- rerun the builder.'
  };
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`  manifest -> assets/windmill.json`);
}

function main() {
  buildTower();
  buildBlades();
  writeManifest();
  console.log(`  boss at ${(BOSS.x * 100).toFixed(1)}%, ${(BOSS.y * 100).toFixed(1)}% of the tower cell`);
}

main();
