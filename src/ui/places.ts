import { artCount, preferredArt } from './art';

/** The approved view of this place, when one is assigned. */
export function placeArt(poiId: string): string | null {
  return preferredArt('places', poiId);
}

/** How many exist. Used by a test, to keep the loader honest about an empty folder. */
export function placeArtCount(): number {
  return artCount('places');
}
