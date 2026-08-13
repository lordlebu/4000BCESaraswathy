// Every window opens and closes, and none of them covers another.
//
// Reported from play: standing on a place opened a panel over the field notes, so the flora
// and fauna you had walked there to read were hidden — and once dismissed it could not be
// reopened without stepping off the tile and back on.

import { expect, test, type Page } from '@playwright/test';
import { step, walkTo } from './walk';

const SEED = 'poi-53';

async function boot(page: Page, w = 1280, h = 800) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`/?seed=${SEED}&hour=12`);
  await expect(page.locator('.map-surface canvas')).toBeVisible();
  await expect(page.locator('.journal h2')).toBeVisible();
}

async function walkToPlace(page: Page) {
  await walkTo(page, ['ArrowLeft', 'ArrowDown']);
}

/** Overlapping area of two elements, in square pixels. */
async function overlap(page: Page, a: string, b: string): Promise<number> {
  return page.evaluate(([x, y]) => {
    const r = (s: string) => document.querySelector(s)?.getBoundingClientRect() ?? null;
    const p = r(x), q = r(y);
    if (!p || !q) return 0;
    return Math.max(0, Math.min(p.right, q.right) - Math.max(p.left, q.left)) *
           Math.max(0, Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top));
  }, [a, b]);
}

test('the field notes can be closed and opened again', async ({ page }) => {
  await boot(page);
  await expect(page.locator('.journal')).toBeVisible();
  await page.getByRole('button', { name: /Field notes/ }).click();
  await expect(page.locator('.journal')).toBeHidden();
  await page.getByRole('button', { name: /Field notes/ }).click();
  await expect(page.locator('.journal')).toBeVisible();
});

test('standing on a place never buries the field notes', async ({ page }) => {
  await boot(page);
  await walkToPlace(page);
  // The two share the bottom of the screen, so only one of them holds it.
  expect(await overlap(page, '.place', '.journal')).toBe(0);
  expect(await overlap(page, '.place', '.log')).toBe(0);
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
  await expect(page.locator('.place')).toBeVisible();
});

test('the Here button only exists where there is a here', async ({ page }) => {
  await boot(page);
  await expect(page.getByRole('button', { name: /Eastern Field/ })).toHaveCount(0);
  await walkToPlace(page);
  await expect(page.getByRole('button', { name: /Eastern Field/ })).toHaveCount(1);
});

test('nothing overlaps in landscape, with every panel open at once', async ({ page }) => {
  await boot(page, 1280, 800);
  await walkToPlace(page);
  // Log open as well as the place: the three panels divide the screen rather than stack.
  const log = page.locator('.log');
  if (!(await log.isVisible())) await page.getByRole('button', { name: 'Journal' }).click();
  await expect(log).toBeVisible();
  expect(await overlap(page, '.place', '.log')).toBe(0);
});
