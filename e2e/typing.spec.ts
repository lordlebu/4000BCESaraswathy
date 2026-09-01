// Typing is not walking.
//
// Reported from play: searching the album for a plant whose name contains "a", "w", "s" or "d"
// walked the traveller across the map instead of typing. The scene binds WASD on the document, so
// every keystroke reached both the input and the world -- and `addCapture` called `preventDefault`
// on those letters, so they never arrived in the box either. Both halves of that are checked here.
//
// There are three text fields in the game -- the album's search, the field kit and the seed bar --
// so this is a rule about focus rather than about one panel.

import { expect, test, type Page } from '@playwright/test';

async function boot(page: Page) {
  await page.setViewportSize({ width: 1000, height: 820 });
  await page.goto('/?seed=poi-1621&hour=12&at=10,8');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1200);
}

/** Where the traveller is, read from the notes rather than from the scene. */
async function where(page: Page): Promise<string> {
  return (await page.locator('.journal h2').textContent()) ?? '';
}

test('typing a word with WASD in it does not walk the traveller', async ({ page }) => {
  // Tested through the seed field rather than the album's search, which only appears past twenty
  // species met. A test that skips itself on a fresh world proves nothing, and this rule is about
  // focus rather than about which of the three fields has it.
  await boot(page);
  await page.getByRole('button', { name: /Map/ }).click();
  await page.waitForTimeout(400);

  const box = page.locator('#seed');
  await expect(box).toBeVisible();

  const before = await where(page);
  await box.click();
  await box.fill('');
  // Every letter of WASD, typed as a real player would.
  await page.keyboard.type('saltweed');
  await page.waitForTimeout(400);

  // The word arrives whole -- `preventDefault` on the letters used to eat four of these eight.
  await expect(box).toHaveValue('saltweed');
  // And the traveller has not moved.
  expect(await where(page), 'typing walked the traveller').toBe(before);
});

test('the keys still walk once the field is left', async ({ page }) => {
  // The other half: refusing keys while typing must not leave them refused afterwards.
  await boot(page);
  const before = await where(page);
  await page.keyboard.press('KeyD');
  await page.waitForTimeout(700);
  expect(await where(page), 'walking stopped working').not.toBe(before);
});
