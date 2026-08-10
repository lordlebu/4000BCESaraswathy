// The day/night wash, in a real renderer.
//
// `test/dayNight.test.ts` covers the colour maths under Node. What it cannot show is whether the
// wash actually reaches the screen — a rectangle at the wrong depth, or one the camera does not
// scroll with, would pass every unit test and be invisible or stuck to the viewport.

import { expect, test, type Page } from '@playwright/test';

const SEED = 'sky-demo';

/**
 * Pin `new Date()` so the scene opens on a chosen hour.
 *
 * Only the constructor. `Date.now()` must keep moving: Phaser drives frame deltas from it, and
 * freezing it stops every tween dead — the fog never fades in and the camera never finishes its
 * opening fade, which looks exactly like a broken renderer and is not.
 */
async function openAtHour(page: Page, hour: number): Promise<void> {
  await page.addInitScript((h: number) => {
    const Real = Date;
    const fixed = new Real(2026, 7, 10, h, 0, 0).getTime();
    // @ts-expect-error replacing the global for the duration of the test
    window.Date = class extends Real {
      constructor(...args: ConstructorParameters<typeof Date> | []) {
        if (args.length === 0) super(fixed);
        else super(...(args as ConstructorParameters<typeof Date>));
      }
    };
    window.Date.now = Real.now.bind(Real);
  }, hour);
}

async function mapAtHour(page: Page, hour: number): Promise<Buffer> {
  await openAtHour(page, hour);
  await page.setViewportSize({ width: 900, height: 620 });
  await page.goto(`?seed=${SEED}`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).not.toHaveText('Travel Journal', { timeout: 20_000 });
  // Long enough for the camera fade and the first fog reveal to finish.
  await page.waitForTimeout(1600);
  return page.locator('.map-surface canvas').screenshot();
}

test('the same map looks different at noon and at night', async ({ page }) => {
  const noon = await mapAtHour(page, 12);
  // Both are real renders of a real map, not blank frames.
  expect(noon.byteLength).toBeGreaterThan(8_000);

  const night = await mapAtHour(page, 22);
  expect(night.byteLength).toBeGreaterThan(8_000);

  // Same seed, same viewport, same starting tile — the only difference is the hour.
  expect(Buffer.compare(noon, night), 'the wash is not reaching the screen').not.toBe(0);
});

test('night still leaves the ground under the traveller readable', async ({ page }) => {
  const night = await mapAtHour(page, 22);
  // A map washed out to a flat navy sheet would compress far smaller than one where the lit ring
  // still shows river, forest and hill colours apart.
  expect(night.byteLength, 'night looks flat — the wash is probably too strong').toBeGreaterThan(
    12_000
  );
});
