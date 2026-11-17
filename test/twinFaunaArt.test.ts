import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe,expect,it } from 'vitest';

const root=join(__dirname,'..');
const manifest=JSON.parse(readFileSync(join(root,'tools/twin-fauna.json'),'utf8'));
const {decodePng}=createRequire(import.meta.url)('../tools/sprite-png.js');
// Every logical source sample must reach the shipped image unchanged, including alpha.
function samePixels(source:any,out:any,sx:number,sy:number,ox:number,oy:number,w:number,h:number){
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++){
    const from=((sy+y)*source.width+sx+x)*4;
    const to=((oy+y*4+dy)*out.width+ox+x*4+dx)*4;
    if(!source.data.subarray(from,from+4).equals(out.data.subarray(to,to+4)))
      throw new Error(`RGBA changed at source ${sx+x},${sy+y}`);
  }
}
describe('generated NES JRPG animal and tram delivery',()=>{
  for(const entry of manifest.animals){
    it(`${entry.id} retains all four source facings without colour or alpha reduction`,()=>{
      const source=decodePng(join(root,entry.source));
      expect([source.width,source.height]).toEqual([64,64]);
      for(const [index,facing]of manifest.directionOrder.entries()){
        const out=decodePng(join(root,`assets/wanderers/${entry.id}-${facing}.png`));
        expect([out.width,out.height]).toEqual([128,128]);
        samePixels(source,out,index%2*32,Math.floor(index/2)*32,0,0,32,32);
      }
    });
  }
  it('keeps sixteen tram poses and uses the first pose of each direction for idle',()=>{
    expect(manifest.tram.directionOrder).toEqual(['right','left','up','down']);
    const source=decodePng(join(root,manifest.tram.source));
    const moving=decodePng(join(root,'assets/twins/tram-walk.png'));
    const still=decodePng(join(root,'assets/twins/tram.png'));
    expect([source.width,source.height]).toEqual([192,160]);
    expect([moving.width,moving.height]).toEqual([768,640]);
    expect([still.width,still.height]).toEqual([768,160]);
    for(let row=0;row<4;row++){
      for(let pose=0;pose<4;pose++)samePixels(source,moving,pose*48,row*40,pose*192,row*160,48,40);
      samePixels(source,still,0,row*40,row*192,0,48,40);
    }
  });
});
