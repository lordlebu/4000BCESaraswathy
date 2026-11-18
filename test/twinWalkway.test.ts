import {it,expect} from 'vitest';
import {fieldMap} from '../src/content/places';
import {buildFieldMap} from '../src/world/fieldMap';
import {planTwinLamps,planTwinRailBridges} from '../src/game/twinWalkway';
import {planTwinScene} from '../src/game/twinArt';
import {otterWakeStep,OTTER_WAKE_LIMIT} from '../src/game/otterWake';
import {railSpanWidth} from '../src/game/twinWalkway';
import {createRequire} from 'node:module';
import {join} from 'node:path';

it('lands the visible rail abutments on both banks despite the painted transparent gutters',()=>{
 const {decodePng}=createRequire(import.meta.url)('../tools/sprite-png.js');
 const png=decodePng(join(__dirname,'../assets/source/twins/rail-bridge-jrpg.png'));
 const opaque:number[]=[];for(let x=0;x<png.width;x++)if(png.data[(18*png.width+x)*4+3]>=128)opaque.push(x);
 const water=3*128,width=railSpanWidth(3);
 expect(-width/2+opaque[0]!/png.width*width).toBeLessThanOrEqual(-water/2);
 expect(-width/2+(opaque.at(-1)!+1)/png.width*width).toBeGreaterThanOrEqual(water/2);
});

it('restores spaced dry-road lamps and replaces only the upper rail span without changing ground',()=>{
 const built=buildFieldMap(fieldMap('field_map_twins')!,{seed:'twin-art-review'}),before=JSON.stringify(built);
 const lamps=planTwinLamps(built);expect(lamps.length).toBeGreaterThan(0);
 for(const p of lamps){const t=built.world.tiles[p.y]![p.x]!;expect(t.road).toBe(true);expect(t.bridge).toBeFalsy();expect(['river','sea']).not.toContain(t.biome);
  expect(built.placed.some(q=>q.at.x===p.x&&q.at.y===p.y)).toBe(false);
  for(const q of lamps)if(q!==p)expect(Math.abs(p.x-q.x)+Math.abs(p.y-q.y)).toBeGreaterThanOrEqual(4);
 }
 const rail=planTwinRailBridges(built.world),span=rail.find(p=>p.sheet==='twinRailBridge')!;
 expect(span).toMatchObject({x:32,y:25,spanTiles:3});expect(rail.filter(p=>p.crop).length).toBe(2);
 const plan=planTwinScene(built);expect(plan.some(p=>p.sheet==='riverBridge'&&p.y===27)).toBe(true);
 expect(plan.some(p=>p.sheet==='twinObjects'&&p.frame===18&&p.y===25)).toBe(false);
 expect(JSON.stringify(built)).toBe(before);
});

it('uses the accepted ripple only for short open-water movements, not land, bridges, stops or jumps',()=>{
 const {world}=buildFieldMap(fieldMap('field_map_twins')!,{seed:'twin-art-review'});
 const at=(x:number,y:number)=>({x:(x+.5)*128,y:(y+1)*128-2});
 const water=at(32,28),land=at(51,12),bridge=at(32,27);
 expect(otterWakeStep(world,water,{x:water.x+8,y:water.y})).toBe(true);
 expect(otterWakeStep(world,water,water)).toBe(false);
 expect(otterWakeStep(world,null,water)).toBe(false);
 expect(otterWakeStep(world,water,{x:water.x+400,y:water.y})).toBe(false);
 for(const p of [land,bridge])expect(otterWakeStep(world,p,{x:p.x+8,y:p.y})).toBe(false);
 expect(OTTER_WAKE_LIMIT).toBe(8);
});
