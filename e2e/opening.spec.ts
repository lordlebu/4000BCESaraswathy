// The first minute: the door, the opening, and standing among the people at the kilns.
//
// Before Roads and Hands phase 3 a new walk went from the door straight onto a tile the generator
// picked, with nothing said. `test/opening.test.tsx` holds the cards; this holds that a player
// setting out actually sees them, ends at the Camp in the Kilns, and is told how to walk.

import { expect, test } from '@playwright/test';

test('setting out plays the opening, then stands you at the kilns with a first hint', async ({ page }) => {
  await page.goto(`/?seed=opening-${Date.now()}&door=shut`);
  await page.getByRole('button', { name: /set out/i }).click();

  const opening = page.getByRole('dialog', { name: 'Opening' });
  await expect(opening).toBeVisible({ timeout: 20_000 });
  await expect(opening).toContainText('Do not ask where the road ends.');
  for (let i = 0; i < 4; i++) await opening.getByRole('button', { name: 'Continue' }).click();
  await expect(opening).toContainText('kilns');
  await opening.getByRole('button', { name: 'Begin' }).click();
  await expect(opening).toHaveCount(0);

  await expect(page).toHaveURL(/at=poi_lothal_camp/);
  await expect(page.locator('.place h2')).toHaveText(/Kilns/, { timeout: 20_000 });
  await expect(page.locator('.coach-line')).toContainText('Walk with');
});

test('the opening can be skipped, and does not play again on going on', async ({ page }) => {
  const seed = `opening-skip-${Date.now()}`;
  await page.goto(`/?seed=${seed}&door=shut`);
  await page.getByRole('button', { name: /set out/i }).click();
  const opening = page.getByRole('dialog', { name: 'Opening' });
  await expect(opening).toBeVisible({ timeout: 20_000 });
  await opening.getByRole('button', { name: 'Skip' }).click();
  await expect(opening).toHaveCount(0);

  // Walk a step so the journey has begun, let the save flush, and come back through the door.
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(3500);
  await page.goto(`/?seed=${seed}&door=shut`);
  await page.getByRole('button', { name: /go on walking/i }).click();
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('dialog', { name: 'Opening' })).toHaveCount(0);
});
