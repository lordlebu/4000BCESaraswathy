// Reproducible captures of the actual running game, not a separate map renderer.
// Start npm run dev first. Survey reveals fog for art review in development only.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const OUT=path.resolve(__dirname,'../docs/images/twins');
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const metrics=await require('./measure-twins').measure();
  fs.writeFileSync(path.join(OUT,'metrics.json'),JSON.stringify(metrics,null,2)+'\n');
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  // Never photograph an earlier bake of the same review seed after geography changes.
  await page.addInitScript(()=>localStorage.clear());
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const captures=[['harappa','poi_harappa_court'],['mohenjodaro','poi_brick_quarter'],['causeway','poi_twin_causeway'],['desert','poi_desert_ground'],['delta','poi_reed_junction'],['coves','poi_twin_cove']];
  for(const [name,at] of captures){
    await page.goto(`http://localhost:4173/?map=field_map_twins&seed=twin-review&hour=12&door=open&events=off&firsts=off&survey=on&at=${at}`);
    await page.locator('.map-surface canvas').waitFor({timeout:45000});
    await page.waitForFunction(()=>Boolean(window.__walker),{timeout:45000});
    await page.waitForTimeout(1800);
    const leave=page.getByRole('button',{name:'Leave',exact:true});if(await leave.isVisible())await leave.click();
    await page.screenshot({path:path.join(OUT,name+'.png')});
  }
  // Identical viewport and measured camera zoom for the existing-city reference.
  const zooms=[];
  for(const map of metrics.filter(m=>m.id!=='field_map_lothal')){
    const at=map.id==='field_map_twins'?'18,18':`${map.centre.x},${map.centre.y}`;
    await page.goto(`http://localhost:4173/?map=${map.id}&seed=twin-review&hour=12&door=open&events=off&firsts=off&at=${at}`);
    await page.waitForFunction(()=>Boolean(window.__walker),{timeout:45000});
    await page.waitForTimeout(1800);
    zooms.push({map:map.id,zoom:await page.locator('.map-surface').getAttribute('data-zoom')});
    await page.screenshot({path:path.join(OUT,map.id==='field_map_twins'?'harappa-scale.png':'dwarka-scale.png')});
  }
  await page.goto('http://localhost:4173/?map=field_map_twins&seed=twin-review&hour=12&door=open&events=off&survey=on&at=32,30');
  await page.locator('.map-surface canvas').waitFor({timeout:45000});await page.waitForTimeout(1800);
  for(let i=0;i<8;i++){await page.keyboard.press('-');await page.waitForTimeout(150);}
  await page.screenshot({path:path.join(OUT,'survey.png')});
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://localhost:4173/?map=field_map_twins&seed=twin-review&hour=12&door=open&events=off&at=poi_harappa_station');
  await page.getByRole('button',{name:/ride the ostrich tram/i}).waitFor({timeout:45000});
  await page.screenshot({path:path.join(OUT,'mobile-station.png')});
  console.log(JSON.stringify({seed:'twin-review',captures:captures.length+4,zooms,survey:'development-only fog reveal; not a playthrough',errors},null,2));
  await browser.close();if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
