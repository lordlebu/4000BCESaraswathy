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
  // **One row, measured at 44px**, since Notes and Carrying moved to the map sheet. It was two and
  // 96, and this used to tolerate that with a bound of 120 -- "three is a wall". Tightened to what
  // it actually costs, with room for one wrap if a seventh contextual control ever arrives, because
  // a guard set well above the truth stops being a guard.
  expect(bar.height, `control bar is ${bar.height}px tall — it has wrapped too far`).toBeLessThan(100);
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
  // map is what somebody came to look at. It stays closable, and stays closed until asked for.
  //
  // **The switch moved to the map sheet**, with the notes' one, because the two controls that
  // decide what is *on screen* were making the bar two rows and 96 pixels of a phone. The ribbon
  // is also as wide as what it holds now rather than the width of the bar, so the thing that was
  // reported is much smaller than it was -- but "much smaller" is not "gone", and this still holds
  // the off switch.
  await boot(page, 1280, 800);
  await expect(page.locator('.satchel-strip')).toBeVisible();

  await page.getByRole('button', { name: 'Map', exact: true }).click();
  const toggle = page.getByRole('button', { name: 'What you are carrying' });
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

test('the strip is as wide as what it holds, not as wide as the bar', async ({ page }) => {
  // It stretched the full width of the control stack -- 1204 pixels of a desktop to say "nothing
  // carried yet" -- which put a band of parchment over the map and took clicks meant for the
  // ground under it.
  await boot(page, 1280, 800);
  const strip = (await page.locator('.satchel-strip').boundingBox())!;
  expect(
    strip.width,
    `the strip is ${Math.round(strip.width)}px wide on a 1280px screen`
  ).toBeLessThan(600);
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
  //
  // **Every control has one, rather than "more than three of them do".** The bar was six or seven
  // buttons when that number was written and is four plus two contextual ones now, so a count is
  // the wrong question: what matters is that no button is left as a bare glyph.
  await boot(page, 360, 800);
  const controls = await page.locator('.controls .control').count();
  const labels = page.locator('.controls .control-label');
  expect(controls, 'no controls found at all').toBeGreaterThan(2);
  expect(await labels.count(), 'a control is drawn as a bare glyph').toBe(controls);
  await expect(labels.first()).toBeVisible();
});
