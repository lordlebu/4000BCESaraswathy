// A place to stop (`docs/a-place-to-stop.md`).
//
// A night closes the day on a page, and the front door says where you left off. Both are drawn
// by React from rules `test/daybook.test.ts` covers under Node; what only a browser can show is
// that the page is reached by the paths a player has -- a camp after dark, a reload -- and is on the
// screen when it is. There is no house in this game, so neither page ever says home.

import { expect, test, type Page } from '@playwright/test';

/** The rest row, wherever the night can be spent. See `e2e/fatigue.spec.ts`. */
function rest(page: Page) {
  return page.locator('.tile-action', { hasText: /roof|camp|bedding|sit out/i }).getByRole('button');
}

async function boot(page: Page, query: string) {
  await page.goto(query);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
}

test('a night closes on the day behind you, and says it is a place to stop', async ({ page }) => {
  // `camp-23` starts the traveller on The Camp in the Kilns, so a night is reachable without a walk.
  await boot(page, '?seed=camp-23&hour=23');
  const camp = rest(page);
  await expect(camp).toBeEnabled({ timeout: 10_000 });
  await camp.click();

  const night = page.locator('.activity-veil');
  await expect(night).toBeVisible();
  // Not before the night: the page is the morning's, not the evening's.
  await expect(page.getByRole('region', { name: 'The day behind you' })).toHaveCount(0);

  await page.locator('.activity-choice.primary').click();
  const day = page.getByRole('region', { name: 'The day behind you' });
  await expect(day).toBeVisible();
  await expect(day).toContainText('A good place to stop');
  await expect(day).not.toContainText(/home/i);

  // The way out is still reachable under the page: the card's body scrolls, and a page that pushed
  // "Start the day" off the card would strand a player in the night.
  const out = page.locator('.activity-choice', { hasText: 'Start the day' });
  await out.scrollIntoViewIfNeeded();
  await out.click();
  await expect(night).toBeHidden();
});

test('the front door says where you left off', async ({ page }) => {
  const seed = `left-off-${Date.now()}`;
  // Walk a step, so there is a journey to come back to; leaving the page flushes the save.
  await boot(page, `?seed=${seed}&door=open&at=10,8`);
  await page.keyboard.press('KeyD');
  await expect(page.locator('.journal h2')).toBeVisible();

  await page.goto(`?seed=${seed}&door=shut&title=skip`);
  await expect(page.getByRole('dialog', { name: /begin/i })).toBeVisible({ timeout: 20_000 });
  const left = page.getByRole('region', { name: 'Where you left off' });
  await expect(left).toBeVisible();
  await expect(left).toContainText(/You were on /);
  await expect(left).not.toContainText(/home/i);
  await expect(page.getByRole('button', { name: /go on walking/i })).toBeVisible();
});
