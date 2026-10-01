// The map's road to settling is on the first page of the diary, and its next step is in the notes.
//
// The first play-through never found settling at all: nothing named it until the traveller stood on
// the ground. `test/settlingRoad.test.ts` holds the steps; this holds that a player can see them.

import { expect, test } from '@playwright/test';

test('the diary leads with the road to settling, and the notes say what to do next', async ({ page }) => {
  await page.goto('/?seed=settling-road&map=field_map_lothal');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });

  // At reading height the notes carry the map's goal.
  await page.locator('.dock-handle').click();
  await expect(page.locator('.status-goal')).toContainText('Help someone here');

  await page.locator('.controls .control', { hasText: 'Records' }).click();
  const road = page.getByRole('region', { name: 'Settling' });
  await expect(road).toBeVisible();
  await expect(road).toContainText('Be known here');
  await expect(road).toContainText('Ask for ground');
});
