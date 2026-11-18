import { allNpcs } from '../content/places';
import { TWIN_PEOPLE } from '../content/twinPeople';
import { travellersOn } from '../content/travellers';
import { caveHelperPresent } from '../content/twinStories';
import { isWalkable } from '../world/generate';
import type { FieldMapWorld } from '../world/fieldMap';
import type { Placement } from './scenePlan';

const SOLID = new Set(['twinHouses','twinHousesDetail','twinHomesPainted','twinObjects',
  'twinDetails','twinCourtyard','twinEnvironment','twinStories','twinCaveProps','twinHighlandForms','twinShrubs','twinHighlandLife']);
const SPOTS = [[0,1],[-1,1],[1,1],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1]];
for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
  if(Math.max(Math.abs(dx),Math.abs(dy))===2)SPOTS.push([dx,dy]);
}
export interface TwinResident { npcId:string; art:string; x:number; y:number; frame:number }

/** Residents start beside one actual authored workplace. Circuit walkers are
 * already drawn by TravellerView and are never duplicated here. Figures add no collision;
 * caveCamp supplies the two cave walking routes. Saved maps use their restored POI anchors.
 */
export function planTwinResidents(built:FieldMapWorld,scenery:readonly Placement[],day=0):TwinResident[]{
  if(!built.world.twinRegion)return [];
  const walking=new Set(travellersOn(built.fieldMap.id,built.world.seed).map(t=>t.npcId));
  const anchors=new Map(built.placed.map(p=>[p.poi.id,p.at]));
  const occupied=new Set(built.placed.map(p=>`${p.at.x},${p.at.y}`));
  const cave=anchors.get('poi_northwest_cave_camp');if(cave)occupied.add(`${cave.x},${cave.y+1}`);
  for(const p of scenery)if(SOLID.has(p.sheet))occupied.add(`${p.x},${p.y}`);
  const out:TwinResident[]=[];
  for(const person of allNpcs()){
    const art=TWIN_PEOPLE[person.id];
    if(!art||walking.has(person.id)||!caveHelperPresent(person.id,day))continue;
    const home=person.foundAt.map(id=>anchors.get(id)).find(at=>at!==undefined);
    if(!home)continue;
    const preferred:Record<string,number[][]>={npc_mirlepa:[[-1,0]],npc_yamantaka:[[2,1]],npc_cave_cook:[[-1,2]],npc_cave_herder:[[1,2]]};
    for(const [dx,dy] of [...(preferred[person.id]??[]),...SPOTS]){
      const x=home.x+dx!,y=home.y+dy!,tile=built.world.tiles[y]?.[x],key=`${x},${y}`;
      if(!tile||!isWalkable(tile)||['river','sea','wetland'].includes(tile.biome)
        ||tile.road||tile.track||tile.bridge||occupied.has(key))continue;
      const facing=dy!>0?4:dy!<0?0:dx!>0?12:8;
      // Kang's generated walking rows follow the shared down/up/right/left contract.
      const kangFacing=dy!>0?0:dy!<0?4:dx!>0?8:12;
      out.push({npcId:person.id,art,x,y,frame:art==='priest-kang'?kangFacing:art==='mirlepa'?16+facing/4:art==='yamantaka'?0:facing});
      occupied.add(key);
      break;
    }
  }
  return out;
}
