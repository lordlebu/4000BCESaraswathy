import {describe,expect,it} from 'vitest';
import {fieldMap} from '../src/content/places';
import {buildFieldMap} from '../src/world/fieldMap';
import {bakeWorld,restoreWorld,rebake} from '../src/world/bake';
import {band} from '../src/world/classify';
import {CAVE_AT,CAVE_ID,inTwinHighlands,stampTwinHighlands} from '../src/world/twinHighlands';
import {planScene} from '../src/game/scenePlan';
import {twinGroundArt,TWIN_KEYS} from '../src/game/twinArt';

const map=fieldMap('field_map_twins')!;
describe('the northeastern Windward highlands',()=>{
  for(const seed of ['twin-review','twin-art-review','twin-manual-review'])it(`has a green camp, three height bands and a connected stream (${seed})`,()=>{
    const built=buildFieldMap(map,{seed}),{world}=built;
    expect(built.placed.find(p=>p.poi.id===CAVE_ID)!.at).toEqual(CAVE_AT);
    expect(world.tiles[CAVE_AT.y]![CAVE_AT.x]!.biome).toBe('plains');
    expect(band(world.tiles[CAVE_AT.y]![CAVE_AT.x]!.elevation)).toBe(1);
    expect(world.tiles[5]![5]!.biome).not.toBe('plains');
    const highlands=world.tiles.flat().filter(inTwinHighlands);
    for(const biome of ['plains','hills','mountains','snow','river'])expect(highlands.some(t=>t.biome===biome)).toBe(true);
    for(const t of highlands.filter(t=>t.biome==='snow'))expect(t.y<=2||t.x>=61).toBe(true);
    const water=new Set(world.tiles.flat().filter(t=>t.biome==='river').map(t=>`${t.x},${t.y}`));
    const seen=new Set<string>(),todo=[{x:56,y:2}];
    while(todo.length){const p=todo.pop()!,key=`${p.x},${p.y}`;if(seen.has(key)||!water.has(key))continue;
      seen.add(key);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])todo.push({x:p.x+dx!,y:p.y+dy!});}
    expect([...seen].some(k=>Number(k.split(',')[0])<35)).toBe(true);
    const forms=planScene(built).filter(p=>p.sheet==='twinHighlandForms');
    for(const category of [0,2,4])expect(forms.some(p=>p.frame===category||p.frame===category+1)).toBe(true);
    for(const p of forms)expect(Math.abs(p.x-CAVE_AT.x)>4||Math.abs(p.y-CAVE_AT.y)>4).toBe(true);
    for(const t of highlands.filter(t=>t.biome!=='river'))expect(twinGroundArt(world,t,0).key).toBe(TWIN_KEYS.highlandGround);
    expect(bakeWorld(rebake(built)!)).toEqual(bakeWorld(built));
  });

  for(const version of [undefined,1] as const)it(`migrates cave/terrain version ${version} without rebuilding cities or transport`,()=>{
    const built=buildFieldMap(map,{seed:'legacy-highland'}),legacy=structuredClone(built);
    for(const t of legacy.world.tiles.flat().filter(inTwinHighlands)){
      t.biome='desert';t.elevation=.25;t.moisture=.05;t.temperature=.65;
    }
    const saved=bakeWorld(legacy);
    if(version===undefined)delete saved.twinRegion!.highlands;else saved.twinRegion!.highlands=version;
    saved.placed.find(p=>p[0]===CAVE_ID)![1]=5;
    saved.placed.find(p=>p[0]===CAVE_ID)![2]=5;
    const original=JSON.stringify(saved),baseline=rebake(built)!;
    const restored=restoreWorld(saved,map)!;
    expect(restored.world.tiles[CAVE_AT.y]![CAVE_AT.x]!.biome).toBe('plains');
    expect(band(restored.world.tiles[CAVE_AT.y]![CAVE_AT.x]!.elevation)).toBe(1);
    expect(restored.world.twinRegion!.highlands).toBe(2);
    expect(restored.placed.find(p=>p.poi.id===CAVE_ID)!.at).toEqual(CAVE_AT);
    expect(restored.placed.filter(p=>p.poi.id!==CAVE_ID)).toEqual(built.placed.filter(p=>p.poi.id!==CAVE_ID));
    for(const row of restored.world.tiles)for(const t of row){
      const before=baseline.world.tiles[t.y]![t.x]!;
      expect([t.road,t.track,t.bridge]).toEqual([before.road,before.track,before.bridge]);
      if(!inTwinHighlands(t)&&t.y!==21&&t.y!==22)expect(t).toEqual(before);
    }
    expect(JSON.stringify(saved)).toBe(original);
    const stable=JSON.stringify(restored);stampTwinHighlands(restored.world);
    expect(JSON.stringify(restored)).toBe(stable);
    expect(bakeWorld(rebake(restored)!)).toEqual(bakeWorld(restored));
  });
});
