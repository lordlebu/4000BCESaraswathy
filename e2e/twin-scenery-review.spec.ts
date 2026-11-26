import {expect,test,type Page} from '@playwright/test';

const base='?map=field_map_twins&seed=hybrid-review-0&twinGen=2&at=poi_earthen_workshop&hour=12&door=open&title=skip&firsts=off&events=off';
const scenery=(page:Page)=>page.evaluate(()=>(window as unknown as {__walker?:()=>{
  twinScenery:{relief:number;landmarks:string[];sites:string[];shadows:number};
}}).__walker?.()?.twinScenery);

test('the default Twin Cities scenery draws rebuilt sites and restores one set of shadows',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(/missing frame|has no frame|texture.*not found/i.test(message.text()))errors.push(message.text());});
  await page.goto(base);
  await expect.poll(async()=> (await scenery(page))?.sites,{timeout:45000}).toContain('twin-site:poi_earthen_workshop');
  const active=(await scenery(page))!;
  expect(active.sites).toContain('poi:poi_dune_windbreak');
  expect(active.landmarks).toContain('twin-site:landmark:poi_earthen_workshop');
  expect(active.landmarks).toHaveLength(16);
  expect(active.sites).toContain('highland:meadow');
  expect(active.relief).toBeGreaterThan(0);
  expect(active.shadows).toBeGreaterThan(0);
  await page.reload();
  await expect.poll(async()=> (await scenery(page))?.shadows,{timeout:45000}).toBe(active.shadows);
  await page.goto(base+'&twinScenery=original');
  await expect.poll(async()=> (await scenery(page))?.sites,{timeout:45000}).toEqual([]);
  expect(errors).toEqual([]);
});
