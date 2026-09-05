// The way in.
//
// The door is skipped under browser automation, because fifty-odd specs are about the map and
// none of them is about this screen. These ask for it back with `?door=shut`, which is the only
// place in the suite that does — so if the flag ever stops working, exactly the tests that care
// are the ones that fail.
//
// What matters here is not that the screen renders. It is that **the scene does not exist behind
// it**, and that starting over is hard to do by accident: 169 discovery rungs is a long walk to
// lose to a mis-click on a screen somebody is trying to get past.

import { expect, test, type Page } from '@playwright/test';

const SEED = 'front-door';

async function knock(page: Page, query = ''): Promise<void> {
  await page.goto(`/?seed=${SEED}&door=shut${query}`);
  await expect(page.getByRole('dialog', { name: /begin/i })).toBeVisible({ timeout: 20_000 });
}

test('the door stands in front of the walk, with no map behind it', async ({ page }) => {
  await knock(page);

  // **The assertion that matters.** A door drawn over a booted scene would look identical and be
  // a different thing entirely: it would spend the load nobody asked for, and "start a new walk"
  // would be a restart of something already running rather than a beginning.
  await expect(page.locator('.map-surface canvas')).toHaveCount(0);

  await page.getByRole('button', { name: /set out|go on walking/i }).first().click();
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('dialog', { name: /begin/i })).toHaveCount(0);
});

test('who you walk as is chosen here, and it is who walks', async ({ page }) => {
  await knock(page);

  const who = page.getByRole('radiogroup', { name: /walking as/i });
  await who.getByRole('radio', { name: /Guyuk/ }).click();
  await expect(who.getByRole('radio', { name: /Guyuk/ })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('button', { name: /set out|go on walking/i }).first().click();

  // `data-traveller` is what the *scene* reports after the swap, not what was asked for — the
  // same seam `e2e/travellers.spec.ts` uses, and for the same reason: the button's own state
  // passed with the texture swap deliberately removed.
  await expect(page.locator('.stage')).toHaveAttribute('data-traveller', 'guyuk', {
    timeout: 20_000
  });
});

test('a fresh seed offers only setting out', async ({ page }) => {
  // Nothing has been walked under this seed, so there is nothing to continue and the screen
  // should not pretend otherwise.
  await page.goto(`/?seed=nobody-walked-here-${Date.now()}&door=shut`);
  await expect(page.getByRole('dialog', { name: /begin/i })).toBeVisible({ timeout: 20_000 });

  await expect(page.getByRole('button', { name: /set out/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /go on walking/i })).toHaveCount(0);
});

test('starting over asks twice, and says what is lost', async ({ page }) => {
  // Walk far enough to have something worth losing, then come back to the door.
  await page.goto(`/?seed=${SEED}&door=open&at=10,8`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await page.keyboard.press('KeyD');
  await expect(page.locator('.journal h2')).toBeVisible();
  // The save is flushed on a timer and on pagehide; navigating away triggers the second.
  await knock(page);

  // Now there *is* a journey, so both ways are offered.
  await expect(page.getByRole('button', { name: /go on walking/i })).toBeVisible();

  const over = page.getByRole('button', { name: /start a new walk/i });
  await over.click();

  // One press changes the label and says what it costs; it does not throw anything away.
  await expect(page.getByRole('button', { name: /yes .* start over/i })).toBeVisible();
  await expect(page.getByText(/put aside/i)).toBeVisible();
  await expect(page.locator('.map-surface canvas'), 'the walk began on one press').toHaveCount(0);
});
