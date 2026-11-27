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
  enkiduGuest: boolean;
  wagon?: { count: number; x: number };
  pieces: string[];
};
const campAt = (page: Page, day?: number) => page.evaluate((d) =>
  (window as unknown as { __camp?: (day?: number) => Camp | null }).__camp?.(d) ?? null, day);

async function installCampClock(page: Page) {
  await page.addInitScript(({ seed, version, knowledgeVersion, dayMs }) => {
    const marker = new URLSearchParams(location.search).get('caravanFixture');
    if (!marker || sessionStorage.getItem('caravanFixture') === marker) return;
    sessionStorage.setItem('caravanFixture', marker);
    localStorage.setItem(`south-of-tethys:${seed}`, JSON.stringify({
      version, knowledgeVersion, twinGeneration: 2, travelled: Number(marker.split('-')[0]) * dayMs,
      caravanSchedule: { revision: 2, firstCycle: 0 }
    }));
  }, { seed, version: SAVE_VERSION, knowledgeVersion: KNOWLEDGE_VERSION, dayMs: DAY_MS });
}

test('a western caravan arrives, pitches the dome and restores its stage after reload', async ({ page }) => {
  await page.goto(path + '&hour=8');
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { __camp?: unknown }).__camp), { timeout: 20_000 }).toBe('function');
  let visit: Camp | null = null;
  for (let day = 1; day < 60 && !visit; day++) {
    const camp = await campAt(page, day);
    if (camp?.caravan && camp.from >= 1) visit = camp;
  }
  expect(visit?.caravan?.route[0]?.x).toBe(0);
  if (!visit?.caravan) throw new Error('The fixture seed must have a western visit');
  const { from, to, at, id } = visit;
  await installCampClock(page);
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

type Enkidu = { at: Point | null; visible: boolean; following: boolean };
const enkidu = (page: Page) => page.evaluate(() =>
  (window as unknown as { __walker?: () => { enkidu: Enkidu | null } }).__walker?.().enkidu ?? null);
const readJourney = (page: Page) => page.evaluate((seed) =>
  JSON.parse(localStorage.getItem(`south-of-tethys:${seed}`) ?? '{}'), seed);
const findVisit = (page: Page, withEnkidu: boolean) => page.evaluate((withEnkidu) => {
  const campAt = (window as unknown as { __camp: (day: number) => Camp | null }).__camp;
  for (let day = 5; day < 700; day++) {
    const camp = campAt(day);
    if (camp?.caravan && camp.enkiduGuest === withEnkidu && day === camp.from + 1) return camp;
  }
  return null;
}, withEnkidu);

test('Enkidu meets the player at an eligible caravan and can rejoin at Southern Landing', async ({ page }) => {
  await page.goto(path + '&hour=12&at=poi_twin_landing');
  const talk = page.getByRole('button', { name: 'Talk to Enkidu' });
  await expect.poll(() => enkidu(page), { timeout: 20_000 }).toMatchObject({ visible: false });
  await expect(talk).toHaveCount(0);
  const camp = await findVisit(page, true);
  if (!camp) throw new Error('The fixture seed must have a caravan carrying Enkidu');
  await installCampClock(page);
  const fixture = path + `&hour=12&caravanFixture=${camp.from + 1}-12`;
  await page.goto(fixture + `&at=${camp.at.x},${camp.at.y}`);
  await expect.poll(() => enkidu(page), { timeout: 20_000 }).toMatchObject({ visible: true, following: false });
  const guest = await enkidu(page);
  if (!guest?.at) throw new Error('Enkidu must stand beside the caravan');
  await page.goto(fixture + `&at=${guest.at.x},${guest.at.y}`);
  await expect(talk).toBeVisible({ timeout: 20_000 });
  await talk.click();
  await page.getByRole('button', { name: 'Invite Enkidu to travel' }).click();
  await page.getByRole('button', { name: 'Go on' }).click();
  await expect.poll(async () => (await readJourney(page)).flags)
    .toEqual(expect.arrayContaining(['met:npc_enkidu', 'recruited:npc_enkidu', 'companion:npc_enkidu']));
  await page.reload();
  await expect.poll(() => enkidu(page), { timeout: 20_000 }).toMatchObject({ visible: true, following: true });

  await page.goto(fixture + '&at=poi_twin_landing');
  await expect(talk).toBeVisible({ timeout: 20_000 });
  await talk.click();
  await page.getByRole('button', { name: 'Part ways for now' }).click();
  await page.getByRole('button', { name: 'Go on' }).click();
  await expect.poll(async () => (await readJourney(page)).flags).not.toContain('companion:npc_enkidu');
  await expect.poll(() => enkidu(page)).toMatchObject({ visible: true, following: false });
  await talk.click();
  await expect(page.getByRole('button', { name: 'Invite Enkidu to travel' })).toBeVisible();
});

test('the first overnight offer can be declined, then records the host visit on acceptance', async ({ page }) => {
  await page.goto(path + '&hour=12');
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { __camp?: unknown }).__camp), { timeout: 20_000 }).toBe('function');
  const camp = await findVisit(page, false);
  if (!camp) throw new Error('The fixture seed must have an Elamite host visit');
  await installCampClock(page);
  const day = camp.from + 1;
  await page.goto(path + `&hour=22&at=${camp.at.x},${camp.at.y}&caravanFixture=${day}-22`);
  const rest = page.getByRole('button', { name: /Make camp for the night/ });
  await expect(rest).toBeEnabled({ timeout: 20_000 });
  await rest.click();
  await expect(page.getByRole('heading', { name: 'Beneath the western shelter' })).toBeVisible();
  await page.getByRole('button', { name: 'Leave for now' }).click();
  expect((await readJourney(page)).travelled).toBe(day * DAY_MS);
  await expect(rest).toBeEnabled();
  await rest.click();
  await page.getByRole('button', { name: 'Stay the night' }).click();
  await page.getByRole('button', { name: 'Go on' }).click();
  await expect.poll(async () => (await readJourney(page)).flags).toContain(`hospitality:${camp.id}`);
  const journey = await readJourney(page);
  expect(journey.travelled).toBeGreaterThan(day * DAY_MS);
  expect(journey.diaryEvents).toEqual(expect.arrayContaining([expect.objectContaining({
    day, subjectId: camp.id, choiceId: 'stay', campResidents: expect.any(Array)
  })]));
  expect(journey.diaryEvents.find((entry: { subjectId?: string }) => entry.subjectId === camp.id).campResidents).toHaveLength(3);
});
