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

test("Guyuk's word does not come over the road's cards, only once the traveller has stepped down", async ({ page }) => {
  // The owner's report of 4 October 2026: crossing to the Aravali, "Word of a herbalist" -- Guyuk's
  // first beat, a road beat -- opened before the traveller had arrived. The next map builds behind the
  // road's cards, the scene reports the traveller set down, and the ride spends half a day -- so when a
  // crossing runs into a new day, the day's road question was asked then. Begun late on the second
  // day (1.8), so the ride ends on the third: written into the save before the page loads, as the
  // camp specs do. Begun on the first day it never showed, which is why the first version of this
  // test passed with the fix taken out.
  const seed = `herbalist-${Date.now()}`;
  const DAY_MS = 60 * 60 * 1000;
  await page.addInitScript(({ key, travelled }) => {
    const saved = JSON.parse(localStorage.getItem(key) ?? '{"knowledgeVersion":1}');
    localStorage.setItem(key, JSON.stringify({ ...saved, travelled }));
  }, { key: `south-of-tethys:${seed}`, travelled: Math.round(DAY_MS * 1.8) });
  await page.goto(`?seed=${seed}&map=field_map_lothal&at=poi_lothal_camp`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Where to go' }).click();
  const sheet = page.getByRole('dialog', { name: 'Where to go' });
  await sheet.locator('.look', { hasText: 'Aravali' }).getByRole('button', { name: 'Travel' }).click();

  const road = page.getByRole('dialog', { name: 'The road' });
  await expect(road).toBeVisible();
  // Long enough for the Aravali to build behind the cards and set the traveller down.
  await page.waitForTimeout(4000);
  await expect(page.getByRole('dialog', { name: 'Word of a herbalist' })).toHaveCount(0);
  await road.getByRole('button', { name: 'Continue' }).click();
  await road.getByRole('button', { name: 'Continue' }).click();
  await road.getByRole('button', { name: 'Step down' }).click();
  // Stepping down opens the ferry song, the road's own; the herbalist's word waits for a step.
  const song = page.getByRole('dialog', { name: 'The ferry song' });
  await expect(song).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('dialog', { name: 'Word of a herbalist' })).toHaveCount(0);
  // And it is not lost: the day was not spent while the cart rolled, so the first step on the Aravali
  // brings it.
  await song.getByRole('button', { name: /listen/i }).click();
  await song.getByRole('button', { name: 'Go on' }).click();
  await expect(song).toHaveCount(0);
  // South, down the path from the Rail-Head: the tile east of it is rock. Focus is left on the Travel
  // button by the crossing, and an arrow key there moves nothing on the map.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press('ArrowDown');
    if (await page.getByRole('dialog', { name: 'Word of a herbalist' }).count()) break;
    await page.waitForTimeout(600);
  }
  const word = page.getByRole('dialog', { name: 'Word of a herbalist' });
  await expect(word).toBeVisible({ timeout: 15_000 });
  // The owner's painting of 4 October 2026, canon's `art` on the beat -- not the small-talk fallback.
  await expect(word.locator('img.activity-scene')).toHaveAttribute('src', /guyuk-word/);
});
