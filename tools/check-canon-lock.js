// Verifies data/creatures.json and data/flora.json still match the canon release they
// were exported from.
//
// These files used to be generated here from docs/bestiary.md, and CI checked them by
// re-running the generator and diffing. They are now a projection of the species canon
// in the SouthOfTethys repo, which lives outside this checkout -- so CI cannot rebuild
// them to compare. data/canon.lock.json carries the canon version and a hash of each
// exported file instead, and this checks the committed data against it.
//
// That catches the two things worth catching: a hand-edit to a generated file, and a
// half-applied export where one file was updated and the other was not.
//
//   node tools/check-canon-lock.js
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// The bundle lives in data/canon/ now: canon exports its own shape and src/content/canon.ts
// adapts it. The flat creatures.json and flora.json were the old engine-shaped export.
const dataDir = path.join(path.resolve(__dirname, '..'), 'data', 'canon');
const lockPath = path.join(dataDir, 'canon.lock.json');

if (!fs.existsSync(lockPath)) {
  console.error('data/canon.lock.json is missing. Regenerate it from the canon repo:');
  console.error('  python utils/export_canon_bundle.py --apply');
  process.exit(1);
}

const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const failures = [];

for (const [filename, expected] of Object.entries(lock.sha256)) {
  const target = path.join(dataDir, filename);
  if (!fs.existsSync(target)) {
    failures.push(`${filename} is missing`);
    continue;
  }
  // Hash over LF-normalised content so the check survives a CRLF checkout on Windows.
  const text = fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
  const actual = crypto.createHash('sha256').update(text, 'utf8').digest('hex');
  if (actual !== expected) {
    failures.push(`${filename} does not match the lock (expected ${expected.slice(0, 16)}, got ${actual.slice(0, 16)})`);
    continue;
  }
  const count = JSON.parse(text).length;
  if (count !== lock.counts[filename]) {
    failures.push(`${filename} has ${count} entries, lock says ${lock.counts[filename]}`);
  }
}

if (failures.length) {
  console.error(`Canon data does not match data/canon.lock.json (canon ${lock.canon_version}):`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error('');
  console.error('These files are generated. Do not edit them by hand -- change the species');
  console.error('canon in the SouthOfTethys repo, then re-export:');
  console.error('  python utils/export_canon_bundle.py --apply');
  process.exit(1);
}

console.log(`Canon data matches the lock (canon ${lock.canon_version}, ` +
  Object.entries(lock.counts).map(([f, n]) => `${f} ${n}`).join(', ') + ').');
