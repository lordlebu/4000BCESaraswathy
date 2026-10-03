// The firsts, in a browser: Thrali lends the dugout from the third day, and the first ride on the
// Aravali's line has its card. The owner's rulings of 3 October 2026.
//
// The rules are `test/firsts.test.ts` and the ask row `test/oneAtATime.test.tsx`. What only a browser
// can show is that asking reaches the card, the card puts the boat in the scene's kit, and the save
// keeps it. Cards are off under automation like the front door, so every test here asks for them.

import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { step } from './walk';

// Thrali stands at the drowned dockyard, two steps south of `at=9,40` on this seed -- the walk
// `talking.spec.ts` makes, and at night, when Thrali is there.
const SEED = 'dock-8';
const AT_THE_DOCK = `/?seed=${SEED}&hour=0&at=9,40&firsts=on`;
const DAY_MS = Number(/export const DAY_MS = ([\d *]+);/.exec(readFileSync('src/game/dayNight.ts', 'utf8'))![1]!.split('*').reduce((a, n) => a * Number(n), 1));
const SAVE = `${/const PREFIX = '([^']+)'/.exec(readFileSync('src/save.ts', 'utf8'))![1]}:${SEED}`;

type Walker = { boat: boolean };
const walker = (page: Page) => page.evaluate(() => (window as unknown as { __walker: () => Walker }).__walker());

async function walkToThrali(page: Page, url = AT_THE_DOCK) {
  await page.goto(url);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  await step(page, 'ArrowDown');
  await step(page, 'ArrowDown');
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
  // A journey a few days old can meet an ordinary event on arriving -- the dockyard's cairn, say.
  // It is the game working, not the thing under test, so answer it and go on.
  const happening = page.locator('.modal-portal .activity-choice').first();
  const appeared = await happening.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true, () => false);
  if (appeared) {
    await happening.click();
    await page.locator('.modal-portal').getByRole('button', { name: 'Go on', exact: true }).click();
  }
  await page.locator('.who', { hasText: 'Thrali' }).click();
  await expect(page.locator('.person')).toHaveCount(1, { timeout: 10_000 });
}

test('asked on the first day, Thrali says not yet, and there is no boat', async ({ page }) => {
  await walkToThrali(page);
  await page.getByRole('button', { name: 'Ask about a boat', exact: true }).click();
  // Thrali keeps the dhow's road too, so there are two rows to ask; this is the boat's answer.
  await expect(page.locator('.conversation-ask', { hasText: /Not yet/ })).toBeVisible();
  expect((await walker(page)).boat).toBe(false);
});

test('from the third day, Thrali lends the dugout with a card, and it stays lent', async ({ page, context }) => {
  // A journey two and a bit days old: the save the page writes, with its clock moved on, put back
  // before the next load -- `addInitScript`, because a direct write is overwritten by the live page.
  await page.goto(AT_THE_DOCK);
  await page.waitForFunction((k) => Boolean(localStorage.getItem(k)), SAVE, { timeout: 30_000, polling: 250 });
  const saved = JSON.parse((await page.evaluate((k) => localStorage.getItem(k), SAVE))!) as { travelled?: number };
  // Exactly two days, so `hour=0` is still midnight -- when Thrali is at the dockyard -- on the third day.
  const older = JSON.stringify({ ...saved, travelled: DAY_MS * 2 });
  await page.addInitScript(([k, v]) => localStorage.setItem(k!, v!), [SAVE, older]);

  await walkToThrali(page);
  await page.getByRole('button', { name: 'Ask about a boat', exact: true }).click();
  const card = page.getByRole('dialog', { name: 'A boat lent' });
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(card).toContainText(/a boat is lent the way a lamp is/);
  // The owner's painting of the moment, not a fallback.
  await expect(card.locator('img.activity-scene')).toHaveAttribute('src', /first-afloat-lothal/);
  await card.getByRole('button', { name: 'Take the dugout', exact: true }).click();
  await expect(card).toContainText(/Sit low and let it/);
  await card.getByRole('button', { name: 'Go on', exact: true }).click();
  await expect(card).toBeHidden();

  await expect.poll(async () => (await walker(page)).boat, { timeout: 5_000 }).toBe(true);
  await expect(page.getByRole('button', { name: 'Ask about a boat', exact: true })).toHaveCount(0);

  // Kept: the save flushes every three seconds, and a fresh page in the same browser has the boat.
  await page.waitForTimeout(3_500);
  const again = await context.newPage();
  await again.goto(`/?seed=${SEED}&hour=0&at=9,40`);
  await again.waitForFunction(() => Boolean((window as unknown as { __walker?: unknown }).__walker), null, { timeout: 60_000 });
  expect((await walker(again)).boat, 'the loan was forgotten on reload').toBe(true);
});

test('the first ride on the line has its card, and the carriage runs once it is taken', async ({ page }) => {
  await page.goto('?map=field_map_aravali&at=board&hour=10&door=open&firsts=on');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.journal h2')).not.toHaveText('Travel Journal', { timeout: 20_000 });
  await page.keyboard.press('KeyB');
  const card = page.getByRole('dialog', { name: 'The line' });
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(card).toContainText(/rests on nothing/);
  await expect(card.locator('img.activity-scene')).toHaveAttribute('src', /first-ride-aravali/);
  await card.getByRole('button', { name: 'Board', exact: true }).click();
  await card.getByRole('button', { name: 'Go on', exact: true }).click();
  type Riding = { riding: boolean };
  await expect
    .poll(async () => (await page.evaluate(() => (window as unknown as { __walker: () => Riding }).__walker())).riding, { timeout: 5_000 })
    .toBe(true);
});
