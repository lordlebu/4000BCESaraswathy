// A pin you can see and change (`docs/satchel-and-hearth.md`, phase 2).
//
// **The owner pinned a recipe and could not find how to unpin it.** Unpinning lived on the recipe's
// row in the workshop, under a button that read "Pinned" -- and once the recipe could be made it
// moved to a list with no button at all. Now the pinned line is itself a control: tapping it opens
// the workshop at that recipe with Unpin focused. This walks that path the way a player would, on
// a phone, since a phone is where a one-line control is easiest to miss.

import { expect, test } from '@playwright/test';

test('tapping the pinned line opens the workshop with Unpin under your finger', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('south-of-tethys:pin-1', JSON.stringify({ knowledgeVersion: 1, pinned: 'recipe_reed_rope' }));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?seed=pin-1&hour=12');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });

  const line = page.getByRole('button', { name: /Working towards/ });
  await expect(line).toContainText(/rope/i);
  // A control owes the tap floor.
  expect((await line.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await line.click();

  const unpin = page.locator('.workshop [data-recipe="recipe_reed_rope"] .recipe-pin');
  await expect(unpin, 'the workshop did not open at the pinned recipe').toBeFocused();
  await expect(unpin).toHaveText('Unpin');
  await unpin.press('Enter');
  await expect(unpin).toHaveText('Pin');

  await page.keyboard.press('Escape');
  await expect(page.locator('.pinned-recipe'), 'the line stayed after unpinning').toHaveCount(0);
});
