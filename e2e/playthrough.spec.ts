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
 * Everything one leg of the walk needs to read, in a single round trip.
 *
 * It used to be four: `arrival.isVisible()`, the status text, the journal heading, and a
 * `page.evaluate` for the tappable rectangle. Each is a message to the browser and back, which is
 * nearly free locally and is not free at all on CI, where the renderer is SwiftShader and every
 * round trip queues behind whatever the page is struggling to draw. Four of them times 110 legs is
 * a lot of waiting for information the page could have handed over once.
 *
 * Raw strings come back and the parsing happens in Node, so the regexes stay testable and out of
 * the page.
 */
async function survey(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('.map-surface canvas')!.getBoundingClientRect();
    const notes = document.querySelector('.journal')?.getBoundingClientRect();
    const arrival = document.querySelector('.arrival') as HTMLElement | null;
    const margin = 12;

    // The travel log was the only panel that could take a side of the map. It is not a panel
    // any more, so the uncovered rectangle runs the full width.
    const right = canvas.width - margin;
    const bottom = (notes ? notes.top - canvas.top : canvas.height) - margin;

    return {
      // Present *and* laid out. A hidden panel still answers `querySelector`.
      arrived: !!arrival && arrival.getClientRects().length > 0,
      status: document.querySelector('.status')?.textContent ?? '',
      here: document.querySelector('.journal h2')?.textContent ?? '',
      map: {
        left: margin,
        top: margin,
        width: right - margin,
        height: bottom - margin,
        // Canvas-relative numbers become viewport ones, which is what `page.mouse` wants -- see
        // the note on the tap below for why it is not `locator.click`.
        originX: canvas.left,
        originY: canvas.top
      }
    };
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
function bearing(status: string): Heading | null {
  if (/Sit a while/.test(status)) return null;

  const direction = status.match(/\b(?:north|south)?-?(?:east|west)?\b(?=[\s.]*(?:of here|$|\.))/)?.[0] ?? status;
  return {
    dx: /east/.test(direction) ? 1 : /west/.test(direction) ? -1 : 0,
    dy: /south/.test(direction) ? 1 : /north/.test(direction) ? -1 : 0,
    nearness: /very close/.test(status) ? 'here' : /You are close/.test(status) ? 'close' : 'far'
  };
}

/** How long the heading must hold still before a turn counts as finished. */
const QUIET_MS = 300;

/**
 * How long a turn may take. A tap hands the pathfinder a whole route; a step is one tile.
 *
 * **Both are ceilings, not waits.** `settle` returns the moment the traveller stops, so a short
 * path costs what a short path costs and these only bound the pathological case.
 *
 * The first version of these was five seconds and one and a half, picked from what a path costs on
 * this machine -- and that is the mistake worth naming, because a cap tuned to local speed is a
 * fixed wait wearing a disguise. A tile is `STEP_MS` = 425 ms of tween, so a twelve-tile route is
 * already 5.1 seconds and gets guillotined at five; the walk then taps again mid-route and is back
 * to advancing one tile a leg, which is exactly the failure this was meant to fix. CI, being
 * slower everywhere else, hit it far more often than a local run ever would.
 *
 * Sized from the map instead: 36x24, so a long route is comfortably past twenty tiles, and twenty
 * tiles is 8.5 seconds of walking before any slowness at all.
 */
const TAP_CAP = 20_000;
const STEP_CAP = 4_000;

/**
 * Wait for a turn to *finish*, rather than for a fixed span of time.
 *
 * The loop used to spend 1,900 ms after every tap and 780 ms after every step, which is 209 seconds
 * of deliberate waiting across 110 legs inside a 240-second budget. Waiting on the clock was never
 * necessary, because the turn is observable: the journal heading names where the traveller is.
 *
 * **But "changed" is the wrong signal, and getting that wrong is what broke this test.** A tap is
 * not one move -- it hands the pathfinder a whole route, and the traveller walks it tile by tile.
 * Returning the moment the heading first changes cuts that route off after its *first* tile and
 * taps again, so every leg advanced one tile instead of five. Measured: the walk went from needing
 * 110 legs to needing **214**, well past the loop's cap, and only still passed because the fifteen
 * seconds of grace after the loop let one last uninterrupted path run to the landmark. On CI there
 * was no such slack and it timed out.
 *
 * So the signal is *stillness*, not change: the heading must differ from where the turn started and
 * then hold the same value for `QUIET_MS`, which is what "the traveller stopped walking" looks like
 * from outside. Back to **38 legs and 41 seconds**, from 214 and 124.
 *
 * Polled in the page rather than across the wire, for the reason `walk.ts` gives: a round trip per
 * check costs more than the interval being polled for. A turn that genuinely achieves nothing -- a
 * tap into water, a blocked axis -- never satisfies the condition and falls back on `cap`, which
 * the loop already counts as `stuckFor`.
 */
async function settle(page: Page, before: string, cap: number): Promise<void> {
  await page
    .waitForFunction(
      ({ before: was, quiet }) => {
        const w = window as unknown as { __settle?: { text: string; since: number } };
        const text = document.querySelector('.journal h2')?.textContent ?? '';
        const now = Date.now();
        if (!w.__settle || w.__settle.text !== text) w.__settle = { text, since: now };
        return text !== was && now - w.__settle.since >= quiet;
      },
      { before, quiet: QUIET_MS },
      { timeout: cap, polling: 60 }
    )
    .catch(() => undefined);
}

test('walk from the settlement to the landmark and get a page for it', async ({ page }) => {
  // Crossing a 36x24 map on foot takes a while: steps are tweened, and wetland and hills are
  // deliberately slower than plains. This is a real playthrough, so it gets a real budget.
  //
  // Four minutes was that budget for a long time and it is not enough any more. The walk is real
  // time -- `STEP_MS` is 425 ms a tile and no amount of test cleverness makes a tween finish
  // sooner -- and CI walks the same route through a software renderer. Locally the walk is around
  // forty seconds; the margin at four minutes was small enough that ordinary variance decided the
  // run, which is not a threshold doing any work. Eight costs nothing on a green run: a timeout
  // bounds a failure, it does not pace a success. The job it sits in allows thirty.
  test.setTimeout(480_000);
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
    // One read for the whole leg. `wasAt` compares against the previous leg's heading, so noticing
    // a turn that achieved nothing costs nothing extra either.
    const view = await survey(page);
    if (view.arrived) break;

    const heading = bearing(view.status);
    if (!heading) break;

    stuckFor = view.here === wasAt ? stuckFor + 1 : 0;
    wasAt = view.here;

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
      await settle(page, wasAt, STEP_CAP);
    } else {
      // Tap ahead in the bearing direction and let the pathfinder route around the water. Nudging
      // off dead centre on the unused axis keeps a blocked route from retrying the identical tap.
      // Tap inside the part of the map that is actually showing. The journal and the field notes
      // are DOM panels over the canvas, so a tap aimed at 92% of the height lands on the notes and
      // never reaches the game — which is equally true for a player, and is why the camera keeps
      // the traveller in the uncovered area in the first place.
      const usable = view.map;
      const jitter = (leg % 5) * 0.08 - 0.16;
      const x = usable.left + usable.width * (0.5 + heading.dx * 0.4 + (heading.dx === 0 ? jitter : 0));
      const y = usable.top + usable.height * (0.5 + heading.dy * 0.4 + (heading.dy === 0 ? jitter : 0));
      // `page.mouse`, not `canvas.click`, and for exactly the reason `walk.ts` uses
      // `page.keyboard` rather than a locator press.
      //
      // `locator.click` first waits for the element to be **actionable**, and part of that is
      // being *stable*: the same bounding box for two consecutive animation frames. The canvas is
      // in a RESIZE-mode scale manager next to a journal panel that reflows as the day turns, so
      // there are moments when its box is never still for two frames together, and the click then
      // waits until the test times out. CI reported it precisely -- "element was visible and
      // stable but the operation never completed", then the page closing underneath the next read.
      //
      // That comment already exists in `walk.ts`, ending "every other spec in this suite already
      // presses through `page.keyboard`; this helper was the one place that did not." This tap was
      // the other place. A mouse click at a computed point sends the event without asking the
      // canvas to hold still, which is the same trade: the coordinates are ours to get right, and
      // nothing waits on a box that never settles.
      await page.mouse.click(usable.originX + x, usable.originY + y);
      await settle(page, wasAt, TAP_CAP);
    }

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
