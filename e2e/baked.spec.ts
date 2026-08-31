// The world is resolved once and kept.
//
// This is the acceptance test for `world/bake.ts`, and it checks the thing the unit tests
// cannot: that the *stored* world is what the running game reads on a second load, through real
// localStorage in a real browser.
//
// The property that matters is not "the same seed gives the same world" -- that was always true
// and is what caused the trouble. It is that a world, once walked, **stops depending on the
// generator at all**. So the test rewrites the stored bake between loads and expects the game to
// show the rewritten ground: proof that it is reading the store rather than regenerating.

import { expect, test } from '@playwright/test';

const SEED = 'bake-e2e';
const MAP = 'field_map_lothal';
const KEY = `south-of-tethys:world:${SEED}:${MAP}`;

async function boot(page: import('@playwright/test').Page, query = '') {
  await page.goto(`/?seed=${SEED}${query}`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
}

test('a world is stored on the first visit and read back on the next', async ({ page }) => {
  await boot(page);

  const stored = await page.evaluate((k) => localStorage.getItem(k), KEY);
  expect(stored, 'nothing was baked on the first load').toBeTruthy();

  const baked = JSON.parse(stored!) as { biomes: string[]; bands: string[]; bakeVersion: number };
  expect(baked.bakeVersion).toBe(1);
  expect(baked.biomes.length).toBeGreaterThan(0);
  // One character per tile is the whole size argument for doing this at all.
  expect(baked.biomes[0]!.length).toBe(baked.biomes.length);
  expect(stored!.length).toBeLessThan(64 * 1024);

  // A second load must not rewrite it: it is the same world, not a freshly generated one that
  // happens to match.
  await boot(page);
  const second = await page.evaluate((k) => localStorage.getItem(k), KEY);
  expect(second).toBe(stored);
});

test('the stored world wins over what the generator would make now', async ({ page }) => {
  await boot(page);

  // Stand in for "the generator changed": rewrite the stored ground directly. If the game reads
  // the store, the journal will describe the ground written here. If it regenerates, it will
  // describe the ground the generator makes, and this fails -- which is exactly the failure the
  // bake exists to prevent.
  const changed = await page.evaluate((k) => {
    const baked = JSON.parse(localStorage.getItem(k)!) as {
      biomes: string[];
      width: number;
      height: number;
      start: { x: number; y: number };
    };
    // '6' is `mountains` in BIOME_CODES. Paint the start tile and its surroundings with it.
    const { x, y } = baked.start;
    for (let dy = -1; dy <= 1; dy += 1) {
      const row = baked.biomes[y + dy];
      if (row === undefined) continue;
      baked.biomes[y + dy] = row.slice(0, Math.max(0, x - 1)) + '666'.slice(0, Math.min(3, row.length - Math.max(0, x - 1))) + row.slice(Math.max(0, x - 1) + 3);
    }
    localStorage.setItem(k, JSON.stringify(baked));
    return baked.biomes[y]!.charAt(x);
  }, KEY);
  expect(changed).toBe('6');

  await boot(page);
  // The field notes describe the ground underfoot. `mountains` is not in Lothal's palette at
  // all, so its description appearing at the start tile can only have come from the store.
  // Matched on the description rather than the biome's name, because the notes are written for
  // a reader and never print the id.
  await expect(page.locator('.journal')).toContainText(/peaks hold the horizon/i, {
    timeout: 20_000
  });
});

test('an unreadable bake is discarded and the world is generated again', async ({ page }) => {
  await boot(page);
  await page.evaluate((k) => localStorage.setItem(k, '{ not json'), KEY);

  // Must not throw: the fallback is exactly what the game did before baking existed.
  await boot(page);
  await expect(page.locator('.map-surface canvas')).toBeVisible();
  const rewritten = await page.evaluate((k) => localStorage.getItem(k), KEY);
  expect(rewritten).not.toBe('{ not json');
  expect(JSON.parse(rewritten!).bakeVersion).toBe(1);
});
