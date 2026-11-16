import {describe,it,expect} from 'vitest';
import {buildFieldMap} from '../src/world/fieldMap';
import {fieldMap} from '../src/content/places';
import {planScene} from '../src/game/scenePlan';
import {twinFurnishings,twinBankDepth} from '../src/game/twinEnvironment';
const map=fieldMap('field_map_twins')!;
describe('the NES city environment composition',()=>{
 it('keeps working space clear of houses, routes and other place anchors',()=>{
  for(let i=0;i<12;i++){
   const built=buildFieldMap(map,{seed:`environment-${i}`}),before=JSON.stringify(built);
   const props=twinFurnishings(built),plan=planScene(built);
   expect(props.length).toBeGreaterThan(0);
   for(const p of props){
    const tile=built.world.tiles[p.y]![p.x]!;
    expect(tile.road||tile.track).not.toBe(true);
    expect(built.placed.some(place=>place.at.x===p.x&&place.at.y===p.y)).toBe(false);
    expect(plan.some(h=>['twinHouses','twinHousesDetail','twinHomesPainted'].includes(h.sheet)&&!h.name&&h.x===p.x&&h.y===p.y)).toBe(false);
   }
   expect(JSON.stringify(built)).toBe(before);
   expect(planScene(built)).toEqual(plan);
  }
 });
 it('keeps bank gradients within water and away from bridge decks',()=>{
  const built=buildFieldMap(map,{seed:'bank-depth'}),banks=twinBankDepth(built);
  expect(banks.length).toBeGreaterThan(0);
  for(const p of banks){
   const tile=built.world.tiles[p.y]![p.x]!;
   expect(['river','sea']).toContain(tile.biome);expect(tile.bridge).not.toBe(true);
   expect(p.frame).toBeGreaterThan(8);expect(p.frame).toBeLessThan(24);
   expect(p.depth).toBeLessThan(100);
  }
 });
});
