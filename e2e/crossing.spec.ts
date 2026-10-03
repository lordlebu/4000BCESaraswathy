// Changing map, in a browser: the card after the road has a picture, and somebody can tell you how
// a map is left. The owner's report of 3 October 2026 -- "one art appears and the second one comes as
// blank", and "we need someone to tell us how to change map".

import { expect, test } from '@playwright/test';

test('the first crossing to the Aravali steps down onto the ferry song, with the road for its picture', async ({ page }) => {
  await page.goto('?seed=crossing&map=field_map_lothal&at=poi_lothal_camp');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Where to go' }).click();
  const sheet = page.getByRole('dialog', { name: 'Where to go' });
  await sheet.locator('.look', { hasText: 'Aravali' }).getByRole('button', { name: 'Travel' }).click();

  const road = page.getByRole('dialog', { name: 'The road' });
  await expect(road).toBeVisible();
  await road.getByRole('button', { name: 'Continue' }).click();
  await expect(road.locator('img.opening-plate')).toHaveAttribute('src', /journey-aravali-lothal/);
  await road.getByRole('button', { name: 'Continue' }).click();
  await road.getByRole('button', { name: 'Step down' }).click();

  // The ferry song has no painting of its own, so it shows the road it came by -- never a blank.
  const song = page.getByRole('dialog', { name: 'The ferry song' });
  await expect(song).toBeVisible({ timeout: 30_000 });
  await expect(song.locator('img.activity-scene')).toHaveAttribute('src', /journey-aravali-lothal/);
  await expect(song.locator('.activity-scene-blank')).toHaveCount(0);
});

test("a road's keeper says where the cart leaves from, and what to press", async ({ page }) => {
  await page.goto('?seed=varuna-0&map=field_map_dwarka&hour=13&door=open&at=poi_caravan_camp');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
  await page.locator('.who', { hasText: 'Jarro' }).click();
  await page.getByRole('button', { name: 'Ask about the road', exact: true }).click();
  const asked = page.locator('.conversation-ask');
  await expect(asked).toContainText('goes from the Caravan Ground');
  await expect(asked.locator('.conversation-hint')).toContainText('press Travel');
});
