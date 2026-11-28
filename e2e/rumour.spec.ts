import { seedJourney } from './journey-fixture';
// Arriving where a stranger's rumour sent you.
//
// `test/rumours.test.ts` proves the rumour, the small talk and the card under Node. What only a page
// can prove is the wiring: that a `told:` flag in the saved journey reaches the arrival, and that
// the arrival asks for the kept promise before anything else. The flag is seeded into the save
// rather than earned on the road, which `e2e/road-talk.spec.ts` already walks.
//
// The dockyard fixture again: two steps north of the Drowned Dockyard on `dock-8`.

import { expect, test } from '@playwright/test';
import { step } from './walk';

const TOLD =
  'told:rumour:place:poi_drowned_dockyard@poi_drowned_dockyard@field_map_lothal:company_carrier';

test('a place a stranger sent you to keeps the promise on arriving', async ({ page }) => {
  await seedJourney(page, 'dock-8', { flags: [TOLD] });

  await page.goto('/?seed=dock-8&hour=12&at=9,40');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  await step(page, 'ArrowDown');
  await step(page, 'ArrowDown');

  const card = page.locator('.activity-card');
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(card.locator('h2')).toHaveText('As you were told');
  await expect(card.locator('.activity-prose')).toContainText('the Drowned Dockyard');
  // Its own painting, not a borrowed scene or the blank band.
  await expect(card.locator('img.activity-scene')).toHaveAttribute('src', /woven-rumour-kept/);
});
