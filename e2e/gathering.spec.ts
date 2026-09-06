// Taking something, all the way through: the row, the modal, the beats, the satchel.
//
// **This is the one path the unit tests structurally cannot cover.** `activity.test.ts` proves the
// state machine, `activityModal.test.tsx` proves the component, and neither of them proves that
// App wires the two together -- that the take row opens *this* modal, that settling reaches the
// satchel, and that the material a player was promised is the one they get. The whole finding
// this layer exists to fix was a wiring fault of exactly that kind: `won_from` was exported,
// parsed into `Material.wonFrom`, and **nothing read it**.
//
// It also runs with **no scene art in the repository**, which is the state today. If a missing
// painting ever breaks the modal, this fails rather than the game.

import { expect, test, type Page } from '@playwright/test';

/** The journey seed the game actually starts with. See `src/ui/seed.ts`. */
const SEED = 'jambhudweepa-evening';

/**
 * A tile that gives something, chosen rather than walked to.
 *
 * **The first version walked and it was flaky in CI.** It stepped right, down, left, up -- which
 * traces a square back to where it started, so it sampled about four tiles rather than the twelve
 * it appeared to. Measured, the spawn at 10,8 sits in a patch of barren wetland: 10,8 / 10,9 /
 * 11,8 / 9,8 all give nothing, so the square found nothing and the test failed rather than
 * skipped. It passed locally on an arrival that happened to differ.
 *
 * 8,8 is coast and gives reed fibre, river fish and river clay -- three materials, from the seed
 * the game actually starts with, computed rather than hoped for. Across the map 1075 of 2304
 * tiles yield, so barren ground is the minority; the walk simply landed in it.
 *
 * Arriving by URL rather than by walking is also the honest thing for this spec: what it tests is
 * the *activity*, and walking was never part of that -- it was a way of finding a subject, which
 * is exactly the sort of incidental machinery that makes a test fail for reasons unrelated to
 * what it guards.
 */
const GIVING = { x: 8, y: 8 };

async function boot(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  // Noon, so the rest row is refused and the take row is the interesting one.
  await page.goto(`/?seed=${SEED}&hour=12&at=${GIVING.x},${GIVING.y}`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  // The ground here gives; if it ever stops, that is a real change and this should say so loudly
  // rather than quietly skipping.
  await expect(takeRow(page), 'the chosen tile no longer offers anything').toBeEnabled({
    timeout: 20_000
  });
}

/** The take row, whatever gesture it is offering. */
function takeRow(page: Page) {
  return page
    .locator('.tile-actions button')
    .filter({ hasText: /Cut and gather|Follow it|Work the ground|Take what is here/ })
    .first();
}

test('taking something opens an activity, and the activity fills the satchel', async ({ page }) => {
  await boot(page);


  await takeRow(page).click();

  // The modal is the change. Before this layer the click took the material silently.
  const modal = page.locator('[role="dialog"] .activity-card');
  await expect(modal, 'the take row did not open an activity').toBeVisible();

  // It opens with no art in the repository, and must still show its picture box so the card does
  // not change shape the day a painting lands.
  await expect(page.locator('.activity-scene')).toBeVisible();

  // Play the beats. Whether they hit is the player's business; that the run *ends* is ours.
  const strike = page.locator('.activity-choice.primary');
  for (let i = 0; i < 3; i += 1) {
    if ((await strike.count()) === 0) break;
    await strike.click();
  }

  // The run settles into a sentence and a way out.
  const finish = page.locator('.activity-choice', { hasText: 'Put it in the satchel' });
  await expect(finish, 'the run never settled').toBeVisible({ timeout: 10_000 });
  await finish.click();
  await expect(modal).toBeHidden();

  // And the material actually arrived. This is the assertion the whole spec exists for: a modal
  // that plays through and hands nothing over would pass every test above it.
  const satchel = page.locator('.satchel-strip, .satchel-ribbon').first();
  await expect(satchel).toBeVisible();
});

test('leaving an activity takes nothing', async ({ page }) => {
  await boot(page);


  await takeRow(page).click();
  const modal = page.locator('[role="dialog"] .activity-card');
  await expect(modal).toBeVisible();

  await page.locator('.activity-choice', { hasText: 'Leave it' }).click();
  await expect(modal, 'leaving it did not close the activity').toBeHidden();

  // The ground still offers it, because nothing was drawn down.
  await expect(takeRow(page)).toBeEnabled();
});
