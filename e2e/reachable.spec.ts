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
  await page.goto('/?seed=poi-252&hour=12');
  // Explicit, not the 5s default: booting the game is the slowest thing this spec does and is not
  // what it is testing. See the same note in fielddiary's `boot`.
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
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

test('the satchel strip never sits under the control bar', async ({ page }) => {
  // **Measured, because guessing got it wrong.** The strip was first pinned 44px below the top
  // on the assumption the bar was one row tall. It is two rows on a 360px phone, and the strip
  // landed underneath it -- invisible, on the narrowest screen, where a permanent readout matters
  // most. They stack in normal flow now; this is what says so if that regresses.
  for (const [w, h] of [[360, 800], [412, 915], [1280, 800]] as const) {
    await boot(page, w, h);
    const bar = (await page.locator('.controls').boundingBox())!;
    const strip = (await page.locator('.satchel-strip').boundingBox())!;
    expect(
      strip.y,
      `at ${w}x${h} the strip starts at ${strip.y} and the bar ends at ${bar.y + bar.height}`
    ).toBeGreaterThanOrEqual(bar.y + bar.height);
  }
});

test('the satchel ribbon can be put away for a clean map', async ({ page }) => {
  // Reported from play: the ribbon is useful and permanent, and permanent is the problem -- the
  // map is what somebody came to look at. It closes like the notes do, from the same bar, and
  // stays closed until asked for.
  await boot(page, 1280, 800);
  await expect(page.locator('.satchel-strip')).toBeVisible();

  const toggle = page.getByRole('button', { name: /Satchel ribbon/ });
  await toggle.click();
  await expect(page.locator('.satchel-strip')).toHaveCount(0);
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  // A footstep is not a request for it back.
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  await expect(page.locator('.satchel-strip')).toHaveCount(0);

  await toggle.click();
  await expect(page.locator('.satchel-strip')).toBeVisible();
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
