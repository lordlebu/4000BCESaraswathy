import { seedJourney } from './journey-fixture';
import {test,expect} from '@playwright/test';
const base='?map=field_map_twins&seed=twin-art-review&door=open&title=skip&firsts=off&events=off&chatter=off';

test('the enlarged cave household and smaller cooker use their real display sizes',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(/has no frame|Texture.*not found/i.test(m.text()))errors.push(m.text());});
  const assets=Promise.all(['highland-life.png','roads-masonry.png'].map(name=>page.waitForResponse(r=>r.url().includes(name)&&r.ok())));
  await page.goto(base+'&hour=12&at=poi_northwest_cave_camp&survey=on',{waitUntil:'domcontentloaded',timeout:90000});
  await expect.poll(()=>page.evaluate(()=>(window as any).__walker?.()?.residents?.length),{timeout:45000}).toBeGreaterThan(2);
  const state=await page.evaluate(()=>(window as any).__walker());
  await assets;
  const mir=state.residents.find((p:any)=>p.npcId==='npc_mirlepa');
  const yam=state.residents.find((p:any)=>p.npcId==='npc_yamantaka');
  expect(yam.height).toBeCloseTo(mir.height*2);
  expect(state.caveScenery.find((p:any)=>p.name==='poi:poi_northwest_cave_camp').width).toBe(192);
  expect(state.caveScenery.find((p:any)=>p.name==='cave:cooker').width).toBe(96);
  await page.keyboard.press('Escape');
  for(let i=0;i<2;i++)await page.getByRole('button',{name:'Zoom out',exact:true}).click();
  await page.screenshot({path:info.outputPath('cave-proportions-and-trees.png')});
  await page.goto(base+'&hour=12&at=50,5&survey=on',{waitUntil:'domcontentloaded',timeout:90000});
  await expect.poll(()=>page.evaluate(()=>(window as any).__walker?.()?.x),{timeout:45000}).toBe(50);
  await page.keyboard.press('Escape');
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Zoom out',exact:true}).click();
  await page.screenshot({path:info.outputPath('highland-trees-and-conifers.png')});
  await page.goto(base+'&hour=12&at=poi_twin_causeway&survey=on',{waitUntil:'domcontentloaded',timeout:90000});
  await expect.poll(()=>page.evaluate(()=>(window as any).__walker?.()?.x),{timeout:45000}).toBe(34);
  await page.keyboard.press('Escape');
  for(let i=0;i<2;i++)await page.getByRole('button',{name:'Zoom out',exact:true}).click();
  await page.screenshot({path:info.outputPath('stone-and-sandstone-approaches.png')});
  expect(errors).toEqual([]);
});

test('sleeping at the cave always opens the shared meal and then the three-person sleeping card',async({page},info)=>{
  await page.goto(base+'&hour=23&at=poi_northwest_cave_camp',{waitUntil:'domcontentloaded',timeout:90000});
  await expect.poll(()=>page.evaluate(()=>(window as any).__walker?.()?.x),{timeout:45000}).toBe(51);
  await page.keyboard.press('Escape');
  const rest=page.getByRole('button',{name:'Stay the night in the cave',exact:true});
  await expect(rest).toBeEnabled();await rest.click();
  const card=page.locator('.activity-veil');
  await expect(card).toBeVisible();
  const image=card.locator('img.activity-scene');
  await expect(image).toHaveAttribute('src',/rest-windward-cave-midnight/);
  await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  await page.screenshot({path:info.outputPath('cave-shared-meal.png')});
  await card.locator('.activity-choice.primary').click();
  await expect(image).toHaveAttribute('src',/rest-windward-cave-dawn/);
  await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  await page.screenshot({path:info.outputPath('cave-three-sleepers.png')});
  await card.locator('.activity-choice',{hasText:'Start the day'}).click();
  await expect(card).toBeHidden();
});


test('the visiting cook shares the generated camp conversation and meal', async ({ page }) => {
  const read = () => page.evaluate(() => (window as unknown as {
    __travellers?: () => { id: string; camp?: string; sheet: string; visible: boolean; tile: {x: number; y: number} | null }[];
  }).__travellers?.().find(person => person.id.startsWith('cave-cook-')));
  const visit = base + '&hour=18&at=poi_northwest_cave_camp';
  await seedJourney(page, 'twin-art-review', { seenEvents: ['happening_twin_cave_arrival'] });
  await page.goto(visit);
  await expect.poll(read, { timeout: 45000 }).toMatchObject({
    id: 'cave-cook-0', camp: 'cave-cook-visit:0', sheet: /^traveller-carrier/, visible: true
  });
  const look = (await read())!.sheet;
  await page.reload();
  await expect.poll(read, { timeout: 45000 }).toMatchObject({ id: 'cave-cook-0', sheet: look, visible: true });
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  const talk = page.getByRole('button', { name: /talk.*visiting cook/i });
  await expect(talk).toBeVisible({ timeout: 15000 });
  await talk.click({ timeout: 10000 });
  const card = page.getByRole('dialog');
  await expect(card.locator('img.activity-scene')).toHaveAttribute('src', /discovery_twin_cave/);
  await expect(card.locator('img.person-portrait, img.stranger-face')).toHaveCount(1);
  await card.getByRole('button', { name: /eat/i }).click();
  await expect(card).toContainText('sheltered hearth');

  await seedJourney(page, 'cave-no-visit', { travelled: 2 * 60 * 60 * 1000 });
  await page.goto(visit.replace('twin-art-review', 'cave-no-visit'));
  await expect(page.getByRole('button', { name: 'Leave', exact: true })).toBeVisible({ timeout: 45000 });
  expect(await read()).toBeUndefined();
});
