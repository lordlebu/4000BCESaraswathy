import { expect, type Page } from '@playwright/test';

/** Resolve the first available place discovery through its event card. */
export async function examineFirst(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Examine', exact: true }).first().click();
  await resolveOpenEvent(page);
}

/** Choose the first response and close an event card that is already open. */
export async function resolveOpenEvent(page: Page): Promise<void> {
  const card = page.getByRole('dialog', { name: 'Examine location' });
  await expect(card).toBeVisible();
  await card.locator('.activity-choice').first().click();
  await card.getByRole('button', { name: 'Set aside' }).click();
}
