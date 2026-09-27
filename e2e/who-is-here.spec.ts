// Who is at a place, seen from the road and on walking in.
//
// Reported from play: "if I walk into a town or POI, I am not aware who is there." The rule is
// `test/presence.test.ts`; this is the half no Node test can see -- that the scene draws a pip for
// each person at a place's door, that React told it who, and that walking in puts them first.
//
// The same fixture as `talking.spec.ts`: two steps north of the Drowned Dockyard at midnight on the
// first day, where Thrali is resting.

import { expect, test, type Page } from '@playwright/test';
import { step } from './walk';

type Pip = { poiId: string; count: number; visible: boolean };

const AT_NIGHT = '/?seed=dock-8&hour=0&at=9,40';

const pips = (page: Page) =>
  page.evaluate(() => (window as unknown as { __pips?: () => Pip[] }).__pips?.() ?? null) as Promise<
    Pip[] | null
  >;

const dockyard = async (page: Page) => (await pips(page))?.find((p) => p.poiId === 'poi_drowned_dockyard');

test('a place shows from the road who is in it, and says so first on walking in', async ({ page }) => {
  await page.goto(AT_NIGHT);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });

  // Seen from two steps off: one pip at the dockyard's door, showing.
  await expect.poll(async () => (await dockyard(page))?.visible ?? false, { timeout: 20_000 }).toBe(true);
  expect((await dockyard(page))?.count, 'the dockyard should hold exactly Thrali').toBe(1);

  await step(page, 'ArrowDown');
  await step(page, 'ArrowDown');
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });

  // People first: the first section of the place is who is here, and Thrali is in it.
  const first = page.locator('.place .place-section').first();
  await expect(first.locator('h3')).toHaveText('Who is here');
  await expect(first.locator('.who', { hasText: 'Thrali' })).toBeVisible();

  // Standing on the place, its own pips give way: the panel is saying it now.
  await expect.poll(async () => (await dockyard(page))?.visible, { timeout: 10_000 }).toBe(false);
});
