// Is the page still the size it was meant to be?
//
// **The last of Phase 4's content budgets, and the one that was missing.** Canon's bundle has a
// budget of its own -- 560 KB, enforced by `check_export_boundary.py` in the canon repo -- because
// Vite inlines every byte of `data/canon/` into the page. But that gate sees only canon's files. The
// woven words in `data/happenings.json`, the portraits' import table, a library pulled in for one
// function: everything else that makes the app's own chunk heavier reached every player unmeasured.
// This measures the chunk itself, after `npm run build`, on every pull request.
//
// **A "something is wrong" bound, not a target to optimise against.** Set with about ten per cent
// over what was measured when it was written (26 September 2026: 844.5 KB counted in 1,024s, which
// Vite prints as 864.8 kB in thousands; canon's bundle was 526 KB of it), so ordinary growth passes
// and a sudden doubling does not. When it fails, find what grew before raising the number -- the
// canon rule applies here too: the answer is usually a split, and raising the budget is a decision
// to be made in the open, in the commit that does it.
//
// Phaser is its own chunk and is not budgeted: it is a pinned dependency that changes only when it
// is upgraded, and an upgrade is reviewed on its own.
//
//   npm run build && node tools/check-bundle-size.js
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

/** The app's own chunk, in KB of what the browser downloads before compression. */
const APP_BUDGET_KB = 950;

const assets = path.join(path.resolve(__dirname, '..'), 'dist', 'assets');
if (!fs.existsSync(assets)) {
  console.error('dist/assets is missing. Build first: npm run build');
  process.exit(1);
}

const chunks = fs.readdirSync(assets).filter((f) => f.endsWith('.js'));
const app = chunks.filter((f) => f.startsWith('index-'));
if (app.length !== 1) {
  // Two means a stale build beside a fresh one, and none means the entry was renamed. Either way
  // the number below would be about the wrong file.
  console.error(`Expected one index-*.js in dist/assets, found ${app.length}: ${app.join(', ') || 'none'}.`);
  console.error('Clean and rebuild: rm -rf dist && npm run build');
  process.exit(1);
}

const kb = (bytes) => bytes / 1024;
let failed = false;
for (const file of chunks.sort()) {
  const body = fs.readFileSync(path.join(assets, file));
  const raw = kb(body.length);
  const gz = kb(zlib.gzipSync(body).length);
  const budgeted = file === app[0];
  const over = budgeted && raw > APP_BUDGET_KB;
  if (over) failed = true;
  const note = budgeted ? `budget ${APP_BUDGET_KB} KB${over ? '  OVER' : ''}` : 'not budgeted';
  console.log(`  ${file.padEnd(28)} ${raw.toFixed(1).padStart(8)} KB  (${gz.toFixed(1)} KB gzipped)  ${note}`);
}

if (failed) {
  console.error(
    `\nThe app chunk is over its ${APP_BUDGET_KB} KB budget. Find what grew first -- ` +
      'see the comment at the top of tools/check-bundle-size.js.'
  );
  process.exit(1);
}
console.log('\nThe app chunk is inside its budget.');
