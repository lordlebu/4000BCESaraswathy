// A painted plate, at the size it was painted.
//
// **This is the half jsdom cannot do, and it is the half where the real bug was.** A plate opens
// over the album, which is the first time this game has had two modals on screen at once. The
// component test proves the right one answers Escape; only a browser can prove the right one is
// *in front*, because portal nodes are appended to the body in effect order — child first — so the
// album's veil lands after the plate's and paints over it unless something lifts the inner one.
// There is no layout in jsdom and therefore no such thing as in front.
//
// The collection is seeded through the game's own save rather than walked to. Only a fraction of
// canon is painted, so meeting a plated species by walking is a coin toss on the seed, and a spec
// that is right two thirds of the time is a spec people learn to rerun.
//
// **One species is named here and it is the plated one, deliberately.** A plate is added, never
// taken away, so naming a painted species cannot go stale as the queue is worked down -- while
// naming an *un*painted one would fail the day somebody paints it. The unit suite finds both halves
// from the data; this spec cannot, because importing `src/content/` into Playwright's Node runtime
// trips the JSON-import problem described below.

import { expect, test, type Page } from '@playwright/test';
import { step } from './walk';

const SEED = 'plate-e2e';

/** A painted animal. See the note above on why this one is named and no unpainted one is. */
const PLATED = 'river-otter';

/**
 * Put a plated animal in the collection, by editing the save the game itself wrote.
 *
 * **Read the version back rather than importing it.** `SAVE_VERSION` lives in `src/save.ts`, and
 * importing that here drags `collection.ts`, `satchel.ts` and `nodes.ts` into Playwright's Node
 * runtime, where their JSON imports need an attribute Node will not infer — the spec does not fail
 * to assert, it never loads at all. Hard-coding the number would go stale the next time the ground
 * moves under a save, and `save.ts` says that happens for two different reasons. So: walk one step
 * so the game writes a save, read what it wrote, and put the edited copy back **through an init
 * script**, which runs before the application does.
 *
 * That last part is the whole trick, and writing to `localStorage` directly is what failed first:
 * the page is still live, the step's arrival settles a moment later, and the game saves its own
 * in-memory collection straight over the edit. The album then opened on a tamarind and a neem and
 * blamed the plates. An init script writes into the *next* load, before anything can overwrite it.
 *
 * `baked.spec.ts` reads-modifies-writes its baked world for the same reason.
 */
async function bootWithCollection(page: Page) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/?seed=${SEED}&hour=12`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });

  // One step, so there is a save to read the version out of.
  await step(page, 'ArrowRight');

  const saved = await page.evaluate(
    (seed) => localStorage.getItem(`south-of-tethys:${seed}`),
    SEED
  );
  expect(saved, 'the game wrote no save to add a collection to').toBeTruthy();

  const journey = JSON.parse(saved!) as { collection?: Record<string, unknown> };
  journey.collection = {
    ...(journey.collection ?? {}),
    [PLATED]: { id: PLATED, kind: 'creature' }
  };

  await page.addInitScript(
    ([seed, payload]) => {
      localStorage.setItem(`south-of-tethys:${seed}`, payload as string);
    },
    [SEED, JSON.stringify(journey)] as const
  );

  await page.reload();
  await expect(page.locator('.journal h2')).toBeVisible({ timeout: 20_000 });
}

/**
 * Open Records, then its album tab.
 *
 * The tab is labelled **Met**, not "Collection" -- the panel is headed Collection and the tab that
 * reaches it is not, which cost this spec its first run.
 */
async function openTheAlbum(page: Page) {
  await page.locator('.controls .control', { hasText: 'Records' }).click();
  await expect(page.locator('.diary')).toBeVisible({ timeout: 10_000 });
  await page.locator('.records-tab', { hasText: 'Met' }).first().click();
  await expect(page.locator('.met-entry').first()).toBeVisible({ timeout: 10_000 });
}

test('a plate in the album opens the painting, in front of the album', async ({ page }) => {
  await bootWithCollection(page);
  await openTheAlbum(page);

  const opener = page.locator('.plate-open').first();
  await expect(opener, 'no plate control in the album — did the save seed fail?').toBeVisible();
  await opener.click();

  const plate = page.locator('.plate-card-image');
  await expect(plate).toBeVisible({ timeout: 10_000 });

  // **In front, not merely present.** `elementFromPoint` at the picture's centre answers what the
  // browser would actually hand a click to, which is the only honest way to ask whether the album
  // is covering it.
  const onTop = await page.evaluate(() => {
    const img = document.querySelector('.plate-card-image') as HTMLElement | null;
    if (!img) return 'no plate';
    const box = img.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return hit?.closest('.plate-card') ? 'the plate' : (hit?.className ?? 'something else');
  });
  expect(onTop, 'something is painted over the plate').toBe('the plate');
});

test('the painting is drawn far larger than the thumbnail that opened it', async ({ page }) => {
  // The whole point. A plate is a 384-pixel file that was never drawn above 38 in the album.
  await bootWithCollection(page);
  await openTheAlbum(page);

  const thumb = (await page.locator('.plate-open img').first().boundingBox())!;
  await page.locator('.plate-open').first().click();
  await expect(page.locator('.plate-card-image')).toBeVisible({ timeout: 10_000 });
  const full = (await page.locator('.plate-card-image').boundingBox())!;

  expect(thumb.width, 'the album thumbnail has grown — check the CSS').toBeLessThan(60);
  expect(full.width, `the opened plate is only ${full.width}px wide`).toBeGreaterThan(240);
});

test('Escape puts the plate down and leaves the album open', async ({ page }) => {
  await bootWithCollection(page);
  await openTheAlbum(page);

  await page.locator('.plate-open').first().click();
  await expect(page.locator('.plate-card-image')).toBeVisible({ timeout: 10_000 });

  await page.keyboard.press('Escape');
  await expect(page.locator('.plate-card-image')).toBeHidden({ timeout: 5_000 });
  await expect(
    page.locator('.met-entry').first(),
    'the album closed too — the wrong modal answered Escape'
  ).toBeVisible();
});

test('the keyboard cannot leave the plate while it is open', async ({ page }) => {
  // The album underneath is a long scrolling list of controls. Two modals deep is exactly where a
  // trap that only handles one would let go.
  await bootWithCollection(page);
  await openTheAlbum(page);

  await page.locator('.plate-open').first().click();
  await expect(page.locator('.plate-card-image')).toBeVisible({ timeout: 10_000 });

  let escaped = 0;
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => Boolean(document.activeElement?.closest('.plate-card')));
    if (!inside) escaped += 1;
  }
  expect(escaped, `${escaped} of 10 tab stops left the plate`).toBe(0);
});
