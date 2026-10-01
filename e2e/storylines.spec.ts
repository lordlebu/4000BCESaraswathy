// A story beat opens as a card, and draws the owner's painting.
//
// `test/storylines.test.ts` walks both arcs beat by beat. This holds the wiring only a browser can:
// that arriving where a beat is due opens its card, with the painting the owner made for it.

import { expect, test } from '@playwright/test';

test("the princess's arc opens at the quarry tank once the Fourteen has been cooked", async ({ page }) => {
  const seed = `story-${Date.now()}`;
  // The Fourteen given: the princess's line teaches root tea, and holding it is what opens her arc.
  await page.addInitScript((s) => {
    localStorage.setItem(
      `south-of-tethys:${s}`,
      JSON.stringify({ knowledgeVersion: 1, progress: { rungs: {}, words: [], answers: {}, recipes: ['recipe_root_tea'], made: [] } })
    );
  }, seed);
  await page.goto(`/?seed=${seed}&map=field_map_narmada&at=poi_basalt_quarry&hour=12`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });

  const card = page.getByRole('dialog', { name: 'In the quarry tank' });
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(card.locator('img').first()).toHaveAttribute('src', /asura-bathe-ruins/);
  await card.getByRole('button', { name: 'Promise to read the terraces' }).click();
});
