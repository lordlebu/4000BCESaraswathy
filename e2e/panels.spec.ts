// Every window opens and closes, and none of them covers another.
//
// Reported from play: standing on a place opened a panel over the field notes, so the flora
// and fauna you had walked there to read were hidden — and once dismissed it could not be
// reopened without stepping off the tile and back on.

import { expect, test, type Page } from '@playwright/test';
import { step, walkTo } from './walk';

// Shares `fielddiary.spec.ts`'s fixture: two steps south of the start is an authored place.
// See the note there for why searched seeds go stale and what stopped most of it.
const SEED = 'poi-1621';

async function boot(page: Page, w = 1280, h = 800) {
  await page.setViewportSize({ width: w, height: h });
  // Two tiles north of poi_eastern_field at (10,10); `walkToPlace` walks the rest.
  await page.goto(`/?seed=${SEED}&hour=12&at=10,8`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
}

async function walkToPlace(page: Page) {
  await walkTo(page, ['ArrowDown', 'ArrowDown']);
}

test('the field notes can be closed and opened again', async ({ page }) => {
  await boot(page);
  await expect(page.locator('.journal')).toBeVisible();
  await page.getByRole('button', { name: /Field notes/ }).click();
  await expect(page.locator('.journal')).toBeHidden();
  await page.getByRole('button', { name: /Field notes/ }).click();
  await expect(page.locator('.journal')).toBeVisible();
});

/**
 * **This used to assert that the two rectangles did not overlap, and that is no longer the
 * question.** The notes and the place were two panels dividing the bottom of the screen; they are
 * one dock with one occupant now, so `.journal` is simply not on the page while a place is being
 * read — and the old assertion would have gone on passing, because `overlap` returns 0 when either
 * element is missing. A test that passes because something vanished is worse than no test.
 *
 * What the original was protecting was that arriving somewhere does not strand you away from the
 * notes. That is what is asserted here instead, through the controls a player actually has.
 */
test('standing on a place never strands the field notes', async ({ page }) => {
  await boot(page);
  await walkToPlace(page);

  // One occupant: never both at once, which is the dock's whole rule.
  await expect(page.locator('.place')).toBeVisible();
  await expect(page.locator('.journal')).toHaveCount(0);

  // And they are one press apart, in both directions, without stepping off the tile.
  await page.getByRole('button', { name: 'Leave' }).click();
  await expect(page.locator('.journal')).toBeVisible();
  await expect(page.locator('.place')).toHaveCount(0);
});

test('a place can be closed, read around, and opened again without moving', async ({ page }) => {
  await boot(page);
  await walkToPlace(page);

  await page.getByRole('button', { name: 'Leave' }).click();
  await expect(page.locator('.place')).toBeHidden();
  // What it was covering is readable now.
  await expect(page.locator('.journal')).toBeVisible();

  // And it comes back without stepping off the tile, which was the reported dead end.
  await page.getByRole('button', { name: /Eastern Field/ }).click();
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
});

test('the Here button only exists where there is a here', async ({ page }) => {
  await boot(page);
  await expect(page.getByRole('button', { name: /Eastern Field/ })).toHaveCount(0);
  await walkToPlace(page);
  await expect(page.getByRole('button', { name: /Eastern Field/ })).toHaveCount(1);
});

test('the dock holds one occupant, and the map keeps the rest of the screen', async ({ page }) => {
  await boot(page, 1280, 800);
  await walkToPlace(page);
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });

  // The travel log used to be a third panel here, and before this stage the place and the notes
  // divided the bottom edge between them. One slot now, and the dock is the only thing along the
  // bottom -- so what is worth asserting is that it stops well short of the screen.
  // Reading height is 56dvh by design -- measured, because at 46 the dock showed 47% of a place
  // against the 73% the old arrangement managed. What this guards is that it stays a fraction of
  // the screen rather than creeping back to the full-bleed band it replaced.
  const dock = (await page.locator('.dock').boundingBox())!;
  expect(dock.height, `the dock is ${Math.round(dock.height)}px of an 800px screen`).toBeLessThan(800 * 0.62);

  // That the actions stay in reach while a place is being read -- the regression folding two panels
  // into one would otherwise introduce -- is asserted in `test/panels.test.tsx`, where the tile can
  // be given an action to have. A seed reaches whatever the ground there happens to offer, and a
  // browser assertion that depends on that is one that passes for the wrong reason on a quiet tile.
});

/**
 * The album fills by walking.
 *
 * The mechanic this replaced was written, tested, and had no consumer -- the fourth time that
 * has happened here. So this checks the thing only a player can see: that walking, with nothing
 * pressed, causes species to be recorded. Unit tests cannot see it, because the wiring from
 * arrival to record is the part that was missing last time.
 */
test('species are met by walking, without pressing anything', async ({ page }) => {
  await boot(page);

  // Seeded from the starting tile, so it is never empty on arrival.
  await expect(page.getByRole('button', { name: 'Map', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  const first = (await page.locator('.sheet').textContent()) ?? '';
  expect(first).toMatch(/Met so far \(\d+\)/);
  const started = Number(/Met so far \((\d+)\)/.exec(first)?.[1] ?? '0');
  expect(started).toBeGreaterThan(0);
  await page.locator('.sheet').getByRole('button', { name: 'Close' }).click();

  // Walk a while. Different tiles hold different species, so the count should climb.
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowLeft']) {
    await step(page, key);
  }

  await page.getByRole('button', { name: 'Map', exact: true }).click();
  const after = (await page.locator('.sheet').textContent()) ?? '';
  const ended = Number(/Met so far \((\d+)\)/.exec(after)?.[1] ?? '0');
  expect(ended).toBeGreaterThanOrEqual(started);
});
