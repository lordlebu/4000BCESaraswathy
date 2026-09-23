// Paddling: when the traveller is in the dugout, and what the water costs then.
//
// The owner's rulings, which this file is the whole of: the dugout is in the kit from the start on
// Lothal; stepping from a bank into the river puts you in it, with no button; stepping onto dry land
// puts you back on foot. It is Pokemon's Surf -- a mounted state entered at the water's edge and left
// on land -- rather than the lodestone train, which carries you along a fixed line.
//
// Free of Phaser, so `test/afloat.test.ts` holds the rules without a browser.

import { stepCostOn } from '../content/species';
import type { Tile } from '../world/types';

/**
 * What a paddled step costs: the fastest going on the map, quicker than a road (0.75). A river on
 * foot is 3; the same channel in the dugout is this.
 */
export const PADDLE_STEP = 0.5;

/**
 * Water the dugout travels on. Canon's `crosses` for it is river, wetland and coast -- coast being
 * the beach you land on, so reaching it is stepping ashore rather than paddling across sand.
 *
 * **A bridge is not paddled.** Paddling onto one is landing on it, which is also how the drawing
 * stays honest: a canoe drawn over a deck would be sitting on the planks.
 */
export function paddleable(tile: Pick<Tile, 'biome' | 'bridge'>): boolean {
  return (tile.biome === 'river' || tile.biome === 'wetland') && !tile.bridge;
}

/**
 * Whether the traveller is in the dugout after stepping onto `to`.
 *
 * Boarding is from a bank into the *river* only. A swamp is walkable at ankle depth, and turning
 * every step into marsh into a launch would take away the choice to wade it; once afloat, the
 * dugout carries on through swamp as well, because it can.
 */
export function afloatAfter(afloat: boolean, to: Pick<Tile, 'biome' | 'bridge'>, hasBoat: boolean): boolean {
  if (!hasBoat) return false;
  if (afloat) return paddleable(to);
  return to.biome === 'river' && !to.bridge;
}

/** What one step onto `to` costs, given whether it will be paddled. */
export function stepCostAfloat(to: Pick<Tile, 'biome' | 'road' | 'bridge'>, afloat: boolean, hasBoat: boolean): number {
  return afloatAfter(afloat, to, hasBoat) ? PADDLE_STEP : stepCostOn(to);
}

/**
 * The cost a tap-to-walk route prices a tile at.
 *
 * A route is planned before it is walked, so it cannot know which steps will be afloat. With the
 * dugout in the kit a river is always quick -- stepping in boards -- and a swamp is quick only if
 * the walk starts afloat, which is the case this can see. Close enough to send a tap along the
 * channel rather than round it, which is the point.
 */
export function routeCost(tile: Pick<Tile, 'biome' | 'road' | 'bridge'>, hasBoat: boolean, startsAfloat: boolean): number {
  if (hasBoat && tile.biome === 'river' && !tile.bridge) return PADDLE_STEP;
  if (hasBoat && startsAfloat && tile.biome === 'wetland') return PADDLE_STEP;
  return stepCostOn(tile);
}
