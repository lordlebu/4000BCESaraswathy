import { expect, test } from '@playwright/test';

const query='?map=field_map_twins&seed=twin-demo&hour=10&door=open&events=off&firsts=off';
test('new city art loads and the ostrich tram follows the causeway in both directions',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(/has no frame|Texture.*not found|failed to load/i.test(m.text()))errors.push(m.text());});
  const loaded:string[]=[];page.on('response',r=>{if(r.url().includes('/assets/twins/'))loaded.push(r.url());});
  await page.goto(query+'&at=poi_harappa_station');
  const ride=page.getByRole('button',{name:/ride the ostrich tram/i});
  await expect(ride).toBeEnabled({timeout:45000});
  expect(loaded.some(u=>u.includes('ground.png'))).toBe(true);expect(loaded.some(u=>u.includes('objects.png'))).toBe(true);
  const wildlife=await page.evaluate(()=>(window as unknown as {__wanderers:()=>{id:string;texture:string;w:number}[]}).__wanderers());
  expect(wildlife).toHaveLength(4);
  for(const animal of wildlife){expect(animal.texture).toMatch(/^wanderer-art:/);expect(animal.w,animal.id).toBeLessThan(90);}
  const walker=()=>page.evaluate(()=>(window as unknown as {__walker:()=>{riding:boolean;carriage:boolean;at:{x:number;y:number}}}).__walker());
  await page.keyboard.press('KeyB');
  await expect.poll(async()=>(await walker()).riding,{timeout:10000}).toBe(true);
  expect((await walker()).carriage).toBe(true);
  await expect.poll(async()=>(await walker()).riding,{timeout:20000}).toBe(false);
  await expect(page.locator('body')).toContainText('The Raised Brick Quarter');
  await expect(ride).toBeEnabled();
  await page.keyboard.press('KeyB');
  await expect.poll(async()=>(await walker()).riding,{timeout:10000}).toBe(true);
  await expect.poll(async()=>(await walker()).riding,{timeout:20000}).toBe(false);
  await expect(page.locator('body')).toContainText('Harappa Tram Yard');
  await page.reload();await expect(ride).toBeEnabled({timeout:45000});
  expect(errors).toEqual([]);
});

test('the ostrich rests at night and the player can use the road',async({page})=>{
  await page.goto(query.replace('hour=10','hour=23')+'&at=poi_harappa_station');
  await expect(page.getByRole('button',{name:/ride/i})).toBeDisabled({timeout:45000});
  await expect(page.locator('body')).toContainText('The ostrich rests at night');
});

test('the diary can notice and deepen a new discovery through the place interface',async({page})=>{
  await page.goto(query+'&at=poi_harappa_court');
  const look=page.getByRole('button',{name:'Look closer',exact:true});
  await expect(look).toBeVisible({timeout:45000});await look.click();
  await expect(page.locator('body')).toContainText('The Wall Around the Roots');
});
