/**
 * The homestead's buildings: the windmill in two unfinished stages, and the glass greenhouse.
 *
 * Lothal's finished mill is `windmill-tower.png` and `windmill-blades.png`, built by
 * `build-windmill.js` and never touched here. **The other maps' finished buildings are built here**
 * (`FINISHED`): Dwarka's wind-pump and solar still, the Narmada's scarp mill with a hive beside it.
 * Each is a tower, a wheel turned at build time exactly as the Grit Mill's is, a house beside it, and
 * sometimes one small thing more; the unfinished stages are Lothal's scaffold on every map. What a settlement adds is the mill *going up* -- a
 * foundation in scaffolding, then a tower half built -- and the greenhouse that stands beside it.
 * See `docs/settling-art.md` for the asks and `src/content/homestead.ts` for when each is drawn.
 *
 * **Both stages share one scale, and that is the whole difficulty.** Fitting each to its cell on
 * its own would stretch the knee-high foundation to the full two tiles, and the mill would appear to
 * shrink as it was built. The stage sources arrive on one canvas size with the building standing on
 * the bottom edge, so the scale that fits the taller stage is used for both: the foundation comes
 * out short, the half-built tower taller, and the finished tower after them is the tallest.
 *
 * Sources are in `assets/source/`, tracked, because this script reads them.
 *
 *   node tools/build-homestead.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { decodePng, contentBox, resample, quantise, intoCell, encodePng } = require('./build-monuments.js');
const { rotate, drawnRadius } = require('./build-windmill.js');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'assets', 'source');
const OUT = path.join(ROOT, 'assets');

/** The mill's cell, the same as the finished tower's: two tiles tall at the 128-pixel tile. */
const STAGE_W = 128;
const STAGE_H = 256;

/** The greenhouse's cell: two tiles wide and one and a half tall, bottom-anchored. */
const HOUSE_W = 256;
const HOUSE_H = 192;

/** The small things beside a building -- a hive -- half a tile each way, so they read as smaller. */
const SMALL = 64;

/** How many positions to cut a quarter-turn into, as for the Grit Mill. */
const STEPS = 12;

/**
 * Each map's finished building, by field map.
 *
 * `boss` is where the wheel mounts, as a fraction of the tower's cell -- settled by eye with a
 * composite, the way `build-windmill.js` settled the Grit Mill's, because a heuristic finds the
 * wrong round thing on a building. `blade` is the wheel's cell: Dwarka's many-vaned pump wheel is
 * sized to its own tower, which is drawn larger than the others. A quarter-turn closes the loop for both,
 * since four sails and sixteen vanes each repeat within 90 degrees.
 */
const FINISHED = {
  field_map_dwarka: {
    tower: 'windpump-tower',
    // Wider than a tile, because the pump's guy ropes splay to pegs well outside its lattice: in a
    // one-tile cell they set the scale, and the pump came out a tile and a half tall where the owner
    // wants every mill taller than the Grit Mill's two tiles, not shorter. 192 wide lets it stand
    // two and a quarter tiles; the ropes reach half a tile into the neighbours, as ropes do.
    cell: { width: 192, height: 288 },
    // The owner: make the water it pulls look as if it moves. See `moveWater`.
    water: { frames: 6 },
    wheel: 'windpump-vanes',
    house: 'still-house',
    blade: 112,
    boss: { x: 0.499, y: 0.031 }
  },
  field_map_narmada: {
    tower: 'scarp-mill-tower',
    cell: { width: STAGE_W, height: STAGE_H },
    wheel: 'scarp-mill-sails',
    // The plateau's glasshouse is Lothal's: canon asks for one of the same kind, and the art agrees.
    house: 'greenhouse',
    extra: 'apiary',
    blade: 112,
    boss: { x: 0.495, y: 0.054 }
  }
};

