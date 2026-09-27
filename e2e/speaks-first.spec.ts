// Somebody speaking first, in a browser.
//
// The rules are `test/bumping.test.ts`. This proves the wiring: walking into a place where somebody
// has a reason, they open their conversation without being chosen from the list.
//
// Thrali at the Drowned Dockyard, at midnight on the first day of `dock-8` -- the fixture
// `talking.spec.ts` uses. He has never been met, so his reason is a first meeting, and the seeded
// roll for that meeting on that day is 0.34 against a chance of 0.6, measured when this was written.
// If a change to the roll or the chance moves that, this spec says so rather than going quiet.
//
// Speaking first is off under automation unless asked for, like the front door, so the other specs
// that walk in here and choose Thrali are not raced by him calling out.

import { expect, test } from '@playwright/test';
import { step } from './walk';

async function walkIn(page: import('@playwright/test').Page, query: string) {
  await page.goto(`/?seed=dock-8&hour=0&at=9,40${query}`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  await step(page, 'ArrowDown');
  await step(page, 'ArrowDown');
}

test('somebody never met calls out as you walk in', async ({ page }) => {
  await walkIn(page, '&chatter=on');
  // Nobody is chosen: the conversation opens on its own, a moment after arriving.
  const person = page.locator('.person');
  await expect(person).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator('.conversation')).toContainText('Thrali');
});

test('under automation nobody speaks first unless asked for', async ({ page }) => {
  await walkIn(page, '');
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
  // Longer than the pause before somebody would call out.
  await page.waitForTimeout(3_000);
  await expect(page.locator('.person')).toHaveCount(0);
  await expect(page.locator('.place')).toBeVisible();
});
