// Does a woven event actually open, in a real page, through the real path?
//
// **The one thing no Node test can say.** `test/happenings.test.ts` proves every template, every
// ration and every line against the real maps -- and would still pass if `App` never asked. This
// codebase's signature fault is exactly that shape, so the page exposes `__happen` and this uses
// it: the same surroundings, the same `seen` and `met`, the same card a step would open, with only
// the ration skipped.

import { expect, test, type Page } from '@playwright/test';

type Happen = (occasion: string, kind?: string, shelter?: string, poiId?: string) => boolean;

async function boot(page: Page) {
  // Mid-morning, so road company are out on the road rather than stopped at a place.
  await page.goto('?seed=happenings&hour=10');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
}

/** Ask for an event, retrying until the traveller has a tile to have it on. */
async function happen(page: Page, occasion: string, kind: string, shelter?: string) {
  await expect
    .poll(
      () =>
        page.evaluate(
          ([o, k, s]) => (window as unknown as { __happen?: Happen }).__happen?.(o!, k, s) ?? false,
          [occasion, kind, shelter] as const
        ),
      { timeout: 20_000 }
    )
    .toBe(true);
}

const card = (page: Page) => page.locator('.activity-card');

/**
 * **A written happening, from canon, through the same card.** Arriving at the Caravan Ground asks the
 * arrival question with that point; *Where you stop* is canon's `happening_where_you_stop`, narrowed
 * to it, and a written happening wins over a woven one whenever it can happen -- no ration.
 */
test('a written happening opens on arriving where it belongs, and happens once', async ({ page }) => {
  await page.goto('?seed=happenings&map=field_map_dwarka&door=open');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          (window as unknown as { __happen?: Happen }).__happen?.('arriving', undefined, undefined, 'poi_caravan_camp') ?? false
        ),
      { timeout: 20_000 }
    )
    .toBe(true);

  await expect(card(page).locator('h2')).toHaveText('Where you stop');
  await expect(card(page)).toContainText('This is where you stop, she says.');
  // Its own painting, found by the canon id underscores and all -- not the night's scene.
  await expect(card(page).locator('img.activity-scene')).toHaveAttribute('src', /happening_where_you_stop/);
  await card(page).getByRole('button', { name: 'Ask who stopped here first' }).click();
  await expect(card(page)).toContainText("Her grandfather's caravan stopped here");
  await card(page).getByRole('button', { name: 'Go on' }).click();
  await expect(card(page)).toBeHidden();

  // Once. Arriving again finds nothing written, so a woven arrival may open or nothing may -- but
  // never *Where you stop* a second time.
  const again = await page.evaluate(
    () => (window as unknown as { __happen?: Happen }).__happen?.('arriving', undefined, undefined, 'poi_caravan_camp') ?? false
  );
  if (again) await expect(card(page).locator('h2')).not.toHaveText('Where you stop');
});

test('a woven event opens, is chosen, and closes', async ({ page }) => {
  await boot(page);
  await happen(page, 'night', 'dream', 'roof');

  await expect(card(page).locator('h2')).toHaveText('A dream');
  await card(page).getByRole('button', { name: 'Let it go' }).click();
  await expect(card(page)).toContainText('you remember only that it was quiet');
  await card(page).getByRole('button', { name: 'Go on' }).click();
  await expect(card(page)).toBeHidden();
});

test('a stranger tells you their name, and greets you by it the next time', async ({ page }) => {
  await boot(page);
  await happen(page, 'road', 'company');

  await expect(card(page).locator('h2')).toHaveText('Company on the road');
  // Their face is on the card, drawn or painted.
  await expect(card(page).locator('.stranger-face')).toBeVisible();
  await card(page).getByRole('button', { name: 'Walk together a while' }).click();
  const line = (await card(page).locator('.activity-prose').textContent()) ?? '';
  const name = line.match(/Their name is (\w+)/)?.[1];
  expect(name, `no name in "${line}"`).toBeTruthy();
  await card(page).getByRole('button', { name: 'Go on' }).click();
  await expect(card(page)).toBeHidden();

  // The same stranger, met again: `met` was recorded by the choice above.
  await happen(page, 'road', 'company-again');
  await expect(card(page).locator('h2')).toHaveText('A face you know');
  await expect(card(page).locator('.activity-prose')).toContainText(`${name}, the`);
});

test('sheltering a stranger is remembered, so the kindness can come back', async ({ page }) => {
  // The chain's other half is proven under Node; what only a page can prove is that a choice's
  // `sets` reaches the saved journey, where the road will look for it.
  await boot(page);
  await happen(page, 'night', 'knock', 'roof');
  await expect(card(page).locator('h2')).toHaveText('Somebody after dark');
  await card(page).getByRole('button', { name: 'Make room' }).click();
  await card(page).getByRole('button', { name: 'Go on' }).click();

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const raw = localStorage.getItem('south-of-tethys:happenings');
          return raw ? ((JSON.parse(raw) as { flags?: string[] }).flags ?? []) : [];
        }),
      { timeout: 15_000 }
    )
    .toEqual([expect.stringMatching(/^sheltered:field_map_[a-z]+:company_[a-z]+$/)]);
});

