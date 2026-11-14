import { describe, expect, it } from 'vitest';
import { fieldMap, poisOn, npcsAt } from '../src/content/places';
import { buildFieldMap } from '../src/world/fieldMap';
import { rebake } from '../src/world/bake';
import { reachableFrom } from '../src/world/generate';
import { TWIN_MAP, cityEdges, districtAt } from '../src/world/twinCities';
import { carriagePath, rideFrom } from '../src/content/vehicles';
import { creatureFor, floraFor } from '../src/content/species';
import { canHappen, events } from '../src/content/events';
import { encampmentOn, campable } from '../src/content/encampments';
import { travellersOn } from '../src/content/travellers';
import { planScene } from '../src/game/scenePlan';

const map=fieldMap(TWIN_MAP)!;
describe('the mainland twin cities',()=>{
  it('keeps the authored geography and all places reachable across seeds',()=>{
    for(let i=0;i<20;i++){
      const b=buildFieldMap(map,{seed:`twins-${i}`}),w=b.world;
      expect([w.width,w.height]).toEqual([64,64]);expect(b.placed).toHaveLength(12);expect(b.unplaced).toEqual([]);
      const reached=reachableFrom(w.tiles,w.width,w.height,w.start);
      for(const p of b.placed)expect(reached.has(`${p.at.x},${p.at.y}`),p.poi.id).toBe(true);
      expect(w.tiles[5]![5]!.biome).not.toBe('sea');expect(w.tiles[63]![63]!.biome).toBe('sea');
      // Walk the actual water network, not the river metadata or a count of blue tiles.
      const water=(x:number,y:number)=>['river','wetland','coast','sea'].includes(w.tiles[y]?.[x]?.biome??'');
      const queue=w.tiles[0]!.filter(t=>t.biome==='river').map(t=>({x:t.x,y:t.y}));
      const seen=new Set<string>();let southernSea=false;
      while(queue.length){const p=queue.pop()!,key=`${p.x},${p.y}`;if(seen.has(key))continue;seen.add(key);
        if(p.y===63&&w.tiles[p.y]![p.x]!.biome==='sea')southernSea=true;
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(water(p.x+dx!,p.y+dy!))queue.push({x:p.x+dx!,y:p.y+dy!});
      }
      expect(southernSea).toBe(true);
      const dry=w.tiles.flat().filter(t=>['desert','hills'].includes(t.biome));expect(dry.length).toBeGreaterThan(1600);
      expect(w.twinRegion!.rail.some(p=>w.tiles[p.y]![p.x]!.biome==='river')).toBe(true);
      for(const p of b.placed)expect(w.tiles[p.at.y]![p.at.x]!.track).not.toBe(true);
    }
  });
  it('restores both districts, flags and bent rail route without changing save versions',()=>{
    const b=buildFieldMap(map,{seed:'twins-save'}),r=rebake(b)!;
    expect(r.world.twinRegion).toEqual(b.world.twinRegion);
    expect(r.world.tiles.map(row=>row.map(t=>[t.biome,!!t.road,!!t.track,!!t.bridge]))).toEqual(b.world.tiles.map(row=>row.map(t=>[t.biome,!!t.road,!!t.track,!!t.bridge])));
    for(const station of r.world.twinRegion!.stations){const ride=rideFrom(r.world,station)!;
      expect(ride.vehicle.id).toBe('vehicle_ostrich_tram');const path=carriagePath(r.world,ride);
      expect(path[0]).toEqual(station);expect(path.at(-1)).toEqual(ride.to);
      for(let i=1;i<path.length;i++)expect(Math.abs(path[i]!.x-path[i-1]!.x)+Math.abs(path[i]!.y-path[i-1]!.y)).toBe(1);
    }
    expect(rideFrom(r.world,{x:32,y:25})).toBeNull();
  });
  it('draws both architectures from their actual city identity and keeps routes clear',()=>{
    const b=buildFieldMap(map);const plan=planScene(b);
    const houses=plan.filter(p=>p.sheet==='twinHouses'&&p.frame<8&&!p.name);
    expect(houses.length).toBeGreaterThan(20);
    for(const p of houses){expect(p.frame<4).toBe(districtAt(b.world.twinRegion!,p)?.id==='harappa');expect(b.world.tiles[p.y]![p.x]!.road).not.toBe(true);expect(b.world.tiles[p.y]![p.x]!.track).not.toBe(true);}
    for(const p of b.placed)expect(plan.some(a=>a.name===`poi:${p.poi.id}`)).toBe(true);
    expect(plan.every(p=>['twinHouses','twinObjects','twinRoutes'].includes(p.sheet))).toBe(true);
  });
  it('keeps each city at Dwarka scale, bounded by walls and natural features with open gates',()=>{
    const reference=buildFieldMap(fieldMap('field_map_dwarka')!,{seed:'twin-review'}).world;
    const referenceTiles=reference.tiles.flat().filter(t=>t.biome==='settlement'&&Math.abs(t.x-reference.settlement!.x)+Math.abs(t.y-reference.settlement!.y)<=4).length;
    const b=buildFieldMap(map,{seed:'twin-review'}),world=b.world;
    for(const district of world.twinRegion!.districts){
      const town=world.tiles.flat().filter(t=>districtAt(world.twinRegion!,t)?.id===district.id&&t.biome==='settlement');
      // Dwarka can be clipped by a map edge; the new inland towns keep the full footprint.
      expect(town.length).toBeGreaterThanOrEqual(referenceTiles);
      expect(town.length).toBeLessThanOrEqual(41);
      expect(Math.max(...town.map(t=>t.x))-Math.min(...town.map(t=>t.x))+1).toBe(9);
      expect(town.some(t=>cityEdges(world,t).wall!==0)).toBe(true);
      expect(town.some(t=>cityEdges(world,t).natural!==0)).toBe(true);
      const gates=town.filter(t=>t.road||t.track);expect(gates.length).toBeGreaterThan(0);
      for(const t of gates)expect(cityEdges(world,t)).toEqual({wall:0,natural:0});
    }
  });
  it('keeps arid and urban species within the curated mainland pools',()=>{
    expect(floraFor({x:9,y:9,biome:'hills'},TWIN_MAP)?.id).not.toBe('vindhya-pine');
    for(let x=0;x<50;x++){
      const f=floraFor({x,y:20,biome:'settlement'},TWIN_MAP);expect(f?.id).not.toBe('root-anchored-artillery-tree');
      const c=creatureFor({x,y:20,biome:'desert'},TWIN_MAP);expect(c?.landmasses?.includes('jambhudweepa')&&!c?.landmasses?.includes('mainland_asia')).not.toBe(true);
    }
  });
  it('counts named walkers once and caps strangers and active camp people',()=>{
    const people=new Set(poisOn(TWIN_MAP).flatMap(p=>npcsAt(p.id).map(n=>n.id)));expect(people.size).toBe(8);
    const travellers=travellersOn(TWIN_MAP,'twins');expect(travellers.filter(t=>t.npcId!==null)).toHaveLength(3);expect(travellers.filter(t=>t.npcId===null)).toHaveLength(2);
    const b=buildFieldMap(map);expect(encampmentOn(b.world,TWIN_MAP,[],0)).toBeNull();let active=0;
    for(let day=1;day<30;day++){const camp=encampmentOn(b.world,TWIN_MAP,b.placed.map(p=>({poiId:p.poi.id,at:p.at})),day);if(camp){active++;expect(['drovers','pilgrims','adventurers']).toContain(camp.kind);expect(campable(b.world,camp.at)).toBe(true);}}
    expect(active).toBeGreaterThan(0);
  });
  it('requires understanding for the closing page and gives repeated encounters a cooldown',()=>{
    const closing=events.find(e=>e.id==='happening_twin_closing')!;
    const now={occasion:'arriving' as const,shelter:null,fieldMapId:TWIN_MAP,day:4,holds:closing.conditions.requires,seen:[],poiId:'poi_harappa_court'};
    expect(canHappen(closing,now)).toBe(false);expect(canHappen(closing,{...now,completed:now.holds})).toBe(true);
    const carrier=events.find(e=>e.id==='happening_twin_carrier')!;
    expect(canHappen(carrier,{...now,occasion:'road',seen:[carrier.id],last:{[carrier.id]:3}})).toBe(false);
    expect(canHappen(carrier,{...now,occasion:'road',day:6,seen:[carrier.id],last:{[carrier.id]:3}})).toBe(true);
  });
});
