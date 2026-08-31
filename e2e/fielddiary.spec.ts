// The three scales, walked.
//
// This is Phase 04's acceptance test in one file: stand on an authored place, look closer at
// something, watch it reach the diary, reload and find it still there, then travel to another
// field map. Every other spec proves the old procedural walk still works; this one proves the
// game is now about somewhere.
//
// The seed is chosen, not arbitrary. `buildFieldMap` is deterministic, so `poi-1666` is a world
// where the Eastern Field lands two steps from where the traveller starts — which turns "walk
// across a delta hoping to find something" into a test that finishes in seconds.
//
// **Re-searched three times now**: when Lothal's palette gained forest and hills, when landforms
// changed the shaping, and when the rivers were rebuilt as a drainage network. Every time for the
// same reason — what terrain a tile is decides which candidate list a place is drawn from, so any
// change to the ground moves every placement.
//
// The third time cost twelve browser tests in CI and was entirely avoidable: the unit suite and
// the build were both green, and this suite was simply not run before pushing. The lesson is not
// about seeds. **Anything that touches `src/world/` invalidates every searched fixture in `e2e/`,
// and there are four of them** — this one, `tower-*` below, `dock-*` in `questions.spec.ts` and
// `hours-*` in `hours.spec.ts`. The field notes' own hour test counts, because the start tile
// moves too and the animal standing on it changes with it.
//
// **Originally:** A searched seed is a fixture
// like any other: the palette decides what every tile becomes, so new ground means new
// placements, and `poi-53` went from two steps away to thirty-nine. Ten specs failed at once,
// all of them ones that walk somewhere. Re-run the search rather than widening the timeouts.

import { expect, test, type Page } from '@playwright/test';
import { step } from './walk';

/** A seed where poi_eastern_field sits at (36,37) and the traveller starts at (36,35). */
const SEED = 'poi-1666';

async function boot(page: Page) {
  await page.goto(`/?seed=${SEED}`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  // The journal only writes once the scene has placed the traveller.
  //
  // Both waits are explicit rather than the 5s default, because starting the game is the slowest
  // thing any of these specs do and it is not the thing any of them are testing. Phaser boots, the
  // world generates, and every sprite in the scene plan is created before this heading appears --
  // five thousand of them on the smaller maps. Whichever spec happens to run while the machine is
  // busiest pays for that, which is why the failure moved between specs from run to run and never
  // pointed at a cause. A generous boot wait costs nothing on a green run.
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
}


test('stand on an authored place, and it opens', async ({ page }) => {
  await boot(page);
  await step(page, 'ArrowDown');
  await step(page, 'ArrowDown');

  const place = page.locator('.place');
  await expect(place).toBeVisible({ timeout: 20_000 });
  await expect(place.locator('h2')).toHaveText(/Eastern Field/i);
  // The arrival prose is the writing the place exists for; it should not be a toast.
  expect((await place.locator('.place-arrival').textContent())!.length).toBeGreaterThan(60);
});

test('looking closer writes the diary, and the diary keeps the crossings-out', async ({ page }) => {
  await boot(page);
  await step(page, 'ArrowDown');
  await step(page, 'ArrowDown');
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });

  // Climb whatever this place will give us without any other knowledge.
  const look = page.getByRole('button', { name: 'Look closer' });
  await expect(look.first()).toBeEnabled();
  await look.first().click();
  await look.first().click().catch(() => {}); // the second rung, if this one has no gate on it

  await page.getByRole('button', { name: 'Leave' }).click();
  await page.getByRole('button', { name: /^Diary/ }).click();

  const diary = page.locator('.diary');
  await expect(diary).toBeVisible();
  await expect(diary.locator('.entry')).toHaveCount(1);
  // At least one reading is on the page. If two rungs were climbed, the first is struck through
  // rather than replaced -- that is the whole idea of the panel.
  const readings = diary.locator('.reading');
  expect(await readings.count()).toBeGreaterThan(0);
  if ((await readings.count()) > 1) {
    await expect(readings.first()).toHaveClass(/struck/);
  }
});

