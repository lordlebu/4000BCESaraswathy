// Where a road crosses a river, a bridge -- if the water is narrow enough to build one.
//
// A route that meets water used to be marked `ford` on every wet tile, and drawn as stepping
// stones. That was right while routes ran *down* channels, because a river cost what plains cost:
// Lothal's routes put 41 tiles a seed in the water, one stretch 27 long, and nobody bridges 27
// tiles of river. Once a river became slow going on foot (cost 3), routes cross where the water is
// narrowest -- measured, every Lothal crossing is one to three tiles -- and that is exactly where a
// bridge goes.
//
// So the rule is a span: a run of river the road crosses, **three tiles or fewer, is bridged**;
// anything wider stays a ford. That is the city-builder rule (Cities: Skylines and Banished place a
// bridge on the short wet run of a road), sized to what one crew with timber could span.
//
// A bridge is also straight: a crossing that turns mid-stream, as routes do over a diagonal river,
// stays a ford.
//
// Two things are never bridged:
//
//   * **`sky_water`.** The pools on the floating islands keep their own crossing and their own art;
//     the island art is kept separate from the ground's on purpose.
//   * **A ford canon names.** The Nomad Ground sits "on shingle above a ford", and a bridge built
//     over that ford would contradict the place it is beside. The crossing nearest it stays a ford.

import type { Point, Tile, World } from './types';

/** The widest river a road bridges, in tiles. Wider than this, the road fords it. */
export const MAX_SPAN = 3;

/**
 * Places canon says stand at a ford, whose nearby crossing must stay one.
 *
 * By id, because canon says it in prose (`poi_nomad_ground`: shingle above a ford) rather than in a
 * field. If a second place ever needs this, it is worth a canon field; one is not.
 */
export const FORDED_PLACES: ReadonlySet<string> = new Set(['poi_nomad_ground']);

/** How near a ford a place must be to claim it, in tiles (Manhattan). */
const FORD_CLAIM = 6;

/**
 * Turn the short river crossings on the road into bridges, in place.
 *
 * Reads `ford` and writes `bridge`: a bridged tile loses `ford`, so a tile is always exactly one of
 * the three road surfaces or none. Returns the bridged tiles, grouped by span.
 */
export function bridgeTheCrossings(world: World, fordPlaces: readonly Point[] = []): Point[][] {
  const { tiles, width, height } = world;
  const seen = new Set<string>();
  const spans: Point[][] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = tiles[y]![x]!;
      if (!isRiverFord(start) || seen.has(`${x},${y}`)) continue;

      // One crossing: the connected run of forded river the road walks through here.
      const run: Tile[] = [];
      const stack = [start];
      seen.add(`${x},${y}`);
      while (stack.length) {
        const here = stack.pop()!;
        run.push(here);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const next = tiles[here.y + dy]?.[here.x + dx];
          if (!next || !isRiverFord(next) || seen.has(`${next.x},${next.y}`)) continue;
          seen.add(`${next.x},${next.y}`);
          stack.push(next);
        }
      }

      if (run.length > MAX_SPAN) continue;
      // **Straight, or not a bridge.** Where a river runs diagonally the route's grid steps turn
      // inside the water, and the run comes out as an L or a staircase -- measured on Narmada as
      // three tiles bending round a corner mid-stream. A deck does not turn in the middle of a
      // river, so a crossing that does stays a ford.
      const straight = run.every((t) => t.y === run[0]!.y) || run.every((t) => t.x === run[0]!.x);
      if (!straight) continue;
      const claimed = run.some((t) =>
        fordPlaces.some((p) => Math.abs(p.x - t.x) + Math.abs(p.y - t.y) <= FORD_CLAIM)
      );
      if (claimed) continue;

      for (const t of run) {
        t.ford = false;
        t.bridge = true;
      }
      spans.push(run.map((t) => ({ x: t.x, y: t.y })));
    }
  }
  return spans;
}

function isRiverFord(tile: Tile): boolean {
  return tile.ford === true && tile.biome === 'river';
}
