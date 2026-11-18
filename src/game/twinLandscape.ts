import {tileHash} from '../world/rng';
import {band} from '../world/classify';
import {decorFrame,depthFor,ROW_SLOT} from './frames';
import {planHighlandLife} from './twinHighlandLife';
import type {FieldMapWorld} from '../world/fieldMap';
import type {Placement} from './scenePlan';

const STRUCTURES=new Set(['twinHouses','twinHousesDetail','twinHomesPainted','twinObjects',
  'twinDetails','twinCourtyard','twinEnvironment','twinStories','twinCaveProps','twinHighlandForms','twinShrubs','twinHighlandLife']);
const GROUND=new Set(['desert','hills','plains','coast','wetland','river','forest','mountains','snow']);
const STEP=[[0,-1],[1,0],[0,1],[-1,0]] as const;
export const MAX_TWIN_SHRUBS=160;
export const MAX_TWIN_GROUND_DECOR=280;

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
  const out=[...faces],candidates:Placement[]=[];
  const chosen=new Set<string>();
  for(const p of decor){
    const key=`${p.x},${p.y}`;
    const t=built.world.tiles[p.y]?.[p.x];
    const density=({plains:3,wetland:2,forest:2,hills:4,coast:4,mountains:6,snow:8,river:9} as Record<string,number>)[t?.biome??'']??7;
    const hash=tileHash(built.world.seed,p.x,p.y,'twin-ground-detail');
    if(!allowed(p)||occupied.has(key)||chosen.has(key)||hash%density!==0)continue;
    // Leaf/twig motifs from the older forest scatter belong on moist highland turf too.
    const leaf=t!.moisture>.5&&['plains','hills'].includes(t!.biome)&&hash%6===0;
    candidates.push(leaf?{...p,frame:decorFrame('leaf-litter',hash)!}:p);chosen.add(key);
  }
  const rank=(p:{x:number;y:number})=>tileHash(built.world.seed,p.x,p.y,'twin-detail-budget');
  candidates.sort((a,b)=>rank(a)-rank(b)||a.y-b.y||a.x-b.x);
  for(const p of candidates.slice(0,MAX_TWIN_GROUND_DECOR)){out.push(p);occupied.add(`${p.x},${p.y}`);}
  for(const row of built.world.tiles)for(const t of row){
    const hash=tileHash(built.world.seed,t.x,t.y,'twin-dry-plant'),key=`${t.x},${t.y}`;
    if(!allowed(t)||occupied.has(key)||t.biome!=='desert'||hash%37!==0)continue;
    out.push({sheet:'twinDryProps',frame:(hash>>>8)%4,x:t.x,y:t.y,depth:depthFor(t.y,ROW_SLOT.undergrowth)});
  }
  return [...out,...planTwinShrubs(built,clear),...planHighlandLife(built,clear,new Set(out.map(p=>`${p.x},${p.y}`)))];
}

/** Low repeated silhouettes mark a drop; half-size pairs soften grass/desert seams with gaps at routes. */
export function planTwinShrubs(built:FieldMapWorld,clear:ReadonlySet<string>):Placement[]{
  const {world}=built;
  if(!world.twinRegion)return [];
  const groups:{rank:number;plants:Placement[]}[]=[];
  for(const row of world.tiles)for(const t of row){
    if(clear.has(`${t.x},${t.y}`)||t.road||t.track||t.bridge||!['plains','hills','forest','mountains','wetland'].includes(t.biome))continue;
    const hash=tileHash(world.seed,t.x,t.y,'twin-shrub');
    const borders=STEP.filter(([dx,dy])=>t.biome==='plains'&&world.tiles[t.y+dy]?.[t.x+dx]?.biome==='desert');
    const cliffs=STEP.filter(([dx,dy])=>{
      const next=world.tiles[t.y+dy]?.[t.x+dx];
      return next&&!['river','sea','wetland'].includes(next.biome)&&band(t.elevation)>band(next.elevation);
    });
    const banks=t.biome==='wetland'&&hash%9===0?STEP.filter(([dx,dy])=>world.tiles[t.y+dy]?.[t.x+dx]?.biome==='river'):[];
    const edges=borders.length?borders:cliffs.length?cliffs:banks;
    if(!edges.length||(!borders.length&&!banks.length&&hash%3===0))continue;
    const [dx,dy]=edges[(hash>>>8)%edges.length]!;
    const frame=t.biome==='wetland'?3:t.moisture<.2||t.biome==='mountains'?1:t.biome==='forest'||(t.moisture>.5&&hash%5===0)?2:hash%3===0?1:0;
    const plants=(borders.length?[-.17,.17]:[0]).map(along=>({sheet:'twinShrubs' as const,
      frame,x:t.x,y:t.y,scale:borders.length ? .5 : banks.length ? .75 : 1,
      offset:{x:dx*.32+(dy?along:0),y:dy*.32-.45+(dx?along:0)},
      depth:depthFor(t.y+dy*.32-.45,ROW_SLOT.undergrowth)}));
    groups.push({rank:hash,plants});
  }
  groups.sort((a,b)=>a.rank-b.rank);
  const out:Placement[]=[];
  for(const group of groups)if(out.length+group.plants.length<=MAX_TWIN_SHRUBS)out.push(...group.plants);
  return out;
}