test('the diary survives a reload', async ({ page }) => {
  await boot(page);
  await step(page, 'ArrowDown');
  await step(page, 'ArrowDown');
  // Twenty seconds rather than ten, and the reason is worth keeping: nothing here is slow, the
  // margin was simply thin. `step` already waits on the journal changing rather than on a clock,
  // so this is only covering the panel's own mount -- but the whole suite shares one machine, and
  // adding two overlay layers to the scene was enough to push this past ten on a loaded run while
  // the identical two-step walk in the test above passed. A wait that is generous costs nothing on
  // a green run; it only bounds the failure.
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Look closer' }).first().click();
  await page.getByRole('button', { name: 'Leave' }).click();

  // Wait for the save to actually hold the rung, rather than sleeping longer than it should take.
  //
  // Two wrong versions of this, and the second is the instructive one.
  //
  // It began as `waitForTimeout(3500)` against a flush on a 3000ms interval -- 500ms of margin, and
  // only if the tick fell kindly. That failed roughly one full-suite run in three.
  //
  // The fix for that was worse: snapshot localStorage, then wait for it to **change**. It passed
  // fifteen local runs and failed on CI immediately, because a change is the wrong thing to wait
  // for. The flush runs on its own interval throughout, so on a slower machine it can land the
  // write *before* the snapshot is taken -- and then the value is already correct and will never
  // change again, because the walk is over and nothing else is dirty. The test sat for its full
  // fifteen seconds waiting for a second write that had no reason to exist.
  //
  // A state assertion has no such race: the save either holds the rung or it does not, and when it
  // was written does not matter. `progress.rungs` is what "Look closer" advances, so a non-empty
  // one is exactly the thing the reload has to restore.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          for (let i = 0; i < localStorage.length; i += 1) {
            const k = localStorage.key(i);
            if (!k?.startsWith('south-of-tethys:')) continue;
            try {
              const rungs = JSON.parse(localStorage.getItem(k) ?? '{}')?.progress?.rungs;
              if (rungs && Object.keys(rungs).length > 0) return true;
            } catch {
              // A half-written or older-shaped save is not the one we are waiting for.
            }
          }
          return false;
        }),
      {
        timeout: 15_000,
        message:
          'the rung from "Look closer" was never saved, so the reload had nothing to restore'
      }
    )
    .toBe(true);

  await page.reload();
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: /^Diary/ }).click();
  await expect(page.locator('.diary .entry')).toHaveCount(1);
});

test('an instance is a place you go into, and it says why when you cannot', async ({ page }) => {
  // A seed where Kavik's Tower stands three steps south of the start: (43,30) from (43,27).
  await page.goto('/?seed=tower-1190');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  await step(page, 'ArrowDown');
  await step(page, 'ArrowDown');
  await step(page, 'ArrowDown');

  const place = page.locator('.place');
  await expect(place).toBeVisible({ timeout: 20_000 });
  await expect(place.locator('h2')).toHaveText(/Kavik/i);

  // Three ways further in, two of them shut until the work is done. A closed one explains
  // itself rather than showing a padlock -- that is the rule the whole panel is built on.
  const deeper = place.locator('.place-section', { hasText: 'Further in' });
  await expect(deeper.locator('.look')).toHaveCount(3);
  await expect(deeper.getByRole('button', { name: 'Closed to you' })).toHaveCount(2);
  await expect(deeper).toContainText(/Not until you understand/);

  // The open one is a place you can stand in, and come back out of.
  await deeper.getByRole('button', { name: 'Go in' }).click();
  await expect(place.locator('.sub h3')).toBeVisible();
  await page.getByRole('button', { name: 'Back out' }).click();
  await expect(place.locator('.sub')).toBeHidden();
  await expect(deeper.locator('.look')).toHaveCount(3);
});

test('the overworld joins the two field maps', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Where to go' }).click();

  const sheet = page.locator('.diary');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('h2')).toHaveText('Where to go');
  await expect(sheet).toContainText('Lothal');
  await expect(sheet).toContainText('Narmada');

  await sheet.getByRole('button', { name: 'Travel' }).first().click();
  await expect(sheet).toBeHidden();

  // A different country: the plateau is large where Lothal is small, so the map is rebuilt.
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
});
