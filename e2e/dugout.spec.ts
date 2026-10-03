// The dugout, in a browser: step from a bank into the river on Lothal and you are paddling; step
// back onto land and you are walking. On a map without a boat the same step is a wade.
//
// The bank is found in the stored world rather than named: a coordinate is a searched seed by
// another name, and the next change to the generator would move the river out from under it.

import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

type Walker = { x: number; y: number; afloat: boolean; boat: boolean; moving: boolean; wade: { kind: string } };

const BIOME_CODES = [...readFileSync('src/world/bake.ts', 'utf8')
  .split('export const BIOME_CODES')[1]!
  .split('];')[0]!
  .matchAll(/'([a-z_]+)'/g)].map((m) => m[1]!);
const BRIDGE_BIT = 1 << 4; // `bridge` is the fifth of TILE_FLAGS
const WALKABLE_LAND = new Set(['plains', 'coast', 'forest', 'hills', 'settlement', 'desert']);
const STEPS: Record<string, [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowDown: [0, 1],
  ArrowUp: [0, -1]
};

const walker = (page: Page) =>
  page.evaluate(() => (window as unknown as { __walker: () => Walker }).__walker());

async function boot(page: Page, url: string) {
  await page.goto(url);
  await page.waitForFunction(() => Boolean((window as unknown as { __walker?: unknown }).__walker), null, {
    timeout: 60_000
  });
  await page.waitForTimeout(1500);
}

/** A land tile with open river (not a bridge) beside it, and the key that steps into the water. */
async function bankOf(page: Page, seed: string, map: string) {
  await boot(page, `/?seed=${seed}&map=${map}&door=open`);
  const baked = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k) ?? 'null') as { biomes: string[]; flags: string[] },
    `south-of-tethys:world:${seed}:${map}`
  );
  const biome = (x: number, y: number) => {
    const code = baked.biomes[y]?.[x];
    return code === undefined ? null : BIOME_CODES[Number.parseInt(code, 36)]!;
  };
  const bridged = (x: number, y: number) => (Number.parseInt(baked.flags[y]![x]!, 36) & BRIDGE_BIT) !== 0;
  for (let y = 2; y < baked.biomes.length - 2; y += 1) {
    for (let x = 2; x < baked.biomes[0]!.length - 2; x += 1) {
      if (!WALKABLE_LAND.has(biome(x, y) ?? '')) continue;
      for (const [key, [dx, dy]] of Object.entries(STEPS)) {
        if (biome(x + dx, y + dy) === 'river' && !bridged(x + dx, y + dy)) {
          return { at: `${x},${y}`, into: key, back: key === 'ArrowRight' ? 'ArrowLeft' : key === 'ArrowLeft' ? 'ArrowRight' : key === 'ArrowDown' ? 'ArrowUp' : 'ArrowDown' };
        }
      }
    }
  }
  throw new Error(`${map}/${seed}: no bank beside open river`);
}

/**
 * How long to wait for a step to finish: a minute, and the number is measured rather than derived.
 *
 * **Slow, not stuck, and slow in proportion to the step.** The wade test steps into a river on foot,
 * cost 3, 1275ms of tween. Phaser credits a stalled frame with no more than the last sane one, so on
 * a starved software renderer a step takes wall time in proportion to its *frames*, not its
 * milliseconds. Traced in CI's container starved to one CPU beside `reachable.spec.ts`: the
 * traveller creeps across the tile with a stall recorded every four seconds, and arrives after
 * **38.7 seconds**, twice, and 6.9 on the third. Paddling on Lothal (cost 0.5) needs a sixth of the
 * frames, which is why it passed beside the wade when `main` went red.
 *
 * This was 10 seconds and failed `main` on the run and its retry. `walk.ts`'s twelve-second budget
 * scaled by the cost, 36, was tried next and was exactly what the trace exceeded. A minute clears
 * the worst measured by half again. It costs a green run nothing -- unstarved at CI's four CPUs the
 * same wade takes 1.7 to 3.5 seconds, and the wait ends the moment he stops.
 */
const STEP_BUDGET = 60_000;

async function step(page: Page, key: string) {
  await page.keyboard.press(key);
  await page.waitForTimeout(300);
  await page.waitForFunction(() => !(window as unknown as { __walker: () => Walker }).__walker().moving, null, {
    timeout: STEP_BUDGET,
    polling: 50
  });
}

test('on Lothal, stepping into the river puts you in the dugout, and stepping out takes you out', async ({ page }) => {
  const seed = 'dugout-e2e';
  const map = 'field_map_lothal';
  const bank = await bankOf(page, seed, map);
  // Lent, as Thrali would from the third day: `?lent=dugout` stands in for the walk to the camp.
  await boot(page, `/?seed=${seed}&map=${map}&door=open&lent=dugout&at=${bank.at}`);
  expect((await walker(page)).afloat, 'afloat before reaching the water').toBe(false);

  await step(page, bank.into);
  expect((await walker(page)).afloat, 'stepped into the river and did not board').toBe(true);

  await step(page, bank.back);
  const ashore = await walker(page);
  expect(ashore.afloat, 'stepped onto the bank and stayed in the boat').toBe(false);
  expect(`${ashore.x},${ashore.y}`).toBe(bank.at);
});

