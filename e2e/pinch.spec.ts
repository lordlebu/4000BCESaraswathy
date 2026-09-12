// Two fingers zoom the map. They must not also walk the traveller.
//
// **The fault this guards.** `WorldScene` binds tap-to-walk to `POINTER_UP` and the map is
// pinch-to-zoom, and the two knew nothing about each other: lifting either finger at the end of a
// pinch fired `POINTER_UP`, the scene read the world point under it, and the traveller set off --
// spending in-game hours on a journey nobody asked for. Every zoom on a phone ended in one.
//
// `test/gesture.test.ts` covers the rule itself, exhaustively and in milliseconds. This covers the
// half that unit test cannot: **that the scene actually asks it.** That distinction is not
// pedantry here -- a rule written, tested, believed and wired to nothing is this repository's
// signature fault and has shipped five times.
//
// Pointer events are dispatched at the canvas rather than driven through `page.touchscreen`, which
// is single-touch only and so cannot express the thing under test.

import { expect, test, type Page } from '@playwright/test';

// **Touch has to be switched on, and that is not a detail.** Phaser starts its `TouchManager` only
// when the device reports touch, so in an ordinary desktop context every pointer event -- even one
// labelled `pointerType: 'touch'` -- is routed through the mouse manager, which fills only
// `mousePointer`. `input.pointer1` and `input.pointer2` stay untouched, `updatePinch` never runs,
// and a spec written without this passes or fails for reasons that have nothing to do with the
// code. Measured while writing this: `navigator.maxTouchPoints` was 0 and the zoom never moved.
test.use({ hasTouch: true });

const START = '/?seed=dock-8&hour=12&at=9,40';

async function boot(page: Page) {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto(START);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(900);
}

/**
 * Put two fingers on the map, draw them apart, and lift them one after the other.
 *
 * Driven through CDP's `Input.dispatchTouchEvent` rather than `page.touchscreen`, which is
 * single-touch only and so cannot express the thing under test, and rather than synthetic
 * `PointerEvent`s, which Chromium delivers but Phaser's mouse path swallows.
 *
 * **Each phase waits for real frames, and the first version of this did not.** Dispatching the
 * whole gesture in one go put every event in a single tick: `updatePinch` polls `pointer1.isDown`
 * once a frame, so it saw both fingers arrive and both fingers leave in the same frame, seeded its
 * reference distance, and never got a second look. The zoom never moved and the spec failed while
 * the game was working -- the reproduction was wrong, not the code.
 *
 * The spread crosses `PINCH_THRESHOLD` (60px) on purpose: a gesture that did not actually zoom
 * would not prove the release was refused for the right reason.
 */
async function pinchApart(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const box = (await page.locator('.map-surface canvas').boundingBox())!;
  const midX = box.x + box.width / 2;
  const midY = box.y + box.height / 2;
  const fingers = (spread: number) => [
    { x: midX - spread, y: midY, id: 1 },
    { x: midX + spread, y: midY, id: 2 }
  ];

  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: fingers(40) });
  for (const spread of [70, 110, 150, 190]) {
    await page.waitForTimeout(90);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: fingers(spread) });
  }
  await page.waitForTimeout(90);
  // One finger leaves, then the other -- which is the whole of the fault. The second release is the
  // dangerous one: by then a single finger was down and it looks exactly like a tap.
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [{ x: midX - 190, y: midY, id: 1 }]
  });
  await page.waitForTimeout(60);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

test('a pinch zooms the map', async ({ page }) => {
  await boot(page);
  const surface = page.locator('.map-surface');
  const before = await surface.getAttribute('data-zoom');

  await pinchApart(page);
  await page.waitForTimeout(600);

  // Guards this spec against proving nothing: if the gesture never reaches Phaser, the test below
  // would pass for the wrong reason -- a traveller who did not move because nothing happened at
  // all.
  await expect(surface, 'the pinch did not reach the scene, so nothing below is proved').not.toHaveAttribute(
    'data-zoom',
    String(before)
  );
});

test('a pinch leaves the traveller where they were', async ({ page }) => {
  await boot(page);
  // The notes name the tile under foot, so the heading is where a step shows up. Read flat: the
  // heading carries a decorative dingbat on its own line, and comparing the raw two-line string
  // against a whitespace-normalised matcher failed once for that alone -- the test being wrong
  // rather than the game.
  const title = page.locator('.journal h2');
  const where = async () => (await title.innerText()).replace(/\s+/g, ' ').trim();
  const before = await where();
  expect(before, 'the seed no longer starts where this spec expects').toContain('9, 40');

  await pinchApart(page);
  // Long enough for a step to have landed if one were ever going to: `STEP_MS` is 425ms a tile,
  // and a walk begun by the release would have moved at least one tile inside this.
  await page.waitForTimeout(2500);

  const after = await where();
  expect(after, `the pinch walked the traveller: "${before}" became "${after}"`).toBe(before);
});
