// Can the keyboard get out of a panel that says it cannot?
//
// **This is the spec that would have caught it.** Eleven things in this game render
// `role="dialog"` with `aria-modal="true"`, which is a promise that the rest of the page is
// unavailable. Measured in a real Chromium before `Modal` existed: with Records open, *eight of
// the next ten tab stops were outside the dialog*. Two presses put the keyboard in the control
// bar, behind a veil it could not see past, with no way to tell it had left. Five of the eleven
// did not close on Escape either.
//
// Every unit test passed throughout, and would have kept passing. A panel's markup is a question
// jsdom can answer; where the keyboard goes once that markup is on a page is not — jsdom has no
// focus order and no `inert`. So this walks each panel in the browser and asks the only question
// that matters: after twelve presses, where am I?
//
// It is deliberately not a tour of every panel. Four cover both shapes the primitive has — the
// veiled page and the bare corner sheet — and a fifth would cost a minute of CI to prove the same
// mechanism a third time.

import { expect, test, type Page } from '@playwright/test';

const SEED = 'dock-8';

async function boot(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/?seed=${SEED}&hour=12&at=9,40`);
  // Explicit rather than the 5s default: booting the renderer is the slowest thing here and is
  // not what is being tested. Same note as the other specs' `boot`.
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
}

/** Where the keyboard lands over `presses` tabs, and whether each stop is inside the dialog. */
async function tabTrail(page: Page, presses: number): Promise<boolean[]> {
  const inside: boolean[] = [];
  for (let i = 0; i < presses; i += 1) {
    await page.keyboard.press('Tab');
    inside.push(
      await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))
    );
  }
  return inside;
}

/** The panels this spec opens, and how to get to each. */
const PANELS = [
  {
    name: 'Records',
    open: (page: Page) => page.locator('.controls .control', { hasText: 'Records' }).click(),
    shows: '.diary',
    dismissible: true
  },
  {
    name: 'Travel',
    open: (page: Page) => page.locator('.controls .control', { hasText: 'Travel' }).click(),
    shows: '.diary',
    dismissible: true
  },
  {
    name: 'Satchel',
    open: (page: Page) => page.locator('.satchel-strip').click(),
    shows: '.diary',
    dismissible: true
  },
  {
    // The one with no veil. It positions itself in the corner and is a panel rather than a page,
    // so the trap has to work without a backdrop to hang it on.
    name: 'Map sheet',
    open: (page: Page) => page.locator('.controls .control', { hasText: 'Map' }).click(),
    shows: '.sheet',
    dismissible: true
  }
] as const;

for (const panel of PANELS) {
  test(`the keyboard cannot leave ${panel.name}`, async ({ page }) => {
    await boot(page);
    await panel.open(page);
    await expect(page.locator(panel.shows)).toBeVisible({ timeout: 10_000 });

    const trail = await tabTrail(page, 12);
    const escaped = trail.filter((wasInside) => !wasInside).length;

    expect(
      escaped,
      `${escaped} of 12 tab stops left the dialog — the trap is not holding`
    ).toBe(0);
  });

  if (panel.dismissible) {
    test(`Escape closes ${panel.name}`, async ({ page }) => {
      await boot(page);
      await panel.open(page);
      await expect(page.locator(panel.shows)).toBeVisible({ timeout: 10_000 });

      await page.keyboard.press('Escape');
      await expect(page.locator(panel.shows)).toBeHidden({ timeout: 5_000 });
    });
  }
}

test('the application behind a panel is inert, and is not afterwards', async ({ page }) => {
  // `aria-modal` only *asserts* this. `inert` is the browser actually doing it — out of the tab
  // order and out of the accessibility tree, which is what a screen reader needs rather than a
  // claim it has to take on trust.
  await boot(page);
  const root = page.locator('#root');
  await expect(root).not.toHaveAttribute('inert', /.*/);

  await page.locator('.controls .control', { hasText: 'Records' }).click();
  await expect(page.locator('.diary')).toBeVisible({ timeout: 10_000 });
  await expect(root).toHaveAttribute('inert', /.*/);

  await page.keyboard.press('Escape');
  await expect(page.locator('.diary')).toBeHidden({ timeout: 5_000 });
  await expect(root).not.toHaveAttribute('inert', /.*/);
});

test('focus goes back to the control that opened the panel', async ({ page }) => {
  // Without this the keyboard lands at the top of the document, several presses from the button
  // somebody has just closed — which on a bar of six controls is the difference between carrying
  // on and starting over.
  await boot(page);

  const records = page.locator('.controls .control', { hasText: 'Records' });
  await records.click();
  await expect(page.locator('.diary')).toBeVisible({ timeout: 10_000 });

  await page.keyboard.press('Escape');
  await expect(page.locator('.diary')).toBeHidden({ timeout: 5_000 });

  const back = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
  expect(back, 'focus did not return to the Records control').toContain('Records');
});
