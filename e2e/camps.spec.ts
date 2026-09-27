// A camp where the roads do not reach, in a browser.
//
// `test/encampments.test.ts` holds when and where a camp stands. This proves the two halves only a
// page can: that the scene draws it on the day it stands, and that walking up to it opens its card.
//
// **No day or tile is pinned.** The scene is asked which day has a camp and where (`__camp(day)`),
// the journey's clock is seeded to that day in the save, and the traveller starts beside the camp --
// so a change to where camps pitch moves this spec with it rather than breaking it.

import { expect, test, type Page } from '@playwright/test';
import { step } from './walk';

type Camp = { id: string; kind: string; at: { x: number; y: number }; visible: boolean | null };

const SEED = 'camps';
const MAP = 'field_map_lothal';
/** One day of the scene's clock, in milliseconds of walking. `DAY_MS` in `game/dayNight.ts`. */
const DAY_MS = 60 * 60 * 1000;
const TITLES: Record<string, string> = {
  adventurers: "Adventurers' fire",
  dacoits: 'A dacoit band',
  pilgrims: 'Pilgrims resting',
  drovers: "A drovers' fold"
};

const campOn = (page: Page, day?: number) =>
  page.evaluate((d) => (window as unknown as { __camp?: (d?: number) => Camp | null }).__camp?.(d) ?? null, day);

test('a camp stands on its day, and walking up to it opens its scene', async ({ page }) => {
  await page.goto(`/?seed=${SEED}&map=${MAP}&hour=12`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { __camp?: unknown }).__camp), { timeout: 20_000 }).toBe('function');

  let day = -1;
  let camp: Camp | null = null;
  for (let d = 1; d < 30 && !camp; d += 1) {
    camp = await campOn(page, d);
    if (camp) day = d;
  }
  expect(camp, 'no camp in thirty days on this seed').not.toBeNull();

  // The clock at that day, and the traveller beside the camp. Tried round it until the game will
  // start there: an unwalkable `?at=` falls back to the map's start.
  await page.addInitScript(
    ({ key, travelled }) => {
      // Into whatever is saved: the first visit above already wrote a journey under this seed, and
      // the clock is the one field that has to say it is that day.
      try {
        const saved = JSON.parse(localStorage.getItem(key) ?? '{"knowledgeVersion":1}');
        localStorage.setItem(key, JSON.stringify({ ...saved, travelled }));
      } catch {
        // Storage refused: the spec fails on the card, which is the honest outcome.
      }
    },
    { key: `south-of-tethys:${SEED}`, travelled: day * DAY_MS + DAY_MS / 4 }
  );
  const card = page.locator('.activity-card');
  let opened = false;
  // Two tiles off, then one step in: walking up to it, the way a player does. The first tile the
  // scene reports arrives before the page has the world, so starting beside it would prove nothing.
  const approaches = [
    { off: { x: 2, y: 0 }, key: 'ArrowLeft' },
    { off: { x: -2, y: 0 }, key: 'ArrowRight' },
    { off: { x: 0, y: 2 }, key: 'ArrowUp' },
    { off: { x: 0, y: -2 }, key: 'ArrowDown' }
  ];
  for (const { off, key } of approaches) {
    const at = { x: camp!.at.x + off.x, y: camp!.at.y + off.y };
    await page.goto(`/?seed=${SEED}&map=${MAP}&hour=12&at=${at.x},${at.y}`);
    await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
    const stood = await page.evaluate(() => (window as unknown as { __walker?: () => { x: number; y: number } }).__walker?.());
    if (!stood || stood.x !== at.x || stood.y !== at.y) continue;
    await step(page, key);
    if (await card.isVisible({ timeout: 8_000 }).catch(() => false)) {
      opened = true;
      break;
    }
  }
  expect(opened, 'walking up to the camp opened nothing').toBe(true);

  // The camp's own card, in the words for its kind, and drawn on the map beside the traveller.
  await expect(card.locator('h2')).toHaveText(TITLES[camp!.kind]!);
  const now = await campOn(page);
  expect(now?.id).toBe(camp!.id);
  expect(now?.visible, 'the camp is not drawn').toBe(true);

  // Every choice at a camp is takeable, and the first leads on.
  await card.locator('.activity-choice').first().click();
  await card.getByRole('button', { name: 'Go on' }).click();
  await expect(card).toBeHidden();
});
