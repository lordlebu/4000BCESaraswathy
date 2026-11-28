import {describe,it,expect} from 'vitest';
import {fieldMap} from '../src/content/places';
import {buildFieldMap} from '../src/world/fieldMap';
import { caveCookCamp } from '../src/content/campLife';
import {beeduAt,beeduRoute,BEEDU_CYCLE_MS} from '../src/content/beedu';
import {bustStage,caveHerderIsVisiting,KANG_ARC} from '../src/content/twinStories';
import {beatNow,storylines} from '../src/content/storylines';
import {linesFor,emptyProgress} from '../src/journey';

describe('the optional bust and permanent cave',()=>{
 it('waits for an invitation, defers without advancing, and restores each bust stage',()=>{
  const facts={fieldMapId:'field_map_twins',day:2,poiId:'poi_harappa_court',flags:[] as string[],holds:()=>true,carried:()=>0};
  expect(beatNow('arriving',facts)).toBeNull();
  const invite=beatNow('arriving',{...facts,requestedArc:KANG_ARC})!;
  expect(invite.choices.find(c=>c.label==='Another time')!.sets).toEqual([]);
  facts.flags.push(...invite.choices[0]!.sets!);expect(bustStage(facts.flags)).toBe(0);
  for(const at of ['poi_harappa_court','poi_earthen_workshop','poi_earthen_workshop','poi_harappa_court']){
   const beat=beatNow('arriving',{...facts,poiId:at})!;
   expect(beat).not.toBeNull();facts.flags.push(...beat.choices[0]!.sets!);
  }
  expect(bustStage(JSON.parse(JSON.stringify(facts.flags)))).toBe(2);
  expect(beatNow('arriving',facts)).toBeNull();
  expect(storylines.find(s=>s.id===KANG_ARC)!.joins).toBe(false);
 });
 it('keeps reports out of personal-witness dialogue and restores finished-bust reactions',()=>{
  const progress=emptyProgress();
  const before=linesFor(progress,'npc_priest_kang');
  const witnessed=linesFor(progress,'npc_priest_kang',{},['beedu:witnessed']);
  expect(witnessed.length).toBeGreaterThan(before.length);
  const finished=linesFor(progress,'npc_priest_kang',{},[`story:${KANG_ARC}:unveiling`]);
  expect(finished.some(l=>l.text.startsWith('There I am in stone.'))).toBe(true);
 });
 it('visits the cave for two days every six without displacing the herder', () => {
  const built = buildFieldMap(fieldMap('field_map_twins')!, { seed: 'cave-roster' });
  const places = built.placed.map(({ poi, at }) => ({ poiId: poi.id, at }));
  for (let day = 0; day < 12; day++) {
   const cook = caveCookCamp(built.fieldMap.id, places, day);
   expect(Boolean(cook)).toBe(day % 6 < 2);
   if (cook) expect(caveHerderIsVisiting(day)).toBe(false);
  }
 });
});

describe('one beedu flight derived from scene time',()=>{
 it('has a closed coast route, pauses underground and rises from and returns to the same sand',()=>{
  const built=buildFieldMap(fieldMap('field_map_twins')!,{seed:'beedu-review'});
  const route=beeduRoute(built.world)!;expect(route).not.toBeNull();
  expect(route.points[0]).toEqual(route.points.at(-1));
  const start=beeduAt(built.world,-157000,false,true)!;
  expect(start.state).toBe('hidden');expect(start.alpha).toBe(0);
  const rising=beeduAt(built.world,-2000,false,true)!;
  expect(rising.state).toBe('emerging');expect(rising.height).toBeGreaterThan(0);
  const flying=beeduAt(built.world,50000,false,true)!;
  expect(flying.state).toBe('gliding');expect(flying.height).toBeGreaterThan(1);
  const buried=beeduAt(built.world,142000,false,true)!;
  expect(buried.state).toBe('burrowing');expect(buried.height).toBe(0);
  expect(Math.hypot(buried.x-route.points[0]!.x,buried.y-route.points[0]!.y)).toBeLessThan(.01);
  expect(beeduAt(built.world,50000+BEEDU_CYCLE_MS,false,true)!.flightId).not.toBe(flying.flightId);
  expect(beeduAt(built.world,50000,true,true)!.frame%4).toBe(0);
 });
});
