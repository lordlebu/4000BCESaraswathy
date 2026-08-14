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

/**
 * The rectangle of canvas the overlays are not covering, in canvas coordinates.
 *
 * The map fills the screen and the panels float on top of it, so "where can I tap" is no longer
 * "anywhere on the canvas".
 */
async function visibleMap(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('.map-surface canvas')!.getBoundingClientRect();
    const notes = document.querySelector('.journal')?.getBoundingClientRect();
    const margin = 12;

    const left = margin;
    const top = margin;
    // The travel log was the only panel that could take a side of the map. It is not a panel
    // any more, so the uncovered rectangle runs the full width.
    const right = canvas.width - margin;
    const bottom = (notes ? notes.top - canvas.top : canvas.height) - margin;
    return { left, top, width: right - left, height: bottom - top };
  });
}

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

  const arrival = page.locator('.arrival');

  // Sixty legs was enough while landmarks tended to land on coast and plains. Levelling the terrain
  // choice sends them into the highlands too, which is slower ground — `travelCost` is 3 in the
  // mountains against 1 on plains — and a windier route, so the same walk needs more turns.
  let wasAt = '';
  let stuckFor = 0;

  for (let leg = 0; leg < 110; leg += 1) {
    if (await arrival.isVisible()) break;

    const heading = await bearing(page);
    if (!heading) break;

    // Taps cover ground; steps finish the job.
    //
    // A tap becomes a pathfinding request for whatever tile it lands on, and a tile that is sea or
    // cut off yields no path at all — the traveller simply does not move, the journal still says
    // the same thing, and the next turn taps the same place. That deadlocked the walk twice on the
    // same tile: "Lamtala lies south-east of here. You are close", 248 tiles explored, going
    // nowhere. Once the journal says the place is close, step instead, which cannot miss.
    if (heading.nearness !== 'far' || stuckFor >= 2) {
      if (heading.dy) await page.keyboard.press(heading.dy > 0 ? 'ArrowDown' : 'ArrowUp');
      if (heading.dx) await page.keyboard.press(heading.dx > 0 ? 'ArrowRight' : 'ArrowLeft');
      // A stuck walk is usually one axis blocked, so try the other on its own as well.
      if (stuckFor >= 3) {
        await page.keyboard.press(stuckFor % 2 ? 'ArrowUp' : 'ArrowDown');
      }
      await page.waitForTimeout(780);
    } else {
      // Tap ahead in the bearing direction and let the pathfinder route around the water. Nudging
      // off dead centre on the unused axis keeps a blocked route from retrying the identical tap.
      // Tap inside the part of the map that is actually showing. The journal and the field notes
      // are DOM panels over the canvas, so a tap aimed at 92% of the height lands on the notes and
      // never reaches the game — which is equally true for a player, and is why the camera keeps
      // the traveller in the uncovered area in the first place.
      const usable = await visibleMap(page);
      const jitter = (leg % 5) * 0.08 - 0.16;
      const x = usable.left + usable.width * (0.5 + heading.dx * 0.4 + (heading.dx === 0 ? jitter : 0));
      const y = usable.top + usable.height * (0.5 + heading.dy * 0.4 + (heading.dy === 0 ? jitter : 0));
      await canvas.click({ position: { x, y } });
      await page.waitForTimeout(1900);
    }

    // "Somewhere at 27, 18" changes as the traveller moves, so an unchanged heading means a turn
    // that achieved nothing.
    const here = (await page.locator('.journal h2').textContent()) ?? '';
    stuckFor = here === wasAt ? stuckFor + 1 : 0;
    wasAt = here;
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
