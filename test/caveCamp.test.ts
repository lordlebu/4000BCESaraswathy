import { describe, expect, it } from 'vitest';
import { fieldMap } from '../src/content/places';
import { buildFieldMap } from '../src/world/fieldMap';
import { isWalkable } from '../src/world/generate';
import { planScene } from '../src/game/scenePlan';
import { planTwinResidents } from '../src/game/twinResidents';
import { cavePose, cavePropFrames, CAVE_TURN_MS, planCaveProps, planCaveWalks } from '../src/game/caveCamp';

describe('the northwest cave household', () => {
  for (const seed of ['twin-review','twin-art-review','twin-manual-review']) {
    it(`keeps both walking routes clear and beside the restored cave (${seed})`, () => {
      const built=buildFieldMap(fieldMap('field_map_twins')!,{seed});
      const before=JSON.stringify(built), scenery=planScene(built);
      const residents=planTwinResidents(built,scenery);
      const walks=planCaveWalks(built,scenery,residents);
      const cave=built.placed.find(p=>p.poi.id==='poi_northwest_cave_camp')!.at;
      expect(walks.map(w=>w.npcId)).toEqual(['npc_mirlepa','npc_yamantaka']);
      const reserved=scenery.filter(p=>['twinStories','twinCaveProps','twinHouses','twinHousesDetail',
        'twinHomesPainted','twinObjects','twinDetails','twinCourtyard','twinEnvironment'].includes(p.sheet));
      for(const walk of walks){
        expect(walk.points.length).toBeGreaterThan(2);
        expect(walk.points.at(-1)).toEqual(walk.points[0]);
        for(const [i,p] of walk.points.entries()){
          const tile=built.world.tiles[p.y]![p.x]!;
          expect(isWalkable(tile)).toBe(true);
          expect(['river','sea','wetland']).not.toContain(tile.biome);
          expect(tile.road||tile.track||tile.bridge).toBeFalsy();
          expect(Math.max(Math.abs(p.x-cave.x),Math.abs(p.y-cave.y))).toBeLessThanOrEqual(4);
          expect(p).not.toEqual({x:cave.x,y:cave.y+1});
          expect(reserved.some(q=>q.x===p.x&&q.y===p.y)).toBe(false);
          expect(residents.some(q=>q.npcId!==walk.npcId&&q.x===p.x&&q.y===p.y)).toBe(false);
          if(i)expect(Math.abs(p.x-walk.points[i-1]!.x)+Math.abs(p.y-walk.points[i-1]!.y)).toBe(1);
        }
      }
      expect(walks[0]!.points.some(p=>walks[1]!.points.some(q=>q.x===p.x&&q.y===p.y))).toBe(false);
      expect(JSON.stringify(built)).toBe(before);
      for(const clock of [0,2_000,CAVE_TURN_MS-1,CAVE_TURN_MS,CAVE_TURN_MS+2_000,2*CAVE_TURN_MS]){
        const poses=walks.map(w=>cavePose(w,clock));
        expect(poses.filter(p=>p.sitting)).toHaveLength(1);
        expect(poses.find(p=>p.sitting)!.frame).toBe(17);
        expect(poses.find(p=>!p.sitting)!.frame).toBeLessThan(16);
        expect(poses).toEqual(walks.map(w=>cavePose(w,clock)));
      }
      expect(cavePose(walks[0]!,0)).not.toMatchObject(cavePose(walks[0]!,2_000));
      expect(cavePose(walks[0]!,CAVE_TURN_MS).sitting).toBe(true);
      expect(cavePose(walks[1]!,CAVE_TURN_MS).sitting).toBe(false);
      expect(planCaveProps(built)).toHaveLength(3);
    });
  }

  it('changes six arrangements through a thirty-day month without frame or daily flicker',()=>{
    const arrangements=[];
    for(let day=0;day<30;day+=5){
      const frames=cavePropFrames(day);arrangements.push(frames.join(','));
      expect(cavePropFrames(day+4)).toEqual(frames);
      expect(cavePropFrames(day+30)).toEqual(frames);
      expect(frames.every(frame=>frame>=0&&frame<6)).toBe(true);
    }
    expect(new Set(arrangements).size).toBe(6);
    expect(cavePropFrames(-1)).toEqual(cavePropFrames(29));
  });

  it('does not add cave scenery or routes to other field maps',()=>{
    const built=buildFieldMap(fieldMap('field_map_dwarka')!,{seed:'twin-review'});
    expect(planCaveProps(built)).toEqual([]);
    expect(planCaveWalks(built,[],[])).toEqual([]);
  });
});
