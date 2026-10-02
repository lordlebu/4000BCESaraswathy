// A cook fire from fuel, through the workshop a player opens (`docs/satchel-and-hearth.md`, phase 3).
//
// The owner carried dung cakes and could not cook anything. `test/fire.test.ts` holds the rule;
// this is the part a unit test cannot prove: that the workshop lists the dish as ready to cook on
// open ground, says which fuel it will burn before the press, and that the press spends one.

import { expect, test } from '@playwright/test';

const SEED = 'cookfire-1';

test('dung cakes cook a curry on open ground, and the workshop says so first', async ({ page }) => {
  await page.addInitScript(
    ({ key }) => {
      try {
        if (!localStorage.getItem(key)) {
          localStorage.setItem(
            key,
            JSON.stringify({
              knowledgeVersion: 1,
              satchel: {
                material_jackfruit_flesh: 2,
                material_ginger_root: 1,
                material_sea_salt: 1,
                item_carry_basket: 1,
                material_dung_cake: 3
              }
            })
          );
        }
      } catch {
        // Storage refused: the spec fails on what it looks for, which is the honest outcome.
      }
    },
    { key: `south-of-tethys:${SEED}` }
  );
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/?seed=${SEED}&hour=12`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: /^Workshop/ }).click();
  const curry = page.locator('.workshop [data-recipe="recipe_jackfruit_curry"]');
  await expect(curry, 'the curry is not offered to cook').toBeVisible();
  await expect(curry).toContainText(/Burns one dung cake, lit from your lamp/);
  await curry.getByRole('button', { name: 'Make', exact: true }).click();

  const card = page.locator('[role="dialog"] .activity-card');
  await expect(card).toBeVisible();
  await card.locator('.activity-choice.primary').click();
  await card.locator('.activity-choice').last().click();
  await expect(card).toBeHidden();

  // One cake burned, two left: read from the save, which is what the satchel is.
  await expect
    .poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').satchel?.material_dung_cake, `south-of-tethys:${SEED}`))
    .toBe(2);
});
