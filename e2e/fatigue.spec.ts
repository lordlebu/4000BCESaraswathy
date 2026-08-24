// Fatigue, which ships behind `?fatigue=1` for one release.
//
// Two things worth a browser. First that the flag is genuinely inert when off -- that is the
// promise this ships on, and a unit test cannot see the rendered page. Second that walking with it
// on does not break anything, since the chain from the accumulator through the scene to the
// journal only exists at runtime.
//
// Note the second one carefully: it is *not* that walking eventually produces a tiredness note.
// That is what this file used to say it did, and it never did -- the threshold is about forty
// tiles away and no spec here walks that far. `test/fatigue.test.ts` owns the curve, under Node,
// where forty steps is free.

import { expect, test, type Page } from '@playwright/test';
import { step } from './walk';

/**
 * Open the map and wait for the notes to be written.
 *
 * The journal is open at boot, so nothing needs clicking -- worth stating because the first
 * version of this file clicked a toggle to "open" it and thereby closed it, then reported the
 * camp button missing when it had been on the page the whole time. Dumping the DOM settled it in
 * one run; two rounds of reasoning had not.
 */
async function boot(page: Page, query: string) {
  await page.goto(query);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal-foot')).toBeVisible();
}

test('tiredness stays inert when the flag is off', async ({ page }) => {
  // Narrowed deliberately. This used to assert no camp button either, which was right while
  // stopping for the night was part of the fatigue experiment. Shelter is unconditional now --
  // it is how a night is spent, not an optional system -- so the button appears after dark for
  // everyone. What the flag still gates is the *tiredness*: the mood line and the slower pace.
  await boot(page, '/?seed=poi-252&hour=12');

  for (let i = 0; i < 6; i += 1) await step(page, 'ArrowRight');

  await expect(page.locator('.status-tired')).toHaveCount(0);
  // Midday, so nothing to stop for either way.
  await expect(page.locator('.camp-button')).toHaveCount(0);
});

test('shelter is offered after dark whether or not the flag is on', async ({ page }) => {
  await boot(page, '/?seed=poi-252&hour=22');
  await expect(page.locator('.camp-button')).toBeVisible({ timeout: 10_000 });
  // And the label says what kind of night it will be, which is the whole explanation of shelter.
  await expect(page.locator('.camp-button')).toHaveText(/roof|camp|bedding|sit out/i);
});

test('walking with the flag on leaves the page and the journal working', async ({ page }) => {
  // **This used to claim it walked far enough to get tired, and it did not.** The name said so,
  // a comment said the traveller "started tired", and neither was true: there is no query
  // parameter that starts anyone tired -- the app reads `seed`, `hour` and `fatigue` and nothing
  // else -- and the walk was nowhere near long enough to earn it. `FRESH_BELOW` is 0.35 of
  // `DAY_OF_WALKING_MS`, which is four days, so a note needs about a day and a half of travel:
  // roughly forty tiles of easy ground. The spec walked fifteen.
  //
  // So `expect(tired).toBeLessThanOrEqual(1)` was passing vacuously. It would have passed with no
  // walk at all, and it passes just as well now, because it never depended on the distance.
  //
  // That mattered, because the walk was not free. Fifteen steps is the most expensive thing in
  // this suite -- the traveller crosses into wetland at step four and wetland steps are
  // deliberately slow, about 1.05s each measured. At 27s locally against a 90s budget it was the
  // first spec to run out of time on CI, where the software renderer costs roughly 3.7x.
  //
  // Eight steps still crosses the plains-to-wetland boundary, which is the only part of the route
  // that was ever doing anything: it proves a step lands, the terrain changes under it, and the
  // journal keeps writing through the change. `test/fatigue.test.ts` owns the curve, as it always
  // did.
  await boot(page, '/?seed=poi-252&fatigue=1&hour=12');

  for (let i = 0; i < 8; i += 1) await step(page, i % 2 ? 'ArrowDown' : 'ArrowRight');

  // The page must not have broken and the journal must still be writing.
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });

  // Not tired, and stated as the real assertion it always could have been rather than the
  // `<= 1` that could not fail. Eight steps is far short of the threshold, so a note appearing
  // here would mean the curve had moved by more than an order of magnitude.
  await expect(page.locator('.status-tired')).toHaveCount(0);
  // Midday, so no bed on offer either.
  await expect(page.locator('.camp-button')).toHaveCount(0);
});

test('the camp button appears at a camp after dark, and sleeping brings the morning', async ({
  page
}) => {
  // A searched seed, on the technique docs/testing.md records: `camp-23` starts the traveller
  // standing on The Camp in the Kilns, so the button is reachable without a walk. The first
  // version of this test used a seed that starts elsewhere and skipped every run, which proves
  // nothing at all.
  await boot(page, '/?seed=camp-23&fatigue=1&hour=23');

  const camp = page.locator('.camp-button');
  await expect(camp).toBeVisible({ timeout: 10_000 });
  await camp.click();
  // Sleeping moves the sky. Whatever the journal says afterwards, it must still be saying it.
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  // Slept: it is morning now, so the same tile no longer offers a bed.
  await expect(page.locator('.camp-button')).toHaveCount(0);
});

test('a camp in daylight is just a place', async ({ page }) => {
  // The negative half. Standing in the same camp at noon must offer nothing -- otherwise the
  // button is a fast-forward rather than somewhere to sleep.
  await boot(page, '/?seed=camp-23&fatigue=1&hour=12');
  await expect(page.locator('.camp-button')).toHaveCount(0);
});
