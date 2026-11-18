import {expect,test} from '@playwright/test';
// Consumer contract, independent of the pose implementation: at least 12s per 128px tile.
const MIN_STEP_MS=12_000,TILE_PX=128;

const base='?map=field_map_twins&seed=twin-landscape-review&hour=12&door=open&title=skip&events=off&firsts=off&chatter=off';
const state=(page:any)=>page.evaluate(()=>(window as any).__walker?.());
async function panorama(page:any,path:string){
  for(let i=0;i<3&&await page.locator('.dock').count();i++){
    if(await page.locator('.dock').getAttribute('data-height')==='peek')break;
    await page.locator('.dock-handle').click();
  }
  for(let i=0;i<2;i++)await page.getByRole('button',{name:'Zoom out',exact:true}).click();
  await page.waitForTimeout(600); // Let the user-facing dock/camera transition settle for the review capture.
  await page.screenshot({path});
}


test('cave smoke and very slow residents follow the real renderer without journey-time jumps',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(base+'&at=poi_northwest_cave_camp',{waitUntil:'domcontentloaded',timeout:90000});
  await expect.poll(async()=> (await state(page))?.twinAmbience?.visibleSmoke,{timeout:45000}).toBe(6);
  const before=await page.evaluate(()=>({clock:performance.now(),state:(window as any).__walker()}));
  const people=before.state.residents.filter((p:any)=>['npc_mirlepa','npc_yamantaka'].includes(p.npcId));
  expect(people.filter((p:any)=>p.frame>=16)).toHaveLength(1);
  const walker=people.find((p:any)=>p.frame<16);
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowRight');
  await expect.poll(async()=> (await state(page))?.x,{timeout:15000}).toBe(52);
  const after=await page.evaluate(()=>({clock:performance.now(),state:(window as any).__walker()}));
  const moved=after.state.residents.find((p:any)=>p.npcId===walker.npcId);
  expect(Math.hypot(moved.x-walker.x,moved.y-walker.y)).toBeLessThanOrEqual((after.clock-before.clock)*TILE_PX/MIN_STEP_MS+4);
  expect(after.state.twinShrubs.scales).toContain(.5);
  expect(after.state.twinShrubs.widths).toContain(64);
  expect(after.state.twinShrubs.scales).toContain(1);
  await panorama(page,info.outputPath('slow-cave-smoke.png'));
});

test('the river uses changing small ripple textures without texture errors',async({page},info)=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(/has no frame|Texture.*not found/i.test(m.text()))errors.push(m.text());});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(base+'&survey=on&at=poi_twin_causeway',{waitUntil:'domcontentloaded',timeout:90000});
  await expect.poll(async()=> (await state(page))?.twinAmbience?.visibleRipples,{timeout:45000}).toBeGreaterThan(0);
  const first=(await state(page)).twinAmbience.waterFrames.join(',');
  await expect.poll(async()=> (await state(page)).twinAmbience.waterFrames.join(','),{timeout:5000}).not.toBe(first);
  await panorama(page,info.outputPath('river-and-border-shrubs.png'));
  expect(errors).toEqual([]);
});

test('only a small explored patch of desert carries the drifting haze',async({page},info)=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(base+'&survey=on&at=poi_desert_ground',{waitUntil:'domcontentloaded',timeout:90000});
  await expect.poll(async()=> (await state(page))?.twinAmbience?.visibleHaze,{timeout:45000}).toBeGreaterThan(0);
  expect((await state(page)).twinAmbience.haze).toBeLessThanOrEqual(12);
  await panorama(page,info.outputPath('desert-haze.png'));
  await page.goto(base+'&survey=on&at=15,13',{waitUntil:'domcontentloaded',timeout:90000});
  await expect.poll(async()=> (await state(page))?.x,{timeout:45000}).toBe(15);
  await panorama(page,info.outputPath('cliff-shrubs.png'));
});

test('reduced motion retains the static landscape and suppresses optional ambience',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(base+'&at=poi_northwest_cave_camp',{waitUntil:'domcontentloaded',timeout:90000});
  await expect.poll(async()=> (await state(page))?.twinAmbience?.enabled,{timeout:45000}).toBe(false);
  expect((await state(page)).twinAmbience).toMatchObject({ripples:0,haze:0,smoke:0});
  expect((await state(page)).twinShrubs.count).toBeGreaterThan(0);
});
