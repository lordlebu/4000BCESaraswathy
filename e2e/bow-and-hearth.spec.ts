import { expect, test, type Page } from '@playwright/test';
const SAVE_VERSION = 19;
const KNOWLEDGE_VERSION = 1;
const DAY_MS = 60 * 60 * 1000;

const seed = 'camps';
const path = `?map=field_map_twins&twinGen=2&seed=${seed}&door=open&events=off&firsts=off`;
type Point = { x: number; y: number };
type Camp = {
  from: number; to: number; at: Point; id: string;
  caravan?: { route: Point[]; wagon: string };
  caravanStage: string | null;
  wagon?: { count: number; x: number };
  pieces: string[];
};
const campAt = (page: Page, day?: number) => page.evaluate((d) =>
  (window as unknown as { __camp?: (day?: number) => Camp | null }).__camp?.(d) ?? null, day);

test('a western caravan arrives, pitches the dome and restores its stage after reload', async ({ page }) => {
  await page.goto(path + '&hour=8');
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { __camp?: unknown }).__camp)).toBe('function');
  let visit: Camp | null = null;
  for (let day = 1; day < 60 && !visit; day++) {
    const camp = await campAt(page, day);
    if (camp?.caravan && camp.from >= 1) visit = camp;
  }
  expect(visit?.caravan?.route[0]?.x).toBe(0);
  if (!visit?.caravan) throw new Error('The fixture seed must have a western visit');
  const { from, to, at, id } = visit;
  await page.addInitScript(({ seed, version, knowledgeVersion, dayMs }) => {
    const marker = new URLSearchParams(location.search).get('caravanFixture');
    if (!marker || sessionStorage.getItem('caravanFixture') === marker) return;
    sessionStorage.setItem('caravanFixture', marker);
    localStorage.setItem(`south-of-tethys:${seed}`, JSON.stringify({
      version, knowledgeVersion, twinGeneration: 2, travelled: Number(marker.split('-')[0]) * dayMs,
      caravanSchedule: { revision: 2, firstCycle: 0 }
    }));
  }, { seed, version: SAVE_VERSION, knowledgeVersion: KNOWLEDGE_VERSION, dayMs: DAY_MS });
  const open = async (day: number, hour: number) => {
    await page.goto(path + `&hour=${hour}&at=${at.x},${at.y}&caravanFixture=${day}-${hour}`);
  };
  await open(from, 8);
  await expect.poll(() => campAt(page), { timeout: 20_000 }).toMatchObject({ id, caravanStage: 'travelling', wagon: { count: 1 } });
  const moving = await campAt(page);
  await page.reload();
  await expect.poll(() => campAt(page), { timeout: 20_000 }).toMatchObject({ id, caravanStage: 'travelling', wagon: { count: 1, x: moving?.wagon?.x } });
  await open(from + 1, 12);
  await expect.poll(() => campAt(page), { timeout: 20_000 }).toMatchObject({
    id, caravanStage: 'established', wagon: { count: 1 }, pieces: expect.arrayContaining(['camp-elamite-dome', 'caravan-canopy'])
  });
  await open(to - 1, 17);
  await expect.poll(() => campAt(page), { timeout: 20_000 }).toMatchObject({ id, caravanStage: 'departure', wagon: { count: 1 } });
  await open(to - 1, 20);
  await expect.poll(() => campAt(page), { timeout: 20_000 }).toMatchObject({ id, caravanStage: 'aftermath' });
});

test('Enkidu can join, persist, return home and rejoin independently of the caravan', async ({ page }) => {
  await page.goto(path + '&hour=12&at=poi_twin_landing');
  const talk = page.getByRole('button', { name: 'Talk to Enkidu' });
  await expect(talk).toBeVisible({ timeout: 20_000 });
  await talk.click();
  await page.getByRole('button', { name: 'Invite Enkidu to travel' }).click();
  await page.getByRole('button', { name: 'Go on' }).click();
  await expect.poll(() => page.evaluate((seed) => JSON.parse(localStorage.getItem(`south-of-tethys:${seed}`) ?? '{}').flags, seed))
    .toEqual(expect.arrayContaining(['met:npc_enkidu', 'companion:npc_enkidu']));
  await page.reload();
  await expect.poll(() => page.evaluate(() => {
    const inspect = (window as unknown as { __walker?: () => { enkidu?: unknown } }).__walker;
    return inspect?.().enkidu;
  }), { timeout: 20_000 }).toMatchObject({ visible: true, following: true });
  await talk.click();
  await page.getByRole('button', { name: 'Part ways for now' }).click();
  await page.getByRole('button', { name: 'Go on' }).click();
  await expect.poll(() => page.evaluate((seed) => JSON.parse(localStorage.getItem(`south-of-tethys:${seed}`) ?? '{}').flags, seed))
    .not.toContain('companion:npc_enkidu');
  await talk.click();
  await expect(page.getByRole('button', { name: 'Invite Enkidu to travel' })).toBeVisible();
});
