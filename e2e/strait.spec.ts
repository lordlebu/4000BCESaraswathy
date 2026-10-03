// The strait's traffic, in a browser: on the Aravali the outrigger, two fishing boats, two kites on
// their ropes and the whale are all on the map; at Dwarka the two kites; on Lothal nothing. And none
// of their frames is missing -- a texture that never loaded draws Phaser's green box and warns.
//
// Where everything goes is `test/strait.test.ts`. What only a browser shows is that the frames load
// and the view puts them up. Hour 13 on this seed is inside the outrigger's first crossing.

import { expect, test, type Page } from '@playwright/test';

type Strait = { ship: boolean; boats: number; kites: number; ropes: number; whale: boolean };

async function boot(page: Page, url: string): Promise<string[]> {
  const warnings: string[] = [];
  page.on('console', (m) => {
    if (/has no frame|Texture .*not found|Failed to process file/i.test(m.text())) warnings.push(m.text());
  });
  await page.goto(url);
  await page.waitForFunction(() => Boolean((window as unknown as { __strait?: unknown }).__strait), null, { timeout: 60_000 });
  await page.waitForTimeout(1500);
  return warnings;
}

const strait = (page: Page) => page.evaluate(() => (window as unknown as { __strait: () => Strait }).__strait());

test('the Aravali strait has its ship, its boats, its kites on ropes and its whale', async ({ page }) => {
  const warnings = await boot(page, '?seed=varuna-0&map=field_map_aravali&hour=13&door=open&at=37,26');
  await expect.poll(async () => (await strait(page)).ship, { timeout: 10_000 }).toBe(true);
  expect(await strait(page)).toMatchObject({ boats: 2, kites: 2, ropes: 2, whale: true });
  expect(warnings, 'a strait frame did not load').toEqual([]);
});

test("Dwarka's caravan camp flies two kites, and nothing sails there", async ({ page }) => {
  const warnings = await boot(page, '?seed=varuna-0&map=field_map_dwarka&hour=13&door=open&at=poi_caravan_camp');
  expect(await strait(page)).toMatchObject({ ship: false, boats: 0, kites: 2, ropes: 2, whale: false });
  expect(warnings).toEqual([]);
});

test('Lothal has none of it', async ({ page }) => {
  await boot(page, '?seed=varuna-0&map=field_map_lothal&hour=13&door=open');
  expect(await strait(page)).toEqual({ ship: false, boats: 0, kites: 0, ropes: 0, whale: false });
});
