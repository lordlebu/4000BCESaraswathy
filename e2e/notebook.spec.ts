import { expect, test } from '@playwright/test';

for (const view of [
  { width: 1280, height: 800, hasTouch: false },
  { width: 390, height: 844, hasTouch: true },
  { width: 360, height: 800, hasTouch: true },
  { width: 844, height: 390, hasTouch: true }
]) {
  test(`notebook reading sizes, shortcuts and dock geometry (${view.width}x${view.height})`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: view, hasTouch: view.hasTouch, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?seed=notebook-review&hour=12&at=poi_eastern_field');
    await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Look closer', exact: true }).first().click();
    await page.getByRole('button', { name: /^Records/ }).click();
    const diary = page.locator('.field-diary');
    await expect(diary).toBeVisible({ timeout: 20_000 });
    await page.evaluate(() => document.fonts.ready);
    const text = await diary.locator('.reading').allTextContents();
    expect(text.length).toBeGreaterThan(0);
    await expect(diary.locator('.reading').last()).toHaveCSS('font-size', '14px');
    expect(await diary.locator('.reading').last().evaluate(el => getComputedStyle(el).fontFamily)).toContain('Caladea');
    expect(await diary.locator('.records-tab').first().evaluate(el => getComputedStyle(el).fontFamily)).toContain('Carlito');
    for (const [size, px] of [['comfortable', 16], ['large', 18], ['compact', 14]] as const) {
      await page.getByRole('combobox', { name: 'Reading size' }).selectOption(size);
      await expect(diary.locator('.reading').last()).toHaveCSS('font-size', `${px}px`);
      expect(await diary.locator('.reading').allTextContents()).toEqual(text);
      expect(await diary.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
    const shortcuts = diary.getByRole('navigation', { name: 'Diary sections' });
    const exportLink = shortcuts.getByRole('link', { name: 'Take it with you', exact: true });
    await exportLink.click();
    const heading = diary.locator('#notebook-export');
    await expect(heading).toBeFocused();
    const visible = await heading.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const top = el.closest('.field-diary')!.querySelector('.notebook-header')!.getBoundingClientRect().bottom;
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return rect.top >= top && (hit === el || el.contains(hit));
    });
    expect(visible, 'section heading is below the sticky header and can be hit').toBe(true);
    await diary.locator('.diary-close').click();
    await expect(page.getByRole('button', { name: /^Records/ })).toBeFocused();
    const handle = page.getByRole('button', { name: 'Open the field notes', exact: true });
    if (await handle.isVisible()) await handle.click();
    await expect(page.locator('.journal')).toBeVisible();
    const dockHeight = await page.locator('.dock').evaluate(el => el.getBoundingClientRect().height);
    await page.getByRole('button', { name: /^Records/ }).click();
    await expect(diary).toBeVisible({ timeout: 20_000 });
    await page.getByRole('combobox', { name: 'Reading size' }).selectOption('large');
    await diary.locator('.diary-close').click();
    if (await handle.isVisible()) await handle.click();
    await expect(page.locator('.journal')).toHaveCSS('font-size', '18px');
    expect(await page.locator('.dock').evaluate(el => el.getBoundingClientRect().height)).toBe(dockHeight);
    await page.reload();
    await page.getByRole('button', { name: /^Records/ }).click();
    await expect(diary).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('combobox', { name: 'Reading size' })).toHaveValue('large');
    await expect(diary.locator('.reading').last()).toHaveCSS('font-size', '18px');
    expect(errors).toEqual([]);
    await context.close();
  });
}
