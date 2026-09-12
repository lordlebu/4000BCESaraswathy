// What time is it?
//
// **Before this, nothing on screen answered.** Measured, the whole of `#root` as text at four hours
// of the same day differed by one line, and only after the light had started to go: *"The light is
// going."* at seven in the evening, *"It is dark."* at ten. At first light and at noon there was
// nothing at all. Meanwhile `routineFor(creature, moment)` decides whether an animal can be
// approached, `canCamp` refuses a rest in daylight, and canon's discovery conditions gate on
// `time_of_day` — three systems asking the player to reason about something the screen never told
// them.
//
// **The case that matters is the last one.** `test/dial.test.ts` proves the arithmetic maps the day
// to a position, exhaustively and in milliseconds. What it cannot prove is that the number reaching
// the page is the *hour* rather than a constant — an icon that renders, looks right in a
// screenshot, and says the same thing at dawn and at midnight is this repository's signature fault
// in its interface form, and it has shipped five times in other shapes.

import { expect, test, type Page } from '@playwright/test';

async function bootAt(page: Page, hour: string) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/?seed=dock-8&hour=${hour}&at=9,40`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  // The scene announces the sky on its half-second check, so the dial arrives a beat after the map.
  await expect(page.locator('.sky-dial')).toBeVisible({ timeout: 10_000 });
}

/** Where the mark sits, and what the dial calls the hour. */
async function readDial(page: Page) {
  return page.evaluate(() => {
    const dial = document.querySelector('.sky-dial')!;
    const mark = document.querySelector('.sky-dial-mark')!;
    return {
      label: dial.getAttribute('aria-label'),
      body: dial.getAttribute('data-body'),
      at: `${mark.getAttribute('cx')},${mark.getAttribute('cy')}`
    };
  });
}

test('the hour is on screen at all, which it was not', async ({ page }) => {
  await bootAt(page, '12');
  const { label } = await readDial(page);
  expect(label, 'the dial says nothing about the hour').toContain('noon');
});

test('it is a readout, not a button that does nothing', async ({ page }) => {
  // There is nothing to press it for — the hour is not something a player sets — and a control that
  // does nothing teaches a player to stop pressing things.
  await bootAt(page, '12');
  await expect(page.locator('.sky-dial')).toHaveRole('img');
  expect(await page.locator('.sky-dial button').count()).toBe(0);
});

test('the mark is where a player is looking, not merely in the document', async ({ page }) => {
  // Hit-tested rather than measured: a bounding box is still reported for an element a scrolling
  // ancestor has clipped away, and `toBeVisible()` is satisfied by one too. The dial rides the
  // dock's grip row, which is exactly the kind of place a thing gets squeezed out of.
  await bootAt(page, '12');
  const seen = await page.evaluate(() => {
    const dial = document.querySelector('.sky-dial')!;
    const b = dial.getBoundingClientRect();
    if (!b.width || !b.height) return false;
    const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return Boolean(hit && (dial.contains(hit) || hit.contains(dial)));
  });
  expect(seen, 'the dial is in the page but not on the screen').toBe(true);
});

test('the sky is drawn as the sun by day and the moon by night', async ({ page }) => {
  await bootAt(page, '12');
  expect((await readDial(page)).body).toBe('sun');

  await bootAt(page, '23');
  expect((await readDial(page)).body).toBe('moon');
});

test('the dial says a different thing at every hour it is asked', async ({ page }) => {
  // **The assertion the whole spec is for.** Six hours, six positions, and the labels the rest of
  // the game uses. An icon wired to a constant passes every other case here.
  const hours = ['6', '9', '12', '16', '19', '22'];
  const marks = new Set<string>();
  const labels: string[] = [];

  for (const hour of hours) {
    await bootAt(page, hour);
    const { at, label } = await readDial(page);
    marks.add(at);
    labels.push(`${hour}: ${label}`);
  }

  expect(
    marks.size,
    `the mark did not move across the day — ${labels.join(', ')}`
  ).toBe(hours.length);
});

test('the dial is there whatever the dock is showing', async ({ page }) => {
  // It rides the grip row rather than the field notes, so standing somewhere or opening the dock
  // does not take the hour away. Whether an animal can be approached and whether a night can be
  // spent both turn on it, so it has no business disappearing the moment a player stands still.
  await bootAt(page, '12');
  await expect(page.locator('.sky-dial')).toBeVisible();

  await page.locator('.dock-handle').click();
  await expect(page.locator('.dock')).toHaveAttribute('data-height', 'read');
  await expect(page.locator('.sky-dial')).toBeVisible();

  await page.locator('.dock-handle').click();
  await expect(page.locator('.dock')).toHaveAttribute('data-height', 'full');
  await expect(page.locator('.sky-dial')).toBeVisible();
});
