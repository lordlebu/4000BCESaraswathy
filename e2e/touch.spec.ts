// What a touch screen gets, and what it does not.
//
// **Two controls that duplicate a gesture the hand already makes.** The zoom cluster is `+` and `-`
// in the top-right corner of the map, and a phone pinches. `Controls.tsx` argued the other way for
// a long time -- *"pinch is not something anyone thinks to try on a map that fits the screen
// already"* -- and what answers it is that the map sheet tells a touch screen about the pinch in
// its own words, which is where a player looks for how to play.
//
// **The size of the prize is small and this spec should not be read as claiming otherwise**: the
// cluster is 44x94, about 1.1% of a landscape phone. What made the item worth doing is that
// measuring it turned up P2 -- a pinch also walked the traveller, every time, and nothing asked.
// `e2e/pinch.spec.ts` guards that.
//
// `hasTouch` is not decoration here. Without it the browser reports no touch, the media query does
// not match, and every assertion below would be about a desktop while claiming to be about a phone.

import { expect, test, type Page } from '@playwright/test';

const START = '/?seed=dock-8&hour=12&at=9,40';

async function boot(page: Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(START);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(600);
}

test.describe('with a finger', () => {
  test.use({ hasTouch: true });

  test('the zoom buttons stand down', async ({ page }) => {
    await boot(page, 390, 844);
    await expect(page.locator('.zoom')).toBeHidden();
    // The map sheet's own controls are untouched: this is about the pair that duplicate a gesture,
    // not about the bar.
    await expect(page.getByRole('button', { name: 'Map', exact: true })).toBeVisible();
  });

  test('the map sheet says how to zoom without naming buttons that are not there', async ({
    page
  }) => {
    await boot(page, 390, 844);
    await page.getByRole('button', { name: 'Map', exact: true }).click();

    const sheet = page.locator('.sheet');
    await expect(sheet).toContainText('Zoom with a pinch');
    // **The assertion that stops this being a half-fix.** Telling a phone about buttons it cannot
    // see is worse than saying nothing, and the sentence that does it is still in the markup for
    // every other screen -- so the check has to be that it is not *shown*, not that it is absent.
    await expect(sheet.locator('.zoom-help-pointer')).toBeHidden();
  });
});

test.describe('with a mouse', () => {
  test('the zoom buttons are still there, and so is the sentence about them', async ({ page }) => {
    // The query is `(hover: none) and (pointer: coarse)` rather than a width, because a small
    // desktop window still has a wheel and a keyboard. This is the case that would break if
    // somebody ever "simplified" it to `max-width`.
    await boot(page, 390, 844);
    await expect(page.locator('.zoom')).toBeVisible();

    await page.getByRole('button', { name: 'Map', exact: true }).click();
    const sheet = page.locator('.sheet');
    await expect(sheet).toContainText('the mouse wheel');
    await expect(sheet.locator('.zoom-help-touch')).toBeHidden();
  });
});
