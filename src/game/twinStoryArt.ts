import type {FieldMapWorld} from '../world/fieldMap';
/** Reserve a quiet corner of the actual restored courtyard, clear of roots and routes. */
export function bustSite(built:FieldMapWorld):{x:number;y:number}|null{
 const court=built.placed.find(p=>p.poi.id==='poi_harappa_court');
 if(!court)return null;
 for(const [dx,dy]of [[3,1],[3,0],[-3,1],[-3,0]]){
  const x=court.at.x+dx!,y=court.at.y+dy!,t=built.world.tiles[y]?.[x];
  if(t?.biome==='settlement'&&!t.road&&!t.track&&!built.placed.some(p=>p.at.x===x&&p.at.y===y))return{x,y};
 }
 return null;
}
