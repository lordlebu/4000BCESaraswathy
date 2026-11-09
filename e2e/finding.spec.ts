// Where the nearest of what the pin wants lies (`docs/satchel-and-hearth.md`, phase 7).
//
// The owner could not find bamboo on the Narmada: nothing said which tile held it. `test/finding.test.ts`
// holds the rule; this proves it reaches the screen -- the pinned line names the nearest seen source
// with steps and a bearing, and the map draws a diamond on that tile.

import { expect, test } from '@playwright/test';

const SEED = 'find-1';

test('a pinned knife points at the nearest flint, in words and on the map', async ({ page }) => {
  await page.addInitScript(
    ({ key }) => {
      try {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ knowledgeVersion: 1, pinned: 'recipe_flint_knife' }));
      } catch {
        // Storage refused: the spec fails on what it looks for, which is the honest outcome.
      }
    },
    { key: `south-of-tethys:${SEED}` }
  );
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/?seed=${SEED}&hour=12`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });

  const where = page.locator('.pinned-recipe .pinned-where');
  await expect(where, 'the pinned line does not say where the flint is').toHaveText(/^flint, (here|\d+ steps? [a-z-]+)$/i, { timeout: 15_000 });

  type Walker = { sourceMark: { x: number; y: number } | null };
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __walker: () => Walker }).__walker().sourceMark), { timeout: 10_000 })
    .not.toBeNull();
});

for (const view of [{ width: 1280, height: 800, touch: false }, { width: 390, height: 844, touch: true }]) {
  test(`source marker can be hidden and shown without walking or revealing ground (${view.width})`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: view, hasTouch: view.touch });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('south-of-tethys:find-1', JSON.stringify({ knowledgeVersion: 1, pinned: 'recipe_flint_knife' })));
    await page.goto('/?seed=find-1&hour=12');
    const hide = page.getByRole('button', { name: /^Hide marker:/ });
    await expect(hide).toBeVisible({ timeout: 20_000 });
    const snapshot = () => page.evaluate(() => {
      const w = (window as unknown as { __walker: () => { x: number; y: number; travelled: number; discovered: number; sourceMark: unknown } }).__walker();
      return { x: w.x, y: w.y, travelled: w.travelled, discovered: w.discovered, mark: w.sourceMark };
    });
    const before = await snapshot();
    if (view.touch) await hide.tap(); else await hide.click();
    await expect.poll(async () => (await snapshot()).mark).toBeNull();
    const show = page.getByRole('button', { name: /^Show me:/ });
    expect((await show.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    if (view.touch) await show.tap(); else await show.click();
    await expect.poll(snapshot).toEqual(before);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/guidance-${view.width}.png` });
    if (view.touch) {
      await page.setViewportSize({ width: 844, height: 390 });
      await expect.poll(() => page.evaluate(() => (window as unknown as { __walker: () => { guidanceEdge: boolean } }).__walker().guidanceEdge)).toBe(true);
      await page.screenshot({ path: 'test-results/guidance-landscape.png' });
      await page.getByRole('button', { name: /^Hide marker:/ }).tap();
      await expect.poll(() => page.evaluate(() => (window as unknown as { __walker: () => { guidanceEdge: boolean } }).__walker().guidanceEdge)).toBe(false);
    }
    await context.close();
  });
}
