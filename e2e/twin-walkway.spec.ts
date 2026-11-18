import {test,expect} from '@playwright/test';
const base='?map=field_map_twins&seed=twin-art-review&door=open&title=skip&events=off&firsts=off&chatter=off&survey=on';
test('the approved rail bridge, mixed verges and covered walkway lamps render at night',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(/has no frame|Texture.*not found/i.test(m.text()))errors.push(m.text());});
 await page.goto(base+'&hour=23&at=poi_twin_causeway',{waitUntil:'domcontentloaded',timeout:90000});
 await expect.poll(()=>page.evaluate(()=>(window as any).__walker?.()?.roadLights?.visiblePosts),{timeout:45000}).toBeGreaterThan(0);
 const state=await page.evaluate(()=>(window as any).__walker());
 expect(state.roadLights.lit).toBeGreaterThan(0);expect(state.railBridge).toEqual([{width:448,height:240}]);
 expect(state.twinShrubs.textures).toContain('twins-shrubs');expect(state.twinShrubs.textures).toContain('overdraw');
 await page.keyboard.press('Escape');
 for(let i=0;i<3;i++){if(await page.locator('.dock').getAttribute('data-height')==='peek')break;await page.locator('.dock-handle').click();}
 for(let i=0;i<2;i++)await page.getByRole('button',{name:'Zoom out',exact:true}).click();
 await page.waitForTimeout(600);await page.screenshot({path:info.outputPath('rail-and-road-lamps-night.png')});
 await page.goto(base+'&hour=12&at=poi_twin_causeway',{waitUntil:'domcontentloaded',timeout:90000});
 await expect.poll(()=>page.evaluate(()=>(window as any).__walker?.()?.railBridge?.length),{timeout:45000}).toBe(1);
 await page.keyboard.press('Escape');
 for(let i=0;i<3;i++){if(await page.locator('.dock').getAttribute('data-height')==='peek')break;await page.locator('.dock-handle').click();}
 for(let i=0;i<2;i++)await page.getByRole('button',{name:'Zoom out',exact:true}).click();
 await page.waitForTimeout(600);await page.screenshot({path:info.outputPath('rail-and-road-day.png')});
 expect(errors).toEqual([]);
});

test('a moving otter leaves a bounded ripple trail on water',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 // Phase zero is 06:00. These public inputs start just before the seeded swim (32,31) -> (32,32).
 await page.goto(base+'&hour=17.952&at=34,31',{waitUntil:'domcontentloaded',timeout:90000});
 await expect.poll(()=>page.evaluate(()=>(window as any).__otterWake?.()?.pool),{timeout:45000}).toBe(8);
 await expect.poll(()=>page.evaluate(()=>(window as any).__otterWake?.()?.emitted),{timeout:20000}).toBeGreaterThan(3);
 await expect.poll(()=>page.evaluate(()=>(window as any).__otterWake?.()?.visible)).toBeGreaterThan(0);
 await page.keyboard.press('Escape');
 await page.screenshot({path:info.outputPath('otter-water-trail.png')});
 expect(await page.evaluate(()=>(window as any).__otterWake().pool)).toBe(8);
});

test('reduced motion suppresses the optional otter wake',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(base+'&hour=17.952&at=34,31',{waitUntil:'domcontentloaded',timeout:90000});
 await expect.poll(()=>page.evaluate(()=>Boolean((window as any).__walker)),{timeout:45000}).toBe(true);
 expect(await page.evaluate(()=>(window as any).__otterWake?.())).toBeNull();
});
