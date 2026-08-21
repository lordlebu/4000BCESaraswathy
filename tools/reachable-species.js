// Which species a player can actually meet, and therefore which ones are worth illustrating.
//
// Canon holds 219 encounter fauna and 78 flora that can appear in play. One painted plate is a
// good session's work to get right, so 297 is a year and nobody is going to do it. The panel
// already draws a derived silhouette for every species (`src/ui/SpeciesIcon.tsx`), so nothing is
// blocked -- but when real plates are painted, they should be painted in the order a player will
// see them, and that order is not obvious from the bundle.
//
// **The obvious approach does not work, and that is the first thing this reports.** The plan
// assumed the three authored maps would use only some of the eleven biomes, so intersecting their
// palettes with each species' `biomes` would cut the list down. It does not: between them Dwarka,
// Lothal and the Narmada Plateau cover ten of the eleven -- everything except `landmark` -- so
// **all 297 placeable species are reachable** and a reachability filter removes nobody.
//
// So the question has to change from *can* a player meet this species to **how often will they**.
// That is answerable from the same data. A species competing with fifty-four others for the
// mountains is seen far less than one of five that live on a landmark tile, and a species that
// lives on five kinds of ground turns up far more than one restricted to a single kind.
//
// This still reads canon rather than reimplementing how a tile picks its species. That distinction
// matters: `utils/check_playability.py` in the canon repo duplicates two functions from `journey.ts`
// and CLAUDE.md records the cost of keeping them in step. Nothing here needs the selection rule --
// the ranking is a property of the palettes and the competition, and it is an **estimate**, which
// is all a work queue needs.
//
//   node tools/reachable-species.js            # the summary
//   node tools/reachable-species.js --top=40   # a longer queue
//   node tools/reachable-species.js --json     # for piping somewhere
//
// CommonJS, like everything in tools/ -- see tools/package.json.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const species = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/canon/species.json'), 'utf8'));
const places = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/canon/places.json'), 'utf8'));

/**
 * Ground the engine cannot draw, and so cannot place anything on.
 *
 * `lava_field` is named by canon and 36 species live there, but there is no tile for it --
 * `src/content/canon.ts` filters it out. A species that lives *only* there is unreachable however
 * the palettes fall, so it must not inflate the count.
 */
const UNDRAWABLE = new Set(['lava_field']);

/** Only these can be placed at all. Sky species and Asura conjurations are inert by design. */
const PLACEABLE = { fauna: 'encounter', flora: 'flavour' };

/**
 * How much of a biome's pool each species occupies. Mirrors RARITY_WEIGHT in `src/content/species.ts`.
 *
 * This is a duplicated constant and it is the one thing here that can drift, so it is worth saying
 * why it is copied rather than derived: this file reads the shipped JSON bundle and cannot import
 * TypeScript. **If the weights change there, change them here.**
 *
 * Leaving it out was the first attempt and it was wrong by a factor of twelve. A mythic species
 * occupies one slot where a common one occupies twelve, so an unweighted ranking put nine mythic
 * Asura conjurations in the top twenty-five fauna -- exactly the horrors a player meets least.
 */
const RARITY_WEIGHT = { common: 12, rare: 4, mythic: 1 };
const weightOf = (s) => RARITY_WEIGHT[s.rarity] ?? RARITY_WEIGHT.common;

