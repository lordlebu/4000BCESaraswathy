import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {fieldMap} from '../src/content/places';
import {buildFieldMap} from '../src/world/fieldMap';
import {planScene} from '../src/game/scenePlan';
import {planTwinScene} from '../src/game/twinArt';
import {twinLandscapeClear} from '../src/game/twinLandscape';
import {planHighlandLife,MAX_HIGHLAND_TREES,MAX_PATH_STONES} from '../src/game/twinHighlandLife';
import {sceneFor} from '../src/ui/scenes';
import {portraitFor} from '../src/ui/portraits';
import {TWIN_PEOPLE} from '../src/content/twinPeople';

describe('cave household proportions, paths and shared rest',()=>{
  it('builds a 1.5-tile cave body and a half-tile dark entrance from native pixels',()=>{
    const {decodePng}=createRequire(import.meta.url)('../tools/sprite-png.js');
    const png=decodePng(join(__dirname,'../assets/twins/highland-life.png'));
    expect([png.width,png.height]).toEqual([384,192]);
    const door=[];
    for(let x=0;x<192;x++)if([57,60,54,255].every((v,i)=>png.data[(128*png.width+x)*4+i]===v))door.push(x);
    expect(door).toHaveLength(64);expect(door.at(-1)!-door[0]!+1).toBe(64);
    expect(png.data[(100*png.width)*4+3]).toBe(255);expect(png.data[(100*png.width+191)*4+3]).toBe(255);
  });
  for(const seed of ['twin-art-review','twin-landscape-review','twin-manual-review'])it(`adds cleared trees and mixed routes without changing saved ground (${seed})`,()=>{
    const built=buildFieldMap(fieldMap('field_map_twins')!,{seed}),before=JSON.stringify(built);
    const base=planTwinScene(built),clear=twinLandscapeClear(built,base),life=planHighlandLife(built,clear);
    for(const p of life){const t=built.world.tiles[p.y]![p.x]!;expect(clear.has(`${p.x},${p.y}`)).toBe(false);expect(t.road||t.track||t.bridge).toBeFalsy();}
    expect(life.filter(p=>p.name==='highland:tree').length).toBeGreaterThan(0);
    expect(life.filter(p=>p.name==='highland:conifer').length).toBeGreaterThan(0);
    expect(life.filter(p=>p.name!=='highland:path-stone').length).toBeLessThanOrEqual(MAX_HIGHLAND_TREES);
    expect(life.filter(p=>p.name==='highland:path-stone').length).toBeLessThanOrEqual(MAX_PATH_STONES);
    const plan=planScene(built),roads=plan.filter(p=>p.sheet==='twinRoads');
    for(const material of ['stone','sandstone','brick'])expect(roads.some(p=>p.name===`road:${material}`)).toBe(true);
    expect(roads.length).toBeGreaterThan(plan.filter(p=>p.sheet==='twinRoutes'&&p.frame<16).length);
    for(const p of roads){const t=built.world.tiles[p.y]![p.x]!;expect(t.road).toBe(true);expect(t.track||t.bridge).toBeFalsy();}
    expect(plan.find(p=>p.name==='poi:poi_northwest_cave_camp')?.sheet).toBe('twinHighlandLife');
    expect(plan.find(p=>p.name==='cave:cooker')?.scale).toBe(.75);
    expect(JSON.stringify(built)).toBe(before);
  });
  it('retires the authored cook and selects the communal cave night at that place',()=>{
    expect(TWIN_PEOPLE.npc_cave_cook).toBeUndefined();
    expect(portraitFor('npc_cave_cook')).toBeNull();
    for(const pick of [0,1,50,999])for(const moment of ['midnight','dawn'] as const){
      expect(sceneFor('rest','settlement',pick,moment,'plains','poi_northwest_cave_camp')).toContain(`rest-windward-cave-${moment}`);
      expect(sceneFor('rest','settlement',pick,moment,'plains','poi_harappa_court')).not.toContain('windward-cave');
    }
  });
});
