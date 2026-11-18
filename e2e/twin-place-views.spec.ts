import {expect,test} from '@playwright/test';

const base='?map=field_map_twins&seed=twin-place-review&hour=12&door=open&title=skip&events=off&chatter=off&firsts=off';

test('city, cave and coast panels load their own paintings through the real place caller',async({page},info)=>{
  const errors:string[]=[],loaded=new Set<string>();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{const id=r.url().match(/\/(?:places|assets)\/(poi_\w+)-painted(?:-[^/?]+)?\.png/);if(id&&r.ok()&&r.request().resourceType()==='image')loaded.add(id[1]!);});
  const places=['poi_harappa_station','poi_northwest_cave_camp','poi_twin_cove'];
  for(const id of places){
    await page.goto(base+'&at='+id);
    const image=page.locator('.place-view');
    await expect(image).toHaveAttribute('src',new RegExp(id+'-painted'),{timeout:45000});
    await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth===512)).toBe(true);
    await expect(image).toBeVisible();
    await page.screenshot({path:info.outputPath(id+'.png')});
  }
  // Count image bytes, excluding Vite URL-module imports; opening one card must not fetch all views.
  expect([...loaded].sort()).toEqual([...places].sort());
  expect(errors).toEqual([]);
});

test('the new cave painting preserves the mobile place card and its description',async({page},info)=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'&at=poi_northwest_cave_camp');
  await expect(page.locator('.place-view')).toHaveAttribute('src',/poi_northwest_cave_camp-painted/,{timeout:45000});
  await expect(page.locator('.place h2')).toHaveText('The Windward Cave');
  await expect(page.locator('.place')).toContainText('cool grass');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('mobile-cave.png')});
});
