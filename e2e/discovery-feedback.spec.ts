import { expect, test } from '@playwright/test';
for (const view of [{ width: 1280, height: 800, touch: false }, { width: 390, height: 844, touch: true }, { width: 844, height: 390, touch: true }]) {
  test(`Look feedback reaches the matching diary entry (${view.width}x${view.height})`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: view, hasTouch: view.touch, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?seed=discovery-feedback&hour=12&at=poi_eastern_field');
    await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
    const look = page.getByRole('button', { name: 'Look closer', exact: true }).first();
    await look.click();
    const notice = page.locator('.discovery-notice');
    await expect(notice).toContainText('Discovery noticed');
    const name = (await page.locator('.look.discovery-updated h4').first().textContent())!;
    const reading = await page.locator('.look.discovery-updated .look-text > p').first().textContent();
    const read = notice.getByRole('button', { name: `Read diary: ${name}`, exact: true });
    expect((await read.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `test-results/discovery-${view.width}x${view.height}.png` });
    if (view.touch) await read.tap(); else await read.click();
    const heading = page.locator('.diary .entry.discovery-updated h4');
    await expect(heading).toHaveText(name);
    await expect(heading).toBeFocused();
    await expect(page.locator('.diary .entry.discovery-updated .reading').last()).toHaveText(reading!);
    await page.locator('.diary-close').click();
    await expect(page.getByRole('button', { name: /^Records/ })).toBeFocused();
    await expect(notice).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
    await expect(notice).toHaveCount(0);
    expect(errors).toEqual([]);
    await context.close();
  });
}

test('a conversation grant waits until the conversation closes and can be dismissed', async ({ page }) => {
  await page.goto('/?seed=discovery-grant&map=field_map_aravali&at=poi_kept_stones&hour=12');
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
  await page.locator('.who', { hasText: 'Dala' }).click();
  await expect(page.locator('.conversation .dialogue-beat')).toBeVisible();
  await expect(page.locator('.discovery-notice')).toHaveCount(0);
  await page.locator('.conversation').getByRole('button', { name: 'Back', exact: true }).click();
  const notice = page.locator('.discovery-notice');
  await expect(notice).toContainText('Discovery noticed');
  await expect(notice).toContainText('The Kept Wall');
  await notice.getByRole('button', { name: /^Dismiss discovery notice:/ }).click();
  await expect(notice).toHaveCount(0);
  await page.getByRole('button', { name: /^Records/ }).click();
  await expect(page.locator('.diary')).toContainText('The Kept Wall');
});
