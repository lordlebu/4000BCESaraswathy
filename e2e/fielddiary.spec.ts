// The three scales, walked.
//
// This is Phase 04's acceptance test in one file: stand on an authored place, look closer at
// something, watch it reach the diary, reload and find it still there, then travel to another
// field map. Every other spec proves the old procedural walk still works; this one proves the
// game is now about somewhere.
//
// The seed is chosen, not arbitrary. `buildFieldMap` is deterministic, so `poi-53` is a world
// where the Eastern Field lands two steps from where the traveller starts — which turns "walk
// across a delta hoping to find something" into a test that finishes in seconds.

import { expect, test, type Page } from '@playwright/test';
import { step } from './walk';

/** A seed where poi_eastern_field sits at (24,47) and the traveller starts at (25,46). */
const SEED = 'poi-53';

async function boot(page: Page) {
  await page.goto(`/?seed=${SEED}`);
  await expect(page.locator('.map-surface canvas')).toBeVisible();
  // The journal only writes once the scene has placed the traveller.
  await expect(page.locator('.journal h2')).toBeVisible();
}


test('stand on an authored place, and it opens', async ({ page }) => {
  await boot(page);
  await step(page, 'ArrowLeft');
  await step(page, 'ArrowDown');

  const place = page.locator('.place');
  await expect(place).toBeVisible({ timeout: 10_000 });
  await expect(place.locator('h2')).toHaveText(/Eastern Field/i);
  // The arrival prose is the writing the place exists for; it should not be a toast.
  expect((await place.locator('.place-arrival').textContent())!.length).toBeGreaterThan(60);
});

test('looking closer writes the diary, and the diary keeps the crossings-out', async ({ page }) => {
  await boot(page);
  await step(page, 'ArrowLeft');
  await step(page, 'ArrowDown');
  await expect(page.locator('.place')).toBeVisible({ timeout: 10_000 });

  // Climb whatever this place will give us without any other knowledge.
  const look = page.getByRole('button', { name: 'Look closer' });
  await expect(look.first()).toBeEnabled();
  await look.first().click();
  await look.first().click().catch(() => {}); // the second rung, if this one has no gate on it

  await page.getByRole('button', { name: 'Leave' }).click();
  await page.getByRole('button', { name: /^Diary/ }).click();

  const diary = page.locator('.diary');
  await expect(diary).toBeVisible();
  await expect(diary.locator('.entry')).toHaveCount(1);
  // At least one reading is on the page. If two rungs were climbed, the first is struck through
  // rather than replaced -- that is the whole idea of the panel.
  const readings = diary.locator('.reading');
  expect(await readings.count()).toBeGreaterThan(0);
  if ((await readings.count()) > 1) {
    await expect(readings.first()).toHaveClass(/struck/);
  }
});

test('the diary survives a reload', async ({ page }) => {
  await boot(page);
  await step(page, 'ArrowLeft');
  await step(page, 'ArrowDown');
  await expect(page.locator('.place')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Look closer' }).first().click();
  await page.getByRole('button', { name: 'Leave' }).click();

  // The save flushes on a timer and on pagehide; give the timer a turn rather than racing it.
  await page.waitForTimeout(3500);
  await page.reload();
  await expect(page.locator('.journal h2')).toBeVisible();

  await page.getByRole('button', { name: /^Diary/ }).click();
  await expect(page.locator('.diary .entry')).toHaveCount(1);
});

test('an instance is a place you go into, and it says why when you cannot', async ({ page }) => {
  // A seed where Kavik's Tower stands two steps north of the start.
  await page.goto('/?seed=tower-139');
  await expect(page.locator('.map-surface canvas')).toBeVisible();
  await expect(page.locator('.journal h2')).toBeVisible();
  await step(page, 'ArrowUp');
  await step(page, 'ArrowUp');

  const place = page.locator('.place');
  await expect(place).toBeVisible({ timeout: 10_000 });
  await expect(place.locator('h2')).toHaveText(/Kavik/i);

  // Three ways further in, two of them shut until the work is done. A closed one explains
  // itself rather than showing a padlock -- that is the rule the whole panel is built on.
  const deeper = place.locator('.place-section', { hasText: 'Further in' });
  await expect(deeper.locator('.look')).toHaveCount(3);
  await expect(deeper.getByRole('button', { name: 'Closed to you' })).toHaveCount(2);
  await expect(deeper).toContainText(/Not until you understand/);

  // The open one is a place you can stand in, and come back out of.
  await deeper.getByRole('button', { name: 'Go in' }).click();
  await expect(place.locator('.sub h3')).toBeVisible();
  await page.getByRole('button', { name: 'Back out' }).click();
  await expect(place.locator('.sub')).toBeHidden();
  await expect(deeper.locator('.look')).toHaveCount(3);
});

test('the overworld joins the two field maps', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Where to go' }).click();

  const sheet = page.locator('.diary');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('h2')).toHaveText('Where to go');
  await expect(sheet).toContainText('Lothal');
  await expect(sheet).toContainText('Narmada');

  await sheet.getByRole('button', { name: 'Travel' }).first().click();
  await expect(sheet).toBeHidden();

  // A different country: the plateau is large where Lothal is small, so the map is rebuilt.
  await expect(page.locator('.map-surface canvas')).toBeVisible();
  await expect(page.locator('.journal h2')).toBeVisible();
});
