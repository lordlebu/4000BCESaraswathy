// The numbers in the prose, checked against the numbers in the data.
//
// **Every count in `README.md` was wrong, and nothing could have said so.** It claimed 257 creatures
// and 116 plants against 231 and 110; 424 entities against 720; fifteen kinds of ground against
// eighteen; 300 species against 341. Each was true when it was written and none of them was true
// any more, because a canon export moves the numbers and no human re-reads a README looking for
// arithmetic.
//
// It also told the reader to run `npm run build:data`, which has never existed as a script in this
// repository — a documented command that cannot be run is worse than an undocumented one, because
// it costs somebody the time to find out.
//
// So the prose is checked. Not the whole document — only the claims that are arithmetic about data
// this repo holds, which is exactly the class that goes stale without anyone noticing. A sentence
// about *why* something is the way it is cannot rot; a number can.
//
// The canon repo already does this to itself: `lint_story.py` refuses a commit whose README says a
// different entity count from `index.json`, and it caught that mistake twice in one session. This
// is the same guard on this side of the line.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import lock from '../data/canon/canon.lock.json';
import biomes from '../data/biomes.json';
import landmarks from '../data/landmarks.json';
import pkg from '../package.json';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
const claude = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');

const counts = lock.counts as Record<string, number>;
const bundleTotal = Object.values(counts).reduce((a, b) => a + b, 0);
const species = counts.fauna + counts.flora;

describe('the README counts what the data actually holds', () => {
  it('gets the creature and plant counts right', () => {
    expect(readme, `README should say ${counts.fauna} creatures`).toContain(
      `**${counts.fauna} creatures and ${counts.flora} plants**`
    );
    expect(readme, `README should say ${counts.fauna} fauna and ${counts.flora} flora`).toMatch(
      new RegExp(`${counts.fauna} fauna and ${counts.flora}\\s+flora`)
    );
  });

  it('gets the bundle total right', () => {
    expect(readme, `the bundle holds ${bundleTotal} entities`).toContain(`among ${bundleTotal} entities`);
    expect(claude, `CLAUDE.md should say ${bundleTotal} entities`).toContain(`${bundleTotal} entities`);
  });

  it('gets the species total right', () => {
    expect(readme, `fauna plus flora is ${species}`).toMatch(new RegExp(`${species} species across seven`));
  });

  it('gets the number of grounds right', () => {
    const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
      'Eighteen', 'Nineteen', 'Twenty'];
    const n = Object.keys(biomes).length;
    expect(readme, `data/biomes.json holds ${n} grounds`).toContain(`**${words[n]} kinds of ground**`);
  });

  it('gets the number of landmark kinds right', () => {
    const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
    const n = Array.isArray(landmarks) ? landmarks.length : Object.keys(landmarks).length;
    expect(readme, `data/landmarks.json holds ${n} kinds`).toContain(`**${words[n]} kinds of landmark**`);
  });
});

describe('the README only names commands that exist', () => {
  it('never tells the reader to run a script this repo does not have', () => {
    // `npm run build:data` sat in the README for long enough to be quoted back. Every `npm run x`
    // in the prose has to be a real entry in package.json.
    const scripts = new Set(Object.keys(pkg.scripts));
    const named = [...readme.matchAll(/`npm run ([a-z:-]+)`/g)].map((m) => m[1]);
    const missing = [...new Set(named)].filter((n) => !scripts.has(n));
    expect(missing, `README names scripts that do not exist: ${missing.join(', ')}`).toEqual([]);
  });
});
