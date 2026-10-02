// The people at a camp, the way in to it, and who comes and goes, in a browser.
//
// `test/campLife.test.ts` holds the rules and proves each thing happens on the real maps. This proves
// the half only a page can: that the scene draws a camp's people where the hour puts them, that the
// talk row reaches them, that the trodden way is drawn, and that a runner and a visitor are on the
// map on the days the rules give them.
//
// **No day, hour or tile is pinned.** The scene is asked which day has a camp, a runner or a visitor
// (`__camp(day)`), the journey's clock is seeded to that day, and `?hour=` sets the hour -- so a
// change to where camps pitch or who visits moves this spec with it rather than breaking it.

import { expect, test, type Page } from '@playwright/test';

type Point = { x: number; y: number };
type Camp = {
  id: string;
  kind: string;
  at: Point;
  from: number;
  to: number;
  way: { turnOff: Point; tiles: number; path: Point[] } | null;
  errand: { travellerId: string; turnOff: Point; beside: Point; arrive: number; part: number } | null;
  visits: { travellerId: string; arrive: number; leave: number }[];
  shelterUp: boolean | null;
  trodden: number;
  troddenShown: number;
  turnOffMarker: boolean;
};
type Seen = { id: string; visible: boolean; tile: Point | null; camp: string | null; slot: string | null; marked: boolean };
type Walker = { x: number; y: number; screen: Point; cell: number };

const MAP = 'field_map_lothal';
/** One day of the scene's clock, in milliseconds of walking. `DAY_MS` in `game/dayNight.ts`. */
const DAY_MS = 60 * 60 * 1000;
/** Seeds tried in order for a day with what a test needs; the first that has it is used. */
const SEEDS = ['camps', 'camp-life', 'a', 'b', 'c', 'd'];

const campOn = (page: Page, day?: number) =>
  page.evaluate((d) => (window as unknown as { __camp?: (d?: number) => Camp | null }).__camp?.(d) ?? null, day);
const travellers = (page: Page) =>
  page.evaluate(() => (window as unknown as { __travellers?: () => Seen[] }).__travellers?.() ?? []) as Promise<Seen[]>;
const walker = (page: Page) =>
  page.evaluate(() => (window as unknown as { __walker?: () => Walker }).__walker?.() ?? null);
const cheb = (a: Point, b: Point) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

async function boot(page: Page, seed: string, hour: number, at?: Point) {
  await page.goto(`/?seed=${seed}&map=${MAP}&hour=${hour}${at ? `&at=${at.x},${at.y}` : ''}`);
  await expect(page.locator('.map-surface canvas')).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(() => page.evaluate(() => typeof (window as unknown as { __camp?: unknown }).__camp), { timeout: 20_000 })
    .toBe('function');
}

/** The first seed and day, in the first month, for which `want` is true of that day's camp. */
async function findDay(page: Page, want: (c: Camp, day: number) => boolean): Promise<{ seed: string; day: number; camp: Camp }> {
  for (const seed of SEEDS) {
    await boot(page, seed, 12);
    for (let d = 1; d < 30; d += 1) {
      const camp = await campOn(page, d);
      if (camp && want(camp, d)) return { seed, day: d, camp };
    }
  }
  throw new Error('no seed has such a day in its first month');
}

/**
 * Open the journey on that day at that hour, standing at `at` if the game will start there. The clock
 * is written into the save before the page loads, the same way `e2e/camps.spec.ts` does it.
 */
async function openOn(page: Page, seed: string, day: number, hour: number, at?: Point): Promise<boolean> {
  await page.addInitScript(
    ({ key, travelled }) => {
      try {
        const saved = JSON.parse(localStorage.getItem(key) ?? '{"knowledgeVersion":1}');
        localStorage.setItem(key, JSON.stringify({ ...saved, travelled }));
      } catch {
        // Storage refused: the spec fails on what it looks for, which is the honest outcome.
      }
    },
    { key: `south-of-tethys:${seed}`, travelled: day * DAY_MS + 1000 }
  );
  await boot(page, seed, hour, at);
  await expect.poll(() => walker(page), { timeout: 30_000 }).not.toBeNull();
  if (!at) return true;
  const stood = await walker(page);
  return Boolean(stood && stood.x === at.x && stood.y === at.y);
}

/** Stand a few tiles to one side of the camp, so its people are in view and the camp card is not opened. */
async function standNear(page: Page, seed: string, day: number, hour: number, camp: Camp): Promise<boolean> {
  for (const d of [{ x: -3, y: 0 }, { x: 3, y: 0 }, { x: -3, y: -1 }, { x: 3, y: -1 }, { x: 0, y: -3 }, { x: 0, y: 3 }]) {
    if (await openOn(page, seed, day, hour, { x: camp.at.x + d.x, y: camp.at.y + d.y })) return true;
  }
  return false;
}

const keepers = async (page: Page, camp: Camp) =>
  (await travellers(page)).filter((t) => t.camp === camp.id);

