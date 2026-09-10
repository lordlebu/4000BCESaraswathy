// Boarding the Lodestone Line, through the keys a player actually has.
//
// `src/content/vehicles.ts` had zero importers and a full set of passing unit tests before this
// mechanic was wired. That is the shape of the three bugs `CLAUDE.md` records -- a rule written,
// tested, and never called -- and no unit test can catch it, because the unit tests were the
// thing that passed. So this presses the key.
//
// Deliberately not tagged `@slow`: it is one boot and two key presses, around twenty seconds,
// against the four and a half minutes of the map crossing.

import { expect, test } from '@playwright/test';

// **`at=board`, not a coordinate**, and that is a correction. This stood at `23,23` because that
// was a rail tile on the northern island of a 44 x 66 map; growing the map to 52 x 78 moved the
// line and left the spec on grass two tiles away, with the ride row correctly disabled. The failure
// said "expected /tiles of rail/, received 'Ride the line'" and nothing at all about the map having
// grown. `startTileFor` resolves this one through `canBoardAt`, which is the same rule the row
// itself asks, so the two cannot drift apart again.
const START = '?map=field_map_aravali&at=board&hour=10&door=open';

test('the line can be boarded, and it carries you across', async ({ page }) => {
  await page.goto(START);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.journal h2')).not.toHaveText('Travel Journal', { timeout: 20_000 });

  // The row exists and says what it will do. `detail` carries the distance, which is the promise
  // the ride has to keep.
  const row = page.getByRole('button', { name: /ride/i });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(/tiles of rail/);

  const before = (await page.locator('.journal h2').textContent()) ?? '';
  await page.keyboard.press('KeyB');

  // Arriving somewhere else is the whole assertion. The row's own numbers are checked in
  // `test/riding.test.ts`; what a browser adds is that the key reaches the scene at all.
  await expect(page.locator('.journal h2')).not.toHaveText(before, { timeout: 15_000 });
  const after = (await page.locator('.journal h2').textContent()) ?? '';

  // Both ends are islands, and the ride runs the length of the strait rather than a step.
  const rowOf = (text: string) => Number(text.split(',').pop());
  expect(Math.abs(rowOf(after) - rowOf(before))).toBeGreaterThan(10);
});
