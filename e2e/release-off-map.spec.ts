// A press released off the map must not stop the next click from walking.
//
// Reported from play on every map as "the player will not move, and the page still answers". The
// scene counted presses and releases so a pinch would not walk the traveller, and heard only the
// releases that landed on the canvas. One press dragged onto a panel and let go there left the
// count at one for the rest of the session, and every click after it read as a second finger.
// Reproduced here at ten clicks out of ten refused, on Dwarka and on Narmada, before the fix.
//
// A browser spec because the unit test in `test/gesture.test.ts` proves the rule and cannot prove
// the scene is listening for `POINTER_UP_OUTSIDE` at all -- which was the whole fault.

import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

type Walker = {
  x: number;
  y: number;
  biome: string | null;
  moving: boolean;
  queued: number;
  screen: { x: number; y: number };
  cell: number;
};

const walker = (page: Page) =>
  page.evaluate(() => (window as unknown as { __walker?: () => Walker }).__walker?.() ?? null);

async function canvasBox(page: Page) {
  const box = await page.locator('.map-surface canvas').boundingBox();
  if (!box) throw new Error('the map canvas has no box');
  return box;
}

/** Click near the traveller in each direction until one sets him walking. */
async function clickSetsHimWalking(page: Page): Promise<boolean> {
  const box = await canvasBox(page);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const before = await walker(page);
  for (const [dx, dy] of [[90, 0], [-90, 0], [0, 90], [0, -90]] as const) {
    await page.mouse.click(cx + dx, cy + dy);
    const moved = await page
      .waitForFunction(
        (from) => {
          const w = (window as unknown as { __walker?: () => Walker }).__walker?.();
          return Boolean(w && (w.x !== from.x || w.y !== from.y || w.moving || w.queued > 0));
        },
        before!,
        { timeout: 4000 }
      )
      .then(() => true)
      .catch(() => false);
    if (moved) return true;
  }
  return false;
}

test('a click still walks after a press was let go off the map', async ({ page }) => {
  await page.goto('/?seed=release-off-map&map=field_map_dwarka&door=open');
  await page.waitForFunction(() => Boolean((window as unknown as { __walker?: unknown }).__walker), null, {
    timeout: 60_000
  });

  // Press on the map, drag past its right edge, and let go out there.
  const box = await canvasBox(page);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 40, box.y + 20, { steps: 8 });
  await page.mouse.up();

  expect(await clickSetsHimWalking(page), 'the click after an off-map release was refused').toBe(true);
});

/**
 * The biome order the bake encodes with, read out of the source rather than restated -- the reason
 * `e2e/baked.spec.ts` gives: importing it drags in the canon bundle, which Playwright's loader
 * refuses, and a hand-copied list would drift.
 */
const BIOME_CODES = [...readFileSync('src/world/bake.ts', 'utf8')
  .split('export const BIOME_CODES')[1]!
  .split('];')[0]!
  .matchAll(/'([a-z_]+)'/g)].map((m) => m[1]!);
const UNWALKABLE = new Set(['sea', 'open_sky', 'sky_underside']);
/** `track` and `plank` bits in the bake's flag mask: either makes an unwalkable tile walkable. */
const CROSSABLE = 0b1100;

test('a click on open air walks toward it instead of doing nothing', async ({ page }) => {
  // Stand on a floating island and click a tile of open sky beside it. `findPath` has no route
  // there, and before this the click was dropped -- which is how the Aravali's far shore read as a
  // frozen game. The tile is chosen from the stored world, not guessed from a pixel.
  const seed = 'release-off-map';
  const map = 'field_map_aravali';
  await page.goto(`/?seed=${seed}&map=${map}&door=open&at=board`);
  await page.waitForFunction(() => Boolean((window as unknown as { __walker?: unknown }).__walker), null, {
    timeout: 60_000
  });
  // The camera fades in and settles its zoom after boot; a tile's screen position read before that
  // is somewhere else by the time the click lands. Wait until two readings agree.
  await page.waitForFunction(
    () => {
      const w = (window as unknown as { __walker?: () => Walker }).__walker?.();
      const g = globalThis as { __last?: string };
      const now = w ? `${Math.round(w.screen.x)},${Math.round(w.screen.y)},${w.cell}` : '';
      const still = now !== '' && now === g.__last;
      g.__last = now;
      return still;
    },
    null,
    { timeout: 20_000, polling: 300 }
  );

  const baked = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k) ?? 'null') as { biomes: string[]; flags: string[] } | null,
    `south-of-tethys:world:${seed}:${map}`
  );
  expect(baked, 'no stored world to read the ground from').not.toBeNull();
  const w = (await walker(page))!;
  const box = await canvasBox(page);

  // The unwalkable tile nearest the traveller that is still on screen.
  let target: { x: number; y: number } | null = null;
  let bestGap = Infinity;
  baked!.biomes.forEach((row, y) => {
    [...row].forEach((code, x) => {
      const biome = BIOME_CODES[Number.parseInt(code, 36)]!;
      const mask = Number.parseInt(baked!.flags[y]![x]!, 36);
      if (!UNWALKABLE.has(biome) || mask & CROSSABLE) return;
      const sx = w.screen.x + (x - w.x) * w.cell;
      const sy = w.screen.y + (y - w.y) * w.cell - w.cell / 2;
      if (sx < w.cell || sy < w.cell || sx > box.width - w.cell || sy > box.height - w.cell) return;
      const gap = Math.hypot(x - w.x, y - w.y);
      if (gap >= 2 && gap < bestGap) {
        bestGap = gap;
        target = { x: sx, y: sy };
      }
    });
  });
  expect(target, 'no open sky on screen beside the island').not.toBeNull();

  await page.mouse.click(box.x + target!.x, box.y + target!.y);
  const moved = await page
    .waitForFunction(
      (from) => {
        const now = (window as unknown as { __walker?: () => Walker }).__walker?.();
        return Boolean(now && (now.x !== from.x || now.y !== from.y || now.moving || now.queued > 0));
      },
      w,
      { timeout: 4000 }
    )
    .then(() => true)
    .catch(() => false);
  expect(moved, 'a click on open sky was dropped rather than walked toward').toBe(true);
});
