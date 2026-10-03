// Paddling: when the traveller is in the dugout, and what the water costs then.
//
// The owner's rulings, which this file is the whole of: on Lothal, once Thrali has lent the dugout
// (from the third day, `content/firsts.ts` -- it was in the kit from the start until 3 October 2026),
// stepping from a bank into the river or off the beach into the shallows puts you in it, with no
// button; stepping onto dry land puts you back on foot. It is Pokemon's Surf -- a mounted state entered at the water's edge and left
// on land -- rather than the lodestone train, which carries you along a fixed line.
//
// Free of Phaser, so `test/afloat.test.ts` holds the rules without a browser.

import { stepCostOn } from '../content/species';
import { isWalkable } from '../world/generate';
import type { Tile, World } from '../world/types';

/**
 * What a paddled step costs: the fastest going on the map, quicker than a road (0.75). A river on
 * foot is 3; the same channel in the dugout is this.
 */
export const PADDLE_STEP = 0.5;

/**
 * How far out from land the dugout may go: the sea within this many tiles of the shore, counted the
 * way a king moves. **The owner's ruling, 3 October 2026**: the shallows are the swamps and the
 * first one or two tiles off the beach. Two, because one is a single row the hull hugs the sand
 * along, and two is somewhere to be.
 */
export const SHALLOW_REACH = 2;

/**
 * The sea tiles a dugout may be on, for one map.
 *
 * **The first time anything stands on the sea**, so it is a set the scene asks, never a change to
 * `isWalkable`: the sea is still not walkable for anybody, and every traveller, camp, visitor and
 * route that reads `isWalkable` keeps exactly the answer it had. Only the traveller in the dugout
 * reads this. "Land" is any walkable tile, so a reach of sea against a bank of plains is shallows as
 * well as one against a beach.
 */
export function shallowsOf(world: Pick<World, 'tiles' | 'width' | 'height'>): Set<Tile> {
  const out = new Set<Tile>();
  const { tiles, width, height } = world;
  const land = (x: number, y: number): boolean => {
    const t = tiles[y]?.[x];
    return Boolean(t && t.biome !== 'sea' && isWalkable(t));
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tile = tiles[y]![x]!;
      if (tile.biome !== 'sea') continue;
      search: for (let dy = -SHALLOW_REACH; dy <= SHALLOW_REACH; dy += 1) {
        for (let dx = -SHALLOW_REACH; dx <= SHALLOW_REACH; dx += 1) {
          if (land(x + dx, y + dy)) {
            out.add(tile);
            break search;
          }
        }
      }
    }
  }
  return out;
}

/**
 * Water the dugout travels on: river, swamp, and the shallows off the shore. Canon's `crosses` for
 * it is river, wetland and coast -- coast being the beach you land on, so reaching it is stepping
 * ashore rather than paddling across sand. `shallow` is the scene's answer from `shallowsOf`.
 *
 * **A bridge is not paddled.** Paddling onto one is landing on it, which is also how the drawing
 * stays honest: a canoe drawn over a deck would be sitting on the planks.
 */
export function paddleable(tile: Pick<Tile, 'biome' | 'bridge'>, shallow = false): boolean {
  return shallow || ((tile.biome === 'river' || tile.biome === 'wetland') && !tile.bridge);
}

/**
 * Whether the traveller is in the dugout after stepping onto `to`.
 *
 * Boarding is from a bank into the *river*, or from the beach into the shallows -- the sea is not
 * walkable, so a step into it can only be a launch. A swamp is walkable at ankle depth, and turning
 * every step into marsh into a launch would take away the choice to wade it; once afloat, the
 * dugout carries on through swamp as well, because it can.
 */
export function afloatAfter(
  afloat: boolean,
  to: Pick<Tile, 'biome' | 'bridge'>,
  hasBoat: boolean,
  shallow = false
): boolean {
  if (!hasBoat) return false;
  if (afloat) return paddleable(to, shallow);
  return shallow || (to.biome === 'river' && !to.bridge);
}

/**
 * Whether the traveller may step onto `to` at all: walkable ground, or the shallows with a boat.
 * The scene's step and its routes ask this instead of `isWalkable`, and nothing else does.
 */
export function canStepOnto(to: Tile, hasBoat: boolean, shallow: boolean): boolean {
  return isWalkable(to) || (hasBoat && shallow);
}

/** What one step onto `to` costs, given whether it will be paddled. */
export function stepCostAfloat(
  to: Pick<Tile, 'biome' | 'road' | 'bridge'>,
  afloat: boolean,
  hasBoat: boolean,
  shallow = false
): number {
  return afloatAfter(afloat, to, hasBoat, shallow) ? PADDLE_STEP : stepCostOn(to);
}

/**
 * The cost a tap-to-walk route prices a tile at.
 *
 * A route is planned before it is walked, so it cannot know which steps will be afloat. With the
 * dugout in the kit a river is always quick -- stepping in boards -- and a swamp is quick only if
 * the walk starts afloat, which is the case this can see. Close enough to send a tap along the
 * channel rather than round it, which is the point.
 */
export function routeCost(
  tile: Pick<Tile, 'biome' | 'road' | 'bridge'>,
  hasBoat: boolean,
  startsAfloat: boolean,
  shallow = false
): number {
  if (hasBoat && shallow) return PADDLE_STEP;
  if (hasBoat && tile.biome === 'river' && !tile.bridge) return PADDLE_STEP;
  if (hasBoat && startsAfloat && tile.biome === 'wetland') return PADDLE_STEP;
  return stepCostOn(tile);
}
