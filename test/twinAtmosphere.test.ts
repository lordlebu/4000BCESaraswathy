import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';
import {fieldMap} from '../src/content/places';
import {buildFieldMap} from '../src/world/fieldMap';
import {planTwinAtmosphere,MAX_TWIN_RIPPLES,MAX_TWIN_HAZE} from '../src/game/twinAtmosphere';
import {cavePose,CAVE_TILE_MS,CAVE_TURN_MS} from '../src/game/caveCamp';

describe('quiet twin-valley ambience',()=>{
  it('keeps the shrub atlas compact and RGBA, with four complete sprite cells',()=>{
    for(const [file,size] of [['assets/source/twins/shrubs-nes-jrpg.png',64],['assets/twins/shrubs-nes-jrpg.png',256]] as const){
      const png=readFileSync(join(__dirname,'..',file));
      expect([png.readUInt32BE(16),png.readUInt32BE(20)]).toEqual([size,size]);expect(png[25]).toBe(6);
    }
  });
  for(const seed of ['twin-review','twin-art-review','twin-manual-review'])it(`uses only open river water, dry desert and the real hearth (${seed})`,()=>{
    const built=buildFieldMap(fieldMap('field_map_twins')!,{seed}),before=JSON.stringify(built);
    const plan=planTwinAtmosphere(built),cave=built.placed.find(p=>p.poi.id==='poi_northwest_cave_camp')!;
    expect(plan.ripples.length).toBeGreaterThan(0);expect(plan.ripples.length).toBeLessThanOrEqual(MAX_TWIN_RIPPLES);
    expect(plan.haze.length).toBeGreaterThan(0);expect(plan.haze.length).toBeLessThanOrEqual(MAX_TWIN_HAZE);
    expect(new Set(plan.ripples.map(p=>`${p.x},${p.y}`)).size).toBe(plan.ripples.length);
    for(const p of plan.ripples){const t=built.world.tiles[p.y]![p.x]!;expect(t.biome).toBe('river');expect(t.road||t.track||t.bridge).toBeFalsy();}
    for(const p of plan.haze){const t=built.world.tiles[p.y]![p.x]!;expect(t.biome).toBe('desert');expect(t.road||t.track||t.bridge).toBeFalsy();}
    expect(plan.hearth).toEqual({x:cave.at.x-1,y:cave.at.y+1});
    expect(planTwinAtmosphere(built)).toEqual(plan);expect(JSON.stringify(built)).toBe(before);
  });

  it('leaves the earlier maps alone',()=>{
    for(const id of ['field_map_lothal','field_map_dwarka','field_map_narmada','field_map_aravali']){
      expect(planTwinAtmosphere(buildFieldMap(fieldMap(id)!,{seed:'older-decor'}))).toEqual({ripples:[],haze:[],hearth:null});
    }
  });

  it('bounds cave speed and finishes at home before sitting, without repeated loops',()=>{
    const walk={npcId:'npc_mirlepa',points:[{x:50,y:12},{x:49,y:12},{x:48,y:12},{x:47,y:12},{x:48,y:12},{x:49,y:12},{x:50,y:12}]};
    let distance=0,last=cavePose(walk,0);
    for(let clock=1000;clock<=CAVE_TURN_MS;clock+=1000){
      const pose=cavePose(walk,clock),step=Math.hypot(pose.x-last.x,pose.y-last.y);
      expect(step).toBeLessThanOrEqual(1000/CAVE_TILE_MS+.00001);distance+=step;last=pose;
    }
    expect(distance).toBeCloseTo(6);expect(last).toMatchObject({x:50,y:12,sitting:true});
  });
});
