import { expect, test } from '@playwright/test';
import { journeyStorageKey, seedJourney } from './journey-fixture';

test('a visible Beedu flight waits while the place panel is open', async ({ page }) => {
  const seed = 'beedu-review';
  // The real flight starts south of the caravan ground and is visible over previously explored dunes.
  const discovered = Array.from({ length: 15 }, (_, y) =>
    Array.from({ length: 15 }, (_, x) => `${x + 4},${y + 35}`)).flat();
  await seedJourney(page, seed, { discovered });
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), journeyStorageKey(seed));
  await page.goto(`?map=field_map_twins&seed=${seed}&hour=12&door=open&title=skip&firsts=off&beedu=show&at=poi_desert_ground`);
  const place = page.getByRole('button', { name: 'Leave', exact: true });
  await expect(place).toBeVisible({ timeout: 45000 });
  const sighting = page.getByRole('dialog', { name: 'A Shadow Leaves the Sand' });
  await expect.poll(async () => (await saved()).encounters?.pending, { timeout: 30000 })
    .toContainEqual(expect.objectContaining({ kind: 'beedu' }));
  await expect(sighting).toHaveCount(0);

  await page.reload();
  await expect(place).toBeVisible({ timeout: 45000 });
  await expect(sighting).toHaveCount(0);
  await place.click();
  await expect(sighting).toBeVisible();
  await expect(sighting.locator('img.activity-scene')).toHaveAttribute('src', /happening_twin_beedu_flight/);
  await sighting.getByRole('button', { name: 'Watch the glide' }).click();
  await expect.poll(async () => (await saved()).seenEvents).toContain('happening_twin_beedu_flight');
});