/**
 * **Before Thrali lends it, Lothal's river is waded** -- the owner's ruling of 3 October 2026, so the
 * first days on the delta show the water taking you to the knee instead of a boat from the first step.
 */
test('on Lothal before the boat is lent, stepping into the river is a wade', async ({ page }) => {
  const seed = 'dugout-e2e';
  const map = 'field_map_lothal';
  const bank = await bankOf(page, seed, map);
  await boot(page, `/?seed=${seed}&map=${map}&door=open&at=${bank.at}`);
  expect((await walker(page)).boat, 'a boat in the kit before anybody lent one').toBe(false);
  await step(page, bank.into);
  const w = await walker(page);
  expect(w.afloat, 'boarded a boat nobody has lent yet').toBe(false);
  expect(w.wade.kind).toBe('cut');
});

test('on a map without a boat, the same step is a wade', async ({ page }) => {
  const seed = 'dugout-e2e';
  const map = 'field_map_narmada';
  const bank = await bankOf(page, seed, map);
  await boot(page, `/?seed=${seed}&map=${map}&door=open&at=${bank.at}`);
  await step(page, bank.into);
  const w = await walker(page);
  expect(w.afloat, 'boarded a boat this map does not have').toBe(false);
  expect(w.wade.kind).toBe('cut');
});

/**
 * The shallows: from the beach into the sea is a launch, out as far as two tiles from land, and no
 * further (the owner's ruling, 3 October 2026). The sea was never walkable before, so this is the
 * check that the step, the routes and the landing all learned it -- and that the deep water past
 * the reach is still refused.
 *
 * The reach is counted here from the baked world, the way `shallowsOf` counts it, rather than read
 * from the game: a spec cannot import `src/`, and a beach found by coordinate would move with the
 * generator.
 */
test('on Lothal, the dugout goes out from the beach into the shallows and no further', async ({ page }) => {
  const seed = 'dugout-e2e';
  const map = 'field_map_lothal';
  await boot(page, `/?seed=${seed}&map=${map}&door=open`);
  const baked = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k) ?? 'null') as { biomes: string[]; flags: string[] },
    `south-of-tethys:world:${seed}:${map}`
  );
  const biome = (x: number, y: number) => {
    const code = baked.biomes[y]?.[x];
    return code === undefined ? null : BIOME_CODES[Number.parseInt(code, 36)]!;
  };
  const land = (x: number, y: number) => {
    const b = biome(x, y);
    return b !== null && b !== 'sea' && b !== 'sky_underside' && b !== 'open_sky';
  };
  const shallow = (x: number, y: number) => {
    if (biome(x, y) !== 'sea') return false;
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) if (land(x + dx, y + dy)) return true;
    return false;
  };
  // A beach with shallows straight out from it, and deep water past them in the same line.
  let found: { at: string; out: string; back: string; reach: number } | null = null;
  for (let y = 0; y < baked.biomes.length && !found; y += 1) {
    for (let x = 0; x < baked.biomes[0]!.length && !found; x += 1) {
      if (biome(x, y) !== 'coast') continue;
      for (const [key, [dx, dy]] of Object.entries(STEPS)) {
        let n = 1;
        while (shallow(x + dx * n, y + dy * n)) n += 1;
        // Straight out from the beach, the shallows end within `SHALLOW_REACH` (2). A line run along
        // the coast stays shallow for as long as the coast does -- thirty tiles on the top row of
        // this seed, sixty steps there and back, which ran out the test's three minutes on CI.
        if (n >= 2 && n <= 3 && biome(x + dx * n, y + dy * n) === 'sea') {
          const back = key === 'ArrowRight' ? 'ArrowLeft' : key === 'ArrowLeft' ? 'ArrowRight' : key === 'ArrowDown' ? 'ArrowUp' : 'ArrowDown';
          found = { at: `${x},${y}`, out: key, back, reach: n - 1 };
          break;
        }
      }
    }
  }
  expect(found, 'no beach with shallows and deep water beyond on this seed').not.toBeNull();
  const beach = found!;
  await boot(page, `/?seed=${seed}&map=${map}&door=open&lent=dugout&at=${beach.at}`);

  await step(page, beach.out);
  expect((await walker(page)).afloat, 'stepped off the beach and did not launch').toBe(true);
  for (let i = 1; i < beach.reach; i += 1) await step(page, beach.out);
  const edge = await walker(page);
  expect(edge.afloat).toBe(true);

  // One more is deep water: refused, and he stays where he is.
  await page.keyboard.press(beach.out);
  await page.waitForTimeout(1200);
  const refused = await walker(page);
  expect(`${refused.x},${refused.y}`, 'paddled out past the shallows').toBe(`${edge.x},${edge.y}`);

  for (let i = 0; i < beach.reach; i += 1) await step(page, beach.back);
  const ashore = await walker(page);
  expect(`${ashore.x},${ashore.y}`).toBe(beach.at);
  expect(ashore.afloat, 'stayed in the boat on the sand').toBe(false);
});
