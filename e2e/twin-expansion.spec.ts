import { journeyStorageKey, seedJourney } from './journey-fixture';
import { examineFirst } from './context-event';
import { expect, test } from '@playwright/test';

const base='?map=field_map_twins&seed=twin-expansion&hour=12&door=open&chatter=off&firsts=off';
for(const [at,title,name] of [
  ['poi_dune_windbreak','The Sand That Stayed',null],
  ['poi_reedwright_bank','A Little Give','Irekha'],
  ['poi_nesting_cove','A Room for the Tide','Ulenna']
] as const){
  test(`the new ${at} loads its written arrival and resident art`,async({page})=>{
    await page.goto(base+'&at='+at);
    // Spawning at a place opens its field notes, without simulating a fresh walk-in.
    // Ask the normal arrival registry, as in happenings.spec.ts.
    await expect.poll(()=>page.evaluate(()=> (window as unknown as {__happen?:(o:string)=>boolean}).__happen?.('arriving')??false),{timeout:30000}).toBe(true);
    const card=page.locator('.activity-card');
    await expect(card.locator('h2')).toHaveText(title,{timeout:30000});
    await card.locator('.activity-choice').first().click();
    await card.getByRole('button',{name:'Go on',exact:true}).click();
    if(name){
      const who=page.locator('.who',{hasText:name});
      await expect(who).toBeVisible();await who.click();
      await expect(page.locator('.person')).toContainText(name);
      await expect(page.locator('.person img').first()).toHaveAttribute('src',new RegExp(name.toLowerCase()));
    }
  });
}

test('returning to the reed bank opens its knowledge-gated follow-up', async ({ page }) => {
  const seed = 'twin-expansion';
  await seedJourney(page, seed, { seenEvents: ['happening_valley_seam'] });

  await page.goto(base + '&at=poi_reedwright_bank');
  const leave = page.getByRole('button', { name: 'Leave', exact: true });
  const pending = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').encounters?.pending,
    journeyStorageKey(seed));
  const initialArrival = expect.objectContaining({ kind: 'place', id: 'poi_reedwright_bank', returning: false });
  await expect(leave).toBeVisible({ timeout: 30000 });
  await expect.poll(pending, { timeout: 12000 }).toContainEqual(initialArrival);
  await leave.click();
  await expect.poll(pending, { timeout: 12000 }).not.toContainEqual(initialArrival);

  await page.getByRole('button', { name: "The Reedwright's Bank, hidden" }).click();
  await examineFirst(page);
  await leave.click();
  const walker = () => page.evaluate(() => (window as unknown as {
    __walker?: () => { x: number; moving: boolean };
  }).__walker?.());
  await page.keyboard.press('KeyD');
  await expect.poll(walker, { timeout: 12000 }).toMatchObject({ x: 39, moving: false });
  const road = page.getByRole('dialog', { name: 'The Longer Road' });
  await expect(road).toBeVisible({ timeout: 12000 });
  await road.getByRole('button', { name: 'Keep the page' }).click();
  await road.getByRole('button', { name: 'Go on' }).click();
  await expect(road).toHaveCount(0);
  await page.keyboard.press('KeyA');
  await expect.poll(walker, { timeout: 12000 }).toMatchObject({ x: 38, moving: false });

  const card = page.getByRole('dialog', { name: 'The Next Repair' });
  await expect(leave).toBeVisible();
  await expect(card).toHaveCount(0);
  await leave.click();
  await expect(card).toBeVisible({ timeout: 10000 });
});
