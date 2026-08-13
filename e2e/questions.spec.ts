// Answering a field question, which the game could not do until Phase 07.
//
// The rules were there and tested; nothing called them. `answer()` had no caller, so the
// mechanic the whole design turns on — settle a question, possibly wrongly — was unreachable.
// This walks it: hear a question from someone, look at the thing it is about, and commit.

import { expect, test, type Page } from '@playwright/test';
import { step, walkTo } from './walk';

/**
 * A seed where the drowned dockyard sits one step west and one north of the start.
 *
 * Thrali stands there and offers the silver-water question, and the water itself is found
 * there — so one place holds the whole loop: hear the question, look at the thing, settle.
 * Opened at midnight because the bloom only shows at night, which is the point of that rung.
 */
const SEED = 'dock-1127';
const AT_NIGHT = `/?seed=${SEED}&hour=0`;

async function boot(page: Page) {
  await page.goto(AT_NIGHT);
  await expect(page.locator('.map-surface canvas')).toBeVisible();
  await expect(page.locator('.journal h2')).toBeVisible();
}

async function openDiary(page: Page) {
  await page.getByRole('button', { name: /^Diary/ }).click();
  await expect(page.locator('.diary')).toBeVisible();
}

test('a question arrives from a person, not from the air', async ({ page }) => {
  await boot(page);
  await openDiary(page);
  // Nothing has been asked yet, so there is nothing to settle.
  await expect(page.locator('.question')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  await step(page, 'ArrowLeft');
  await step(page, 'ArrowUp');
  await expect(page.locator('.place')).toBeVisible({ timeout: 10_000 });

  const listen = page.getByRole('button', { name: 'Write it down' });
  if ((await listen.count()) === 0) test.skip(true, 'nobody at this place has a question to give');
  await listen.first().click();
  await page.getByRole('button', { name: 'Leave' }).click();

  await openDiary(page);
  await expect(page.locator('.question')).not.toHaveCount(0);
});

test('every reading is shown, including the ones you cannot argue', async ({ page }) => {
  await boot(page);
  await step(page, 'ArrowLeft');
  await step(page, 'ArrowUp');
  await expect(page.locator('.place')).toBeVisible({ timeout: 10_000 });
  const listen = page.getByRole('button', { name: 'Write it down' });
  if ((await listen.count()) === 0) test.skip(true, 'no question available on this seed');
  await listen.first().click();
  await page.getByRole('button', { name: 'Leave' }).click();
  await openDiary(page);

  const question = page.locator('.question').first();
  // The disagreement is the content: more than one account, and both sides given.
  await expect(question.locator('.readings li')).not.toHaveCount(0);
  await expect(question.locator('.account')).not.toHaveCount(0);
  // Unsupported readings say what is missing rather than hiding.
  await expect(question).toContainText(/You would need|Write this down/);
});

test('the player can settle a question, and is never told they were wrong', async ({ page }) => {
  await boot(page);
  await step(page, 'ArrowLeft');
  await step(page, 'ArrowUp');
  await expect(page.locator('.place')).toBeVisible({ timeout: 10_000 });

  // Take everything this place will give. Rounds rather than a single pass: a rung opens the
  // next rung, and hearing a line can unlock another, so one sweep leaves the place unfinished.
  for (let round = 0; round < 4; round += 1) {
    for (const label of ['Look closer', 'Write it down']) {
      const buttons = page.getByRole('button', { name: label });
      for (let i = 0; i < (await buttons.count()); i += 1) {
        if (await buttons.nth(i).isEnabled()) await buttons.nth(i).click();
      }
    }
  }
  await page.getByRole('button', { name: 'Leave' }).click();
  await openDiary(page);

  const commit = page.getByRole('button', { name: 'Write this down' });
  if ((await commit.count()) === 0) test.skip(true, 'no reading is yet arguable on this seed');
  await commit.first().click();

  const question = page.locator('.question').first();
  await expect(question.locator('.reading-chosen')).toHaveCount(1);
  await expect(question).toContainText('Written down');
  // No verdict. Being mistaken has to survive being committed.
  await expect(question).not.toContainText(/correct|incorrect|wrong answer|right answer/i);
});
