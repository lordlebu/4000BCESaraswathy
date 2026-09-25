// Does a woven event actually open, in a real page, through the real path?
//
// **The one thing no Node test can say.** `test/happenings.test.ts` proves every template, every
// ration and every line against the real maps -- and would still pass if `App` never asked. This
// codebase's signature fault is exactly that shape, so the page exposes `__happen` and this uses
// it: the same surroundings, the same `seen` and `met`, the same card a step would open, with only
// the ration skipped.

import { expect, test, type Page } from '@playwright/test';

type Happen = (occasion: string, kind?: string, shelter?: string) => boolean;

async function boot(page: Page) {
  // Mid-morning, so road company are out on the road rather than stopped at a place.
  await page.goto('?seed=happenings&hour=10');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
}

/** Ask for an event, retrying until the traveller has a tile to have it on. */
async function happen(page: Page, occasion: string, kind: string, shelter?: string) {
  await expect
    .poll(
      () =>
        page.evaluate(
          ([o, k, s]) => (window as unknown as { __happen?: Happen }).__happen?.(o!, k, s) ?? false,
          [occasion, kind, shelter] as const
        ),
      { timeout: 20_000 }
    )
    .toBe(true);
}

const card = (page: Page) => page.locator('.activity-card');

test('a woven event opens, is chosen, and closes', async ({ page }) => {
  await boot(page);
  await happen(page, 'night', 'dream', 'roof');

  await expect(card(page).locator('h2')).toHaveText('A dream');
  await card(page).getByRole('button', { name: 'Let it go' }).click();
  await expect(card(page)).toContainText('you remember only that it was quiet');
  await card(page).getByRole('button', { name: 'Go on' }).click();
  await expect(card(page)).toBeHidden();
});

test('a stranger tells you their name, and greets you by it the next time', async ({ page }) => {
  await boot(page);
  await happen(page, 'road', 'company');

  await expect(card(page).locator('h2')).toHaveText('Company on the road');
  // Their face is on the card, drawn or painted.
  await expect(card(page).locator('.stranger-face')).toBeVisible();
  await card(page).getByRole('button', { name: 'Walk together a while' }).click();
  const line = (await card(page).locator('.activity-prose').textContent()) ?? '';
  const name = line.match(/Their name is (\w+)/)?.[1];
  expect(name, `no name in "${line}"`).toBeTruthy();
  await card(page).getByRole('button', { name: 'Go on' }).click();
  await expect(card(page)).toBeHidden();

  // The same stranger, met again: `met` was recorded by the choice above.
  await happen(page, 'road', 'company-again');
  await expect(card(page).locator('h2')).toHaveText('A face you know');
  await expect(card(page).locator('.activity-prose')).toContainText(`${name}, the`);
});

test('sheltering a stranger is remembered, so the kindness can come back', async ({ page }) => {
  // The chain's other half is proven under Node; what only a page can prove is that a choice's
  // `sets` reaches the saved journey, where the road will look for it.
  await boot(page);
  await happen(page, 'night', 'knock', 'roof');
  await expect(card(page).locator('h2')).toHaveText('Somebody after dark');
  await card(page).getByRole('button', { name: 'Make room' }).click();
  await card(page).getByRole('button', { name: 'Go on' }).click();

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const raw = localStorage.getItem('south-of-tethys:happenings');
          return raw ? ((JSON.parse(raw) as { flags?: string[] }).flags ?? []) : [];
        }),
      { timeout: 15_000 }
    )
    .toEqual([expect.stringMatching(/^sheltered:field_map_[a-z]+:company_[a-z]+$/)]);
});
