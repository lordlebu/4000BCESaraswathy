// Is the page still the size it was meant to be?
//
// **The last of Phase 4's content budgets, and the one that was missing.** Canon's bundle has a
// budget of its own, enforced by `check_export_boundary.py` in the canon repo. But that gate sees
// only canon's files. The woven words in `data/happenings.json`, the portraits' import table, a
// library pulled in for one function: everything else that makes the app's own chunk heavier
// reached every player unmeasured. This measures the built chunks, after `npm run build`, on every
// pull request.
//
// **Budgeted gzipped, because that is what a player downloads.** Every host this game is published
// to -- GitHub Pages, itch.io -- compresses text on the way out, and the performance budgets the
// rest of the web uses (Lighthouse, size-limit, bundlesize) are all stated in transfer size for that
// reason. The first version of this check, and canon's 560 KB gate beside it, counted raw bytes:
// canon's data was 569 KB by that measure and 116 KB on the wire, in a game whose paintings come
// to 30 MB. Content was being withheld to satisfy a number nobody downloads.
//
// **Two chunks, two budgets.**
//
//   index-*   the app's own code. A "something is wrong" bound, not a target: about ten per cent
//             over what was measured when it was set (30 September 2026: 177.0 KB gzipped), so
//             ordinary growth passes and a sudden doubling does not. When it fails, find what grew
//             before raising the number.
//
//   canon-*   canon's data, split out in `vite.config.ts`. **The rule is that the data may not
//             outweigh the engine that draws it** -- Phaser is 347.6 KB gzipped -- which is the same
//             number `check_export_boundary.py` holds in the canon repo. It measured 105.0 KB when
//             this was written, so canon can roughly triple before this speaks. Past that the answer
//             is not a bigger number but loading on demand: lore the first frame does not need
//             belongs behind an `import()`, where it costs nothing until somebody opens it.
//
// Phaser is its own chunk and is not budgeted: it is a pinned dependency that changes only when it
// is upgraded, and an upgrade is reviewed on its own.
//
//   npm run build && node tools/check-bundle-size.js
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

/** What each chunk may weigh, in KB gzipped. A chunk not named here is reported and not budgeted. */
const BUDGETS_GZ_KB = { index: 200, canon: 350 };

const assets = path.join(path.resolve(__dirname, '..'), 'dist', 'assets');
if (!fs.existsSync(assets)) {
  console.error('dist/assets is missing. Build first: npm run build');
  process.exit(1);
}

const chunks = fs.readdirSync(assets).filter((f) => f.endsWith('.js'));
const kb = (bytes) => bytes / 1024;
let failed = false;

for (const name of Object.keys(BUDGETS_GZ_KB)) {
  const found = chunks.filter((f) => f.startsWith(`${name}-`));
  if (found.length !== 1) {
    // Two means a stale build beside a fresh one, and none means the chunk was renamed or folded
    // back into another. Either way a budget would be silently measuring nothing.
    console.error(`Expected one ${name}-*.js in dist/assets, found ${found.length}: ${found.join(', ') || 'none'}.`);
    console.error('Clean and rebuild: rm -rf dist && npm run build');
    process.exit(1);
  }
}

for (const file of chunks.sort()) {
  const body = fs.readFileSync(path.join(assets, file));
  const raw = kb(body.length);
  const gz = kb(zlib.gzipSync(body).length);
  const budget = BUDGETS_GZ_KB[file.split('-')[0]];
  const over = budget !== undefined && gz > budget;
  if (over) failed = true;
  const note = budget === undefined ? 'not budgeted' : `budget ${budget} KB gzipped${over ? '  OVER' : ''}`;
  console.log(`  ${file.padEnd(28)} ${gz.toFixed(1).padStart(8)} KB gzipped  (${raw.toFixed(1)} KB raw)  ${note}`);
}

if (failed) {
  console.error(
    '\nA chunk is over its budget. Find what grew first -- ' +
      'see the comment at the top of tools/check-bundle-size.js.'
  );
  process.exit(1);
}
console.log('\nEvery budgeted chunk is inside its budget.');
