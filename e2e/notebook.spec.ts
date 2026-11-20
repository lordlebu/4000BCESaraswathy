import { expect, test } from '@playwright/test';
import { examineFirst } from './context-event';
import { openRecords } from './records';

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
    await page.goto('?seed=notebook-review&hour=12&at=poi_eastern_field');
    await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
    await examineFirst(page);
    await openRecords(page);
    const diary = page.locator('.field-diary');
    await expect(diary).toBeVisible({ timeout: 20_000 });
    await page.evaluate(() => document.fonts.ready);
    const text = await diary.locator('.reading').allTextContents();
    expect(text.length).toBeGreaterThan(0);
    await expect(diary.locator('.reading').last()).toHaveCSS('font-size', '14px');
    expect(await diary.locator('.reading').last().evaluate(el => getComputedStyle(el).fontFamily)).toContain('Caladea');
    await expect(diary.locator('.records-tab')).toHaveCount(0);
    expect(await page.locator('.records-tab').first().evaluate(el => getComputedStyle(el).fontFamily)).toContain('Carlito');
    for (const [size, px] of [['comfortable', 16], ['large', 18], ['compact', 14]] as const) {
      await page.getByRole('combobox', { name: 'Reading size' }).selectOption(size);
      await expect(diary.locator('.reading').last()).toHaveCSS('font-size', `${px}px`);
      await expect(diary.locator('.road-notes .status')).toHaveCSS('font-size', `${px}px`);
      expect(await diary.locator('.reading').allTextContents()).toEqual(text);
      expect(await diary.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
    const shortcuts = diary.getByRole('navigation', { name: 'Diary sections' });
    await shortcuts.getByRole('link', { name: 'Road notes', exact: true }).click();
    await expect(diary.locator('#notebook-road')).toBeFocused();
    const roadNotes = diary.getByRole('region', { name: 'Road notes' });
    await expect(roadNotes.locator('.status')).not.toBeEmpty();
    await expect(roadNotes.locator('.map-coverage')).toContainText(/About \d+% of this map revealed\./);
    const coverage = await roadNotes.locator('.map-coverage').innerText();
    await expect(diary).not.toContainText('places discovered');
    await expect(shortcuts.getByRole('link', { name: 'Take it with you', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Take it with you', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Take it with you' })).toBeVisible();
    await diary.locator('.diary-close').click();
    await expect(page.getByRole('button', { name: /^Records/ })).toBeFocused();
    const handle = page.getByRole('button', { name: 'Open the field notes', exact: true });
    if (await handle.isVisible()) await handle.click();
    await expect(page.locator('.journal')).toBeVisible();
    await expect(page.locator('.journal')).not.toContainText(/places discovered|elders spoke/);
    await expect(page.locator('.journal .status-goal')).toHaveCount(0);
    const dockHeight = await page.locator('.dock').evaluate(el => el.getBoundingClientRect().height);
    await openRecords(page);
    await expect(diary).toBeVisible({ timeout: 20_000 });
    await page.getByRole('combobox', { name: 'Reading size' }).selectOption('large');
    await diary.locator('.diary-close').click();
    if (await handle.isVisible()) await handle.click();
    await expect(page.locator('.journal')).toHaveCSS('font-size', '18px');
    expect(await page.locator('.dock').evaluate(el => el.getBoundingClientRect().height)).toBe(dockHeight);
    await page.reload();
    // Initial placement can open the place and replace a surface opened before the world is ready.
    await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
    await openRecords(page);
    await expect(diary).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('combobox', { name: 'Reading size' })).toHaveValue('large');
    await expect(diary.locator('.map-coverage')).toHaveText(coverage);
    await expect(diary.locator('.reading').last()).toHaveCSS('font-size', '18px');
    expect(errors).toEqual([]);
    await context.close();
  });
}
