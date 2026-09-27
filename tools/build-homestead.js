/**
 * The homestead's buildings: the windmill in two unfinished stages, and the glass greenhouse.
 *
 * The finished mill is `windmill-tower.png` and `windmill-blades.png`, built by
 * `build-windmill.js` and never touched here. What a settlement adds is the mill *going up* -- a
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

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'assets', 'source');
const OUT = path.join(ROOT, 'assets');

/** The mill's cell, the same as the finished tower's: two tiles tall at the 128-pixel tile. */
const STAGE_W = 128;
const STAGE_H = 256;

/** The greenhouse's cell: two tiles wide and one and a half tall, bottom-anchored. */
const HOUSE_W = 256;
const HOUSE_H = 192;

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
  const manifest = {
    stage: { width: STAGE_W, height: STAGE_H },
    stages,
    greenhouse: { width: HOUSE_W, height: HOUSE_H, drawn: house },
    note: 'Written by tools/build-homestead.js. Do not hand-edit -- rerun the builder.'
  };
  fs.writeFileSync(path.join(OUT, 'homestead.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

if (require.main === module) main();
