// Walking, in a way that survives a loaded machine.
//
// Every spec that moves the traveller used to press a key and wait a fixed number of
// milliseconds. That is the same mistake the zoom spec made: a step is a tween whose length
// depends on the terrain — wetland is deliberately slower than plains — and the scene ignores
// input while one is in flight, so a press during a slow step is simply swallowed. It looks
// like "the panel never opened" and is really "the second key never counted".
//
// Waiting for the journal to report a new tile waits for the actual arrival.

import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * How long to wait for a step to land before assuming it went nowhere.
 *
 * **Twelve seconds, and the number is about the renderer rather than the tween.** A step is
 * `STEP_MS * cost * pace` -- 425ms on ordinary ground -- so four seconds was nearly ten times the
 * work and still failed: `travellers.spec.ts` reported "guyuk would not walk" on CI and again on
 * its retry, and reproduced in the CI container at 6 of 7 failing with two workers.
 *
 * The same spec passes 6 of 7 with `--workers=1` in the same container. That is the whole
 * diagnosis: the tween is not slow, the *frame* is, because a software renderer sharing four
 * cores with a second worker can stall past any bound tuned against tween length.
 *
 * Raising it costs nothing on a green run -- the wait ends the moment the journal changes -- and
 * the timeout was never a failure anyway: it is swallowed, because a step onto identical ground
 * genuinely reads the same. It only ever needed to outlast a stall.
 */
const ARRIVAL_TIMEOUT = 12_000;

/** Take one step, and return when the traveller has actually arrived somewhere new. */
export async function step(page: Page, key: string): Promise<void> {
  const before = await readJournal(page, 'before the step');

  // `page.keyboard`, not `locator('.map-surface canvas').press`.
  //
  // Phaser listens on the window, so the key arrives either way -- but a locator press first waits
  // for that element to be *actionable*, and part of actionability is being **stable**: the same
  // bounding box for two consecutive animation frames. The canvas is in a RESIZE-mode scale
  // manager sitting next to a journal panel that reflows as the day turns, so there are moments
  // when its box is never still for two frames together. The wait then runs to the test timeout.
  //
  // That is what failed CI on the fatigue walk: ninety seconds spent "waiting for
  // locator('.map-surface canvas')" before a key was ever sent, on both the run and its retry,
  // while the spec passes in 24 seconds locally. Every other spec in this suite already presses
  // through `page.keyboard`; this helper was the one place that did not.
  await page.keyboard.press(key);

  // Poll **inside the browser**, not across the wire.
  //
  // This was a loop of `waitForTimeout(100)` then `textContent()`, and the round-trip was not
  // free: a step that finished in 1100ms was detected after 7 polls, so each iteration cost about
  // 157ms rather than the 100 intended. A third of the wait was Playwright talking to Chromium,
  // paid fifteen times a spec, on the slowest job in CI.
  //
  // `waitForFunction` ships the comparison to the page and polls there, so arrival is noticed
  // within the polling interval instead of an interval plus a round-trip.
  //
  // The timeout is not a failure. A step onto identical ground genuinely reads the same, so this
  // can never demand a change -- it can only wait longer than any tween before giving up, which is
  // the useful part.
  await page
    .waitForFunction(
      (previous) => (document.querySelector('.journal')?.textContent ?? '') !== previous,
      before,
      { timeout: ARRIVAL_TIMEOUT, polling: 50 }
    )
    .catch(() => undefined);
}

/**
 * The field notes' text, or a failure that says what went wrong.
 *
 * `locator.textContent()` waits for the element to exist and then, if it never does, runs to the
 * *test's* timeout — ninety seconds, reported as `waiting for locator('.journal')` with no hint of
 * why. That has now cost several CI investigations, and the message is the reason: it reads as
 * slowness, when what it actually means is that the panel is **gone from the DOM**.
 *
 * `.journal` only renders while the surface is `here` (see `src/ui/surface.ts`), so it vanishing
 * mid-walk means something closed or replaced that surface — an interrupt, a travel, a scene
 * restart. Waiting longer can never fix that.
 *
 * So the wait is bounded to a few seconds and the failure names the state it found. A spec that
 * dies in five seconds pointing at the surface is worth many that die in ninety pointing at
 * nothing.
 */
async function readJournal(page: Page, when: string): Promise<string> {
  const journal = page.locator('.journal');
  try {
    await journal.first().waitFor({ state: 'attached', timeout: 5_000 });
  } catch {
    throw new Error(
      `The field notes are not on the page ${when}. \`.journal\` renders only while the surface ` +
        `is \`here\`, so something closed or replaced it. Visible instead: ${await surfaces(page)}.`
    );
  }
  return (await journal.first().textContent()) ?? '';
}

/**
 * Which surface is on the page, for the message above — and never a thrown error.
 *
 * This is a diagnostic, so it must not be able to fail louder than the thing it is diagnosing, and
 * on its first outing it did exactly that. When the *test* runs out of time, Playwright tears the
 * context down and then unwinds; a bare `page.evaluate` in that window throws "Target page,
 * context or browser has been closed", which replaced the real failure in the CI log with a
 * pointer to this file. The genuine problem — the fatigue walk overrunning ninety seconds — was
 * invisible underneath it.
 */
async function surfaces(page: Page): Promise<string> {
  try {
    const found = await page.evaluate(() =>
      ['.journal', '.sheet', '.arrival', '.overworld', '.ending', '.field-kit']
        .filter((sel) => document.querySelector(sel))
        .join(', ')
    );
    return found || 'nothing';
  } catch {
    return 'could not look — the page was already closed, which usually means the test itself ran out of time';
  }
}

