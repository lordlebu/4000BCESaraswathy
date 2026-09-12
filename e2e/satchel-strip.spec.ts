// Putting the satchel away, from where it is, and having it stay away.
//
// **Reported from play, twice over.** The strip never hides, which is the convention an idle game's
// resource readout follows and is right -- every other decision is read against what you have. The
// complaint was not that it exists but that stopping looking at it had become a menu item: the off
// switch moved into the map sheet under *What is on screen*, which was right for the control bar
// and put the thing a player asked for two taps deep, with nothing on the strip itself saying it
// could be dismissed.
//
// And then the follow-up, which was not in the report and was found by answering it: the choice did
// not survive a reload. `satchelRibbon` lives in the surface reducer and `Journey` has no field for
// it, so the strip came back every boot. An option that forgets itself on every visit is not an
// option, and that is the half this spec is really for -- `test/satchelStrip.test.tsx` covers the
// control, and only a browser has a page that can be loaded twice.

import { expect, test, type Page } from '@playwright/test';

const START = '/?seed=dock-8&hour=12&at=9,40';

async function boot(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(START);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(600);
}

test('the strip can be put away from the strip', async ({ page }) => {
  await boot(page);
  await expect(page.locator('.satchel-strip')).toBeVisible();

  await page.getByRole('button', { name: /put the satchel away/i }).click();
  await expect(page.locator('.satchel-strip')).toHaveCount(0);
});

test('and the map sheet brings it back', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: /put the satchel away/i }).click();
  await expect(page.locator('.satchel-strip')).toHaveCount(0);

  // The way back is the switch the dismiss's own label names. If these two ever stop agreeing, the
  // strip becomes a one-way door.
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await page.locator('.showing', { hasText: 'What you are carrying' }).click();
  await expect(page.locator('.satchel-strip')).toBeVisible();
});

test('and it stays away across a reload', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: /put the satchel away/i }).click();
  await expect(page.locator('.satchel-strip')).toHaveCount(0);

  await page.reload();
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(600);

  // **The assertion the whole preference layer exists for.** Before it, this is where the strip
  // came back -- every visit, for months, with the switch working perfectly each time.
  await expect(
    page.locator('.satchel-strip'),
    'the strip came back after a reload, so the choice was not kept'
  ).toHaveCount(0);
});

test('a fresh visitor still gets the strip', async ({ page }) => {
  // The default has to survive the preference. A readout nobody has found is a readout that does
  // not exist, which is why it is on to begin with -- and a storage layer that answered "hidden" to
  // somebody who never chose would be worse than not having one.
  await boot(page);
  await expect(page.locator('.satchel-strip')).toBeVisible();
});
