// Is anybody else actually on the road?
//
// **The only check that can answer it.** `test/travellers.test.ts` proves the rules -- who travels,
// where their circuit goes, where the hour puts them -- and every one of those assertions would
// still pass if `WorldScene` never called any of it. That is this codebase's signature fault, with
// five recorded instances: a thing built, tested, believed, and wired to nothing. A Node test
// cannot see a Phaser sprite, so the scene exposes `window.__travellers` and this reads it.
//
// Two things are asserted and the second is the one that matters: that the sprites exist, and that
// they are **somewhere different at noon than at dawn**. A roster of three figures parked on one
// tile for the whole day would satisfy the first and is exactly the failure worth catching.

import { expect, test, type Page } from '@playwright/test';

type Seen = { id: string; named: boolean; sheet: string; visible: boolean; x: number; y: number };

const read = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __travellers?: () => Seen[] }).__travellers?.() ?? null
  ) as Promise<Seen[] | null>;

// `?hour=` is a clock hour from 0 to 24, not a phase -- and phase 0 is first light at six in the
// morning rather than midnight, which is exactly the confusion that put the first version of the
// walking window at noon-to-midnight. Named here so the next reader does not have to rediscover it.
async function bootAt(page: Page, hour: string): Promise<Seen[]> {
  await page.goto(`/?seed=road-company&hour=${hour}`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  // The scene moves them on its half-second gate, so they arrive a beat after the canvas.
  await page.waitForTimeout(1500);
  const seen = await read(page);
  expect(seen, 'the scene exposes no travellers at all -- is createTravellers still called?')
    .not.toBeNull();
  return seen!;
}

test('the map carries other people, and they are drawn from the built sheets', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', (m) => {
    const text = m.text();
    if (/has no frame|Texture .* not found|__MISSING/i.test(text)) warnings.push(text);
  });

  const seen = await bootAt(page, '12');

  expect(seen.length, 'nobody is travelling on this map').toBeGreaterThan(0);
  expect(seen.length, 'more travellers than the roster allows').toBeLessThanOrEqual(3);
  // Canon supplies the circuits, so at least one of them is a person canon wrote rather than road
  // company the game invented.
  expect(seen.some((t) => t.named), 'every traveller is unnamed road company').toBe(true);
  // No two the same figure: three copies of one face reads as a bug even when it is not.
  expect(new Set(seen.map((t) => t.sheet)).size, 'two travellers share a sheet').toBe(seen.length);
  expect(warnings, 'a traveller sheet did not load').toEqual([]);
});

test('they are out at noon and stopped at a place in the small hours', async ({ page }) => {
  // The rule is that a traveller is at a place at dawn and at a place at dusk, and only ever found
  // on the road in between -- so night never has to be special-cased and a meeting feels like a
  // meeting. Read at two hours rather than asserted from one, because a figure that never moves is
  // the failure this is for.
  const noon = await bootAt(page, '12');
  const night = await bootAt(page, '2');

  expect(noon.some((t) => t.visible), 'nobody is on the road at noon').toBe(true);
  expect(night.every((t) => !t.visible), 'somebody is still walking at two in the morning').toBe(true);

  const walking = noon.filter((t) => t.visible);
  const atNight = new Map(night.map((t) => [t.id, t]));
  const moved = walking.filter((t) => {
    const was = atNight.get(t.id);
    return was && (was.x !== t.x || was.y !== t.y);
  });
  expect(moved.length, 'every traveller is on the same tile at noon as at two in the morning')
    .toBeGreaterThan(0);
});
