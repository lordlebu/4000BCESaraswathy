// Where the nearest of what the pin wants lies (`docs/satchel-and-hearth.md`, phase 7).
//
// The owner could not find bamboo on the Narmada: nothing said which tile held it. `test/finding.test.ts`
// holds the rule; this proves it reaches the screen -- the pinned line names the nearest seen source
// with steps and a bearing, and the map draws a diamond on that tile.

import { expect, test } from '@playwright/test';

const SEED = 'find-1';

test('a pinned knife points at the nearest flint, in words and on the map', async ({ page }) => {
  await page.addInitScript(
    ({ key }) => {
      try {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ knowledgeVersion: 1, pinned: 'recipe_flint_knife' }));
      } catch {
        // Storage refused: the spec fails on what it looks for, which is the honest outcome.
      }
    },
    { key: `south-of-tethys:${SEED}` }
  );
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/?seed=${SEED}&hour=12`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });

  const where = page.locator('.pinned-recipe .pinned-where');
  await expect(where, 'the pinned line does not say where the flint is').toHaveText(/^flint, (here|\d+ steps? [a-z-]+)$/i, { timeout: 15_000 });

  type Walker = { sourceMark: { x: number; y: number } | null };
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __walker: () => Walker }).__walker().sourceMark), { timeout: 10_000 })
    .not.toBeNull();
});
