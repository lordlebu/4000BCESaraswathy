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

test('returning to the reed bank opens its knowledge-gated follow-up',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('south-of-tethys:twin-expansion',JSON.stringify({
    knowledgeVersion:1,progress:{rungs:{discovery_twin_banks:0},words:[],recipes:[],made:[],answered:{},questions:[]},
    seenEvents:['happening_valley_seam']
  })));
  await page.goto(base+'&at=poi_reedwright_bank');
  await expect(page.getByRole('button',{name:'Leave',exact:true})).toBeVisible({timeout:30000});
  await page.getByRole('button',{name:'Leave',exact:true}).click();
  await page.keyboard.press('KeyD');
  await expect.poll(()=>page.evaluate(()=>(window as any).__walker().x)).toBe(39);
  await page.keyboard.press('KeyA');
  await expect(page.locator('.activity-card h2')).toHaveText('The Next Repair',{timeout:10000});
});
