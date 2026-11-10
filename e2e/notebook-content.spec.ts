import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// Read authored fixtures as JSON instead of importing the game's content graph into Node.
const canon = JSON.parse(readFileSync(new URL('../data/canon/knowledge.json', import.meta.url), 'utf8')) as {
  discoveries: { id: string; levels: { entry: string }[] }[];
  vocabulary: { id: string }[];
  field_questions: { id: string }[];
};

for (const kind of ['empty', 'words', 'questions', 'dense'] as const) {
  test(`${kind} notebook retains authored text at large sizes`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/?seed=notebook-content&hour=12&at=poi_eastern_field');
    await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Look closer', exact: true }).first().click();
    const key = 'south-of-tethys:notebook-content';
    await expect.poll(() => page.evaluate(k => Boolean(JSON.parse(localStorage.getItem(k) ?? '{}').progress), key)).toBe(true);
    const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), key);
    const base = { ...saved.progress, rungs: {}, words: [], questions: [], answered: {} };

    const progress = {
      ...base,
      ...(kind === 'words' || kind === 'dense' ? { words: canon.vocabulary.map(w => w.id) } : {}),
      ...(kind === 'questions' || kind === 'dense' ? { questions: canon.field_questions.map(q => q.id) } : {}),
      ...(kind === 'dense' ? { rungs: Object.fromEntries(canon.discoveries.map(d => [d.id, d.levels.length - 1])) } : {})
    };
    await page.addInitScript(({ key, saved, progress }) => localStorage.setItem(key, JSON.stringify({ ...saved, progress })), { key, saved, progress });
    await page.reload();
    await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /^Records/ }).click();
    const diary = page.locator('.field-diary');
    await expect(diary).toBeVisible({ timeout: 20_000 });
    await page.getByRole('combobox', { name: 'Reading size' }).selectOption('large');
    if (kind === 'empty') await expect(diary.locator('.diary-empty')).toBeVisible();
    else {
      await expect(diary.locator('.diary-empty')).toHaveCount(0);
      await expect(diary.locator('.diary-sub')).not.toHaveText('Nothing written yet.');
    }
    if (kind === 'dense') {
      await expect(diary.locator('.entry')).toHaveCount(canon.discoveries.length);
      expect((await diary.locator('.reading').allTextContents()).sort()).toEqual(canon.discoveries.flatMap(d => d.levels.map(l => l.entry)).sort());
    }
    // Layout checks visit every populated section, including questions and words far below the fold.
    const links = diary.getByRole('navigation', { name: 'Diary sections' }).getByRole('link');
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      await links.nth(i).click();
      expect(await diary.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
    await diary.evaluate(el => { el.scrollTop = 0; });
    await page.screenshot({ path: `test-results/notebook-${kind}-360.png` });
    // 200% text enlargement: rem typography and header clearance must continue to reflow.
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await page.getByRole('combobox', { name: 'Reading size' }).selectOption('compact');
    expect(await page.locator('.field-diary').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expect(page.locator('.diary-close')).toBeVisible();
  });
}

test('missing notebook fonts fall back to readable text', async ({ page }) => {
  await page.route('**/*.woff2', route => route.abort());
  await page.goto('/?seed=notebook-fallback&hour=12&at=poi_eastern_field');
  await expect(page.locator('.place')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Look closer', exact: true }).first().click();
  await page.getByRole('button', { name: /^Records/ }).click();
  await expect(page.locator('.field-diary')).toBeVisible({ timeout: 20_000 });
  await page.locator('.field-diary .reading').last().scrollIntoViewIfNeeded();
  await expect(page.locator('.field-diary .reading').last()).toBeVisible();
  expect((await page.locator('.field-diary .reading').last().textContent())!.length).toBeGreaterThan(0);
  expect(await page.locator('.field-diary').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
});
