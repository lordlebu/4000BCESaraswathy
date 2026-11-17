import {tileHash} from '../world/rng';
import {depthFor,ROW_SLOT} from './frames';
import type {FieldMapWorld} from '../world/fieldMap';
import type {Placement} from './scenePlan';

const STRUCTURES=new Set(['twinHouses','twinHousesDetail','twinHomesPainted','twinObjects',
  'twinDetails','twinCourtyard','twinEnvironment','twinStories','twinCaveProps','twinHighlandForms']);
const GROUND=new Set(['desert','hills','plains','coast']);

/** Presentation clearance only: never alter terrain, buildings, collision or seeded generation. */
export function twinLandscapeClear(built:FieldMapWorld,base:readonly Placement[]):Set<string>{
  const clear=new Set<string>();
  const reserve=(x:number,y:number,r:number)=>{
    for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)clear.add(`${x+dx},${y+dy}`);
  };
  for(const p of built.placed)reserve(p.at.x,p.at.y,p.poi.id==='poi_northwest_cave_camp'?4:3);
  for(const p of base)if(STRUCTURES.has(p.sheet))reserve(p.x,p.y,1);
  for(const row of built.world.tiles)for(const t of row)if(t.road||t.track||t.bridge)reserve(t.x,t.y,1);
  return clear;
}

/** Reuse older maps' cliff/decor art sparingly, plus small generated NES JRPG dry-country props. */
export function planTwinLandscape(built:FieldMapWorld,base:readonly Placement[],
  cliffs:readonly Placement[],decor:readonly Placement[],clear=twinLandscapeClear(built,base)):Placement[]{
  if(!built.world.twinRegion)return [];
  const allowed=(p:{x:number;y:number})=>!clear.has(`${p.x},${p.y}`)
    &&GROUND.has(built.world.tiles[p.y]?.[p.x]?.biome??'');
  const faces=cliffs.filter(p=>allowed(p)&&['hills','desert'].includes(built.world.tiles[p.y]![p.x]!.biome));
  const occupied=new Set(faces.map(p=>`${p.x},${p.y}`));
  const out=[...faces];
  for(const p of decor){
    const key=`${p.x},${p.y}`;
    if(!allowed(p)||occupied.has(key)||tileHash(built.world.seed,p.x,p.y,'twin-ground-detail')%7!==0)continue;
    out.push(p);occupied.add(key); // At most one small shared prop per selected tile.
  }
  for(const row of built.world.tiles)for(const t of row){
    const hash=tileHash(built.world.seed,t.x,t.y,'twin-dry-plant'),key=`${t.x},${t.y}`;
    if(!allowed(t)||occupied.has(key)||t.biome!=='desert'||hash%37!==0)continue;
    out.push({sheet:'twinDryProps',frame:(hash>>>8)%4,x:t.x,y:t.y,depth:depthFor(t.y,ROW_SLOT.undergrowth)});
  }
  return out;
}
