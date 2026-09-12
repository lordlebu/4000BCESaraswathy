// How much of the screen is the map?
//
// **A number in a document goes stale; this is the same measurement as a check.** The whole of
// `docs/ui-streamline-plan.md` started from one: the chrome covered 48% of the screen standing on
// ordinary ground and 73% standing in a place — 83% on a landscape phone — while the first line of
// `src/ui/styles.css` said "The map is the screen". Nothing in the suite could see that, and
// nothing would have noticed it creeping back.
//
// It belongs beside `reachable.spec.ts`: both are about arrangement rather than content, and both
// exist because a layout can look right in a screenshot and be unusable in the hand.
//
// **The thresholds are set from measurement, not from the plan's aspiration**, which is this
// repository's own rule — see `docs/testing.md`. Each sits a little under what the dock actually
// achieves, so the guard fires on a regression rather than on the next honest pixel.

import { expect, test, type Page } from '@playwright/test';
import { step } from './walk';

const SEED = 'dock-8';

/** Two steps south of here is the drowned dockyard. */
const START = `/?seed=${SEED}&hour=12&at=9,40`;

async function boot(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto(START);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(900);
}

/**
 * How much of the viewport the map still has, as a percentage.
 *
 * The union of every panel over the canvas, sampled on a four-pixel grid — a union rather than a
 * sum, because the zoom cluster sits beside the control bar and counting both twice would flatter
 * or damn the layout depending on where they happened to be. The panels are parchment at 93% over
 * a blur, so covered means covered.
 */
async function mapShare(page: Page): Promise<number> {
  return page.evaluate(() => {
    const W = innerWidth;
    const H = innerHeight;
    const step = 4;
    const rects = ['.dock', '.controls', '.satchel-strip', '.zoom']
      .map((sel) => document.querySelector(sel))
      .filter((el): el is Element => Boolean(el))
      .map((el) => el.getBoundingClientRect());

    let covered = 0;
    let total = 0;
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        total += 1;
        if (rects.some((r) => x >= r.x && x < r.right && y >= r.y && y < r.bottom)) covered += 1;
      }
    }
    return 100 - (100 * covered) / total;
  });
}

/**
 * The resting state of the walk, which is what this plan is actually about.
 *
 * | | before the dock | after the bar | after the standing row |
 * |---|---|---|---|
 * | desktop | 51.7 | 68.2 | **66.2** |
 * | phone portrait | 52.1 | 68.4 | **63.5** |
 * | small phone | 51.8 | 67.8 | **63.2** |
 * | phone landscape | 37.3 | 61.5 | **44.6** |
 *
 * **The floors come down, and that is a trade rather than a regression.** The middle column is a
 * dock that showed a heading and two sentences about the next valley; the right-hand one shows the
 * animal, what it is doing, the plant, the material and both verbs. `docs/ui-affordances-plan.md`
 * has the measurement: at peek, `.journal-notes` was `display: none` and took *all* of the tile's
 * content with it, so everything a player was deciding about lived one press of the handle away.
 * Chrome taking the map back would be a regression. Content the player came for is what the map was
 * cleared *for*.
 *
 * **Landscape is arithmetic, not a choice, and it is the one to read twice.** On a 390-pixel screen
 * the handle, the heading, the standing row and the rail come to 164 pixels whatever anyone
 * prefers -- 42% of the height -- so showing what is on the tile at rest costs 16.9 points there.
 * Dropping the heading buys nine of them back and was reverted; the note in `styles.css` says why.
 * The honest comparison is not against 61.5 but against **37.3**, which is what this screen had
 * before any of this work, with a dock that showed less.
 */
const RESTING = [
  { name: 'desktop', w: 1280, h: 800, floor: 62, was: 51.7 },
  { name: 'phone portrait', w: 390, h: 844, floor: 59, was: 52.1 },
  { name: 'small phone', w: 360, h: 800, floor: 59, was: 51.8 },
  { name: 'phone landscape', w: 844, h: 390, floor: 41, was: 37.3 }
] as const;

