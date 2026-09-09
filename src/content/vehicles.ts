// What can be boarded, and what it makes crossable.
//
// The one part of the making layer that changes where a player can go rather than what they
// are holding. A vehicle's whole content is `crosses`: a list of biomes it can travel over,
// which is `affords: ["cross"]` said at the scale of a journey rather than a step.
//
// **One vehicle is now boardable, and it is a convenience rather than a gate.** This comment used
// to say nothing here changed where a player could go, and to leave the reason open. The reason
// is settled now, by measurement rather than by taste:
//
// `isWalkable` in `world/generate.ts` returns true for **any** tile carrying `track`, so the whole
// Lodestone Line -- all 64 tracked tiles, all 22 of the rail span -- is already walkable end to
// end. A carriage therefore cannot unlock ground, because there is no ground on the line that
// walking does not already reach. The alternative, making the rail unwalkable so the ride is
// required, puts a gate in front of a cozy game's only journey; that is the design decision this
// file declined before and still declines.
//
// So `rideFrom` below is a **faster way across a span you can already walk**. Walking it still
// works and still costs what it costs. That is the whole mechanic, and it is the honest one:
// *a crossing you can walk end to end is a bridge; one you ride is a railway*, and what makes the
// difference here is the clock rather than the map.
//
// The boats remain unwired for the older reason, unchanged: `crosses` says what water a hull can
// take, and nothing yet asks.
//
// Pure and free of React and Phaser.

import { type Vehicle, material, vehicles } from './making';
import { type Satchel, count } from './satchel';
import { canBoardAt, trackRoute } from '../world/crossing';
import type { BiomeId, Point, World } from '../world/types';

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
 * `sea` was the whole answer for a long time -- the only biome in `data/biomes.json` that is not
 * walkable, and so the only ground where a boat is the difference between arriving and not.
 *
 * **The Aravali added two more**, and with them the first reason to board anything. `sky_underside`
 * is unwalkable by nature, and `open_sky` is what the lodestone line hangs in. A crossing that a
 * player can walk end to end is a bridge; one they ride is a railway, and the difference is this
 * function having more than one answer.
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


// --- riding the line ------------------------------------------------------

/**
 * What riding costs against walking the same distance, as a share of it.
 *
 * A quarter. The number is a tuning choice and lives here rather than in the scene for the reason
 * `content/tiers.ts` gives about the resource layer: a number the walk is balanced by belongs
 * beside the rule it balances, not in the file that happens to draw the result.
 *
 * It is a share rather than a fixed saving because `travelTimeMs` already charges by the tile, so
 * a longer line should save more. What it must not be is zero: a ride that costs no daylight makes
 * the far island free, and the whole point of the clock is that a day has an end.
 */
export const RIDE_SHARE = 0.25;

/** A ride that could be taken from where the traveller is standing. */
export interface Ride {
  /** The carriage that runs this line. */
  readonly vehicle: Vehicle;
  /** Where the traveller boards -- the tile they are on. */
  readonly from: Point;
  /** The far station, where they get off. */
  readonly to: Point;
  /** How many tiles of line are covered, for the clock and for the sentence. */
  readonly tiles: number;
}

/**
 * The carriage that runs on a line, derived rather than named.
 *
 * **Not a hardcoded id, for the same reason `railSpan` derives the span**: a fact stored in two
 * places is a fact waiting to disagree. The line calls at the islands, so the craft that runs it
 * is the one canon says can travel over them.
 *
 * On the Aravali that resolves to the Lodestone carriage, which is the only vehicle in canon whose
 * `crosses` includes `sky_island`.
 */
export function carriageFor(world: World, route: readonly Point[]): Vehicle | null {
  const grounds = new Set(route.map((p) => world.tiles[p.y]?.[p.x]?.biome).filter(Boolean));
  // The stations are the solid ground the line calls at; the rest of the run is what it hangs over.
  for (const ground of ['sky_island', 'coast', 'plains', 'settlement'] as const) {
    if (!grounds.has(ground)) continue;
    const found = vehicles.find((v) => v.crosses.includes(ground));
    if (found) return found;
  }
  return null;
}

/**
 * Where the traveller would be carried, boarding here -- or null if they cannot board.
 *
 * **`crosses` is deliberately not consulted for the ground under the rail, and that is the trap
 * this function exists to avoid.** Measured on the Aravali, the rail span is 10 tiles of `sea`,
 * 3 of `sky_underside` and 9 of `sky_island`; the Lodestone carriage's canon `crosses` list is
 * `open_sky, sky_island, coast, plains, settlement`. Asking "can this vehicle cross the biome
 * under it" therefore refuses to run the Lodestone carriage on the Lodestone Line over 13 of its
 * own 22 tiles.
 *
 * That is not a canon error to go and fix. It is the same insight `Tile.track` was introduced for:
 * **the line is a flag, not a biome**, and a carriage on rails travels on the rails rather than on
 * whatever is underneath them. So boarding asks `canBoardAt`, which already knows the difference
 * between standing on the line and standing on a rope ladder at the bottom of it.
 *
 * The destination is the far end: whichever boardable tile of the route is furthest from here.
 * On the Aravali that is a station at each end of the strait -- nine boardable tiles in two
 * clusters, y23-25 on one island and y39-44 on the other.
 */
export function rideFrom(world: World, at: Point): Ride | null {
  if (!canBoardAt(world, at)) return null;

  const route = trackRoute(world);
  if (route.length === 0) return null;

  const stations = route.filter((p) => canBoardAt(world, p));
  if (stations.length === 0) return null;

  const away = (p: Point) => Math.abs(p.x - at.x) + Math.abs(p.y - at.y);
  const to = stations.reduce((best, p) => (away(p) > away(best) ? p : best), stations[0]!);
  // Standing at the far station already: there is nowhere for this ride to go.
  if (to.x === at.x && to.y === at.y) return null;

  const vehicle = carriageFor(world, route);
  if (!vehicle) return null;

  return { vehicle, from: at, to, tiles: away(to) };
}
