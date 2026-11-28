import {expect,it} from 'vitest';
import {fieldMap} from '../src/content/places';
import {buildFieldMap} from '../src/world/fieldMap';
import {rebake} from '../src/world/bake';
import {pointKey} from '../src/world/pathfind';
import {planCaveWalks} from '../src/game/caveCamp';
import {planScene} from '../src/game/scenePlan';
import {reliefCell,RELIEF_DIRECTIONS} from '../src/game/twinRelief';
import {twinSceneryReview} from '../src/game/twinSceneryReview';
import {terrainAtlasLayout,twinTerrainProfile,MAX_TWIN_TERRAIN_FRAMES} from '../src/game/twinTerrain';
import {planTwinResidents} from '../src/game/twinResidents';

const twins=fieldMap('field_map_twins')!;
const review=twinSceneryReview('?twinScenery=all');
const homes=new Set(['twinHouses','twinHousesDetail','twinHomesPainted']);
const sites=['poi_earthen_workshop','poi_nesting_ruins','poi_planted_ruins','poi_drain_court','poi_dune_windbreak','poi_reedwright_bank'];

it('rebuilds six registered sites while keeping the approved homes and cave routes',()=>{
  {
    const built=buildFieldMap(twins,{seed:'hybrid-review-0'});
    const original=planScene(built);
    const plan=planScene(built,review);
    expect(original.some(p=>p.sheet==='twinSite'||p.sheet==='twinRelief'||p.twinShadow)).toBe(false);
    for(const id of sites){
      expect(plan.filter(p=>p.name===`poi:${id}`)).toHaveLength(1);
      expect(plan.some(p=>p.name===`twin-site:${id}`),id).toBe(true);
    }
    const established=(list:typeof plan)=>list.filter(p=>homes.has(p.sheet)&&!p.name)
      .map(p=>[p.sheet,p.frame,p.x,p.y]);
    expect(established(plan)).toEqual(established(original));
    for(let day=0;day<30;day+=5){
      const before=planTwinResidents(built,original,day),after=planTwinResidents(built,plan,day);
      expect(after).toEqual(before);
      expect(planCaveWalks(built,plan,after)).toEqual(planCaveWalks(built,original,before));
    }
    expect(plan.filter(p=>p.sheet==='twinLandmark')).toHaveLength(16);
    expect(plan.some(p=>p.name==='highland:meadow')).toBe(true);
    expect(plan.filter(p=>p.sheet==='twinRelief').length).toBeGreaterThan(0);
    expect(plan.some(p=>p.name==='highland:cave-skirt')).toBe(true);
    expect(plan.some(p=>p.name==='highland:meltwater')).toBe(true);
    expect(plan.some(p=>p.name==='twin-site:outskirts'&&homes.has(p.sheet))).toBe(true);
  }
});

it('preserves gameplay ground, reciprocal ridge joins and preview placement across 150 layouts',()=>{
  for(let n=0;n<150;n++){
    const built=buildFieldMap(twins,{seed:`valley-stress-${n}`});
    const restored=rebake(built)!;
    const before=JSON.stringify(built);
    const plan=planScene(built,review);
    expect(JSON.stringify(built)).toBe(before);
    const preview=(list:typeof plan)=>list.filter(p=>p.sheet==='twinRelief'||p.sheet==='twinSite'||p.sheet==='twinLandmark'||p.twinShadow);
    expect(preview(planScene(restored,review))).toEqual(preview(plan));
    const allowed=new Set(built.placed.map(p=>pointKey(p.at)));
    for(const p of preview(plan)){
      const t=built.world.tiles[p.y]![p.x]!;
      if(p.name?.startsWith('poi:'))continue;
      expect(!!(t.road||t.track||t.bridge),`${n} ${p.name} ${p.x},${p.y}`).toBe(false);
      expect(allowed.has(pointKey(p))).toBe(false);
    }
    for(const row of built.world.tiles)for(const t of row){
      const r=reliefCell(built.world,t,'combined');
      if(!r)continue;
      for(const [side,[dx,dy]] of RELIEF_DIRECTIONS.entries())if(r.joins&(1<<side)){
        const neighbour=reliefCell(built.world,built.world.tiles[t.y+dy]![t.x+dx]!,'combined')!;
        if(!(neighbour.joins&(1<<((side+2)%4))))throw new Error(`Open ridge on seed ${n} at ${pointKey(t)}`);
      }
    }
    const atlas=terrainAtlasLayout(built.world,twinTerrainProfile('sage','combined'));
    expect(atlas.unique.size).toBeLessThanOrEqual(MAX_TWIN_TERRAIN_FRAMES);
  }
},60_000);