function reachable() {
  const maps = places.field_maps.map((m) => ({
    id: m.id,
    name: m.name,
    palette: new Set((m.seed_biomes || []).filter((b) => !UNDRAWABLE.has(b)))
  }));

  // Every biome any authored map can produce.
  const authored = new Set();
  for (const m of maps) for (const b of m.palette) authored.add(b);

  // How many placeable species of each half compete for each biome. This is the denominator that
  // makes the ranking mean anything: mountains carries 55 fauna and landmark carries 4.
  // Counted in *pool slots*, not species: the engine expands each entry by its rarity weight, so a
  // biome of twelve common species is a pool of 144 and one mythic among them holds a single slot.
  const competitors = { fauna: {}, flora: {} };
  const heads = { fauna: {}, flora: {} };
  for (const half of ['fauna', 'flora']) {
    for (const s of species[half] || []) {
      if (s.placement !== PLACEABLE[half]) continue;
      for (const b of s.biomes || []) {
        if (UNDRAWABLE.has(b)) continue;
        competitors[half][b] = (competitors[half][b] || 0) + weightOf(s);
        heads[half][b] = (heads[half][b] || 0) + 1;
      }
    }
  }

  const rows = [];
  for (const half of ['fauna', 'flora']) {
    for (const s of species[half] || []) {
      if (s.placement !== PLACEABLE[half]) continue;
      const homes = (s.biomes || []).filter((b) => !UNDRAWABLE.has(b));
      if (homes.length === 0) continue;

      const on = maps.filter((m) => homes.some((b) => m.palette.has(b))).map((m) => m.id);

      // How often a player is likely to meet this one.
      //
      //   for each map that can grow it,
      //     for each of its biomes that map's palette contains,
      //       (that biome's share of the map) x (this species' share of that biome)
      //
      // The biome share is approximated as an equal split of the palette, because the true mix
      // depends on the generator and the seed. That is a real limitation and it is deliberately
      // not hidden: the ranking it produces is stable and the absolute numbers are not meaningful.
      let score = 0;
      for (const m of maps) {
        const mine = homes.filter((b) => m.palette.has(b));
        if (mine.length === 0) continue;
        for (const b of mine) {
          score += (1 / m.palette.size) * (weightOf(s) / (competitors[half][b] || 1));
        }
      }

      rows.push({
        id: s.id,
        name: s.name,
        half,
        rarity: s.rarity || null,
        biomes: homes,
        maps: on,
        // Per map, so a number is comparable between a species on one map and a species on three.
        score: score / maps.length
      });
    }
  }

  rows.sort((a, b) => b.score - a.score);
  return { maps, authored, competitors, heads, rows };
}

function main() {
  const { maps, authored, competitors, heads, rows } = reachable();

  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(rows, null, 2));
    return;
  }

  console.log('Authored maps and their palettes:');
  for (const m of maps) console.log(`  ${m.name.padEnd(22)} ${[...m.palette].join(', ')}`);

  const ALL = ['sea', 'coast', 'plains', 'forest', 'wetland', 'hills', 'mountains', 'desert', 'river', 'settlement', 'landmark'];
  const unused = ALL.filter((b) => !authored.has(b));
  console.log(`\nBetween them the authored maps produce ${authored.size} of ${ALL.length} biomes.`);
  console.log(`Never produced: ${unused.length ? unused.join(', ') : 'none'}`);
  console.log(`\n  => every placeable species is reachable. Reachability filters nobody, so the`);
  console.log(`     queue below is ranked by how OFTEN a player meets one, not whether they can.`);

  console.log('\nCompetition per biome (placeable species sharing that ground):');
  for (const b of ALL.filter((x) => authored.has(x))) {
    console.log(`  ${b.padEnd(11)} fauna ${String(competitors.fauna[b] || 0).padStart(3)}   flora ${String(competitors.flora[b] || 0).padStart(3)}`);
  }

  const show = (half, n) => {
    const set = rows.filter((r) => r.half === half).slice(0, n);
    console.log(`\n--- ${half}: the ${n} most often met ---`);
    for (const r of set) {
      const maps = r.maps.length === 3 ? 'all maps' : `${r.maps.length} map${r.maps.length === 1 ? '' : 's'}`;
      console.log(
        `  ${r.name.padEnd(30)} ${String((r.score * 1000).toFixed(2)).padStart(6)}  ${maps.padEnd(9)} ${(r.rarity || '').padEnd(8)} ${r.biomes.join(',')}`
      );
    }
  };

  const n = Number((process.argv.find((a) => a.startsWith('--top=')) || '--top=25').split('=')[1]);
  show('fauna', n);
  show('flora', Math.round(n * 0.4));

  const fauna = rows.filter((r) => r.half === 'fauna');
  const flora = rows.filter((r) => r.half === 'flora');
  const head = (set, k) => set.slice(0, k).reduce((t, r) => t + r.score, 0) / set.reduce((t, r) => t + r.score, 0);
  console.log(`\nWhat a plate budget buys, as a share of all encounters:`);
  for (const k of [20, 40, 60, 100]) {
    console.log(
      `  top ${String(k).padStart(3)} of each half  ->  fauna ${(head(fauna, k) * 100).toFixed(0)}%   flora ${(head(flora, Math.round(k * 0.4)) * 100).toFixed(0)}%`
    );
  }
  console.log('\nEverything unpainted keeps its derived silhouette, which is the point of having one.');
}

main();
