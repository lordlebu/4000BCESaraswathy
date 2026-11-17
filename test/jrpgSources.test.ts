import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root=join(__dirname,'..');
const manifest=JSON.parse(readFileSync(join(root,'tools/characters.json'),'utf8'));
const {decodePng}=createRequire(import.meta.url)('../tools/sprite-png.js');

describe('reviewed NES JRPG sources',()=>{
  for(const row of manifest.characters.filter((c:{jrpgSource?:string})=>c.jrpgSource)){
    it(`${row.id} ships all twenty poses without changing source RGBA samples`,()=>{
      const source=decodePng(join(root,row.jrpgSource));
      const built=decodePng(join(root,'assets',`${row.id}-overworld.png`));
      const cell=row.cell??manifest.cell;
      expect([source.width,source.height]).toEqual([cell.width*4,cell.height*5]);
      expect([built.width,built.height]).toEqual([cell.width*20,cell.height]);
      // Compare complete source rows with delivered rows: palette/alpha changes,
      // dropped poses and accidentally transposed frames all fail here.
      for(let frame=0;frame<20;frame++)for(let y=0;y<cell.height;y++){
        const from=((Math.floor(frame/4)*cell.height+y)*source.width+(frame%4)*cell.width)*4;
        const to=(y*built.width+frame*cell.width)*4;
        expect(Buffer.compare(source.data.subarray(from,from+cell.width*4),
          built.data.subarray(to,to+cell.width*4)),`frame ${frame}, row ${y}`).toBe(0);
      }
    });
  }
});
