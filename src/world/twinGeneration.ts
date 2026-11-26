export type TwinGeneration = 1 | 2;

/** Once the new valley passes visual review, newly created journeys pin version 2. */
export const NEW_TWIN_GENERATION: TwinGeneration = 1;

export function twinGenerationFor(
  saved: TwinGeneration | undefined,
  link: string | null,
  fresh: boolean
): TwinGeneration {
  return saved ?? (link === '2' ? 2 : link === '1' ? 1 : fresh ? NEW_TWIN_GENERATION : 1);
}
