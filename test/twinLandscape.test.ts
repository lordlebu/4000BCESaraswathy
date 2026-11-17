import {describe,it,expect} from 'vitest';
import {fieldMap} from '../src/content/places';
import {buildFieldMap} from '../src/world/fieldMap';
import {planScene} from '../src/game/scenePlan';
import {planTwinScene} from '../src/game/twinArt';
import {twinLandscapeClear} from '../src/game/twinLandscape';

describe('the shared valley landscape accents',()=>{
  for(const seed of ['twin-review','twin-art-review','twin-manual-review']){
    it(`adds sparse cliffs/decor/plants while keeping buildings and paths intact (${seed})`,()=>{
      const built=buildFieldMap(fieldMap('field_map_twins')!,{seed});
      const before=JSON.stringify(built),base=planTwinScene(built),plan=planScene(built);
      const accents=plan.slice(base.length),clear=twinLandscapeClear(built,base);
      expect(plan.slice(0,base.length)).toEqual(base); // Every accepted building/placement survives verbatim.
      expect(accents.some(p=>p.sheet==='cliffs')).toBe(true);
      expect(accents.some(p=>p.sheet==='decor')).toBe(true);
      expect(accents.some(p=>p.sheet==='twinDryProps')).toBe(true);
      expect(accents.length).toBeLessThan(500);
      const small=new Set<string>();
      for(const p of accents){
        const tile=built.world.tiles[p.y]![p.x]!;
        expect(clear.has(`${p.x},${p.y}`)).toBe(false);
        expect(tile.road||tile.track||tile.bridge).toBeFalsy();
        expect(['desert','hills','plains','coast']).toContain(tile.biome);
        if(p.sheet!=='cliffs'){
          expect(small.has(`${p.x},${p.y}`)).toBe(false);small.add(`${p.x},${p.y}`);
        }
      }
      expect(planScene(built)).toEqual(plan);
      expect(JSON.stringify(built)).toBe(before);
    });
  }
});
