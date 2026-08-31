// Phase 06's claim, checked: the same ground read at a different hour.
//
// `?hour=` fixes the clock, so noon and midnight are two views of one seed rather than a wait.
// If these ever read the same, time has gone back to being lighting.

import { expect, test, type Page } from '@playwright/test';

// Re-searched when the rivers were rebuilt: the start tile moved, and the one it moved to had
// an animal that reads the same at noon and at midnight, which is exactly what this asserts is
// impossible. A seed whose starting tile holds a night-stalker.
const SEED = 'hours-1';

async function fieldNoteAt(page: Page, hour: number): Promise<string> {
  await page.goto(`/?seed=${SEED}&hour=${hour}`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
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

test('a sleeping animal is not met, and the note says when to come back', async ({ page }) => {
  // The button this used to check is gone: meeting something is now a consequence of standing
  // where it is, not of pressing anything. The rule it was guarding survives -- an animal that
  // is not out has not been met -- so that is what is checked instead.
  for (const hour of [0, 3, 6, 9, 12, 15, 18, 21]) {
    await fieldNoteAt(page, hour);
    const notes = (await page.locator('.journal-notes').textContent()) ?? '';

    if (/asleep somewhere close|Nothing is out in this/.test(notes)) {
      expect(notes).toMatch(/Try (dawn|morning|afternoon|evening|night)/);
      return;
    }
  }
  // Every hour had the animal out. That is possible but worth knowing about rather than
  // passing silently, because it would mean the routine gate never fires on this seed.
  test.fail(true, 'no hour of this seed found a creature off duty');
});

test('the panel does not resize as the day turns', async ({ page }) => {
  // The failure this guards against is subtle and was found by CI, not by looking: the line
  // about what a creature is doing is the only text here that changes while the player stands
  // still. When it shared a paragraph with the field guide entry, a creature falling asleep
  // reflowed the panel, React reported new viewport insets, and the camera refitted -- the map
  // moving under a player who had not touched anything.
  const heights = new Set<number>();
  const doings = new Set<string>();
  for (const hour of [0, 3, 6, 9, 12, 15, 18, 21]) {
    await fieldNoteAt(page, hour);
    const box = await page.locator('.journal').boundingBox();
    heights.add(Math.round(box!.height));
    doings.add((await page.locator('.doing').textContent()) ?? '');
  }

  // The hours really are saying different things -- otherwise this asserts nothing.
  expect(doings.size).toBeGreaterThan(1);
  expect([...heights], `panel height varied across the day: ${[...heights]}`).toHaveLength(1);
});

/**
 * The same, on a narrow phone.
 *
 * Added while checking whether the reservation above was still needed after the panels were
 * consolidated. It is -- removing it swings the wide panel 288/278/288 across a day -- but the
 * phone override that used to sit beside it was not: at this width the two-column notes absorb
 * the extra wrapped line by themselves. This holds that, so the removal cannot silently regress.
 */
test('the panel does not resize as the day turns, on a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });

  const heights = new Set<number>();
  for (const hour of [0, 6, 12, 18]) {
    await fieldNoteAt(page, hour);
    const box = await page.locator('.journal').boundingBox();
    heights.add(Math.round(box!.height));
  }

  expect([...heights], `panel height varied on a phone: ${[...heights]}`).toHaveLength(1);
});
