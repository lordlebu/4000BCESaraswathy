// What can be boarded, and what it makes crossable.
//
// The one part of the making layer that changes where a player can go rather than what they
// are holding. A vehicle's whole content is `crosses`: a list of biomes it can travel over,
// which is `affords: ["cross"]` said at the scale of a journey rather than a step.
//
// **This does not move anybody yet, and says so.** Canon's field maps have declared
// `neighbours` since the second map shipped — Lothal names Narmada, Narmada names Lothal —
// and nothing in the game has ever used the edge. A vehicle is the reason that edge would be
// used, so this file answers the questions a travel screen would ask, and the travel screen
// is not built. That is a deliberate stopping point rather than an omission: the rules layer
// is where this repo puts a mechanic first, and the three times a rule shipped with no caller
// are recorded at the top of `journey.ts` as the thing to avoid. So the test for this file
// covers what it claims and nothing pretends the crossing happens.
//
// Pure and free of React and Phaser.

import { type Vehicle, material, vehicles } from './making';
import { type Satchel, count } from './satchel';
import type { BiomeId } from '../world/types';

export { vehicles };

/** Whether this craft can travel over that ground. */
export function crosses(vehicleId: string, biome: BiomeId): boolean {
  return vehicles.find((v) => v.id === vehicleId)?.crosses.includes(biome) ?? false;
}

/** Everything that could carry a traveller over this ground. */
export function forBiome(biome: BiomeId): Vehicle[] {
  return vehicles.filter((v) => v.crosses.includes(biome));
}

/**
 * Biomes a traveller could reach with this craft that walking cannot manage.
 *
 * `sea` is the whole answer today and will stay the interesting one: it is the only biome in
 * `data/biomes.json` that is not walkable, so it is the only ground where a boat is the
 * difference between arriving and not.
 */
export function opensUp(vehicleId: string, walkable: ReadonlySet<string>): BiomeId[] {
  const v = vehicles.find((x) => x.id === vehicleId);
  return v ? v.crosses.filter((b) => !walkable.has(b)) : [];
}

/**
 * What is still needed to build one, as material ids and shortfalls.
 *
 * Vehicles are described by their materials rather than by a recipe -- canon gives them
 * `materials` and a `built_by` process, and stops short of an ingredient list with counts.
 * That is honest: canon knows a dhow is teak, husk and pitch, and does not know how much.
 * So this answers "have you seen all of what it takes", which is a real question a panel can
 * ask, and does not invent quantities to make it look like a recipe.
 */
export function missingFor(satchel: Satchel, vehicleId: string): string[] {
  const v = vehicles.find((x) => x.id === vehicleId);
  if (!v) return [];
  return v.materials.filter((m) => count(satchel, m) < 1);
}

/** Whether the traveller has at least one of everything a craft is made of. */
export function couldBuild(satchel: Satchel, vehicleId: string): boolean {
  const v = vehicles.find((x) => x.id === vehicleId);
  return Boolean(v) && missingFor(satchel, vehicleId).length === 0;
}

/**
 * A craft described the way a person would describe it.
 *
 * Named materials rather than ids, because the interesting fact about a coracle is that it
 * is a basket with a skin over it.
 */
export function describe(vehicleId: string): string | null {
  const v = vehicles.find((x) => x.id === vehicleId);
  if (!v) return null;
  const made = v.materials.map((m) => material(m)?.name ?? m).join(', ').toLowerCase();
  const who = v.capacity ? ` Carries ${v.capacity}.` : '';
  return made ? `${v.name}: ${made}.${who} ${v.description}` : `${v.name}. ${v.description}`;
}
