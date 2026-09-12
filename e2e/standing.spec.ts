// Can a player see what is on the tile they are standing on, without opening anything?
//
// **Before this row, the answer was no, at every device size.** Measured, the complete text of the
// dock at peek was the biome's description, a sentence about the surrounding country, and two
// verbs. `.journal-notes` is `display: none` at that height -- a deliberate call about a block of
// prose -- and it took the animal, what the animal was doing, the plant and the material with it.
// The `Work the ground` chip's own detail line (`"Dung cake."`) was hidden there too, so the verb
// was on screen and the object of it was not.
//
// **This is the half `test/standingRow.test.tsx` cannot reach.** That suite proves the row names
// what it was handed; jsdom has no layout, so it cannot tell a row that is on screen from one that
// has been clipped by a scrolling panel. That distinction is not hypothetical here: the row was
// written into `JournalPanel` first, rendered correctly, passed every unit case, and was cut off by
// the dock's own scroll on three of four sizes. It is pinned beside the action rail now, and this
// is what says so.

import { expect, test, type Page } from '@playwright/test';

/** Plains at 9, 40: a cliff swift, a poison oleander, and dung cake on the ground. */
const START = '/?seed=dock-8&hour=12&at=9,40';

const SIZES = [
  { name: 'desktop', w: 1280, h: 800 },
  { name: 'phone portrait', w: 390, h: 844 },
  { name: 'small phone', w: 360, h: 800 },
  { name: 'phone landscape', w: 844, h: 390 }
];

async function boot(page: Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(START);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(900);
}

for (const { name, w, h } of SIZES) {
  test(`what is on this ground is readable at rest — ${name}`, async ({ page }) => {
    await boot(page, w, h);

    // Nothing has been pressed. This is the state a player walks in.
    await expect(page.locator('.dock')).toHaveAttribute('data-height', 'peek');

    const chips = page.locator('.standing');
    await expect(chips, 'the standing row is not on screen at peek').not.toHaveCount(0);

    // **Asked of the browser by hit-testing, and the weaker version of this passed with the fault
    // in place.** Comparing each chip's bounding box against the dock's looks like the obvious
    // check and proves almost nothing: a box is still reported for an element a scrolling ancestor
    // has clipped away, and `toBeVisible()` is satisfied by one too. Checked by clipping the row to
    // twenty pixels with `overflow: hidden` -- all four sizes passed.
    //
    // `elementFromPoint` at the chip's centre asks the question a player asks: is that thing there,
    // where I am looking. It catches clipping, being covered by another panel, and being off the
    // screen, all three.
    const unseen = await page.evaluate(() => {
      const out: string[] = [];
      for (const chip of document.querySelectorAll('.standing')) {
        const b = chip.getBoundingClientRect();
        const label = (chip.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (b.width === 0 || b.height === 0) {
          out.push(`${label} (no box)`);
          continue;
        }
        const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
        if (!hit || !(chip.contains(hit) || hit.contains(chip))) out.push(label);
      }
      return out;
    });

    expect(
      unseen,
      `on screen at peek but not actually visible at ${w}x${h} — clipped, covered, or off the edge: ` +
        unseen.join('; ')
    ).toEqual([]);
  });
}

test('the animal, the plant and the material are all named, and so is what the animal is doing', async ({
  page
}) => {
  await boot(page, 390, 844);

  // The content, not just the container. A row of three empty chips would pass every geometric
  // assertion above.
  const row = page.locator('.standing-row');
  await expect(row).toContainText('Cliff Swift');
  await expect(row).toContainText('Poison Oleander');
  await expect(row).toContainText('Dung cake');

  // **The one that matters most.** `routineFor` decides whether an animal can be approached and
  // `blockedReason` refuses a stalk on the same fact, so this is the line that changes what the
  // player can do -- and it was the single most useful thing the fold was hiding.
  await expect(row).toContainText('feeding');
});

test('the row steps aside once the dock is opened, rather than saying it all twice', async ({
  page
}) => {
  await boot(page, 390, 844);
  await expect(page.locator('.standing-row')).toBeVisible();

  // One press of the handle. The full notes say all of this at length, with the canon description
  // under each name, so the row would be the same facts in a smaller font directly above them.
  await page.locator('.dock-handle').click();
  await expect(page.locator('.dock')).toHaveAttribute('data-height', 'read');
  await expect(page.locator('.standing-row')).toBeHidden();
  await expect(page.locator('.journal-notes')).toBeVisible();
  await expect(page.locator('.journal-notes')).toContainText('Cliff Swift');

  // And the sentence about the surrounding country comes back with it — it is what peek traded
  // away, not something that was deleted.
  await expect(page.locator('.surroundings')).toBeVisible();
});
