export type TwinGeneration = 1 | 2;

/** Newly created journeys pin this version. Unversioned seed links still mean version 1. */
export const NEW_TWIN_GENERATION: TwinGeneration = 2;
export const TWIN_MAP = 'field_map_twins';

export function twinWorldSeed(seed: string): string {
  return seed.startsWith('twins:') ? seed : `twins:${seed}`;
}

export function twinGenerationFor(
  saved: TwinGeneration | undefined,
  link: string | null,
  fresh: boolean
): TwinGeneration {
  return saved ?? (link === '2' ? 2 : link === '1' ? 1 : fresh ? NEW_TWIN_GENERATION : 1);
}
