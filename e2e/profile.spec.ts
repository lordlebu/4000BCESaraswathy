// A person's portrait, opened from a conversation, in a browser.
//
// `test/profile.test.tsx` renders the card. This is the half only a page can say: that the portrait
// in a real conversation is a control, that it opens Thrali's own painting rather than a drawing,
// and that the painting is drawn no larger than it was painted -- the owner's "the drawing shouldn't
// be all over the screen, as it might fade".
//
// The dockyard fixture `talking.spec.ts` uses.

import { expect, test } from '@playwright/test';
import { step } from './walk';

test('a person’s portrait opens at the size it was painted', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?seed=dock-8&hour=0&at=9,40');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  await step(page, 'ArrowDown');
  await step(page, 'ArrowDown');
  await page.locator('.who', { hasText: 'Thrali' }).click();
  await expect(page.locator('.person')).toHaveCount(1, { timeout: 10_000 });

  await page.getByRole('button', { name: 'Thrali — see their portrait' }).click();
  const card = page.locator('.profile-card');
  await expect(card).toBeVisible();
  const painting = card.locator('img.person-portrait');
  await expect(painting).toHaveAttribute('src', /thrali/);

  // Never enlarged past its 256 painted pixels, even with a whole desktop to fill.
  const box = await painting.boundingBox();
  expect(box, 'the painting has no box').not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(256);
  expect(box!.width).toBeGreaterThan(200);

  await card.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(card).toBeHidden();
  // Back in the conversation, not thrown out of it.
  await expect(page.locator('.person')).toHaveCount(1);
});
