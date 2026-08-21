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

  // A step onto identical ground reads the same, so this cannot demand a change forever —
  // but it can wait far longer than a tween before giving up, which is the useful part.
  for (let i = 0; i < 40; i += 1) {
    await page.waitForTimeout(100);
    if ((await readJournal(page, `after pressing ${key}`)) !== before) return;
  }
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
    const surfaces = await page.evaluate(() =>
      ['.journal', '.sheet', '.arrival', '.overworld', '.ending', '.field-kit']
        .filter((sel) => document.querySelector(sel))
        .join(', ')
    );
    throw new Error(
      `The field notes are not on the page ${when}. \`.journal\` renders only while the surface ` +
        `is \`here\`, so something closed or replaced it. Visible instead: ${surfaces || 'nothing'}.`
    );
  }
  return (await journal.first().textContent()) ?? '';
}

/** Walk a fixed route and wait for the place panel it should end on. */
export async function walkTo(page: Page, keys: string[], timeout = 20_000): Promise<void> {
  for (const key of keys) await step(page, key);
  await expect(page.locator('.place')).toBeVisible({ timeout });
}