for (const view of RESTING) {
  test(`the map keeps most of the screen while walking — ${view.name}`, async ({ page }) => {
    await boot(page, view.w, view.h);
    const share = await mapShare(page);
    expect(
      share,
      `the map has ${share.toFixed(1)}% of a ${view.w}x${view.h} screen at rest, ` +
        `against a floor of ${view.floor}% and ${view.was}% before the dock`
    ).toBeGreaterThan(view.floor);
  });
}

/**
 * Standing in a place — where the game happens, and where it used to be worst.
 *
 * Short landscape is deliberately absent, and that absence is the honest part. On a 390-pixel-tall
 * screen, reading a place and seeing the map are in direct conflict: the handle and the rail take
 * 86 pixels whatever happens, so a reading height that leaves the map a third leaves the writing
 * 14 pixels of 447. **Reading won** — the dock asks for 78dvh there and gets whatever is left under
 * the control bar — and the map is one press on the handle away, which the last test in this file
 * is what proves.
 */
const READING = [
  { name: 'desktop', w: 1280, h: 800, floor: 34, was: 27.0 },
  { name: 'phone portrait', w: 390, h: 844, floor: 31, was: 18.9 }
] as const;

for (const view of READING) {
  test(`the map is still there while reading a place — ${view.name}`, async ({ page }) => {
    await boot(page, view.w, view.h);
    await step(page, 'ArrowDown');
    await step(page, 'ArrowDown');
    await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });

    const share = await mapShare(page);
    expect(
      share,
      `the map has ${share.toFixed(1)}% while a place is open, against ${view.was}% before the dock`
    ).toBeGreaterThan(view.floor);
  });
}

test('the place is readable rather than a letterbox', async ({ page }) => {
  // The other half of the measurement, and the one the old arrangement was worst at: the panel
  // showed 349 of its 477 pixels on a desktop and **135 of 473** on a landscape phone. What is
  // asserted is the share of the writing on screen, not the pixels, so it survives canon giving a
  // place more to say.
  await boot(page, 844, 390);
  await step(page, 'ArrowDown');
  await step(page, 'ArrowDown');
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });

  const shown = await page.evaluate(() => {
    const body = document.querySelector('.dock-body');
    return body ? (100 * body.clientHeight) / body.scrollHeight : 0;
  });
  // 25% measured at reading height, against 29% before. **A 390-pixel-tall screen is where every
  // trade in this stage bites at once**: the handle and the rail take 117 pixels before a word is
  // drawn, and the blocked rows keep their place because `TileActions` requires it. What a player
  // has that they did not have before is a third press on the handle, which takes the dock to full
  // and the place to the whole page. This floor guards the reading height, not the best available.
  expect(
    shown,
    `${shown.toFixed(0)}% of the place is on screen on a landscape phone, against 29% before`
  ).toBeGreaterThan(21);
});

test('the handle gives the map back', async ({ page }) => {
  // The trade the whole stage rests on: the dock is allowed to be large while you are reading,
  // because getting out is a press and not a hunt. If this stops being true, the heights above stop
  // being defensible.
  //
  // **Two presses from reading height, not one**, because the handle cycles peek -> read -> full:
  // the step that goes *up* exists because reading height alone showed less of a place than the
  // arrangement this replaced. Going round is still cheaper than hunting for a control.
  await boot(page, 844, 390);
  await step(page, 'ArrowDown');
  await step(page, 'ArrowDown');
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });

  const reading = await mapShare(page);
  await page.locator('.dock-handle').click();
  await page.waitForTimeout(350);
  await page.locator('.dock-handle').click();
  await page.waitForTimeout(400);
  const after = await mapShare(page);

  expect(
    after,
    `the map went from ${reading.toFixed(1)}% to ${after.toFixed(1)}% — the handle gave nothing back`
  ).toBeGreaterThan(reading + 20);
});
