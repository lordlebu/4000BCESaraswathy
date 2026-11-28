import { artCount, art } from './art';

/** The exact painted item or material. */
export function thingArt(id: string): string | null {
  return art('things', id);
}

/** How many exist. Used by a test, to keep the loader honest about an empty folder. */
export function thingArtCount(): number {
  return artCount('things');
}
