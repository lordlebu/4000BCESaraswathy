/** Shared presentation rules for the permanent cave household and optional Harappa bust. */
export const CAVE_POI = 'poi_northwest_cave_camp';
export const CAVE_REST_LABEL = 'Stay the night in the cave';
export const KANG_ARC = 'storyline_twin_kang_bust';
export const KANG_DONE = `story:${KANG_ARC}:unveiling`;
export function bustStage(flags:readonly string[]):number|null{
  if(flags.includes(KANG_DONE))return 2;
  if(flags.includes(`story:${KANG_ARC}:prepare`))return 1;
  if(flags.includes(`story:${KANG_ARC}:commission`))return 0;
  return null;
}
/** The herder visits on days three and four of each six-day cycle. */
export function caveHerderIsVisiting(day: number): boolean {
  const phase = day % 6;
  return phase === 3 || phase === 4;
}
