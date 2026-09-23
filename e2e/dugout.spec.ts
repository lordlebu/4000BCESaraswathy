// The dugout, in a browser: step from a bank into the river on Lothal and you are paddling; step
// back onto land and you are walking. On a map without a boat the same step is a wade.
//
// The bank is found in the stored world rather than named: a coordinate is a searched seed by
// another name, and the next change to the generator would move the river out from under it.

import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

type Walker = { x: number; y: number; afloat: boolean; moving: boolean; wade: { kind: string } };

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

async function step(page: Page, key: string) {
  await page.keyboard.press(key);
  await page.waitForTimeout(300);
  await page.waitForFunction(() => !(window as unknown as { __walker: () => Walker }).__walker().moving, null, {
    timeout: 10_000
  });
}

test('on Lothal, stepping into the river puts you in the dugout, and stepping out takes you out', async ({ page }) => {
  const seed = 'dugout-e2e';
  const map = 'field_map_lothal';
  const bank = await bankOf(page, seed, map);
  await boot(page, `/?seed=${seed}&map=${map}&door=open&at=${bank.at}`);
  expect((await walker(page)).afloat, 'afloat before reaching the water').toBe(false);

  await step(page, bank.into);
  expect((await walker(page)).afloat, 'stepped into the river and did not board').toBe(true);

  await step(page, bank.back);
  const ashore = await walker(page);
  expect(ashore.afloat, 'stepped onto the bank and stayed in the boat').toBe(false);
  expect(`${ashore.x},${ashore.y}`).toBe(bank.at);
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
