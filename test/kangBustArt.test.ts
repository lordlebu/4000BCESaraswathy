import {createRequire} from 'node:module';
import {join} from 'node:path';
import {expect,it} from 'vitest';

const {decodePng}=createRequire(import.meta.url)('../tools/sprite-png.js');

it('ships all three generated Kang bust stages without reducing colour or alpha',()=>{
  const source=decodePng(join(__dirname,'../assets/source/twins/kang-bust-nes-jrpg.png'));
  const out=decodePng(join(__dirname,'../assets/twins/stories-nes.png'));
  expect([source.width,source.height]).toEqual([96,40]);
  expect([out.width,out.height]).toEqual([896,160]);
  for(let y=0;y<40;y++)for(let x=0;x<96;x++)for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++){
    const from=(y*96+x)*4,to=((y*4+dy)*out.width+x*4+dx)*4;
    if(!source.data.subarray(from,from+4).equals(out.data.subarray(to,to+4)))
      throw new Error(`Kang bust RGBA changed at ${x},${y}`);
  }
});
