// Build every playable traveller's overworld sheet, from one manifest.
//
// This replaced two hand-written invocations of `build-sprite-sheet.js` in `package.json`, each
// with its palette size typed into the command line. Two characters was tolerable. Five characters
// across seven source sheets is not -- and the sitting art is packed two and three figures to a
// file, which is not something a command line should be asked to remember.
//
//   node tools/build-characters.js            # build every character
//   node tools/build-characters.js varuna     # just one
//   node tools/build-characters.js --check    # verify what is built, write nothing
//
// A sixth traveller is a row in `characters.json` and nothing else.
//
// CommonJS, like everything in tools/ -- see tools/package.json.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(__dirname, 'characters.json');
const BUILDER = path.join(__dirname, 'build-sprite-sheet.js');
const OUT_DIR = path.join(ROOT, 'assets');

/**
 * How many frames a finished sheet carries, and why it is not thirty-two.
 *
 * The walk is four frames a facing -- contact, pass, contact, pass -- because a walk cycle needs
 * them. **Sitting is one frame a facing**, and that is a decision rather than a shortfall: a seated
 * figure has nowhere to walk to, and the second frame of an idle exists to breathe rather than to
 * move. The art was drawn that way too, one pose per direction, so this layout is what is actually
 * in hand rather than three quarters of a layout nobody has.
 *
 * `player.ts` reads the same two constants. Change one, change both.
 */
const WALK_FRAMES = 16;
const SIT_FRAMES = 4;
const TOTAL_FRAMES = WALK_FRAMES + SIT_FRAMES;

function sheetFrames(file, cellWidth) {
  const buf = fs.readFileSync(file);
  return buf.readUInt32BE(16) / cellWidth;
}

/** Run the existing builder. It owns every pixel decision; this only says what to feed it. */
function build(source, out, cell, colours, frames) {
  const args = [BUILDER, source, out, String(cell.width), String(cell.height), `--colours=${colours}`];
  if (frames) args.push(`--frames=${frames.join(',')}`);
  execFileSync(process.execPath, args, { stdio: 'pipe', cwd: ROOT });
}

/**
 * Concatenate finished sheets side by side into one texture.
 *
 * The builder can already take several sources in one go, but not here: the walking source must
 * use every figure it finds and the sitting source must use a named subset, and one invocation
 * cannot carry two different selections. So each half is built on its own and the halves are
 * stitched.
 *
 * Both halves come from the same builder at the same cell size, so this only has to move rows of
 * pixels -- it decodes and re-encodes with the same code the builder uses rather than splicing
 * PNG chunks, because a second encoder is a second thing to keep correct.
 */
function joinSheets(parts, out, cell, repeatLast) {
  const { decodePng, encodePng } = require('./sprite-png.js');
  const images = parts.map(decodePng);
  const frames = [];
  images.forEach((img, i) => {
    const n = img.width / cell.width;
    for (let f = 0; f < n; f += 1) frames.push({ img, f });
    // A facing the sitting art does not have repeats the last one it does, so every direction has
    // something to draw. Stated here rather than in the builder: it is a fact about this game's
    // art, not about PNGs.
    if (i === 1 && repeatLast) {
      while (frames.length - images[0].width / cell.width < repeatLast) {
        frames.push({ img, f: n - 1 });
      }
    }
  });

  const width = cell.width * frames.length;
  const sheet = Buffer.alloc(width * cell.height * 4);
  frames.forEach((entry, index) => {
    for (let y = 0; y < cell.height; y += 1) {
      const from = (y * entry.img.width + entry.f * cell.width) * 4;
      const to = (y * width + index * cell.width) * 4;
      entry.img.data.copy(sheet, to, from, from + cell.width * 4);
    }
  });
  fs.writeFileSync(out, encodePng(width, cell.height, sheet));
  return frames.length;
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const { cell, characters } = manifest;
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const only = args.filter((a) => !a.startsWith('--'));

  const wanted = only.length ? characters.filter((c) => only.includes(c.id)) : characters;
  if (!wanted.length) {
    console.log(`No character named ${only.join(', ')}. Known: ${characters.map((c) => c.id).join(', ')}`);
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'sprites-'));
  let failed = 0;

  for (const c of wanted) {
    const out = path.join(OUT_DIR, `${c.id}-overworld.png`);
    const rel = path.relative(ROOT, out);

    if (check) {
      if (!fs.existsSync(out)) {
        console.log(`  !  ${c.id.padEnd(9)} not built`);
        failed += 1;
        continue;
      }
      const n = sheetFrames(out, cell.width);
      const ok = n === TOTAL_FRAMES;
      if (!ok) failed += 1;
      console.log(`  ${ok ? 'ok' : '! '} ${c.id.padEnd(9)} ${n} frames${ok ? '' : `, expected ${TOTAL_FRAMES}`}`);
      continue;
    }

    const walkOut = path.join(tmp, `${c.id}-walk.png`);
    const sitOut = path.join(tmp, `${c.id}-sit.png`);
    build(path.join(ROOT, c.walk.source), walkOut, cell, c.colours, c.walk.frames);
    build(path.join(ROOT, c.sit.source), sitOut, cell, c.colours, c.sit.frames);

    const walkN = sheetFrames(walkOut, cell.width);
    const sitN = sheetFrames(sitOut, cell.width);

    // **The check that would have caught the shipping Mithra sheet.** It has sixteen frames because
    // `build:sprite` only ever gave it a walking source, and nothing noticed for a month because
    // nothing ever loaded it. A sheet that is short is not a sheet that is nearly right.
    if (walkN !== WALK_FRAMES) {
      console.log(`  !  ${c.id}: walk source gave ${walkN} frames, expected ${WALK_FRAMES} (${c.walk.source})`);
      failed += 1;
      continue;
    }
    if (sitN < 1) {
      console.log(`  !  ${c.id}: sitting source gave nothing (${c.sit.source})`);
      failed += 1;
      continue;
    }

    const total = joinSheets([walkOut, sitOut], out, cell, SIT_FRAMES);
    if (total !== TOTAL_FRAMES) {
      console.log(`  !  ${c.id}: joined to ${total} frames, expected ${TOTAL_FRAMES}`);
      failed += 1;
      continue;
    }

    const kb = (fs.statSync(out).size / 1024).toFixed(1);
    console.log(`  ok ${c.id.padEnd(9)} ${total} frames  ${kb} KB  ${rel}`);
  }

  if (failed) {
    console.log('');
    console.log(`${failed} character(s) not built. Nothing that is short is nearly right.`);
    process.exitCode = 1;
  }
}

main();
