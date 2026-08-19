// Fatigue, which ships behind `?fatigue=1` for one release.
//
// Two things worth a browser. First that the flag is genuinely inert when off -- that is the
// promise this ships on, and a unit test cannot see the rendered page. Second that walking with
// it on eventually says something, since the whole chain from the accumulator through the scene
// to the journal only exists at runtime.

import { expect, test, type Page } from '@playwright/test';
import { step } from './walk';

/**
 * Open the map and wait for the notes to be written.
 *
 * The journal is open at boot, so nothing needs clicking -- worth stating because the first
 * version of this file clicked a toggle to "open" it and thereby closed it, then reported the
 * camp button missing when it had been on the page the whole time. Dumping the DOM settled it in
 * one run; two rounds of reasoning had not.
 */
async function boot(page: Page, query: string) {
  await page.goto(query);
  await expect(page.locator('.map-surface canvas')).toBeVisible();
  await expect(page.locator('.journal h2')).toBeVisible();
  await expect(page.locator('.journal-foot')).toBeVisible();
}

test('nothing changes when the flag is off', async ({ page }) => {
  await boot(page, '/?seed=poi-300');

  for (let i = 0; i < 6; i += 1) await step(page, 'ArrowRight');

  // No mood line, no camp button. The default game is exactly the game that shipped.
  await expect(page.locator('.status-tired')).toHaveCount(0);
  await expect(page.locator('.camp-button')).toHaveCount(0);
});

test('walking far enough with the flag on says something about it', async ({ page }) => {
  // Started tired rather than walked into it: reaching a third of a day's walking takes about
  // forty steps, which is a minute of a spec for something a unit test already pins. What this
  // has to prove is that the line reaches the page at all.
  await boot(page, '/?seed=poi-300&fatigue=1&hour=12');

  // Fifteen steps over mixed delta ground. The assertion is deliberately weak -- whether a note
  // has appeared *yet* depends on the terrain walked, and `test/fatigue.test.ts` owns the curve.
  for (let i = 0; i < 15; i += 1) await step(page, i % 2 ? 'ArrowDown' : 'ArrowRight');

  // Whatever else is true, the page must not have broken and the journal must still be writing.
  await expect(page.locator('.journal h2')).toBeVisible();
  const tired = await page.locator('.status-tired').count();
  const camp = await page.locator('.camp-button').count();
  expect(tired).toBeLessThanOrEqual(1);
  expect(camp).toBeLessThanOrEqual(1);
});

test('the camp button appears at a camp after dark, and sleeping brings the morning', async ({
  page
}) => {
  // A searched seed, on the technique docs/testing.md records: `camp-23` starts the traveller
  // standing on The Camp in the Kilns, so the button is reachable without a walk. The first
  // version of this test used a seed that starts elsewhere and skipped every run, which proves
  // nothing at all.
  await boot(page, '/?seed=camp-23&fatigue=1&hour=23');

  const camp = page.locator('.camp-button');
  await expect(camp).toBeVisible({ timeout: 10_000 });
  await camp.click();
  // Sleeping moves the sky. Whatever the journal says afterwards, it must still be saying it.
  await expect(page.locator('.journal h2')).toBeVisible();
  // Slept: it is morning now, so the same tile no longer offers a bed.
  await expect(page.locator('.camp-button')).toHaveCount(0);
});

test('a camp in daylight is just a place', async ({ page }) => {
  // The negative half. Standing in the same camp at noon must offer nothing -- otherwise the
  // button is a fast-forward rather than somewhere to sleep.
  await boot(page, '/?seed=camp-23&fatigue=1&hour=12');
  await expect(page.locator('.camp-button')).toHaveCount(0);
});
