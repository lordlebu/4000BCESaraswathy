import { expect, type Page } from '@playwright/test';

/** Open the player's Records and await the real panel, rather than its loading dialog.
 * Callers must finish their scene/placement setup before using the controls. Content
 * assertions retain their own budgets after this existing 20-second loading budget. */
export async function openRecords(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Records/ }).click();
  await expect(page.locator('.diary')).toBeVisible({ timeout: 20_000 });
}
