import { seedJourney } from './journey-fixture';
// The next step, always (`docs/satchel-and-hearth.md`, phase 8).
//
// With the first morning over and nothing pinned, the dock used to say nothing about what to do. Now
// it says one next step, and when that step is a building stage it is a button that pins it -- the
// pin's line then counts off what the stage still wants. Seeded with a ground already agreed, so the
// next step is a stage.

import { expect, test } from '@playwright/test';

const SEED = 'guide-1';
const MAP = 'field_map_lothal';
const AGREED = [
  `homestead:${MAP}:ground:ground_eastern_field`,
  `homestead:${MAP}:eased:poisoned`,
  `homestead:${MAP}:eased:moving`,
  `homestead:${MAP}:eased:stranger`
];

test('the next step offers the next building stage, and pins it', async ({ page }) => {
  await seedJourney(page, SEED, { flags: AGREED });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/?seed=${SEED}&map=${MAP}&hour=12`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });

  const step = page.locator('button.guide-line');
  await expect(step).toContainText(/lay the foundation/i, { timeout: 15_000 });
  expect((await step.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await step.click();

  // Pinned: the guide gives way to the pin's own line, which says what the stage wants.
  await expect(page.locator('.pinned-recipe')).toContainText(/Lay the foundation/);
  await expect(page.locator('.guide-line')).toHaveCount(0);
});
