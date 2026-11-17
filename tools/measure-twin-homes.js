// Same-scene A/B: route only the home atlas, leaving placement, camera and size fixed.
// node tools/measure-twin-homes.js [--headed]
const {chromium}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:!process.argv.includes('--headed')});
 const results=[];
 try{
  for(const at of ['poi_harappa_court','poi_drain_court'])for(const variant of ['painted','snes','snes','painted']){
   const context=await browser.newContext({viewport:{width:1280,height:900}});
   const page=await context.newPage();const errors=[];let atlasLoads=0;
   page.on('pageerror',e=>errors.push(e.message));
   await page.route(/\/assets\/twins\/homes-(?:painted|snes)\.png/,route=>{
    if(route.request().resourceType()==='script')return route.continue();
    atlasLoads++;
    return route.fulfill({contentType:'image/png',body:fs.readFileSync(path.join(__dirname,`../assets/twins/homes-${variant}.png`))});
   });
   await page.goto(`http://127.0.0.1:4173/?map=field_map_twins&seed=twin-art-review&hour=12&door=open&title=skip&events=off&chatter=off&firsts=off&at=${at}`);
   await page.waitForFunction(()=>Boolean(window.__walker),undefined,{timeout:60000});
   if(atlasLoads!==1)throw new Error(`Expected one atlas load, got ${atlasLoads}`);
   await page.getByRole('button',{name:'Leave',exact:true}).click();
   async function sample(){return page.evaluate(async()=>{
    const canvas=document.querySelector('.map-surface canvas');
    const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
    const ext=gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown';
    const samples=await new Promise(resolve=>{
      const times=[];let previous;let count=0;
      const tick=now=>{if(previous!==undefined&&count>30)times.push(now-previous);previous=now;
        if(++count<121)requestAnimationFrame(tick);else resolve(times.sort((a,b)=>a-b));};
      requestAnimationFrame(tick);
    });
    return {renderer,median:samples[Math.floor(samples.length*.5)],p90:samples[Math.floor(samples.length*.9)]};
   });}
   const result=await sample();
   await page.keyboard.down('d');
   const walking=await sample();
   await page.keyboard.up('d');
   results.push({at,variant,atlasLoads,...result,walking:{median:walking.median,p90:walking.p90},errors});console.log(JSON.stringify(results.at(-1)));
   await context.close();
  }
  const out=path.join(__dirname,'../dump/twin-city-art-review/art-review/home-performance.json');
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify(results,null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
