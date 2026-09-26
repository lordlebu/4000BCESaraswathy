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

type Seen = {
  id: string;
  named: boolean;
  sheet: string;
  visible: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  playerH: number;
};

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
  // Three of canon's people at most, two strangers beside them on every map, and one kin where the
  // Maru walk -- `TRAVELLERS_PER_MAP` plus `ROAD_COMPANY_PER_MAP` plus the dolmen-keeper. Written out
  // rather than imported, because a spec that imports `src/content/` never loads (see the
  // session-craft skill).
  expect(seen.length, 'more travellers than the roster allows').toBeLessThanOrEqual(6);
  expect(seen.filter((t) => !t.named).length, 'no road company on this map').toBeGreaterThan(0);
  // Canon supplies the circuits, so at least one of them is a person canon wrote rather than road
  // company the game invented.
  expect(seen.some((t) => t.named), 'every traveller is unnamed road company').toBe(true);
  // No two the same figure: copies of one face read as a bug even when they are not. The texture
  // key names the body *and* its dyes, so two carriers in different cloth are two keys.
  expect(new Set(seen.map((t) => t.sheet)).size, 'two travellers are drawn alike').toBe(seen.length);
  expect(warnings, 'a traveller sheet did not load').toEqual([]);
});

test('they are drawn smaller than the player, to leave the mount room', async ({ page }) => {
  // **The ratio, asserted where it is actually applied.** `test/characters.test.ts` proves
  // `travellerScale` halves `figureScale`; nothing under Node can prove the scene calls the right
  // one, and it called the same one for both for as long as travellers have existed -- so every
  // figure on the road was the player's own 104x160, which covers a 128 tile outright and leaves
  // nowhere to draw the cart or the raft each of them is carrying.
  //
  // Half is the target and the bounds are loose on purpose: this is guarding against "the same
  // size" and "a speck", not pinning a number that the grid could legitimately move.
  const seen = await bootAt(page, '12');
  expect(seen.length, 'nobody to measure').toBeGreaterThan(0);
  for (const t of seen) {
    expect(t.h, `${t.id} is drawn at the player's own height`).toBeLessThan(t.playerH);
    expect(t.h / t.playerH, `${t.id} is barely smaller than the player`).toBeLessThanOrEqual(0.55);
    expect(t.h / t.playerH, `${t.id} is drawn as a speck`).toBeGreaterThanOrEqual(0.25);
    // Still the same 26x40 art, so the aspect cannot have been squashed on the way down.
    expect(t.w / t.h, `${t.id} is drawn out of shape`).toBeCloseTo(26 / 40, 1);
  }
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

test('a map change leaves the last map’s people behind', async ({ page }) => {
  // **The scene is reused, not rebuilt, when you travel.** Phaser's `restart` re-enters `init` on
  // the same instance, and the traveller list was never reset there, so every map crossed added its
  // roster to the last one's -- sprites destroyed, entries kept, all of them moved every tick and
  // reported to React. One map's worth is the most there should ever be.
  const before = await bootAt(page, '12');
  await page.getByRole('button', { name: 'Where to go' }).click();
  const sheet = page.locator('.diary');
  await sheet.getByRole('button', { name: 'Travel' }).first().click();
  await expect(sheet).toBeHidden();
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2500);

  const after = await read(page);
  expect(after, 'no travellers after travelling').not.toBeNull();
  expect(after!.length, `${before.length} before, ${after!.length} after`).toBeLessThanOrEqual(6);
  expect(new Set(after!.map((t) => t.id)).size, 'a traveller is listed twice').toBe(after!.length);
});

test('a dolmen-keeper walks the Narmada beside the Maru, a head taller', async ({ page }) => {
  // **The Violet-Horned Clan, on the road.** `test/travellers.test.ts` proves the roster puts a
  // dolmen-keeper wherever the Maru drover walks; this proves the scene draws them, in their own
  // taller sheet, re-dyed like any stranger. The asura sheet was built and staged for a whole
  // round with nothing drawing it, which is the fault this exists to catch.
  await page.goto('/?seed=road-company&hour=12&map=field_map_narmada&door=open');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1500);
  const seen = (await read(page))!;
  const keeper = seen.find((t) => t.id === 'company_keeper');
  expect(keeper, `no dolmen-keeper among ${seen.map((t) => t.id).join(', ')}`).toBeDefined();
  expect(keeper!.sheet, 'the keeper is not drawn from the asura sheet').toContain('traveller-asura');
  const carrier = seen.find((t) => t.id === 'company_carrier');
  expect(carrier, 'no carrier to measure against').toBeDefined();
  expect(keeper!.h, 'the keeper is not taller than the carrier').toBeGreaterThan(carrier!.h);
});
