// What kind of landmark stands at the end of the journey.
//
// The generator only decides *where* it is and what ground it stands on. This picks *what* it is,
// so that a shell beach never turns up in the mountains and a heron pool never turns up in a
// desert. Keeping the choice here rather than in `world/` is what lets the generator stay free of
// `data/*.json` — see the note on `Landmark.terrain` in `world/types.ts`.

import landmarkData from '../../data/landmarks.json';
import { tileHash } from '../world/rng';
import type { Landmark, TerrainBiomeId } from '../world/types';

/** One entry of `data/landmarks.json`. Hand-written, like `biomes.json`. */
export interface LandmarkKind {
  id: string;
  name: string;
  terrain: TerrainBiomeId[];
  /** What you see standing there. */
  description: string;
  /** The page written into the journal on arrival — the end of the session. */
  arrival: string;
}

export const landmarkKinds = landmarkData as LandmarkKind[];

/**
 * The kind of landmark suited to this ground.
 *
 * Falls back to the full list rather than throwing if a terrain has no match, because an
 * unexpected landmark reads better than a crash — and `test/landmarks.test.ts` asserts every
 * terrain the generator can produce has at least one real match, so the fallback should stay
 * unreachable.
 */
export function landmarkKindFor(landmark: Landmark, seed: string): LandmarkKind {
  const suited = landmarkKinds.filter((kind) => kind.terrain.includes(landmark.terrain));
  const pool = suited.length ? suited : landmarkKinds;
  return pool[tileHash(seed, landmark.x, landmark.y, 'landmark-kind') % pool.length]!;
}

/** "Hairuvan, the Great Banyan" — the invented name plus what it actually is. */
export function landmarkTitle(landmark: Landmark, seed: string): string {
  return `${landmark.name}, the ${landmarkKindFor(landmark, seed).name}`;
}
