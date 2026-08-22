// Walking, in a way that survives a loaded machine.
//
// Every spec that moves the traveller used to press a key and wait a fixed number of
// milliseconds. That is the same mistake the zoom spec made: a step is a tween whose length
// depends on the terrain — wetland is deliberately slower than plains — and the scene ignores
// input while one is in flight, so a press during a slow step is simply swallowed. It looks
// like "the panel never opened" and is really "the second key never counted".
//
// Waiting for the journal to report a new tile waits for the actual arrival.

import { expect, type Page } from '@playwright/test';

/** How long to wait for a step to land before assuming it went nowhere. */
const ARRIVAL_TIMEOUT = 4_000;

/** Take one step, and return when the traveller has actually arrived somewhere new. */
export async function step(page: Page, key: string): Promise<void> {
  const before = await readJournal(page, 'before the step');

  // `page.keyboard`, not `locator('.map-surface canvas').press`.
  //
  // Phaser listens on the window, so the key arrives either way -- but a locator press first waits
  // for that element to be *actionable*, and part of actionability is being **stable**: the same
  // bounding box for two consecutive animation frames. The canvas is in a RESIZE-mode scale
  // manager sitting next to a journal panel that reflows as the day turns, so there are moments
  // when its box is never still for two frames together. The wait then runs to the test timeout.
  //
  // That is what failed CI on the fatigue walk: ninety seconds spent "waiting for
  // locator('.map-surface canvas')" before a key was ever sent, on both the run and its retry,
  // while the spec passes in 24 seconds locally. Every other spec in this suite already presses
  // through `page.keyboard`; this helper was the one place that did not.
  await page.keyboard.press(key);

  // Poll **inside the browser**, not across the wire.
  //
  // This was a loop of `waitForTimeout(100)` then `textContent()`, and the round-trip was not
  // free: a step that finished in 1100ms was detected after 7 polls, so each iteration cost about
  // 157ms rather than the 100 intended. A third of the wait was Playwright talking to Chromium,
  // paid fifteen times a spec, on the slowest job in CI.
  //
  // `waitForFunction` ships the comparison to the page and polls there, so arrival is noticed
  // within the polling interval instead of an interval plus a round-trip.
  //
  // The timeout is not a failure. A step onto identical ground genuinely reads the same, so this
  // can never demand a change -- it can only wait longer than any tween before giving up, which is
  // the useful part.
  await page
    .waitForFunction(
      (previous) => (document.querySelector('.journal')?.textContent ?? '') !== previous,
      before,
      { timeout: ARRIVAL_TIMEOUT, polling: 50 }
    )
    .catch(() => undefined);
}

/**
 * The field notes' text, or a failure that says what went wrong.
 *
 * `locator.textContent()` waits for the element to exist and then, if it never does, runs to the
 * *test's* timeout — ninety seconds, reported as `waiting for locator('.journal')` with no hint of
 * why. That has now cost several CI investigations, and the message is the reason: it reads as
 * slowness, when what it actually means is that the panel is **gone from the DOM**.
 *
 * `.journal` only renders while the surface is `here` (see `src/ui/surface.ts`), so it vanishing
 * mid-walk means something closed or replaced that surface — an interrupt, a travel, a scene
 * restart. Waiting longer can never fix that.
 *
 * So the wait is bounded to a few seconds and the failure names the state it found. A spec that
 * dies in five seconds pointing at the surface is worth many that die in ninety pointing at
 * nothing.
 */
async function readJournal(page: Page, when: string): Promise<string> {
  const journal = page.locator('.journal');
  try {
    await journal.first().waitFor({ state: 'attached', timeout: 5_000 });
  } catch {
    throw new Error(
      `The field notes are not on the page ${when}. \`.journal\` renders only while the surface ` +
        `is \`here\`, so something closed or replaced it. Visible instead: ${await surfaces(page)}.`
    );
  }
  return (await journal.first().textContent()) ?? '';
}

/**
 * Which surface is on the page, for the message above — and never a thrown error.
 *
 * This is a diagnostic, so it must not be able to fail louder than the thing it is diagnosing, and
 * on its first outing it did exactly that. When the *test* runs out of time, Playwright tears the
 * context down and then unwinds; a bare `page.evaluate` in that window throws "Target page,
 * context or browser has been closed", which replaced the real failure in the CI log with a
 * pointer to this file. The genuine problem — the fatigue walk overrunning ninety seconds — was
 * invisible underneath it.
 */
async function surfaces(page: Page): Promise<string> {
  try {
    const found = await page.evaluate(() =>
      ['.journal', '.sheet', '.arrival', '.overworld', '.ending', '.field-kit']
        .filter((sel) => document.querySelector(sel))
        .join(', ')
    );
    return found || 'nothing';
  } catch {
    return 'could not look — the page was already closed, which usually means the test itself ran out of time';
  }
}

/** Walk a fixed route and wait for the place panel it should end on. */
export async function walkTo(page: Page, keys: string[], timeout = 20_000): Promise<void> {
  for (const key of keys) await step(page, key);
  await expect(page.locator('.place')).toBeVisible({ timeout });
}
