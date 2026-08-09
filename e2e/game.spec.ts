// Does the game actually run?
//
// Every assertion here is about the seam the unit tests cannot reach: Phaser booting, the canvas
// being drawn to, and the EventBus carrying a message from a scene to a React panel and back.

import { expect, test, type Page } from '@playwright/test';

const SEED = 'play-test';

// Navigation is relative on purpose. A leading slash would ignore a baseURL subpath, so the suite
// could not be aimed at a Pages-style `/<repo>/` build or the deployed site.

/** Console errors and uncaught exceptions, collected so a silent failure cannot pass. */
function watchForErrors(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console.error: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`));
  return problems;
}

/** The journal only fills in once a scene has emitted `tile-entered`, so this proves the bridge. */
async function waitForJourney(page: Page) {
  const title = page.locator('.journal h2');
  await expect(title).not.toHaveText('Travel Journal', { timeout: 20_000 });
  return title;
}

test('boots, draws a map, and reports where the player is standing', async ({ page }) => {
  const problems = watchForErrors(page);
  await page.goto(`?seed=${SEED}`);

  // Phaser injects the canvas into .map-surface once the renderer is up.
  const canvas = page.locator('.map-surface canvas');
  await expect(canvas).toBeVisible({ timeout: 20_000 });

  const box = await canvas.boundingBox();
  expect(box, 'canvas has no layout box').not.toBeNull();
  expect(box!.width).toBeGreaterThan(200);
  expect(box!.height).toBeGreaterThan(200);

  // A blank canvas would still be "visible", so check that pixels were actually written.
  //
  // Reading the canvas back in-page does not work here: Phaser renders through WebGL, and once a
  // frame is composited the drawing buffer is undefined unless `preserveDrawingBuffer` is on —
  // which costs performance in the real game to serve a test. Playwright screenshots the composited
  // surface instead, which is what a player sees.
  //
  // PNG size is the cheap signal. A flat fill compresses to almost nothing; a map of tinted tiles,
  // glyphs and a fog gradient does not. Measured at 846x518: a rendered map is ~46 KB, a same-sized
  // flat fill is ~2.4 KB. The threshold sits between them with room either side.
  const shot = await canvas.screenshot();
  expect(shot.byteLength, 'canvas compresses like a flat fill — it is probably blank').toBeGreaterThan(
    8_000
  );

  const title = await waitForJourney(page);
  await expect(title).toContainText(/at \d+, \d+/);
  await expect(page.locator('.journal')).toContainText(/discovered/);

  expect(problems, problems.join('\n')).toEqual([]);
});

test('walking changes the journal', async ({ page }) => {
  const problems = watchForErrors(page);
  await page.goto(`?seed=${SEED}`);
  const title = await waitForJourney(page);
  const before = await title.textContent();

  // Walk a short way. Sea is impassable, so try both axes rather than assuming a free direction.
  await page.locator('.map-surface canvas').click({ position: { x: 10, y: 10 } });
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(260);
  }

  await expect(title).not.toHaveText(before ?? '', { timeout: 10_000 });
  expect(problems, problems.join('\n')).toEqual([]);
});

test('a seed is reproducible and travels in the URL', async ({ page }) => {
  await page.goto(`?seed=${SEED}`);
  const first = await (await waitForJourney(page)).textContent();

  await page.reload();
  const second = await (await waitForJourney(page)).textContent();
  expect(second).toBe(first);

  // A different seed must produce a different starting tile description.
  await page.goto('?seed=monsoon-evening');
  const other = await (await waitForJourney(page)).textContent();
  expect(other).not.toBe(first);
});
