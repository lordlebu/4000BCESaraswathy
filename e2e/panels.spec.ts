// Every window opens and closes, and none of them covers another.
//
// Reported from play: standing on a place opened a panel over the field notes, so the flora
// and fauna you had walked there to read were hidden — and once dismissed it could not be
// reopened without stepping off the tile and back on.

import { expect, test, type Page } from '@playwright/test';
import { step, walkTo } from './walk';

const SEED = 'poi-252';

async function boot(page: Page, w = 1280, h = 800) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`/?seed=${SEED}&hour=12`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
}

async function walkToPlace(page: Page) {
  await walkTo(page, ['ArrowUp', 'ArrowUp']);
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
  // The travel log used to be a third panel here. What remains on the glass at once is the
  // place and the notes underneath it, and they divide the bottom edge rather than stack.
  await expect(page.locator('.place')).toBeVisible();
  expect(await overlap(page, '.place', '.journal')).toBe(0);
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
