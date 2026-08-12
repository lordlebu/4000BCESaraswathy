// Phase 06's claim, checked: the same ground read at a different hour.
//
// `?hour=` fixes the clock, so noon and midnight are two views of one seed rather than a wait.
// If these ever read the same, time has gone back to being lighting.

import { expect, test, type Page } from '@playwright/test';

const SEED = 'hours-test';

async function fieldNoteAt(page: Page, hour: number): Promise<string> {
  await page.goto(`/?seed=${SEED}&hour=${hour}`);
  await expect(page.locator('.map-surface canvas')).toBeVisible();
  await expect(page.locator('.journal h2')).toBeVisible();
  return (await page.locator('.journal-notes').textContent()) ?? '';
}

test('the creatures are doing different things at noon and at midnight', async ({ page }) => {
  const noon = await fieldNoteAt(page, 12);
  const midnight = await fieldNoteAt(page, 0);

  // Same tile, same species, same journal prompt — but not the same sentence about it.
  expect(noon).not.toBe(midnight);
  expect(noon.length).toBeGreaterThan(20);
  expect(midnight.length).toBeGreaterThan(20);
});

test('a sleeping animal cannot be sketched, and the note says when to come back', async ({ page }) => {
  // Walk the clock until the traveller is standing over something that is not out.
  for (const hour of [0, 3, 6, 9, 12, 15, 18, 21]) {
    await fieldNoteAt(page, hour);
    const button = page.getByRole('button', { name: /Observe creature|Sketch recorded/ });
    const notes = (await page.locator('.journal-notes').textContent()) ?? '';

    if (/asleep somewhere close|Nothing is out in this/.test(notes)) {
      await expect(button).toBeDisabled();
      expect(notes).toMatch(/Try (dawn|morning|afternoon|evening|night)/);
      return;
    }
  }
  // Every hour had the animal out. That is possible but worth knowing about rather than
  // passing silently, because it would mean the routine gate never fires on this seed.
  test.fail(true, 'no hour of this seed found a creature off duty');
});
