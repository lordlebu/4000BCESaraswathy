// Talking to somebody on the road, in a browser.
//
// Reported from play: nobody on the road could be spoken to, and the only stranger who ever talked
// was the princess, because she walks up to you. `test/presence.test.ts` proves the row's words and
// `test/happenings.test.ts` proves the card; neither can see the scene report who is nearby or the
// rail act on it, which is the half this checks.
//
// **No coordinate is pinned.** The page reads where somebody is drawn at noon, then reopens with
// the traveller standing beside them. Positions are a pure function of the seed, the day
// and the hour, so the same person is on the same tile when the second page opens.

import { expect, test, type Page } from '@playwright/test';

type Seen = {
  id: string;
  named: boolean;
  visible: boolean;
  tile: { x: number; y: number } | null;
  waiting: boolean;
  marked: boolean;
};
type Walker = { x: number; y: number; screen: { x: number; y: number }; cell: number };

const SEED = 'road-company';

async function boot(page: Page, at?: { x: number; y: number }) {
  await page.goto(`/?seed=${SEED}&hour=12${at ? `&at=${at.x},${at.y}` : ''}`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
}

const travellers = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __travellers?: () => Seen[] }).__travellers?.() ?? []
  ) as Promise<Seen[]>;

const walker = (page: Page) =>
  page.evaluate(() => (window as unknown as { __walker?: () => Walker }).__walker?.() ?? null);

/** Everybody walking at noon, read off the running scene once they have been placed. */
async function onTheRoad(page: Page): Promise<Seen[]> {
  await boot(page);
  let seen: Seen[] = [];
  await expect
    .poll(async () => {
      seen = (await travellers(page)).filter((t) => t.visible && t.tile);
      return seen.length;
    }, { timeout: 20_000 })
    .toBeGreaterThan(0);
  return seen;
}

/**
 * Stand beside this traveller, or return false when every tile beside them is one the game will not
 * start on. The same page, reopened with its save cleared, so nothing from the first boot moves the
 * start -- and so a run is one browser page rather than five, which is what a slow runner can bear.
 */
async function standBeside(page: Page, who: Seen): Promise<boolean> {
  return standOff(page, who, [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: -1 }]);
}

/**
 * Stand a few tiles off this traveller: in view, and well short of beside them. To the side first,
 * so they are drawn on the open map: the dock covers the bottom of the screen, and the camera keeps
 * the player in the strip above it, so somebody three tiles north or south can be off the page.
 */
async function standAway(page: Page, who: Seen): Promise<boolean> {
  return standOff(page, who, [
    { x: -3, y: 0 },
    { x: 3, y: 0 },
    { x: -3, y: 1 },
    { x: 3, y: 1 },
    { x: -3, y: -1 },
    { x: 3, y: -1 },
    { x: 0, y: 3 },
    { x: 0, y: -3 }
  ]);
}

async function standOff(page: Page, who: Seen, offsets: { x: number; y: number }[]): Promise<boolean> {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      // A private window raises here; there is nothing saved to clear.
    }
  });
  const t = who.tile!;
  for (const d of offsets) {
    const at = { x: t.x + d.x, y: t.y + d.y };
    await boot(page, at);
    // The walker is placed a beat after the canvas. An unwalkable `?at=` falls back to the map's
    // own start, which is how a refused tile shows itself.
    await expect.poll(() => walker(page), { timeout: 30_000 }).not.toBeNull();
    const stood = await walker(page);
    if (stood && stood.x === at.x && stood.y === at.y) return true;
  }
  return false;
}

const talkRow = (page: Page) => page.locator('.tile-action button', { hasText: /Talk to|Walk with/ });

test('a traveller in view is named on the rail and marked on the map', async ({ page }) => {
  const seen = await onTheRoad(page);
  // Somebody is drawn, so if the player is not within six tiles of anybody the row is absent. Either
  // way, what is on the rail must agree with what the scene drew: never a row for nobody.
  const me = await walker(page);
  const near = seen.some((t) => Math.max(Math.abs(t.tile!.x - me!.x), Math.abs(t.tile!.y - me!.y)) <= 6);
  if (!near) {
    await expect(talkRow(page)).toHaveCount(0);
    return;
  }
  await expect(talkRow(page)).toHaveCount(1, { timeout: 10_000 });
  // Anybody in view can be called to, so the row is never greyed for distance any more.
  await expect(talkRow(page)).toBeEnabled();
  // Exactly one person carries the mark, so two people equally near can be told apart.
  await expect.poll(async () => (await travellers(page)).filter((t) => t.marked).length).toBe(1);
});

/** Where a traveller's tile is on the page, from the walker's own screen position. */
async function onScreen(page: Page, tile: { x: number; y: number }) {
  const w = (await walker(page))!;
  const box = (await page.locator('.map-surface canvas').boundingBox())!;
  return {
    x: box.x + w.screen.x + (tile.x - w.x) * w.cell,
    // The walker's point is at his feet; half a cell up is the middle of the tile.
    y: box.y + w.screen.y + (tile.y - w.y) * w.cell - w.cell / 2
  };
}

