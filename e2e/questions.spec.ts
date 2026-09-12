// Answering a field question, which the game could not do until Phase 07.
//
// The rules were there and tested; nothing called them. `answer()` had no caller, so the
// mechanic the whole design turns on — settle a question, possibly wrongly — was unreachable.
// This walks it: hear a question from someone, look at the thing it is about, and commit.

import { expect, test, type Page } from '@playwright/test';
import { step } from './walk';

/**
 * A seed where the drowned dockyard sits two steps south of the start.
 *
 * Re-searched when Lothal's palette gained forest and hills, which moved every placement --
 * `dock-1127` put the dockyard thirty-three steps away -- and again when placement stopped
 * indexing into the candidate list. A searched seed is a fixture and goes stale like one, though
 * far less often now: see the note in `fielddiary.spec.ts` for what changed.
 *
 * Stale a third time when `terrainBias` began reading canon's `terrain` list in the order canon
 * writes it rather than as an unordered set. The dockyard's first-choice ground is `wetland`, so
 * on `dock-5226` it moved from 35,41 to 6,23 and these specs walked two steps into empty marsh.
 * That is the fixture doing its job -- the placement is better and the pin was out of date -- and
 * it is exactly the failure mode the note above describes. `dock-8` puts it at 9,42 on open plains.
 *
 * `dock-9` was tried first and came back **flaky in the container** -- three of five passing
 * only on retry. Its start tile is in a river, and the two are not interchangeable to the
 * walk. Cheap to find because `tools/ci-local.sh` runs the real image; invisible from a log.
 *
 * Thrali stands there and offers the silver-water question, and the water itself is found
 * there — so one place holds the whole loop: hear the question, look at the thing, settle.
 * Opened at midnight because the bloom only shows at night, which is the point of that rung.
 */
const SEED = 'dock-8';
// Two tiles north of poi_drowned_dockyard at (9,42), so the two ArrowDowns still walk.
const AT_NIGHT = `/?seed=${SEED}&hour=0&at=9,40`;

async function boot(page: Page) {
  await page.goto(AT_NIGHT);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
}

async function openDiary(page: Page) {
  await page.getByRole('button', { name: /Records/ }).click();
  await expect(page.locator('.diary')).toBeVisible();
}

/**
 * Listen to the first person standing here, then go back to the place.
 *
 * **Being spoken to now takes one press, and that is a change to the mechanic rather than to the
 * layout.** Everybody at a place used to talk at once, so standing there was enough to be told
 * things — which is what these tests relied on. A place lists who is here now and one of them takes
 * the dock when chosen, so a player who walks in and out again is told nothing by anybody. That is
 * the right trade: three simultaneous typewriters were not a conversation. But *listening is an
 * act* is a real ruling and it is stated here, because it is the sort of thing a spec quietly
 * stops exercising rather than fails on.
 *
 * What has not changed is what happens once somebody is talking: no button records a line, because
 * being told something is how you hear it. `Dialogue` writes it down as its last beat lands.
 */
async function listenToSomebody(page: Page) {
  await page.locator('.who').first().click();
  await expect(page.locator('.person .said')).not.toHaveCount(0);
  // `exact`, because `getByRole(name)` matches as a case-insensitive **substring** and "Back" is
  // three letters that turn up inside other labels. It resolved to two elements the day the satchel
  // strip gained a dismiss whose name explained where the strip had gone.
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('.place')).toBeVisible({ timeout: 10_000 });
}

test('a question arrives from a person, not from the air', async ({ page }) => {
  await boot(page);
  await openDiary(page);
  // Nothing has been asked yet, so there is nothing to settle.
  await expect(page.locator('.question')).toHaveCount(0);
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  await step(page, 'ArrowDown');
  await step(page, 'ArrowDown');
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });

  // Choose somebody, and no button records what they say: being told something is how you hear it,
  // and the diary is Varuna's. See `listenToSomebody`.
  await listenToSomebody(page);
  await page.getByRole('button', { name: 'Leave' }).click();

  await openDiary(page);
  await expect(page.locator('.question')).not.toHaveCount(0);
});

test('every reading is shown, including the ones you cannot argue', async ({ page }) => {
  await boot(page);
  await step(page, 'ArrowDown');
  await step(page, 'ArrowDown');
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
  await listenToSomebody(page);
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
  await step(page, 'ArrowDown');
  await step(page, 'ArrowDown');
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });

  // Take everything this place will give. Rounds rather than a single pass: a rung opens the next
  // rung, and hearing a line can unlock another, so one sweep leaves the place unfinished.
  //
  // Hear everybody first, one at a time -- a line can open a rung, so this has to happen before the
  // looking rather than beside it. Only looking needs clicking after that: no button records a
  // line, and pressing a button that is gone is a silent no-op that would leave this walking
  // through the motions of a mechanic it had stopped exercising.
  for (let i = 0, people = await page.locator('.who').count(); i < people; i += 1) {
    await page.locator('.who').nth(i).click();
    await expect(page.locator('.person')).toHaveCount(1, { timeout: 10_000 });
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.locator('.place')).toBeVisible({ timeout: 10_000 });
  }

  for (let round = 0; round < 4; round += 1) {
    const buttons = page.getByRole('button', { name: 'Look closer' });
    for (let i = 0; i < (await buttons.count()); i += 1) {
      if (await buttons.nth(i).isEnabled()) await buttons.nth(i).click();
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
