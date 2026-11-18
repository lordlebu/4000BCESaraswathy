import {tileHash} from '../world/rng';
import {planCaveProps} from './caveCamp';
import type {FieldMapWorld} from '../world/fieldMap';
import type {Point} from '../world/types';

export const MAX_TWIN_RIPPLES=96;
export const MAX_TWIN_HAZE=12;
export const TWIN_RIPPLE_MS=900;

/** Cached presentation only. The saved water network and transport remain authoritative. */
export function planTwinAtmosphere(built:FieldMapWorld):{ripples:Point[];haze:Point[];hearth:Point|null}{
  const {world}=built;
  if(!world.twinRegion)return {ripples:[],haze:[],hearth:null};
  const rank=(p:Point)=>tileHash(world.seed,p.x,p.y,'twin-water-motion');
  const ripples=world.tiles.flat().filter(t=>t.biome==='river'&&!t.bridge&&!t.road&&!t.track&&rank(t)%4===0)
    .sort((a,b)=>rank(a)-rank(b)).slice(0,MAX_TWIN_RIPPLES).map(({x,y})=>({x,y}));
  const haze:Point[]=[];
  const dry=(p:Point)=>{
    const t=world.tiles[p.y]?.[p.x];
    return t?.biome==='desert'&&!t.road&&!t.track&&!t.bridge
      &&[[0,-1],[1,0],[0,1],[-1,0]].every(([dx,dy])=>world.tiles[p.y+dy!]?.[p.x+dx!]?.biome==='desert');
  };
  for(const id of ['poi_desert_ground','poi_dune_windbreak']){
    const centre=built.placed.find(p=>p.poi.id===id)?.at;
    if(!centre)continue;
    // The stop itself can be a sandy hollow in rock. Find nearby open sand, rather than
    // forcing a mist tile onto that rock, a road or the grass/desert seam.
    const candidates:Point[]=[];
    for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){
      const p={x:centre.x+dx,y:centre.y+dy};if(dry(p))candidates.push(p);
    }
    const distance=(p:Point)=>(p.x-centre.x)**2+(p.y-centre.y)**2;
    candidates.sort((a,b)=>distance(a)-distance(b)||rank(a)-rank(b));
    const focus=candidates[0];if(!focus)continue;
    for(const dy of [-1,0])for(const dx of [-1,0,1]){
      const p={x:focus.x+dx,y:focus.y+dy};
      if(!dry(p)||haze.some(q=>q.x===p.x&&q.y===p.y))continue;
      // A whole dry-cell margin keeps the drifting edge away from grass and water.
      haze.push(p);
    }
  }
  const fire=planCaveProps(built).find(p=>p.frame===2||p.frame===5);
  return {ripples,haze:haze.slice(0,MAX_TWIN_HAZE),hearth:fire?{x:fire.x,y:fire.y}:null};
}