test('the Asura-Tainted Princess walks up and says hi', async ({ page }) => {
  // The first person who comes to you rather than waiting to be found. In play she does it the
  // first time you reach the Cloud Stair; `__approach` sends the same message from wherever you
  // are, so what this proves is the walk and the conversation it opens.
  await page.goto('?seed=princess&map=field_map_narmada&hour=10');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(
      () =>
        page.evaluate(
          () => (window as unknown as { __approach?: (id: string) => boolean }).__approach?.('npc_asura_princess') ?? false
        ),
      { timeout: 20_000 }
    )
    .toBe(true);

  // Her conversation opens once she has walked over, with her own portrait and her own first line.
  const dock = page.locator('.dock[data-occupant="conversation"]');
  await expect(dock).toBeVisible({ timeout: 15_000 });
  await expect(dock).toContainText('The Asura-Tainted Princess');
  await expect(dock).toContainText('Hi.', { timeout: 15_000 });
  await expect(dock.locator('img.person-portrait')).toBeVisible();

  // And she is standing beside the traveller, a head taller than a traveller from the road.
  type Visitor = { npcId: string; visible: boolean; x: number; y: number; player: { x: number; y: number }; h: number };
  const [her] = (await page.evaluate(
    () => (window as unknown as { __visitors?: () => unknown[] }).__visitors?.() ?? []
  )) as Visitor[];
  expect(her?.npcId).toBe('npc_asura_princess');
  expect(her!.visible).toBe(true);
  expect(Math.max(Math.abs(her!.x - her!.player.x), Math.abs(her!.y - her!.player.y)), 'not beside the traveller').toBeLessThanOrEqual(1);
  expect(her!.h, 'drawn at her own taller cell').toBe(88);
});

/**
 * **The strait from the rim**: arriving at the Far Landing, the second floating island, opens canon's
 * happening with the owner's painting of a woman watching the ships. Written, so it wins over anything
 * woven, and once only. It was the First Pier's until 4 October 2026, when the owner asked for the
 * Aravali's cards to be spread out: the first island has the Alms Step's card now.
 */
test('the Far Landing shows the strait from the rim, with its painting, once', async ({ page }) => {
  await page.goto('?seed=happenings&map=field_map_aravali&door=open&hour=10');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  const arrive = () =>
    page.evaluate(() => (window as unknown as { __happen?: Happen }).__happen?.('arriving', undefined, undefined, 'poi_far_landing') ?? false);
  await expect.poll(arrive, { timeout: 20_000 }).toBe(true);
  await expect(card(page).locator('h2')).toHaveText('The strait from the rim');
  await expect(card(page).locator('img.activity-scene')).toHaveAttribute('src', /happening_the_strait_from_the_rim/);
  await card(page).getByRole('button', { name: 'Kneel beside her and watch' }).click();
  await expect(card(page)).toContainText('what she comes up for');
  await card(page).getByRole('button', { name: 'Go on' }).click();
  await expect(card(page)).toBeHidden();
  // Asked again on the same arrival: canon's happening has been, so it is not this card.
  if (await arrive()) await expect(card(page).locator('h2')).not.toHaveText('The strait from the rim');
});

/**
 * **The Aravali's written cards, spread across the crossing** (the owner, 4 October 2026). They used
 * to land together in the first hour. Now each belongs to its own place, north across the map: the
 * Alms Step on the first island, the strait at the Far Landing, the sleeping stranger at the Kept
 * Stones on the north bank. The First Pier, where they used to start, holds none of them.
 */
test("the Aravali's cards each wait for their own place", async ({ page }) => {
  await page.goto('?seed=happenings-spread&map=field_map_aravali&door=open&hour=10');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  const arrive = (poiId: string) =>
    page.evaluate((id) => (window as unknown as { __happen?: Happen }).__happen?.('arriving', undefined, undefined, id) ?? false, poiId);
  const close = async () => {
    await card(page).getByRole('button').first().click();
    await card(page).getByRole('button', { name: 'Go on' }).click();
    await expect(card(page)).toBeHidden();
  };

  // The First Pier opens none of the written three.
  if (await arrive('poi_first_pier')) {
    await expect(card(page).locator('h2')).not.toHaveText(/The strait from the rim|Alms on the step|A stranger asleep/);
    await close();
  }
  for (const [poiId, title] of [
    ['poi_alms_step', 'Alms on the step'],
    ['poi_kept_stones', 'A stranger asleep']
  ] as const) {
    await expect.poll(() => arrive(poiId), { timeout: 20_000 }).toBe(true);
    await expect(card(page).locator('h2')).toHaveText(title);
    // The Alms Step's card draws the owner's painting of 4 October 2026.
    if (poiId === 'poi_alms_step') await expect(card(page).locator('img.activity-scene')).toHaveAttribute('src', /happening_alms_on_the_step/);
    await close();
  }
});

