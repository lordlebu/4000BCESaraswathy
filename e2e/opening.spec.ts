// The first minute: the title, the opening, the door, and standing among the people at the kilns.
//
// Before Roads and Hands phase 3 a new walk went from the door straight onto a tile the generator
// picked, with nothing said. Since 4 October 2026, on the owner's word, a visit opens on the title --
// *South of Tethys*, and the name in Brahmi -- and somebody who has never walked goes on from it into
// the opening before the door asks who sets out. `test/opening.test.tsx` holds the cards; this holds
// that a player actually sees them in that order, ends at the Camp in the Kilns, and is told how to walk.

import { expect, test } from '@playwright/test';

test('a first visit opens on the title, plays the opening, then the door, then the kilns', async ({ page }) => {
  await page.goto(`/?seed=opening-${Date.now()}&door=shut`);

  const opening = page.getByRole('dialog', { name: 'Opening' });
  await expect(opening).toBeVisible({ timeout: 20_000 });
  await expect(opening.getByRole('heading', { name: 'South of Tethys' })).toBeVisible();
  await expect(opening.locator('.opening-title-brahmi b')).toHaveText('𑀲𑁄𑀅𑀣𑁆 𑀑𑀨𑁆 𑀢𑁂𑀣𑀺𑀲𑁆');
  // Drawn in the shipped Brahmi face, not as boxes: the font has to have loaded.
  await expect
    .poll(() => page.evaluate(() => document.fonts.check('700 32px "Noto Sans Brahmi"', '𑀲𑁄𑀅𑀣𑁆')))
    .toBe(true);
  // The door waits behind the opening, and so does the map.
  await expect(page.getByRole('dialog', { name: /begin/i })).toHaveCount(0);
  await expect(page.locator('.map-surface canvas')).toHaveCount(0);

  await opening.getByRole('button', { name: 'Continue' }).click();
  await expect(opening).toContainText('Do not ask where the road ends.');
  await opening.getByRole('button', { name: 'Continue' }).click();
  // The owner's painting, not the drawn stand-in.
  await expect(opening.locator('img.opening-plate')).toHaveAttribute('src', /prologue-1-road/);
  for (let i = 0; i < 3; i++) await opening.getByRole('button', { name: 'Continue' }).click();
  await expect(opening).toContainText('kilns');
  await opening.getByRole('button', { name: 'Begin' }).click();
  await expect(opening).toHaveCount(0);

  // Now the door, to choose who sets out -- and setting out does not play the opening again.
  await page.getByRole('button', { name: /set out/i }).click();
  await expect(page).toHaveURL(/at=poi_lothal_camp/);
  await expect(page.locator('.place h2')).toHaveText(/Kilns/, { timeout: 20_000 });
  await expect(page.getByRole('dialog', { name: 'Opening' })).toHaveCount(0);
  await expect(page.locator('.coach-line')).toContainText('Walk with');
});

test('the opening can be skipped, and coming back shows the title alone, then the door', async ({ page }) => {
  const seed = `opening-skip-${Date.now()}`;
  await page.goto(`/?seed=${seed}&door=shut`);
  const opening = page.getByRole('dialog', { name: 'Opening' });
  await expect(opening).toBeVisible({ timeout: 20_000 });
  await opening.getByRole('button', { name: 'Skip' }).click();
  await expect(opening).toHaveCount(0);
  await page.getByRole('button', { name: /set out/i }).click();
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('dialog', { name: 'Opening' })).toHaveCount(0);

  // Walk a step so the journey has begun, let the save flush, and come back.
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(3500);
  await page.goto(`/?seed=${seed}&door=shut`);
  await expect(opening).toBeVisible({ timeout: 20_000 });
  await expect(opening.getByRole('heading', { name: 'South of Tethys' })).toBeVisible();
  await expect(opening.getByRole('button', { name: 'Begin' })).toHaveCount(0);
  await opening.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /go on walking/i }).click();
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('dialog', { name: 'Opening' })).toHaveCount(0);
});

test('starting over sets out on a new world', async ({ page }) => {
  const seed = `opening-over-${Date.now()}`;
  await page.goto(`/?seed=${seed}&door=open&at=10,8`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await page.keyboard.press('KeyD');
  await expect(page.locator('.journal h2')).toBeVisible();
  await page.goto(`/?seed=${seed}&door=shut&title=skip`);
  await page.getByRole('button', { name: /start a new walk/i }).click();
  await page.getByRole('button', { name: /yes .* start over/i }).click();
  // A fresh seed, chosen for you, in the address -- not the old one wiped.
  await expect(page).not.toHaveURL(new RegExp(`seed=${seed}`));
  await expect(page).toHaveURL(/seed=[a-z]+-[a-z]+-\d{1,2}/);
});
