import { expect, test } from '@playwright/test';
import { journeyStorageKey } from '../src/storageKeys';
import { journeyFixture } from './journey-fixture';

test('the front door clears retired journeys, bakes and last seed while keeping preferences', async ({ page }) => {
  const current = journeyStorageKey('current-seed');
  const retired = [
    'south-of-tethys:last-seed',
    'south-of-tethys:old-seed',
    'south-of-tethys:world:old-seed:field_map_dwarka'
  ];
  await page.addInitScript(({ current, retired, snapshot }) => {
    if (sessionStorage.getItem('reset-fixture')) return;
    sessionStorage.setItem('reset-fixture', '1');
    for (const key of retired) localStorage.setItem(key, 'old-seed');
    localStorage.setItem(current, snapshot);
    localStorage.setItem('varuna:showing', JSON.stringify({ readingSize: 'large' }));
    localStorage.setItem('other-app:seed', 'kept');
  }, { current, retired, snapshot: JSON.stringify(journeyFixture({ discovered: ['2,3'] })) });

  await page.goto('?seed=old-seed&door=shut&title=skip');
  await expect(page.getByRole('status')).toContainText('Previous journeys were cleared.');
  await expect(page.getByRole('button', { name: /go on walking/i })).toHaveCount(0);
  expect(await page.evaluate(keys => keys.map(key => localStorage.getItem(key)), retired)).toEqual([null, null, null]);
  expect(await page.evaluate(keys => keys.map(key => localStorage.getItem(key)),
    [current, 'other-app:seed'])).toEqual([JSON.stringify(journeyFixture({ discovered: ['2,3'] })), 'kept']);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('varuna:showing') ?? '{}'))).toMatchObject({ readingSize: 'large' });

  await page.goto('?seed=current-seed&door=shut&title=skip');
  await expect(page.getByRole('button', { name: /go on walking/i })).toBeVisible();
  await expect(page.getByText('Previous journeys were cleared.', { exact: false })).toHaveCount(0);
});

test('a failed field load gives the player a way back to the current seed', async ({ page }) => {
  await page.route(/\/(src\/ui\/fieldSession\.ts|assets\/fieldSession-[^/]+\.js)(\?|$)/, route => route.abort());
  await page.goto('?seed=recover-this-world&door=open&title=skip');
  const recovery = page.getByRole('alert');
  await expect(recovery.getByRole('heading', { name: 'The map has stopped.' })).toBeVisible();
  await expect(recovery).toContainText('recover-this-world');
  await expect(recovery.getByRole('button', { name: 'Start with a new seed' })).toBeVisible();

  await page.unrouteAll();
  await recovery.getByRole('button', { name: 'Try this journey again' }).click();
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 45000 });
  expect(new URL(page.url()).searchParams.get('seed')).toBe('recover-this-world');
});
