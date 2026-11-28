import { describe, expect, it } from 'vitest';
import { fieldMap } from '../src/content/places';
import { TWIN_PEOPLE } from '../src/content/twinPeople';
import { caveHerderIsVisiting } from '../src/content/twinStories';
import { travellersOn } from '../src/content/travellers';
import { buildFieldMap } from '../src/world/fieldMap';
import { planScene } from '../src/game/scenePlan';
import { planTwinResidents } from '../src/game/twinResidents';
import { everySheet } from '../src/game/characters';

describe('the stationary twin-city cast', () => {
  it('loads every named identity and never duplicates somebody walking a circuit', () => {
    const sheets=new Set(everySheet().map(s=>s.key));
    for(const art of Object.values(TWIN_PEOPLE))expect(sheets.has(art)).toBe(true);
    for(const seed of ['twin-review','twin-art-review','twin-manual-review']){
      const built=buildFieldMap(fieldMap('field_map_twins')!,{seed});
      const scenery=planScene(built),before=JSON.stringify(built);
      const residents=planTwinResidents(built,scenery);
      const walkers=travellersOn('field_map_twins',seed).filter(t=>t.npcId!==null);
      expect(new Set(residents.map(r=>r.npcId)).size).toBe(residents.length);
      expect(residents.map(r=>r.npcId).sort()).toEqual(Object.keys(TWIN_PEOPLE)
        .filter(id=>!walkers.some(w=>w.npcId===id)&&(id!=='npc_cave_herder'||caveHerderIsVisiting(0))).sort());
      for(const person of residents){
        const tile=built.world.tiles[person.y]![person.x]!;
        expect(tile.road||tile.track||tile.bridge).toBeFalsy();
        expect(['river','sea','wetland']).not.toContain(tile.biome);
        expect(scenery.filter(p=>p.x===person.x&&p.y===person.y)
          .every(p=>!['twinHouses','twinHousesDetail','twinHomesPainted','twinCourtyard'].includes(p.sheet))).toBe(true);
        expect(walkers.some(w=>w.npcId===person.npcId)).toBe(false);
      }
      expect(planTwinResidents(built,scenery)).toEqual(residents);
      expect(JSON.stringify(built)).toBe(before);
    }
  });

  it('adds nobody on other maps', () => {
    const built=buildFieldMap(fieldMap('field_map_dwarka')!,{seed:'twin-review'});
    expect(planTwinResidents(built,planScene(built))).toEqual([]);
  });
});
