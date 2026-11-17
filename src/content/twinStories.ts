/** Shared presentation rules for the permanent cave household and optional Harappa bust. */
export const CAVE_POI = 'poi_northwest_cave_camp';
export const KANG_ARC = 'storyline_twin_kang_bust';
export const KANG_DONE = `story:${KANG_ARC}:unveiling`;
export function bustStage(flags:readonly string[]):number|null{
  if(flags.includes(KANG_DONE))return 2;
  if(flags.includes(`story:${KANG_ARC}:prepare`))return 1;
  if(flags.includes(`story:${KANG_ARC}:commission`))return 0;
  return null;
}
/** One intermittent helper, with quiet days between visits. Both named residents stay at this POI. */
export function caveHelperPresent(npcId:string,day:number):boolean{
  const phase=((Math.floor(day)%6)+6)%6;
  if(npcId==='npc_cave_cook')return phase===0||phase===1;
  if(npcId==='npc_cave_herder')return phase===3||phase===4;
  return true;
}