test("a camp's people are drawn at it by the hour, and the way in is worn into the ground", async ({ page }) => {
  // A middle day, so nothing is being pitched or struck.
  const { seed, day, camp } = await findDay(page, (c, d) => d > c.from && d < c.to - 1);
  expect(await standNear(page, seed, day, 13, camp), 'nowhere to stand near the camp').toBe(true);

  // Midday: the leader and the runner in the shade, the watch at work -- three people, unless the
  // runner is out on the way, which is somewhere else and still drawn.
  await expect.poll(async () => (await keepers(page, camp)).filter((t) => t.visible).length, { timeout: 20_000 }).toBe(3);
  const atCamp = (await keepers(page, camp)).filter((t) => t.visible && t.tile && cheb(t.tile, camp.at) <= 2);
  expect(atCamp.length, 'nobody is at the camp at midday').toBeGreaterThanOrEqual(2);

  // The shelter is up, and the trodden way and the turn-off marker are drawn.
  const now = (await campOn(page))!;
  expect(now.shelterUp).toBe(true);
  expect(now.trodden, 'no trodden way drawn').toBeGreaterThan(0);
  expect(now.turnOffMarker, 'no marker where the way leaves the road').toBe(true);

  // The talk row names one of them, and pressing it walks up and opens a card about the camp.
  const row = page.locator('.tile-action button', { hasText: /Talk to/ });
  await expect(row).toBeEnabled({ timeout: 10_000 });
  await row.click();
  const card = page.locator('.activity-card');
  await expect(card).toBeVisible({ timeout: 30_000 });
  // Either the camp's own welcome, from the one who leads, or one of its people's own word.
  await expect(card.locator('h2')).toHaveText(/^(Adventurers' fire|A dacoit band|Pilgrims resting|A drovers' fold|.+, the .+)$/);
  // It is the camp's own painting, whichever card it is.
  await expect(card.locator('img').first()).toHaveAttribute('src', new RegExp(`woven-camp`));
});

test('the way in is shown as the walker comes along it, and leads to the camp', async ({ page }) => {
  const { seed, day, camp } = await findDay(page, (c, d) => d > c.from && d < c.to - 1 && (c.way?.tiles ?? 0) >= 6);
  // Standing on the way itself, a few tiles out from the fire: the tiles round the walker are known,
  // so the trodden ones among them are drawn.
  const path = camp.way!.path;
  let stood = false;
  for (const back of [4, 5, 3, 6]) {
    const at = path[path.length - 1 - back];
    if (at && (await openOn(page, seed, day, 13, at))) {
      stood = true;
      break;
    }
  }
  expect(stood, 'nowhere on the way the game will start').toBe(true);
  await expect.poll(async () => (await campOn(page))?.troddenShown ?? 0, { timeout: 20_000 }).toBeGreaterThan(0);
});

test('at the meal you can eat with them, and at night only the watch is up', async ({ page }) => {
  const { seed, day, camp } = await findDay(page, (c, d) => d > c.from && d < c.to - 1);
  expect(await standNear(page, seed, day, 18, camp), 'nowhere to stand near the camp').toBe(true);
  await expect.poll(async () => (await keepers(page, camp)).filter((t) => t.visible).length, { timeout: 20_000 }).toBe(3);

  // Tap the watch -- not the leader, whose first word is the camp's own card -- and talk to them.
  const settle = async () => {
    let last = '';
    await expect
      .poll(async () => {
        const w = await walker(page);
        const now = JSON.stringify([Math.round(w!.screen.x), Math.round(w!.screen.y), w!.cell]);
        const same = now === last;
        last = now;
        return same;
      }, { timeout: 30_000, intervals: [300] })
      .toBe(true);
  };
  await settle();
  const watch = (await keepers(page, camp)).find((t) => t.slot === 'watch')!;
  const w = (await walker(page))!;
  const box = (await page.locator('.map-surface canvas').boundingBox())!;
  const tap = {
    x: box.x + w.screen.x + (watch.tile!.x - w.x) * w.cell,
    y: box.y + w.screen.y + (watch.tile!.y - w.y) * w.cell - w.cell / 2
  };
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName ?? null, tap);
  expect(hit, 'the watch is drawn under the interface').toBe('CANVAS');
  await page.mouse.click(tap.x, tap.y);
  const card = page.locator('.activity-card');
  await expect(card).toBeVisible({ timeout: 30_000 });
  // Walking up beside the watch can bring the walker beside the fire, and the camp's own welcome
  // comes first. The watch's word waits for it to close rather than replacing it.
  if (!/, the /.test((await card.locator('h2').textContent()) ?? '')) {
    await card.locator('.activity-choice').first().click();
    await card.getByRole('button', { name: 'Go on' }).click();
    await expect(card.locator('h2')).toHaveText(/, the /, { timeout: 15_000 });
  }
  await expect(card.locator('h2')).toHaveText(/, the /);
  await card.getByRole('button', { name: 'Eat with them' }).click();
  await card.getByRole('button', { name: 'Go on' }).click();
  await expect(card).toBeHidden();

  // The same camp at night: the leader and the runner asleep in the shelter, the watch at the fire.
  expect(await standNear(page, seed, day, 23, camp)).toBe(true);
  await expect.poll(async () => (await keepers(page, camp)).filter((t) => t.visible).map((t) => t.slot), { timeout: 20_000 }).toEqual(['watch']);
});

