// Does the watchdog actually fire?
//
// `test/stall.test.ts` proves every decision it makes and would pass with the timer wired to
// nothing -- which is this codebase's signature fault, with six recorded instances. A stall is a
// browser event, so only a browser can say the timer is mounted, that it survives being blocked,
// and that what it records is readable. The block is deliberate and synchronous: that is the one
// thing a page can do to itself that is indistinguishable from the freeze being hunted.

import { expect, test } from '@playwright/test';

test('a blocked main thread is noticed, described and kept', async ({ page }) => {
  await page.goto('/?seed=stall-check');
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  // Let the scene come up, so the record has a walker in it rather than null.
  await page.waitForTimeout(2000);

  const warnings: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'warning' && m.text().startsWith('[stall]')) warnings.push(m.text());
  });

  expect(await page.evaluate(() => (window as any).__stalls?.length ?? -1), 'the watchdog is not mounted').toBe(0);

  // Peg the thread for two and a half seconds, which is well past STALL_MS.
  await page.evaluate(() => {
    const end = performance.now() + 2500;
    while (performance.now() < end) {
      /* deliberately blocking */
    }
  });
  await page.waitForTimeout(600);

  const stalls = (await page.evaluate(() => (window as any).__stalls ?? [])) as {
    lateBy: number;
    walker: { x: number; y: number; biome: string } | null;
  }[];

  expect(stalls.length, 'the block went unnoticed').toBeGreaterThan(0);
  expect(stalls[0]!.lateBy, 'the gap was measured too short to be the block').toBeGreaterThan(1000);
  expect(stalls[0]!.walker, 'nothing was recorded about where the walker was').not.toBeNull();
  expect(typeof stalls[0]!.walker!.biome, 'the walker record is not the shape __walker returns').toBe('string');
  expect(warnings.join(' '), 'no console line a phone could show').toMatch(/^\[stall\] stalled \d+ms at \d+,\d+ on \w+/);

  // And it survives the reload that usually follows a freeze.
  const kept = await page.evaluate(() => window.localStorage.getItem('sot.stalls'));
  expect(kept, 'nothing was persisted for a session that gets reloaded').toBeTruthy();
  expect(JSON.parse(kept!).length).toBeGreaterThan(0);
});
