// A whole session, start to finish.
//
// The other specs prove the parts. This one proves the loop: set out from the settlement, walk
// across the country, arrive at the landmark, and get a written page for it. It is the only test
// that exercises the arrival beat, which is the moment the whole slice is built around.
//
// Navigation is by tapping rather than by key presses, because tapping routes through the scene's
// BFS pathfinder and therefore walks *around* the sea instead of pressing hopelessly into it.

import { expect, test, type Page } from '@playwright/test';

const SEED = 'play-test';

type Heading = { dx: number; dy: number; nearness: 'far' | 'close' | 'here' };

/**
 * Read the compass bearing the journal is currently giving for the landmark.
 *
 * The wording carries distance as well as direction, which the walk needs: striding toward the far
 * edge of the view is right when the landmark is a day away and wrong when it is two tiles off,
 * where it simply overshoots and paces back and forth.
 */
async function bearing(page: Page): Promise<Heading | null> {
  const status = (await page.locator('.status').textContent()) ?? '';
  if (/Sit a while/.test(status)) return null;

  const direction = status.match(/\b(?:north|south)?-?(?:east|west)?\b(?=[\s.]*(?:of here|$|\.))/)?.[0] ?? status;
  return {
    dx: /east/.test(direction) ? 1 : /west/.test(direction) ? -1 : 0,
    dy: /south/.test(direction) ? 1 : /north/.test(direction) ? -1 : 0,
    nearness: /very close/.test(status) ? 'here' : /You are close/.test(status) ? 'close' : 'far'
  };
}

test('walk from the settlement to the landmark and get a page for it', async ({ page }) => {
  // Crossing a 36x24 map on foot takes a while: steps are tweened, and wetland and hills are
  // deliberately slower than plains. This is a real playthrough, so it gets a real budget.
  test.setTimeout(240_000);
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(`uncaught: ${error.message}`));

  await page.goto(`?seed=${SEED}`);
  const canvas = page.locator('.map-surface canvas');
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).not.toHaveText('Travel Journal', { timeout: 20_000 });

  // The goal is named from the very first step.
  const opening = (await page.locator('.status').textContent()) ?? '';
  expect(opening).toMatch(/elders spoke of [A-Z]/);

  const box = (await canvas.boundingBox())!;
  const arrival = page.locator('.arrival');

  for (let leg = 0; leg < 60; leg += 1) {
    if (await arrival.isVisible()) break;

    const heading = await bearing(page);
    if (!heading) break;

    if (heading.nearness === 'here') {
      // Within a few tiles, tapping overshoots and the traveller paces back and forth. Step.
      if (heading.dy) await page.keyboard.press(heading.dy > 0 ? 'ArrowDown' : 'ArrowUp');
      if (heading.dx) await page.keyboard.press(heading.dx > 0 ? 'ArrowRight' : 'ArrowLeft');
      await page.waitForTimeout(450);
      continue;
    }

    // Otherwise tap ahead in the bearing direction and let the pathfinder route around water.
    // Nudging off dead centre on the unused axis keeps a blocked route from retrying the same tap.
    const reach = heading.nearness === 'close' ? 0.18 : 0.42;
    const jitter = (leg % 5) * 0.08 - 0.16;
    const x = box.width * (0.5 + heading.dx * reach + (heading.dx === 0 ? jitter : 0));
    const y = box.height * (0.5 + heading.dy * reach + (heading.dy === 0 ? jitter : 0));
    await canvas.click({ position: { x, y } });
    await page.waitForTimeout(1400);
  }

  await expect(arrival, 'never reached the landmark').toBeVisible({ timeout: 15_000 });
  await expect(arrival.locator('h2')).toContainText(/, the /);
  await expect(arrival).toContainText(/Recorded in the travel journal/);
  await expect(arrival).toContainText(SEED);
  await expect(arrival).not.toContainText(/undefined|null|NaN/);

  // The journal now knows the journey finished, so the log stops saying it was never found.
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Keep this page' }).click();
  expect((await download).suggestedFilename()).toBe(`south-of-tethys-${SEED}.png`);

  expect(problems, problems.join('\n')).toEqual([]);
});
