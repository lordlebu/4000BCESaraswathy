// Is a built character sheet good enough to keep?
//
// **Written because "Mithra's quality is better than the others" turned out to be measurable, and
// nothing was measuring it.** Malacite and Mehtar shipped at 58-65% speckle -- nearly two thirds of
// their pixels match no neighbour -- against Mithra's 27%. Nothing failed, nothing warned, and the
// difference is plainly visible the moment a player zooms in.
//
//   node tools/check-sprite.js assets/mithra-overworld.png
//   node tools/check-sprite.js assets/*.png
//
// The three numbers, and why these three:
//
// **speckle** -- the share of opaque pixels whose colour matches none of their four neighbours.
// This is the one that matters. The scene sets `FilterMode.NEAREST`, so zooming magnifies hard
// pixels: a pixel that belongs to a shape grows into a bigger piece of that shape, and a pixel that
// belongs to nothing grows into a visible speck. Dithering is the usual source.
//
// **mean run** -- the average horizontal stretch of one colour. The same property from the other
// side, and it is what "flat" means numerically.
//
// **colours** -- reported but deliberately NOT a gate. Rebuilding Mithra from the same source at
// 18, 22, 26, 34 and 48 colours moved speckle only 19.8% to 26.6% and was *visually identical* at
// 8x magnification. The quantise target is a weak lever; it cannot rescue a bad source and it does
// not spoil a good one. Turn it down because it is free, not because it fixes anything.
//
// CommonJS, like everything in tools/ -- see tools/package.json.

const fs = require('fs');
const { decodePng } = require('./sprite-png.js');

/** A pixel this transparent is background. Matches the builder's own threshold. */
const SOLID = 128;

/**
 * The bar, taken from Mithra rather than chosen.
 *
 * She is the sheet that was pointed at as the good one, so her numbers are the standard: 26.8%
 * speckle and a 1.59px mean run. The gates sit a little the wrong side of both, because a sheet
 * that merely ties the best one should pass rather than scrape.
 */
const MAX_SPECKLE = 30;
const MIN_RUN = 1.45;

function measure(file) {
  const { width, height, data } = decodePng(file);
  const at = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    const i = (y * width + x) * 4;
    return data[i + 3] < SOLID ? null : (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
  };

  const colours = new Set();
  let opaque = 0;
  let speckle = 0;
  let runs = 0;
  let runTotal = 0;
  let semi = 0;

  for (let y = 0; y < height; y += 1) {
    let runColour = null;
    let runLength = 0;
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 0 && alpha < 255) semi += 1;
      const colour = at(x, y);
      if (colour === null) {
        if (runLength) { runs += 1; runTotal += runLength; runLength = 0; runColour = null; }
        continue;
      }
      opaque += 1;
      colours.add(colour);
      // Four-neighbour rather than eight: a diagonal-only match is a dither pattern, which is
      // exactly the thing being caught rather than an exception to it.
      if (![at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].some((n) => n === colour)) {
        speckle += 1;
      }
      if (colour === runColour) runLength += 1;
      else { if (runLength) { runs += 1; runTotal += runLength; } runColour = colour; runLength = 1; }
    }
    if (runLength) { runs += 1; runTotal += runLength; }
  }

  return {
    width, height,
    colours: colours.size,
    speckle: (speckle / opaque) * 100,
    run: runTotal / runs,
    semi
  };
}

function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('usage: node tools/check-sprite.js <sheet.png> [...]');
    process.exit(2);
  }

  console.log('sheet                     size       colours   speckle   mean run   verdict');
  let failed = 0;
  for (const file of files) {
    if (!fs.existsSync(file)) { console.log(`${file}: missing`); failed += 1; continue; }
    const m = measure(file);
    const bad = [];
    if (m.speckle > MAX_SPECKLE) bad.push(`speckle over ${MAX_SPECKLE}%`);
    if (m.run < MIN_RUN) bad.push(`runs under ${MIN_RUN}px`);
    // A built sheet has no soft edges at all -- the builder snaps every pixel. Any semi-transparent
    // pixel means this is a raw, not a build, and it will shimmer at every zoom level.
    if (m.semi > 0) bad.push(`${m.semi} semi-transparent pixels -- is this a raw rather than a build?`);
    if (bad.length) failed += 1;
    console.log(
      file.replace(/^.*\//, '').padEnd(25),
      `${m.width}x${m.height}`.padEnd(10),
      String(m.colours).padStart(7),
      `${m.speckle.toFixed(1)}%`.padStart(9),
      `${m.run.toFixed(2)}px`.padStart(10),
      '  ',
      bad.length ? `FAIL -- ${bad.join('; ')}` : 'ok'
    );
  }

  if (failed) {
    console.log(`\n${failed} sheet(s) below the bar. The cause is almost always the source art rather`);
    console.log('than the build: rebuilding at fewer colours moves speckle by about seven points, and');
    console.log('the gap between the best and worst sheets in this repository is forty.');
    process.exit(1);
  }
}

main();