/**
 * **A card opened on the step that reaches the landmark waits behind its page.** The scene says where
 * you stand before it says you have arrived, so a camp beside the landmark opened its welcome first
 * and the page came up under it -- `playthrough.spec.ts` failed that way twice. Asked for mid-step
 * here, so the card is open before the page; the page must be the one on top, and the card must come
 * back once it is closed.
 */
test('a card opened as the landmark is reached waits behind the page, and returns after it', async ({ page }) => {
  await page.goto('?seed=happenings&door=open&hour=10');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith('south-of-tethys:world:happenings')), null, { timeout: 60_000 });
  const spot = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('south-of-tethys:world:happenings'))!;
    const baked = JSON.parse(localStorage.getItem(key)!) as { landmark: { x: number; y: number }; biomes: string[] };
    return { ...baked.landmark, width: baked.biomes[0]!.length, height: baked.biomes.length };
  });
  const sides: [number, number, string][] = [[-1, 0, 'ArrowRight'], [1, 0, 'ArrowLeft'], [0, -1, 'ArrowDown'], [0, 1, 'ArrowUp']];
  const arrival = page.locator('.arrival');
  let reached = false;
  for (const [dx, dy, key] of sides) {
    const x = spot.x + dx, y = spot.y + dy;
    if (x < 0 || y < 0 || x >= spot.width || y >= spot.height) continue;
    await page.goto(`?seed=happenings&door=open&hour=10&at=${x},${y}`);
    await page.waitForFunction(() => Boolean((window as unknown as { __walker?: unknown }).__walker), null, { timeout: 60_000 });
    await page.waitForTimeout(1000);
    await page.keyboard.press(key);
    // Mid-step: the card opens before the step lands and the page arrives.
    const opened = await page.evaluate(() => (window as unknown as { __happen?: Happen }).__happen?.('road', 'tracks') ?? false);
    if (await arrival.waitFor({ timeout: 20_000 }).then(() => true, () => false)) {
      reached = opened;
      break;
    }
  }
  expect(reached, 'never had a card open as the landmark was reached').toBe(true);
  // The page is what a press lands on, not a card's veil over it.
  const keep = page.getByRole('button', { name: 'Keep this page' });
  await expect(keep).toBeVisible();
  const onTop = await keep.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return hit === el || el.contains(hit);
  });
  expect(onTop, 'a card sits over the landmark page').toBe(true);
  await expect(card(page)).toHaveCount(0);
  // Closed, the card that was waiting comes back.
  await page.keyboard.press('Escape');
  await expect(arrival).toBeHidden();
  await expect(card(page)).toBeVisible({ timeout: 10_000 });
});

/**
 * **Nothing opens over the landmark's page.** A camp pitched beside the landmark put its welcome
 * on top of the journey's end, so the player was left facing a dacoit band with the page beneath
 * it -- which is how `playthrough.spec.ts` failed, on the days its walk passed a camp. The page
 * holds every card back (`pageOpenRef`), and the same question asked once it closes is answered.
 */
test('no card opens over the landmark page, and asking again once it closes is answered', async ({ page }) => {
  await page.goto('?seed=happenings&door=open&hour=10');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith('south-of-tethys:world:happenings')), null, { timeout: 60_000 });
  const spot = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('south-of-tethys:world:happenings'))!;
    const baked = JSON.parse(localStorage.getItem(key)!) as { landmark: { x: number; y: number }; biomes: string[] };
    const { x, y } = baked.landmark;
    return { x, y, width: baked.biomes[0]!.length, height: baked.biomes.length };
  });
  // Stand beside it and step on. Whichever side the ground allows: a refused step is no step.
  const sides: [number, number, string][] = [[-1, 0, 'ArrowRight'], [1, 0, 'ArrowLeft'], [0, -1, 'ArrowDown'], [0, 1, 'ArrowUp']];
  const arrival = page.locator('.arrival');
  for (const [dx, dy, key] of sides) {
    const x = spot.x + dx, y = spot.y + dy;
    if (x < 0 || y < 0 || x >= spot.width || y >= spot.height) continue;
    await page.goto(`?seed=happenings&door=open&hour=10&at=${x},${y}`);
    await page.waitForFunction(() => Boolean((window as unknown as { __walker?: unknown }).__walker), null, { timeout: 60_000 });
    await page.waitForTimeout(1000);
    await page.keyboard.press(key);
    if (await arrival.waitFor({ timeout: 20_000 }).then(() => true, () => false)) break;
  }
  await expect(arrival, 'never stood on the landmark').toBeVisible();

  const ask = () => page.evaluate(() => (window as unknown as { __happen?: Happen }).__happen?.('road', 'tracks') ?? false);
  expect(await ask(), 'a card opened over the landmark page').toBe(false);
  await expect(card(page)).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(arrival).toBeHidden();
  await expect.poll(ask, { timeout: 20_000 }).toBe(true);
});
