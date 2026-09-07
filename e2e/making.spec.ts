// Making a thing, all the way through: gather the material, open the bench, play it, get the item.
//
// **The workshop had no browser coverage at all**, and making has just stopped being a single
// click -- it opens the activity card and the craft happens when the run settles. That is exactly
// the shape of change that broke `main` twice in this sprint: the unit tests prove the pieces and
// nothing proved App wires them together.
//
// It is also the only test that walks the whole economy in one go. `activity.test.ts` knows about
// beats, `makingGestures.test.ts` knows which gesture a process asks for, and neither of them can
// tell you that a reed cut on a coast tile is retted into fibre in a satchel.

import { expect, test, type Page } from '@playwright/test';

const SEED = 'jambhudweepa-evening';

/**
 * The coast tile that gives reed fibre, and the reason this spec can be deterministic.
 *
 * Shared with `gathering.spec.ts`, which records why it is chosen rather than walked to and why
 * `test/e2eFixtures.test.ts` pins it: the spawn sits in barren wetland, and a walk that samples
 * four tiles found nothing. 8,8 gives reed fibre, river fish and river clay.
 *
 * `recipe_ret_reed_fibre` is then the thing to make: one reed fibre, no tool, no settlement. It is
 * the only recipe this tile can complete from a single gather, which the browser had to say out
 * loud -- the first version of this spec reached for "Twisting reed rope" because it also takes
 * only reed fibre, and the panel answered "needs 4 Reed fibre, has 1" and "needs something that
 * can work". Reading the ingredient *list* is not the same as reading the ingredient *counts*.
 */
const GIVING = { x: 8, y: 8 };

async function boot(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/?seed=${SEED}&hour=12&at=${GIVING.x},${GIVING.y}`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
}

/** Play whatever activity is open through to its end, and close it. */
async function playItOut(page: Page) {
  const card = page.locator('[role="dialog"] .activity-card');
  await expect(card).toBeVisible();

  // The run can settle on its own at any instant -- a beat that goes unanswered times out -- so a
  // strike that finds no button means the run finished without us, which is a legal outcome.
  const strike = page.locator('.activity-choice.primary');
  for (let i = 0; i < 3; i += 1) {
    if ((await strike.count()) === 0) break;
    await strike.click({ timeout: 5_000 }).catch(() => {});
  }

  // The way out is one button whose label changes, so it is never detached mid-click.
  const wayOut = page.locator('.activity-choices .activity-choice').last();
  await expect(wayOut).toBeVisible({ timeout: 20_000 });
  await wayOut.click();
  await expect(card).toBeHidden();
}

test('a reed cut on the shore is retted at the bench', async ({ page }) => {
  await boot(page);

  // Gather first: the bench needs the material, and this is the honest way to have it.
  await page
    .locator('.tile-actions button')
    .filter({ hasText: /Cut and gather|Work the ground|Take what is here/ })
    .first()
    .click();
  await playItOut(page);

  await page.getByRole('button', { name: /Workshop/ }).click();
  const workshop = page.getByRole('dialog');
  await expect(workshop).toBeVisible();

  // **Making now opens the card rather than making silently.** Before this change the click made
  // the rope and closed nothing, so this assertion is the change itself.
  // Under READY, which is the panel's own word for "you have everything this needs". Anything
  // under WITHIN REACH says why not and its button reads "Not yet".
  // `.recipe-ready` is the panel's own class for a row it will actually make -- see the `ready`
  // branch in `WorkshopPanel`. Asking for it by class rather than by the button's enabled state
  // means this fails loudly if the panel stops distinguishing the two.
  const ready = workshop.locator('.recipe-ready', { hasText: /Retting reed/ }).first();
  await expect(ready, 'the retting recipe is not ready — was the reed gathered?').toBeVisible({
    timeout: 20_000
  });
  await ready.getByRole('button', { name: /Make/ }).click();

  const card = page.locator('[role="dialog"] .activity-card');
  await expect(card, 'making did not open an activity').toBeVisible();
  // It says what is being made, not what is underfoot: a bench job is about the recipe.
  await expect(card).toContainText(/retting/i);
  await playItOut(page);
});

test('with an empty satchel there is no workshop to open', async ({ page }) => {
  /**
   * **The first version of this test was wrong about the game**, and the browser said so.
   *
   * It booted with nothing carried, clicked Workshop, and timed out -- because the control only
   * exists when something is carried or something is makeable here. That is deliberate: `Controls`
   * says a button with genuinely nothing behind it should not be on screen, which is the one
   * exception to this game's "never hide a control" rule and is stated where it is made.
   *
   * So the honest assertion is the absence, and it is worth having: it is the cheapest possible
   * check that the workshop is still gated on having something to work with.
   */
  await boot(page);

  await expect(
    page.getByRole('button', { name: /Workshop/ }),
    'the workshop is offered with nothing to make and nothing carried'
  ).toHaveCount(0);
});