function fit(name, cellW, cellH, colours, water) {
  const img = decodePng(path.join(SOURCE, `${name}.png`));
  const box = contentBox(img, 0, 1);
  const scale = Math.min(cellW / box.w, cellH / box.h);
  const dw = Math.max(1, Math.round(box.w * scale));
  const dh = Math.max(1, Math.round(box.h * scale));
  const drawn = resample(img, box, dw, dh);
  const used = quantise([drawn], colours);
  const cell = intoCell(drawn, dw, dh, cellW, cellH);
  if (water) {
    const { sheet, wet } = moveWater(cell, cellW, cellH, water.frames);
    write(name, cellW * water.frames, cellH, sheet, used + 1, `source ${box.w}x${box.h} -> ${dw}x${dh}, ${water.frames} frames, ${wet} pixels of water`);
  } else {
    write(name, cellW, cellH, cell, used, `source ${box.w}x${box.h} -> ${dw}x${dh}`);
  }
  return { width: dw, height: dh };
}

/** The water's two blues, and the glint that travels through it. */
const WATER = [114, 176, 246];
const WATER_SHADE = [101, 160, 229];
const GLINT = [232, 244, 255];

/**
 * Water that moves: the same building in `frames` frames, with a glint travelling down through
 * the water one pixel a frame.
 *
 * **The painted highlights are the difficulty.** The painter drew the water blue with cream
 * highlights, and once quantised those highlights are the same colour as the cream stone around the
 * trough -- so a highlight cannot be found by its colour. It is found by where it is instead: blue
 * pixels are water, and a cream pixel is water too when two of its four neighbours already are.
 * Three passes reach the middle of the widest highlight without leaking onto the stone, which
 * touches the water along one side at most.
 *
 * The glint runs on a diagonal, `y + x/2`, so it reads as a sheet sliding down the spout and across
 * the trough rather than as a row of lights blinking. Six frames close the loop.
 */
function moveWater(cell, width, height, frames) {
  const at = (x, y) => (y * width + x) * 4;
  const wet = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = at(x, y);
      if (cell[p + 3] > 0 && cell[p + 2] > cell[p] + 40 && cell[p + 2] > 120) wet[y * width + x] = 1;
    }
  }
  for (let pass = 0; pass < 3; pass += 1) {
    const next = wet.slice();
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const i = y * width + x;
        const p = at(x, y);
        if (wet[i] || cell[p + 3] === 0 || cell[p] < 230 || cell[p + 1] < 200) continue;
        const around = wet[i - 1] + wet[i + 1] + wet[i - width] + wet[i + width];
        if (around >= 2) next[i] = 1;
      }
    }
    wet.set(next);
  }
  let count = 0;
  for (const w of wet) count += w;
  const sheetWidth = width * frames;
  const sheet = Buffer.alloc(sheetWidth * height * 4);
  for (let f = 0; f < frames; f += 1) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const from = at(x, y);
        const to = (y * sheetWidth + f * width + x) * 4;
        cell.copy(sheet, to, from, from + 4);
        if (!wet[y * width + x]) continue;
        const band = (((y + (x >> 1) - f) % frames) + frames) % frames;
        const colour = band === 0 ? GLINT : band === frames / 2 ? WATER_SHADE : WATER;
        sheet[to] = colour[0];
        sheet[to + 1] = colour[1];
        sheet[to + 2] = colour[2];
      }
    }
  }
  return { sheet, wet: count };
}

