import { expect, test } from '@playwright/test';

const base = '/?map=field_map_twins&seed=twin-story-review&hour=12&door=open&title=skip&chatter=off&firsts=off&events=off';

test('the cave household uses its named portraits in real conversations', async ({ page }) => {
  await page.goto(base + '&at=poi_northwest_cave_camp');
  for (const [name, art] of [['Mirlepa', 'mirlepa'], ['Yamantaka', 'yamantaka']]) {
    await page.locator('button.who').filter({ hasText: name }).click();
    const portrait = page.locator('.conversation img.person-portrait').first();
    await expect(portrait).toHaveAttribute('src', new RegExp(`${art}-painted`));
    await expect.poll(() => portrait.evaluate((img: HTMLImageElement) =>
      img.complete && img.naturalWidth === 256)).toBe(true);
    await page.locator('.conversation').getByRole('button', { name: 'Back', exact: true }).click();
  }
});

test('Kang offers an optional commission and keeps a declined invitation open', async ({ page }) => {
  await page.goto(base + '&at=poi_harappa_court');
  await expect(page.getByRole('dialog', { name: 'A Place for a Likeness' })).not.toBeVisible();
  const ask = async () => {
    await page.locator('button.who').filter({ hasText: 'Priest Kang' }).click();
    const portrait=page.locator('.conversation img.person-portrait').first();
    await expect(portrait).toHaveAttribute('src',/priest-kang-painted/);
    await expect.poll(()=>portrait.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth===256)).toBe(true);
    await page.getByRole('button', { name: 'Ask about making the bust', exact: true }).click();
  };
  await ask();
  const card = page.getByRole('dialog', { name: 'A Place for a Likeness' });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Another time', exact: true }).click();
  await card.getByRole('button', { name: 'Go on', exact: true }).click();
  await ask();
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Help plan the bust', exact: true }).click();
  await card.getByRole('button', { name: 'Go on', exact: true }).click();
  await expect(card).not.toBeVisible();
});
