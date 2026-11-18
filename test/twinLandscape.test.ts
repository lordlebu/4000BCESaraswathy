import {describe,it,expect} from 'vitest';
import {fieldMap} from '../src/content/places';
import {buildFieldMap} from '../src/world/fieldMap';
import {planScene} from '../src/game/scenePlan';
import {planTwinScene} from '../src/game/twinArt';
import {MAX_TWIN_SHRUBS,MAX_TWIN_GROUND_DECOR,twinLandscapeClear} from '../src/game/twinLandscape';

describe('the shared valley landscape accents',()=>{
  for(const seed of ['twin-review','twin-art-review','twin-manual-review']){
    it(`adds sparse cliffs/decor/plants while keeping buildings and paths intact (${seed})`,()=>{
      const built=buildFieldMap(fieldMap('field_map_twins')!,{seed});
      const before=JSON.stringify(built),base=planTwinScene(built),plan=planScene(built);
      const accents=plan.slice(base.length).filter(p=>p.sheet!=='twinLamp'),clear=twinLandscapeClear(built,base);
      expect(plan.slice(0,base.length)).toEqual(base); // Every accepted building/placement survives verbatim.
      expect(accents.some(p=>p.sheet==='cliffs')).toBe(true);
      expect(accents.some(p=>p.sheet==='decor')).toBe(true);
      expect(accents.some(p=>p.sheet==='twinDryProps')).toBe(true);
      expect(accents.filter(p=>p.sheet==='twinShrubs'||p.sheet==='twinVergeGrass').length).toBeLessThanOrEqual(MAX_TWIN_SHRUBS);
      expect(accents.filter(p=>p.sheet==='decor').length).toBeLessThanOrEqual(MAX_TWIN_GROUND_DECOR);
      expect(accents.some(p=>p.sheet==='twinVergeGrass'&&p.scale===.5)).toBe(true);
      expect(accents.some(p=>p.sheet==='twinShrubs'&&p.scale===1)).toBe(true);
      const small=new Set<string>();
      for(const p of accents){
        const tile=built.world.tiles[p.y]![p.x]!;
        expect(clear.has(`${p.x},${p.y}`)).toBe(false);
        expect(tile.road||tile.track||tile.bridge).toBeFalsy();
        expect(['desert','hills','plains','coast','wetland','river','forest','mountains','snow']).toContain(tile.biome);
        if(p.sheet==='twinShrubs'||p.sheet==='twinVergeGrass'){
          const neighbours=[[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy])=>built.world.tiles[p.y+dy!]?.[p.x+dx!]);
          if(p.scale===.5){expect(tile.biome).toBe('plains');expect(neighbours.some(t=>t?.biome==='desert')).toBe(true);}
          expect(p.offset).toBeDefined();expect(p.frame).toBeGreaterThanOrEqual(0);expect(p.frame).toBeLessThan(4);
        }
        if(p.sheet!=='cliffs'&&p.sheet!=='twinShrubs'&&p.sheet!=='twinVergeGrass'&&!p.name?.startsWith('highland:tree')&&!p.name?.startsWith('highland:conifer')){
          expect(small.has(`${p.x},${p.y}`)).toBe(false);small.add(`${p.x},${p.y}`);
        }
      }
      expect(planScene(built)).toEqual(plan);
      expect(JSON.stringify(built)).toBe(before);
    });
  }
});
