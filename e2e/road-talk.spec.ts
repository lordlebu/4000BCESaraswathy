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

type Seen = { id: string; named: boolean; visible: boolean; tile: { x: number; y: number } | null };

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
  page.evaluate(
    () => (window as unknown as { __walker?: () => { x: number; y: number } }).__walker?.() ?? null
  );

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
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      // A private window raises here; there is nothing saved to clear.
    }
  });
  const t = who.tile!;
  for (const d of [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: -1 }]) {
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

test('a traveller in view is named on the rail, and greyed until you are beside them', async ({ page }) => {
  const seen = await onTheRoad(page);
  // Somebody is drawn, so if the player is not within six tiles of anybody the row is absent. Either
  // way, what is on the rail must agree with what the scene drew: never a row for nobody.
  const me = await walker(page);
  const near = seen.some((t) => Math.max(Math.abs(t.tile!.x - me!.x), Math.abs(t.tile!.y - me!.y)) <= 6);
  if (!near) await expect(talkRow(page)).toHaveCount(0);
  else await expect(talkRow(page)).toHaveCount(1, { timeout: 10_000 });
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