test("on a runner's day, the runner and a traveller stand at the turn-off trading", async ({ page }) => {
  const { seed, day, camp } = await findDay(page, (c) => c.errand !== null);
  const errand = camp.errand!;
  await openOn(page, seed, day, (errand.arrive + errand.part) / 2);
  await expect
    .poll(async () => {
      const all = await travellers(page);
      const runner = all.find((t) => t.camp === camp.id && t.slot === 'runner');
      const trader = all.find((t) => t.id === errand.travellerId);
      return { runner: runner?.tile ?? null, trader: trader?.tile ?? null };
    }, { timeout: 20_000 })
    .toEqual({ runner: errand.beside, trader: errand.turnOff });
});

test("on a visitor's day, the visitor is at the camp's fire", async ({ page }) => {
  const { seed, day, camp } = await findDay(page, (c) => c.visits.length > 0);
  const visit = camp.visits[0]!;
  await openOn(page, seed, day, (visit.arrive + visit.leave) / 2);
  await expect
    .poll(async () => {
      const v = (await travellers(page)).find((t) => t.id === visit.travellerId);
      return v?.tile ? cheb(v.tile, camp.at) : null;
    }, { timeout: 20_000 })
    .toBeLessThanOrEqual(2);
});

test('people on the road wade where the player would, cut at the waterline', async ({ page }) => {
  // Lothal is a delta: somebody is in the swamp or a ford at some hour of a day on the road. Each
  // hour is a fresh page, so the first that finds somebody on wet ground ends the search.
  type Wading = Seen & { cut: number };
  let found: Wading | null = null;
  let ground = '';
  for (const hour of [9, 10, 11, 12, 13, 14, 15, 16]) {
    await boot(page, 'road-company', hour);
    await expect.poll(async () => (await travellers(page)).filter((t) => t.visible && t.tile).length, { timeout: 20_000 }).toBeGreaterThan(0);
    const all = (await travellers(page)) as Wading[];
    for (const t of all) {
      if (!t.visible || !t.tile || t.camp) continue;
      const biome = await page.evaluate(
        ({ x, y }) => (window as unknown as { __tile?: (x: number, y: number) => string | null }).__tile?.(x, y) ?? null,
        t.tile
      );
      if (biome === 'wetland' || biome === 'river') {
        found = t;
        ground = biome;
        break;
      }
    }
    if (found) break;
  }
  expect(found, 'nobody on the road stood in water at any hour tried').not.toBeNull();
  expect(found!.cut, `${found!.id} in the ${ground} is not drawn wading`).toBeGreaterThan(0);
});

test('a camp can pitch on the northern sky island, and its people are drawn there', async ({ page }) => {
  // The owner's ruling: camps may be anywhere a person can be, the northern island preferably.
  const tileAt = (p: Point) =>
    page.evaluate(({ x, y }) => (window as unknown as { __tile?: (x: number, y: number) => string | null }).__tile?.(x, y) ?? null, p);
  let found: { seed: string; day: number; camp: Camp } | null = null;
  for (const seed of SEEDS) {
    await page.goto(`/?seed=${seed}&map=field_map_aravali&hour=12`);
    await expect.poll(() => page.evaluate(() => typeof (window as unknown as { __camp?: unknown }).__camp), { timeout: 20_000 }).toBe('function');
    for (let d = 1; d < 30 && !found; d += 1) {
      const c = await campOn(page, d);
      if (c && d > c.from && d < c.to - 1 && (await tileAt(c.at)) === 'sky_island') found = { seed, day: d, camp: c };
    }
    if (found) break;
  }
  expect(found, 'no camp on a sky island in a month on any seed tried').not.toBeNull();
  const { seed, day, camp } = found!;
  await page.addInitScript(
    ({ key, travelled }) => {
      try {
        const saved = JSON.parse(localStorage.getItem(key) ?? '{"knowledgeVersion":1}');
        localStorage.setItem(key, JSON.stringify({ ...saved, travelled }));
      } catch {
        // Storage refused: the spec fails on what it looks for.
      }
    },
    { key: `south-of-tethys:${seed}`, travelled: day * DAY_MS + 1000 }
  );
  await page.goto(`/?seed=${seed}&map=field_map_aravali&hour=13`);
  await expect.poll(() => walker(page), { timeout: 30_000 }).not.toBeNull();
  await expect
    .poll(async () => (await keepers(page, camp)).filter((t) => t.visible && t.tile && cheb(t.tile, camp.at) <= 4).length, { timeout: 20_000 })
    .toBeGreaterThanOrEqual(2);
  // And it has a way in, over the island and down the rope if it must.
  expect((await campOn(page))?.way, 'the island camp has no way in').not.toBeNull();
});
