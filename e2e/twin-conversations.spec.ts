import { expect, test } from '@playwright/test';

const base = '?map=field_map_twins&seed=twin-review&door=open&firsts=off&chatter=off';

test('a walking stranger answers T at dusk on the eastern causeway approach', async ({ page }) => {
  await page.goto(base + '&hour=18&at=46,33');
  const row = page.locator('.tile-action button', { hasText: 'Walk with the carrier' });
  await expect(row).toBeEnabled({ timeout: 30000 });
  await page.keyboard.press('KeyT');
  await expect(page.locator('.activity-card h2')).toHaveText('Company on the road');
});

test('tapping a causeway carrier hails them, approaches over the bridge, and remembers the meeting', async ({ page }) => {
  await page.goto(base + '&hour=12&at=32,27');
  await page.waitForFunction(() => Boolean((window as any).__travellers));
  await expect.poll(() => page.evaluate(() => (window as any).__travellers().find((t: any) => t.id === 'company_carrier')?.visible)).toBe(true);
  const point = await page.evaluate(() => {
    const t = (window as any).__travellers().find((t: any) => t.id === 'company_carrier');
    const w = (window as any).__walker();
    return { x: w.screen.x + (t.tile.x - w.x) * w.cell, y: w.screen.y + (t.tile.y - w.y) * w.cell - 12 };
  });
  await page.mouse.click(point.x, point.y);
  const card = page.locator('.activity-card');
  await expect(card.locator('h2')).toHaveText('Company on the road', { timeout: 15000 });
  await card.getByRole('button', { name: 'Walk together a while' }).click();
  await card.getByRole('button', { name: 'Go on', exact: true }).click();
  await page.keyboard.press('KeyT');
  await expect(card.locator('h2')).toContainText('On the road with');
  await card.getByRole('button').last().click();
  await card.getByRole('button', { name: 'Go on', exact: true }).click();
  await page.reload();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('south-of-tethys:twin-review') ?? '{}').met ?? [])).toContain('field_map_twins:company_carrier');
});

test.describe('touch conversations', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('a visible stranger answers the touch action at dusk', async ({ page }) => {
    await page.goto(base + '&hour=18&at=46,33');
    const row = page.locator('.tile-action button', { hasText: 'Walk with the carrier' });
    await expect(row).toBeEnabled({ timeout: 30000 });
    await row.tap();
    await expect(page.locator('.activity-card h2')).toHaveText('Company on the road');
  });
});
