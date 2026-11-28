export const TWIN_MAP = 'field_map_twins';

export function twinWorldSeed(seed: string): string {
  return seed.startsWith('twins:') ? seed : `twins:${seed}`;
}
