import type { Page } from '@playwright/test';
import type { Journey } from '../src/save';
import { JOURNEY_VERSION, journeyStorageKey } from '../src/storageKeys';

export { journeyStorageKey };

export function journeyFixture(patch: Partial<Journey> = {}): Journey {
  return {
    discovered: [], collection: {}, reached: false,
    progress: { rungs: {}, words: [], recipes: [], made: [], answered: {}, questions: [] },
    satchel: {}, nodesByMap: {}, travelled: 0,
    ...patch,
    version: JOURNEY_VERSION
  };
}

export async function seedJourney(page: Page, seed: string, patch: Partial<Journey>): Promise<void> {
  await page.addInitScript(({ key, payload }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, payload);
  }, { key: journeyStorageKey(seed), payload: JSON.stringify(journeyFixture(patch)) });
}
