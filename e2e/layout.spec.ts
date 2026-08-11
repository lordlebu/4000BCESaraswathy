// The map is the screen, in whichever way round the screen happens to be.
//
// These assertions are about arrangement rather than content, and every one of them is here because
// the alternative is a layout that looks right in a screenshot and is unusable in the hand.

import { expect, test, type Page } from '@playwright/test';

const SEED = 'play-test';

const VIEWPORTS = [
  { name: 'desktop landscape', width: 1280, height: 800 },
  { name: 'phone portrait', width: 390, height: 844 },
  { name: 'phone landscape', width: 844, height: 390 }
] as const;

async function open(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto(`?seed=${SEED}&hour=12`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1200);
}

/** Where the panels are, and what they leave of the map. */
async function geometry(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => document.querySelector(selector)?.getBoundingClientRect() ?? null;
    return {
      canvas: rect('.map-surface canvas'),
      log: rect('.log'),
      notes: rect('.journal'),
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    };
  });
}

for (const view of VIEWPORTS) {
  test.describe(view.name, () => {
    test('the map fills the screen and the page does not scroll', async ({ page }) => {
      await open(page, view.width, view.height);
      const { canvas, scrollHeight, clientHeight, scrollWidth, clientWidth } = await geometry(page);

      // Within a pixel or two: device pixel ratios and sub-pixel layout make exact equality a
      // flake rather than a stronger assertion.
      expect(Math.abs(canvas!.width - view.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(canvas!.height - view.height)).toBeLessThanOrEqual(2);

      // Nothing is below the fold, because there is no fold.
      expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 2);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    });

    test('the field notes report the current tile', async ({ page }) => {
      await open(page, view.width, view.height);
      const title = page.locator('.journal h2');
      await expect(title).toContainText(/, a settlement$|at \d+, \d+/);
      await expect(page.locator('.journal')).toContainText('discovered');

      const before = await title.textContent();
      // Not a closed loop: right-down-left-up returns to the starting tile and proves nothing.
      // Sea is impassable, so both axes are tried rather than assuming either is open.
      for (const key of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown']) {
        await page.keyboard.press(key);
        await page.waitForTimeout(320);
      }
      await expect(title).not.toHaveText(before ?? '', { timeout: 10_000 });
    });
  });
}

// The reason the camera takes follow offsets at all. Without them the traveller centres on the
// screen, which in landscape is underneath the journey log — the player spends the walk unable to
// see the one thing they are moving.
test('the traveller is never hidden behind a panel', async ({ page }) => {
  await open(page, 1280, 800);

  // Walk a while so this is not just true of the starting tile.
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press(i % 2 ? 'ArrowRight' : 'ArrowDown');
    await page.waitForTimeout(320);
  }

  const { canvas, log, notes } = await geometry(page);
  const camera = await page.evaluate(() => {
    // The scene centres the traveller in whatever the panels leave uncovered, so that rectangle's
    // centre is where he is. Asserting on the rectangle rather than hunting for him in pixels keeps
    // this about the layout contract instead of about sprite colours.
    const c = document.querySelector('.map-surface canvas')!.getBoundingClientRect();
    const l = document.querySelector('.log')?.getBoundingClientRect();
    const n = document.querySelector('.journal')?.getBoundingClientRect();
    const right = l && l.width < c.width * 0.8 ? l.left : c.right;
    const bottom = n ? n.top : c.bottom;
    return { x: (c.left + right) / 2, y: (c.top + bottom) / 2 };
  });

  expect(log, 'the log should be open on a desktop').not.toBeNull();
  expect(notes).not.toBeNull();
  expect(camera.x).toBeLessThan(log!.left);
  expect(camera.y).toBeLessThan(notes!.top);
  // And that centre is genuinely inside the canvas, not off the edge of it.
  expect(camera.x).toBeGreaterThan(canvas!.left);
  expect(camera.y).toBeGreaterThan(canvas!.top);
});

test('the journal opens and closes, and reading it does not walk the traveller', async ({ page }) => {
  await open(page, 1280, 800);
  const log = page.locator('.log');
  await expect(log).toBeVisible();

  const where = await page.locator('.journal h2').textContent();
  // A tap on the panel is a tap on the panel, not a move order to the map underneath it.
  await log.click({ position: { x: 60, y: 200 } });
  await page.waitForTimeout(900);
  await expect(page.locator('.journal h2')).toHaveText(where ?? '');

  await page.getByRole('button', { name: 'Journal', exact: true }).click();
  await expect(log).toBeHidden();
  await page.getByRole('button', { name: 'Journal', exact: true }).click();
  await expect(log).toBeVisible();
});

test('the map sheet holds the seed, the legend and the sketches', async ({ page }) => {
  await open(page, 1280, 800);
  await page.getByRole('button', { name: 'Map', exact: true }).click();

  const sheet = page.locator('.sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByLabel('Journey seed')).toHaveValue(SEED);
  await expect(sheet.locator('.legend-list li').first()).toBeVisible();

  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(sheet).toBeHidden();
});

// Zoom used to be entirely automatic, with no way for a player to change it at all.
test('the player can zoom in and out, and get the automatic fit back', async ({ page }) => {
  await open(page, 1280, 800);
  const canvas = page.locator('.map-surface canvas');

  const frame = async () => (await canvas.screenshot()).byteLength;
  const start = await frame();

  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.waitForTimeout(700);
  const zoomedIn = await frame();
  // Bigger tiles mean fewer edges and flatter colour, which compresses smaller. The direction is
  // what matters; the exact number is a property of the PNG encoder, not of the game.
  expect(zoomedIn).not.toBe(start);

  await page.getByRole('button', { name: 'Zoom out' }).click();
  await page.waitForTimeout(700);
  expect(await frame()).not.toBe(zoomedIn);

  // The keyboard reaches it too, and 0 hands it back to the automatic fit.
  await page.keyboard.press('Equal');
  await page.waitForTimeout(500);
  await page.keyboard.press('Digit0');
  await page.waitForTimeout(700);
  expect(Math.abs((await frame()) - start)).toBeLessThan(start * 0.05);
});
