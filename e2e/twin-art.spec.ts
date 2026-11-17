import { expect, test } from '@playwright/test';

const base = '?map=field_map_twins&seed=twin-art-review&hour=12&door=open&title=skip&chatter=off&firsts=off';

test('the cave household uses generated walking and seated poses beside the cave', async ({page})=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(/has no frame|Texture.*not found/i.test(m.text()))errors.push(m.text());});
  const props=page.waitForResponse(r=>/cave-props-nes-jrpg/.test(r.url())&&r.ok());
  await page.goto(base+'&events=off&at=poi_northwest_cave_camp');
  await props;
  const household=()=>page.evaluate(()=>(window as any).__walker?.().residents
    .filter((r:any)=>['npc_mirlepa','npc_yamantaka'].includes(r.npcId)));
  await expect.poll(async()=> (await household())?.length,{timeout:45000}).toBe(2);
  const initial=await household();
  expect(initial.map((r:any)=>r.sheet).sort()).toEqual(['mirlepa','yamantaka']);
  expect(initial.filter((r:any)=>r.frame>=16)).toHaveLength(1);
  const moving=initial.find((r:any)=>r.frame<16);
  await expect.poll(async()=>{
    const current=(await household()).find((r:any)=>r.npcId===moving.npcId);
    return Math.hypot(current.x-moving.x,current.y-moving.y);
  },{timeout:10000}).toBeGreaterThan(2);
  expect(errors).toEqual([]);
});

test('the three circuit walkers load their own undyed NES identities', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (/has no frame|Texture.*not found/i.test(m.text())) errors.push(m.text()); });
  await page.goto(base + '&events=off&at=poi_harappa_court');
  await expect.poll(() => page.evaluate(() => (window as any).__travellers?.()
    .filter((t: any) => t.id.startsWith('npc_twin_'))
    .map((t: any) => [t.id, t.sheet]).sort()), { timeout: 45000 }).toEqual([
      ['npc_twin_gardener', 'twin-gardener'],
      ['npc_twin_mason', 'twin-mason'],
      ['npc_twin_waterkeeper', 'twin-waterkeeper']
    ]);
  await expect.poll(() => page.evaluate(() => (window as any).__walker?.().residents
    .map((r: any) => r.npcId).sort()), {timeout:45000}).toEqual([
      'npc_cave_cook','npc_cove_watcher_ulenna','npc_mirlepa','npc_priest_kang','npc_reedwright_irekha','npc_twin_brickworker',
      'npc_twin_handler','npc_twin_landingkeeper','npc_twin_maintainer','npc_twin_stationkeeper','npc_yamantaka'
    ]);
  expect(errors).toEqual([]);
});

test('both cities load their material overlays without texture errors', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (/has no frame|Texture.*not found/i.test(m.text())) errors.push(m.text()); });
  for(const [name,at] of [['harappa','poi_harappa_court'],['mohenjodaro','poi_drain_court']]) {
    const response=page.waitForResponse(r=>/surfaces(?:-|\.png)/.test(r.url())&&r.ok());
    const homes=page.waitForResponse(r=>/homes-snes(?:-|\.png)/.test(r.url())&&r.ok());
    const environment=page.waitForResponse(r=>/environment-nes(?:-|\.png)/.test(r.url())&&r.ok());
    await page.goto(base + '&events=off&at=' + at);
    await response;
    await homes;
    await environment;
    await expect(page.getByRole('button',{name:'Leave',exact:true})).toBeVisible({timeout:45000});
    await page.getByRole('button',{name:'Leave',exact:true}).click();
    await expect(page.locator('.map-surface canvas')).toBeVisible();
    await page.screenshot({path:info.outputPath(name+'-materials.png')});
  }
  expect(errors).toEqual([]);
});

for (const mobile of [false, true]) {
  test.describe(mobile ? 'mobile courtyard art' : 'desktop courtyard art', () => {
    test.use(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true }
      : { viewport: { width: 1280, height: 900 } });
    test('loads the neem, preferred place view and knowledge-gated event painting', async ({ page }, info) => {
      const errors: string[] = [], loaded: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (/has no frame|Texture.*not found/i.test(m.text())) errors.push(m.text()); });
      page.on('response', r => { if (r.ok()) loaded.push(r.url()); });
      await page.addInitScript(() => localStorage.setItem('south-of-tethys:twin-art-review', JSON.stringify({
        knowledgeVersion: 1,
        progress: { rungs: { discovery_twin_shade: 3 }, words: [], recipes: [], made: [], answered: {}, questions: [] },
        seenEvents: ['happening_twin_closing', 'happening_valley_courtyard_return']
      })));
      await page.goto(base + '&at=poi_harappa_court');
      const view = page.locator('img[src*="poi_harappa_court-painted"]');
      await expect(view).toBeVisible({ timeout: 45000 });
      await expect.poll(() => view.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      await expect.poll(() => loaded.some(u => /courtyard-neem/.test(u))).toBe(true);
      await page.screenshot({ path: info.outputPath('courtyard-place.png') });
      await page.getByRole('button', { name: 'Leave', exact: true }).click();
      await page.screenshot({ path: info.outputPath('courtyard-world.png') });
      await expect.poll(() => page.evaluate(() => (window as any).__happen?.('arriving', undefined, undefined, 'poi_harappa_court') ?? false)).toBe(true);
      const card = page.locator('.activity-card');
      await expect(card.locator('h2')).toHaveText('A Courtyard Worth Shading');
      const painting = card.locator('img.activity-scene');
      await expect(painting).toHaveAttribute('src', /happening_twin_courtyard-painted/);
      await expect.poll(() => painting.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 512)).toBe(true);
      await page.screenshot({ path: info.outputPath('courtyard-event.png') });
      expect(errors).toEqual([]);
    });
  });
}

test('Eru wears the preferred painted portrait in the actual conversation', async ({ page }, info) => {
  await page.goto(base + '&at=poi_earthen_workshop');
  // Eru walks a circuit at noon. Hail the real nearby traveller instead of
  // assuming found_at means permanently standing in the workshop.
  const eru = page.getByRole('button', { name: 'Talk to Eru', exact: true });
  await expect(eru).toBeEnabled({ timeout: 45000 });
  await eru.click();
  const portrait = page.locator('.person img.person-portrait').first();
  await expect(portrait).toHaveAttribute('src', /twin-mason-painted/, { timeout: 30000 });
  await expect.poll(() => portrait.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 256)).toBe(true);
  await page.screenshot({ path: info.outputPath('eru-conversation.png') });
});
