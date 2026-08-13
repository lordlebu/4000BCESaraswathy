// Can every control actually be pressed?
//
// Reported from a phone: the Journal button had run off the right edge behind the zoom cluster
// and could not be reached. The control bar grew from two buttons to six with no right bound
// and no wrapping, so it overflowed in silence — nothing rendered wrong, the button was simply
// somewhere the screen was not.
//
// This is the guard for that whole class. It walks every control at real device sizes and
// requires each to be inside the viewport, not underneath anything, and big enough to hit.

import { expect, test, type Page } from '@playwright/test';

const SIZES = [
  { w: 360, h: 800, name: 'small phone portrait' },
  { w: 390, h: 844, name: 'phone portrait' },
  { w: 720, h: 1600, name: 'tall phone portrait' },
  { w: 844, h: 390, name: 'phone landscape' },
  { w: 1024, h: 768, name: 'tablet landscape' },
  { w: 1280, h: 800, name: 'desktop' }
];

/** Apple and Google both put the comfortable minimum at 44px; 40 allows for a hairline border. */
const MIN_TAP = 40;

async function boot(page: Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto('/?seed=poi-53&hour=12');
  await expect(page.locator('.map-surface canvas')).toBeVisible();
  await expect(page.locator('.journal h2')).toBeVisible();
  await page.waitForTimeout(400);
}

for (const { w, h, name } of SIZES) {
  test(`every control is on screen and hittable — ${name}`, async ({ page }) => {
    await boot(page, w, h);

    const controls = page.locator('.controls .control, .zoom button');
    const count = await controls.count();
    expect(count, 'no controls found at all').toBeGreaterThan(4);

    for (let i = 0; i < count; i += 1) {
      const button = controls.nth(i);
      const label = (await button.getAttribute('aria-label')) ?? `control ${i}`;
      const box = (await button.boundingBox())!;

      expect(box, `${label} has no box`).not.toBeNull();
      expect(box.x, `${label} starts off the left edge`).toBeGreaterThanOrEqual(0);
      expect(box.y, `${label} starts above the top edge`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `${label} runs off the right edge at ${w}px`).toBeLessThanOrEqual(w);
      expect(box.y + box.height, `${label} runs off the bottom at ${h}px`).toBeLessThanOrEqual(h);
      expect(box.height, `${label} is too small to tap`).toBeGreaterThanOrEqual(MIN_TAP);
      expect(box.width, `${label} is too narrow to tap`).toBeGreaterThanOrEqual(MIN_TAP);

      // Reachable in the browser's own judgement — not covered, not disabled, actually there.
      await expect(button, `${label} is not clickable`).toBeEnabled();
    }
  });
}

test('the control bar never buries the map under rows of buttons', async ({ page }) => {
  await boot(page, 360, 800);
  const bar = (await page.locator('.controls').boundingBox())!;
  // One row on a phone, because the labels drop. Two would be tolerable; three is a wall.
  expect(bar.height, `control bar is ${bar.height}px tall — it has wrapped too far`).toBeLessThan(120);
});

test('a keyboard user can see where they are', async ({ page }) => {
  // There was no focus state in the whole stylesheet: every control could be tabbed to and
  // none of them showed it. This checks the ring is actually painted, not merely declared.
  await boot(page, 1280, 800);
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus-visible');
  await expect(focused).toHaveCount(1);

  const ring = await focused.evaluate((el) => {
    const s = getComputedStyle(el);
    return { style: s.outlineStyle, width: s.outlineWidth };
  });
  expect(ring.style).not.toBe('none');
  expect(parseFloat(ring.width)).toBeGreaterThanOrEqual(2);
});

test('a phone still gets words on its buttons', async ({ page }) => {
  // Glyphs alone rescue a screen reader via aria-label and nobody else. If the labels ever go
  // again, this is what says so.
  await boot(page, 360, 800);
  const labels = page.locator('.controls .control-label');
  expect(await labels.count()).toBeGreaterThan(3);
  await expect(labels.first()).toBeVisible();
});
