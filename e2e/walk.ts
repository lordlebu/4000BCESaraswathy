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
  const journal = page.locator('.journal');
  const before = (await journal.textContent()) ?? '';

  await page.locator('.map-surface canvas').press(key);

  // A step onto identical ground reads the same, so this cannot demand a change forever —
  // but it can wait far longer than a tween before giving up, which is the useful part.
  for (let i = 0; i < 40; i += 1) {
    await page.waitForTimeout(100);
    if (((await journal.textContent()) ?? '') !== before) return;
  }
}

/** Walk a fixed route and wait for the place panel it should end on. */
export async function walkTo(page: Page, keys: string[], timeout = 20_000): Promise<void> {
  for (const key of keys) await step(page, key);
  await expect(page.locator('.place')).toBeVisible({ timeout });
}
