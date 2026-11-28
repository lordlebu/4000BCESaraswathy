import { art, artCount } from './art';

/** The assigned activity painting. Seeded takes depict the same activity. */
export function sceneFor(
  gesture: string,
  variant?: string | null,
  pick = 0,
  moment?: NightMoment | null,
  ground?: string | null,
  placeId?:string|null
): string | null {
  const key = sceneKey(gesture, variant, moment, ground, placeId);
  return key ? art('scenes', key, pick) : null;
}

/** The asset key selected by this activity and its circumstances. */
export function sceneKey(
  gesture: string,
  variant?: string | null,
  moment?: NightMoment | null,
  ground?: string | null,
  placeId?:string|null
): string | null {
  if (gesture === 'rest') {
    if (placeId === 'poi_northwest_cave_camp') return moment ? `rest-windward-cave-${moment}` : null;
    if (variant === 'none') return moment ? `rest-none-${moment}` : null;
    if (variant === 'bedroll' && moment && ground && NIGHT_GROUND_GROUP[ground] === 'high') {
      return ground === 'snow' && moment === 'midnight' ? 'rest-bedroll-snow-midnight' : `rest-bedroll-high-${moment}`;
    }
    return variant ? `rest-${variant}` : 'rest';
  }
  if (!variant || (gesture === 'work' && variant === 'knapping')) return gesture;
  const groundScenes = gesture === 'stoop' ? ['coast', 'forest', 'high', 'plains', 'sky_island']
    : gesture === 'work' ? ['coast', 'high', 'river'] : [];
  const group = GROUND_GROUP[variant];
  const subject = group && groundScenes.includes(group) ? group : variant;
  return `${gesture}-${subject}`;
}

export type NightMoment = 'midnight' | 'dawn';
export const NIGHT_MOMENTS: readonly NightMoment[] = ['midnight', 'dawn'];

/** Activities on climbing ground share the same subject. */
export const GROUND_GROUP: Readonly<Record<string, string>> = {
  hills: 'high',
  mountains: 'high',
  snow: 'high',
  // The underside of a floating island is a rock face with roots hanging off it: climbed, not
  // walked. The top of one is not, and has its own painting.
  sky_underside: 'high'
};

/** A night on a sky island uses the high-ground bedroll scene. */
export const NIGHT_GROUND_GROUP: Readonly<Record<string, string>> = { ...GROUND_GROUP, sky_island: 'high' };

/** How many exist. Used by a test, to keep the loader honest about an empty folder. */
export function sceneCount(): number {
  return artCount('scenes');
}