test('somebody a few tiles off stops when called to, and the conversation opens once reached', async ({ page }) => {
  // Reported from play: a traveller on a long leg out-walks the player, so somebody on the road
  // could be seen and never caught. Calling out stops them; the traveller walks up beside them.
  const named = (await onTheRoad(page)).find((t) => t.named);
  expect(named, 'nobody canon wrote is on the road at noon on this seed').toBeTruthy();
  expect(await standAway(page, named!), `nowhere to stand a few tiles from ${named!.id}`).toBe(true);

  const row = talkRow(page);
  await expect(row).toBeEnabled({ timeout: 20_000 });
  // Whoever the row means is the one marked on the map: press it and they are the one who stops.
  let marked: Seen | undefined;
  await expect
    .poll(async () => {
      marked = (await travellers(page)).find((t) => t.marked);
      return Boolean(marked);
    }, { timeout: 10_000 })
    .toBe(true);
  await expect(row).toContainText(/will stop and wait|near too/);
  await row.click();

  await expect
    .poll(async () => (await travellers(page)).find((t) => t.id === marked!.id)?.waiting, { timeout: 10_000 })
    .toBe(true);
  // A named person's conversation, or a stranger's card: either way it opens on arrival, unpressed.
  const opened = marked!.named ? page.locator('.person') : page.locator('.activity-card');
  await expect(opened.first()).toBeVisible({ timeout: 30_000 });
  const me = (await walker(page))!;
  const them = (await travellers(page)).find((t) => t.id === marked!.id)!;
  expect(
    Math.max(Math.abs(them.tile!.x - me.x), Math.abs(them.tile!.y - me.y)),
    'the conversation opened before the traveller was beside them'
  ).toBeLessThanOrEqual(1);
});

test('tapping somebody on the road chooses them, and marks them on the map', async ({ page }) => {
  // Reported from play: with two people equally near it was not clear who the row would talk to.
  const named = (await onTheRoad(page)).find((t) => t.named);
  expect(named, 'nobody canon wrote is on the road at noon on this seed').toBeTruthy();
  expect(await standAway(page, named!), `nowhere to stand a few tiles from ${named!.id}`).toBe(true);
  await expect(talkRow(page)).toBeEnabled({ timeout: 20_000 });

  // Wait for the camera to settle, or the tap lands on wherever the tile used to be.
  let last = '';
  await expect
    .poll(async () => {
      const w = await walker(page);
      const now = JSON.stringify([Math.round(w!.screen.x), Math.round(w!.screen.y), w!.cell]);
      const same = now === last;
      last = now;
      return same;
    }, { timeout: 30_000, intervals: [300] })
    .toBe(true);

  const tile = (await travellers(page)).find((t) => t.id === named!.id)!.tile!;
  const at = await onScreen(page, tile);
  // On the map, not under the dock or a button: otherwise this proves nothing about the tap.
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName ?? null, at);
  expect(hit, `${named!.id} is drawn under the interface, not on the open map`).toBe('CANVAS');
  await page.mouse.click(at.x, at.y);
  await expect
    .poll(async () => {
      const them = (await travellers(page)).find((t) => t.id === named!.id);
      return { marked: them?.marked, waiting: them?.waiting };
    }, { timeout: 10_000 })
    .toEqual({ marked: true, waiting: true });
  await expect(page.locator('.person').first()).toBeVisible({ timeout: 30_000 });
});

test('beside a named traveller, their conversation opens', async ({ page }) => {
  const named = (await onTheRoad(page)).find((t) => t.named);
  // Failures rather than skips: a spec that skips whenever the road is empty proves nothing.
  expect(named, 'nobody canon wrote is on the road at noon on this seed').toBeTruthy();
  expect(await standBeside(page, named!), `nowhere to stand beside ${named!.id}`).toBe(true);
  const there = page;

  const row = talkRow(there);
  await expect(row).toBeEnabled({ timeout: 20_000 });
  await expect(row).toContainText('Talk to');
  // By day the talk row stands where the rest row would say "there is daylight left", so the rail
  // is no longer than it was -- a fourth chip ran off the bottom of a small phone.
  await expect(there.locator('.tile-action', { hasText: /bedding|roof|night/i })).toHaveCount(0);
  await row.click();
  await expect(there.locator('.person')).toHaveCount(1, { timeout: 10_000 });
});

test('beside a stranger, walking with them opens a card about them', async ({ page }) => {
  const stranger = (await onTheRoad(page)).find((t) => !t.named);
  expect(stranger, 'no road company on the road at noon on this seed').toBeTruthy();
  expect(await standBeside(page, stranger!), `nowhere to stand beside ${stranger!.id}`).toBe(true);
  const there = page;

  const row = talkRow(there);
  await expect(row).toBeEnabled({ timeout: 20_000 });
  await expect(row).toContainText('Walk with');
  await row.click();
  const card = there.locator('.activity-card');
  await expect(card).toBeVisible({ timeout: 10_000 });
  // About somebody: the card carries the stranger's face beside its title.
  await expect(card.locator('.event-heading')).toBeVisible();

  // The first time is the company card, and walking together is how you learn their name.
  await expect(card.locator('h2')).toHaveText('Company on the road');
  await card.getByRole('button', { name: 'Walk together a while' }).click();
  const line = (await card.locator('.activity-prose').textContent()) ?? '';
  const name = line.match(/Their name is (\w+)/)?.[1];
  expect(name, `no name in "${line}"`).toBeTruthy();
  await card.getByRole('button', { name: 'Go on' }).click();
  await expect(card).toBeHidden();

  // The second time is small talk: how the map knows you, and perhaps what they have heard.
  await row.click();
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(card.locator('h2')).toHaveText(`On the road with ${name}`);
  // Its own painting, not a borrowed scene or the blank band.
  await expect(card.locator('img.activity-scene')).toHaveAttribute('src', /woven-small-talk/);
});