/** Walk a fixed route and wait for the place panel it should end on. */
export async function walkTo(page: Page, keys: string[], timeout = 20_000): Promise<void> {
  for (const key of keys) await step(page, key);
  await expect(page.locator('.place')).toBeVisible({ timeout });
}

/**
 * The biome order the stored world encodes with, read out of the source -- `e2e/baked.spec.ts`
 * gives the reason: importing it drags in the canon bundle, which Playwright's loader refuses.
 */
const BIOME_CODES = [...readFileSync('src/world/bake.ts', 'utf8')
  .split('export const BIOME_CODES')[1]!
  .split('];')[0]!
  .matchAll(/'([a-z_]+)'/g)].map((m) => m[1]!);

/** Ground a walk up to a place may start on and cross: dry land, not water and not air. */
const APPROACHABLE = new Set(['plains', 'coast', 'forest', 'hills', 'settlement', 'desert', 'wetland', 'mountains', 'snow']);

/**
 * Where to stand to walk onto a place, and the two steps that get there -- read from the world the
 * game actually built, never written down.
 *
 * **Every spec that walked onto a place used to name the tile**, "two north of the Eastern Field at
 * 10,10", and a coordinate is a searched seed by another name: the day placement changed, the
 * places moved and six specs walked two steps into nothing. This boots the seed once, reads where
 * the place landed from the stored world, and picks the first side with two tiles of dry land to
 * approach over. Arrival is what opens a place, so the traveller has to step onto it rather than
 * start on it.
 */
export async function approachPlace(
  page: Page,
  seed: string,
  poiId: string,
  map = 'field_map_lothal'
): Promise<{ at: string; keys: string[] }> {
  await page.goto(`/?seed=${seed}&map=${map}`);
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  const baked = await page.evaluate(
    (k) =>
      JSON.parse(localStorage.getItem(k) ?? 'null') as {
        biomes: string[];
        placed: [string, number, number][];
      } | null,
    `south-of-tethys:world:${seed}:${map}`
  );
  if (!baked) throw new Error(`${map}/${seed}: no stored world to read the places from`);
  const found = baked.placed.find(([id]) => id === poiId);
  if (!found) throw new Error(`${map}/${seed}: ${poiId} was not placed`);
  const [, px, py] = found;
  const places = new Set(baked.placed.map(([, x, y]) => `${x},${y}`));
  const land = (x: number, y: number) => {
    const code = baked.biomes[y]?.[x];
    if (code === undefined || places.has(`${x},${y}`)) return false;
    return APPROACHABLE.has(BIOME_CODES[Number.parseInt(code, 36)] ?? '');
  };
  // From the north first, as the old fixtures did, then the other three sides.
  const sides: [number, number, string][] = [
    [0, -1, 'ArrowDown'],
    [-1, 0, 'ArrowRight'],
    [1, 0, 'ArrowLeft'],
    [0, 1, 'ArrowUp']
  ];
  for (const [dx, dy, key] of sides) {
    if (land(px + dx, py + dy) && land(px + 2 * dx, py + 2 * dy)) {
      return { at: `${px + 2 * dx},${py + 2 * dy}`, keys: [key, key] };
    }
  }
  throw new Error(`${map}/${seed}: no side of ${poiId} at ${px},${py} has two tiles of dry land`);
}

/** Ground that costs 1 to step onto: the quickest step there is short of a road. */
const OPEN = new Set(['plains', 'coast', 'settlement']);

const openGroundFound = new Map<string, string>();

/**
 * A tile of open, cheap ground with the same immediately east of it, found in the stored world --
 * for a spec that needs to take one ordinary step and does not care where.
 *
 * **Why it has to be cheap, measured.** `travellers.spec.ts` stood at a named tile and pressed D.
 * That tile was river until marsh stopped being eased into river, and swamp afterwards: a step of
 * cost 2 instead of 1. Under CI's software renderer the first seconds after boot run at a few
 * frames a second and Phaser caps how far a tween advances per frame, so a step's wall time scales
 * with its cost -- and the cost-2 step overran the twelve-second wait, "would not walk", on nearly
 * every run of the branch while the page itself booted exactly as fast as before (median 1.52s
 * against 1.53s, five loads each, in the CI image). Ordinary ground makes it the step it meant.
 */
export async function openGround(
  page: Page,
  seed: string,
  map = 'field_map_lothal'
): Promise<string> {
  const remembered = openGroundFound.get(`${seed}:${map}`);
  if (remembered) return remembered;
  await page.goto(`/?seed=${seed}&map=${map}`);
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
  const baked = await page.evaluate(
    (k) =>
      JSON.parse(localStorage.getItem(k) ?? 'null') as {
        biomes: string[];
        placed: [string, number, number][];
      } | null,
    `south-of-tethys:world:${seed}:${map}`
  );
  if (!baked) throw new Error(`${map}/${seed}: no stored world to read the ground from`);
  const places = new Set(baked.placed.map(([, x, y]) => `${x},${y}`));
  const open = (x: number, y: number) => {
    const code = baked.biomes[y]?.[x];
    if (code === undefined || places.has(`${x},${y}`)) return false;
    return OPEN.has(BIOME_CODES[Number.parseInt(code, 36)] ?? '');
  };
  for (let y = 2; y < baked.biomes.length - 2; y += 1) {
    for (let x = 2; x < baked.biomes[0]!.length - 3; x += 1) {
      if (open(x, y) && open(x + 1, y)) {
        openGroundFound.set(`${seed}:${map}`, `${x},${y}`);
        return `${x},${y}`;
      }
    }
  }
  throw new Error(`${map}/${seed}: no open ground with open ground east of it`);
}
