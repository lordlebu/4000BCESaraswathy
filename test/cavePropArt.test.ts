import { createRequire } from 'node:module';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const {decodePng}=createRequire(import.meta.url)('../tools/sprite-png.js');

it('keeps dry-country NES props compact and preserves source RGBA at 2x',()=>{
  const source=decodePng(join(__dirname,'../assets/source/twins/dry-props-nes-jrpg.png'));
  const out=decodePng(join(__dirname,'../assets/twins/dry-props-nes-jrpg.png'));
  expect([source.width,source.height]).toEqual([64,64]);
  expect([out.width,out.height]).toEqual([128,128]);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
    const from=(y*64+x)*4,to=((y*2+dy)*128+x*2+dx)*4;
    if(!source.data.subarray(from,from+4).equals(out.data.subarray(to,to+4)))
      throw new Error(`Dry prop RGBA changed at ${x},${y}`);
  }
});

it('delivers all six cave props with unchanged RGBA samples',()=>{
  const source=decodePng(join(__dirname,'../assets/source/twins/cave-props-nes-jrpg.png'));
  const out=decodePng(join(__dirname,'../assets/twins/cave-props-nes-jrpg.png'));
  expect([source.width,source.height]).toEqual([96,64]);
  expect([out.width,out.height]).toEqual([384,256]);
  for(let y=0;y<64;y++)for(let x=0;x<96;x++)for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++){
    const from=(y*96+x)*4,to=((y*4+dy)*384+x*4+dx)*4;
    if(!source.data.subarray(from,from+4).equals(out.data.subarray(to,to+4)))
      throw new Error(`Cave prop colour/alpha changed at ${x},${y}`);
  }
});
