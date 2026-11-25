import {test,expect} from '@playwright/test';

const base='?map=field_map_twins&seed=twin-landscape-review&hour=12&door=open&title=skip&events=off&firsts=off&chatter=off&survey=on';
for(const palette of ['sage','lichen','olive'])test(`the ${palette} highlands use the shared baked terrain atlas`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(/has no frame|Texture.*not found/i.test(m.text()))errors.push(m.text());});
  await page.goto(`${base}&at=poi_northwest_cave_camp&turf=${palette}`,{waitUntil:'domcontentloaded',timeout:90000});
  await expect.poll(()=>page.evaluate(()=>(window as any).__walker?.()?.twinTerrain?.palette),{timeout:45000}).toBe(palette);
  const terrain=await page.evaluate(()=>(window as any).__walker().twinTerrain);
  expect(terrain.texture).toBe('twins-terrain-surface');expect(terrain.width).toBe(128);
  expect(terrain).toMatchObject({terrainRounding:'full',fogRounding:'full',filter:1}); // Phaser NEAREST
  expect(terrain.frames).toBeGreaterThan(40);expect(terrain.frames).toBeLessThanOrEqual(768);
  expect(terrain.bytes).toBeLessThanOrEqual(3*1024*1024);
  for(let i=0;i<3;i++){
    if(await page.locator('.dock').getAttribute('data-height')==='peek')break;
    await page.locator('.dock-handle').click();
  }
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Zoom out',exact:true}).click();
  await page.waitForTimeout(600);
  await page.screenshot({path:info.outputPath(`cave-${palette}.png`)});
  // Fixed seam position includes desert, highland foothills and the meltwater channel.
  if(palette==='sage'){
    await page.goto(`${base}&at=42,18`,{waitUntil:'domcontentloaded',timeout:90000});
    await expect.poll(()=>page.evaluate(()=>(window as any).__walker?.()?.x),{timeout:45000}).toBe(42);
    await page.keyboard.press('Escape');
    for(let i=0;i<2;i++)await page.getByRole('button',{name:'Zoom out',exact:true}).click();
    await page.waitForTimeout(600);await page.screenshot({path:info.outputPath('desert-highland-transition.png')});
  }
  expect(errors).toEqual([]);
});
