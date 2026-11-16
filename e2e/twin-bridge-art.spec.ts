import {expect,test} from '@playwright/test';
for(const mobile of [false,true])test.describe(mobile?'mobile bridge':'desktop bridge',()=>{
  test.use({viewport:mobile?{width:390,height:844}:{width:1280,height:900},hasTouch:mobile});
  test('the north-south causeway uses the existing bridge and can be walked',async({page},info)=>{
    const errors:string[]=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(/has no frame|Texture.*not found/i.test(m.text()))errors.push(m.text());});
    const bridge=page.waitForResponse(r=>/river-bridge(?:-|\.png)/.test(r.url())&&r.ok());
    await page.goto('?map=field_map_twins&seed=twin-review&hour=12&door=open&title=skip&events=off&chatter=off&firsts=off&at=46,43');
    await bridge;
    await page.waitForFunction(()=>Boolean((window as any).__walker));
    await page.keyboard.press('ArrowUp');
    await expect.poll(()=>page.evaluate(()=>(window as any).__walker().y)).toBe(42);
    await page.screenshot({path:info.outputPath('north-south-bridge.png')});
    expect(errors).toEqual([]);
  });
});
