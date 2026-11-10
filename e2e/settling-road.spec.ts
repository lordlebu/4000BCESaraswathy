// The diary keeps the road to settling; the dock's guidance rail carries one next step.
//
// The first play-through never found settling at all: nothing named it until the traveller stood on
// the ground. `test/settlingRoad.test.ts` holds the steps; this holds that a player can see them.

import { expect, test } from '@playwright/test';
import { openRecords } from './records';

test('the diary keeps settling guidance without repeating the next step in the notes', async ({ page }) => {
  await page.goto('?seed=settling-road&map=field_map_lothal');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });

  // Opening the notes must not duplicate the guidance rail's next step in the prose.
  await page.locator('.dock-handle').click();
  await expect(page.locator('.journal .status-goal')).toHaveCount(0);
  await expect(page.locator('.guide-line')).toContainText('Help someone here');

  await openRecords(page);
  const road = page.getByRole('region', { name: 'Settling' });
  await expect(road).toBeVisible();
  await expect(road).toContainText('Be known here');
  await expect(road).toContainText('Ask for ground');
});