function buildWheel(name, blade) {
  const img = decodePng(path.join(SOURCE, `${name}.png`));
  const radius = drawnRadius(img);
  const half = Math.min(img.width, img.height) / 2;
  if (radius > half) throw new Error(`${name}.png: the wheel reaches ${radius.toFixed(0)} px but the image allows ${half.toFixed(0)}`);
  const side = Math.ceil(radius) * 2;
  const box = {
    ox: Math.round((img.width - 1) / 2 - side / 2),
    oy: Math.round((img.height - 1) / 2 - side / 2),
    w: side,
    h: side
  };
  const drawings = [];
  for (let i = 0; i < STEPS; i += 1) drawings.push(resample(rotate(img, (Math.PI / 2) * (i / STEPS)), box, blade, blade));
  const used = quantise(drawings, 22);
  const width = blade * STEPS;
  const sheet = Buffer.alloc(width * blade * 4);
  drawings.forEach((pixels, i) => {
    for (let y = 0; y < blade; y += 1) pixels.copy(sheet, (y * width + i * blade) * 4, y * blade * 4, (y + 1) * blade * 4);
  });
  write(name, width, blade, sheet, used, `${STEPS} frames of ${blade}, reaching ${radius.toFixed(0)} of ${half.toFixed(0)}`);
}

function buildFinished() {
  const out = {};
  for (const [map, f] of Object.entries(FINISHED)) {
    fit(f.tower, f.cell.width, f.cell.height, 22, f.water);
    buildWheel(f.wheel, f.blade);
    if (f.house !== 'greenhouse') fit(f.house, HOUSE_W, HOUSE_H, 24);
    if (f.extra) fit(f.extra, SMALL, SMALL, 16);
    out[map] = { ...f, steps: STEPS, small: SMALL };
  }
  return out;
}


function write(name, width, height, pixels, colours, note) {
  const file = path.join(OUT, `${name}.png`);
  fs.writeFileSync(file, encodePng(width, height, pixels));
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`${name}: ${width}x${height}, ${colours} colours, ${kb} KB  ${note}`);
}

function buildStages() {
  const names = ['windmill-stage-1', 'windmill-stage-2'];
  const sources = names.map((n) => decodePng(path.join(SOURCE, `${n}.png`)));
  const boxes = sources.map((img) => contentBox(img, 0, 1));
  sources.forEach((img, i) => {
    if (img.width !== sources[0].width || img.height !== sources[0].height) {
      throw new Error(`${names[i]}.png is ${img.width}x${img.height}; the stages must share a canvas`);
    }
  });
  // The scale that fits every stage's drawing in the cell, so none is clipped and all agree.
  const scale = Math.min(...boxes.map((b) => Math.min(STAGE_W / b.w, STAGE_H / b.h)));
  const out = [];
  boxes.forEach((box, i) => {
    const dw = Math.max(1, Math.round(box.w * scale));
    const dh = Math.max(1, Math.round(box.h * scale));
    const drawn = resample(sources[i], box, dw, dh);
    const colours = quantise([drawn], 22);
    write(names[i], STAGE_W, STAGE_H, intoCell(drawn, dw, dh, STAGE_W, STAGE_H), colours, `source ${box.w}x${box.h} -> ${dw}x${dh}`);
    out.push({ name: names[i], width: dw, height: dh });
  });
  return out;
}

function buildGreenhouse() {
  const img = decodePng(path.join(SOURCE, 'greenhouse.png'));
  const box = contentBox(img, 0, 1);
  const scale = Math.min(HOUSE_W / box.w, HOUSE_H / box.h);
  const dw = Math.max(1, Math.round(box.w * scale));
  const dh = Math.max(1, Math.round(box.h * scale));
  const drawn = resample(img, box, dw, dh);
  const colours = quantise([drawn], 24);
  write('greenhouse', HOUSE_W, HOUSE_H, intoCell(drawn, dw, dh, HOUSE_W, HOUSE_H), colours, `source ${box.w}x${box.h} -> ${dw}x${dh}`);
  return { width: dw, height: dh };
}

function main() {
  const stages = buildStages();
  const house = buildGreenhouse();
  const finished = buildFinished();
  const manifest = {
    stage: { width: STAGE_W, height: STAGE_H },
    stages,
    greenhouse: { width: HOUSE_W, height: HOUSE_H, drawn: house },
    finished,
    note: 'Written by tools/build-homestead.js. Do not hand-edit -- rerun the builder.'
  };
  fs.writeFileSync(path.join(OUT, 'homestead.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

if (require.main === module) main();
