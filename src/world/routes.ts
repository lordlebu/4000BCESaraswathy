// Easing the ground between the places worth reaching.
//
// The three rules a field map has to obey are: the rim is hard, the middle is easier, and **the
// places are reachable however far out they sit**. The first two are functions of position and
// the shapers in `landform.ts` handle them. The third is not a function of position at all -- it
// depends on where the content ended up -- so it cannot be done while generating terrain. It has
// to happen after placement.
//
// That inverts the usual order, and the inversion is the point:
//
//     generate terrain  ->  place the points of interest  ->  ease the routes between them
//
// A valley is therefore literally the path between two places, rather than a landform that a
// place happens to sit in. It is also exactly the line Phase 6 wants to draw on the map, which is
// not a coincidence: the road and the drawing of the road should be the same fact.

import { findPath } from './pathfind';
import { isWalkable } from './generate';
import type { BiomeId, Point, Tile } from './types';

/**
 * What each biome becomes when a route is eased through it.
 *
 * Softening rather than flattening: hills become the plains between them, forest opens to the
 * clearing a track would follow, mountains drop to a pass.
 *
 * **Wetland is no longer eased, and it used to become river.** That was the delta's answer while a
 * river cost what plains cost: you do not drain a marsh to cross it, you follow the channel. Once
 * a river became slow going on foot (cost 3, waist-deep), easing marsh *into* river made every
 * route across Lothal harder to walk rather than easier, and manufactured channels for the road to
 * run down -- 41 route tiles a seed in water, one stretch 27 tiles long. Following the channel is
 * now the dugout's job, which is canon's `vehicles` on Lothal. On foot the road crosses the marsh
 * as a path, which is what a raised track through reeds is.
 *
 * Sea, coast, settlement and landmark are absent deliberately. A route must not fill in water,
 * pave a beach, or overwrite authored ground.
 */
const EASED: Partial<Record<BiomeId, BiomeId>> = {
  mountains: 'hills',
  hills: 'plains',
  forest: 'plains',
  desert: 'plains'
};

/**
 * What crossing each biome costs, for choosing where a route runs.
 *
 * Duplicated from `data/biomes.json` rather than imported, because `world/` stays independent of
 * the content layer -- the same reason `isWalkable` is duplicated in `generate.ts`, and
 * `test/species.test.ts` asserts the two agree. Only the *ordering* matters here: a route should
 * prefer cheap ground, and a table that disagreed on absolute values would still pick the same
 * line.
 */
const CROSSING: Partial<Record<BiomeId, number>> = {
  coast: 1, plains: 1, settlement: 1, landmark: 1,
  forest: 2, wetland: 2, hills: 2, desert: 2,
  // River was 1, the same as plains, and routes ran *down* channels for it. At 3 a route crosses
  // water where it is narrowest instead, which is where a bridge can go.
  mountains: 3, river: 3
};

/** Cost of entering a tile, on the same scale the game uses. */
export function crossingCost(tile: Tile): number {
  return CROSSING[tile.biome] ?? 1;
}

/**
 * Whether a route may pass through this tile. `isWalkable`'s answer, asked of `isWalkable`.
 *
 * **This used to be `tile.biome !== 'sea'` with a comment saying it mirrored `isWalkable`, and the
 * mirror had gone two biomes stale.** `UNWALKABLE` grew `open_sky` and `sky_underside` when the
 * floating islands were stamped, and nothing here noticed -- so every tour on the Aravali has been
 * routed *through the underside of an island*, which is open air with rock hanging in it.
 *
 * It was invisible for two reasons that both stopped being true at once. Easing changes nothing
 * there, because `EASED` has no entry for either biome; and nothing drew the line, so a route
 * through solid rock cost nothing and showed nowhere. Drawing the road is what surfaced it, and
 * `test/road.test.ts` failed by name on `road at 22,57 is on sky_underside`.
 *
 * Duplicating the *rule* was never the problem -- `CLAUDE.md` is explicit that `world/` may not
 * import the content layer, and `crossingCost` above duplicates the travel costs for that reason.
 * Duplicating it as a **different expression of the same idea** was: a set membership on one side
 * and a single inequality on the other cannot drift loudly. Calling the function removes the copy
 * entirely, and `generate.ts` imports nothing from here, so there is no cycle to pay for it.
 */
export function routable(tile: Tile): boolean {
  return isWalkable(tile);
}

export interface EaseOptions {
  /**
   * How wide the eased corridor is, in tiles either side of the line.
   *
   * One, and deliberately narrow. A three-wide corridor between six places erases the map's
   * character -- the point is a track through difficult country, not a cleared plain.
   *
   * Wet maps take two. A delta's interior is marsh by definition, so no shaping can make it cheap,
   * and a one-wide thread through it reads as a scratch rather than as the way people move.
   * Measured: a delta at radius 1 leaves the interior at cost 1.84.
   *
   * This used to end "the whole point of the landform is that you follow the water", and the
   * easing turned marsh into river to make that true. It no longer does -- see `EASED` -- because a
   * river is slow going on foot now and following the water is the dugout's job. The wider corridor
   * still opens the forest and hills beside the track.
   */
  radius?: number;
  /** Cost of entering a tile, so routes are eased along the way somebody would actually walk. */
  costOf?: (tile: Tile) => number;
  /** Whether a tile can be walked at all. Routes never cross water. */
  isWalkable?: (tile: Tile) => boolean;
  /**
   * Tiles a route may pass through but must not change.
   *
   * The places themselves, and the landmark. Easing runs after placement -- it has to, since it
   * needs to know where the places ended up -- so without this it can soften the very tile a place
   * was placed on and leave it standing on terrain canon forbids. `poi_silted_granary landed on
   * river` was exactly that: the granary is authored for settlement or wetland, and the route to
   * it turned its own tile into a channel.
   */
  keep?: ReadonlySet<string>;
  /**
   * Which stops to join, as pairs of indices into `stops`. Absent means each stop to the next, the
   * chain the network used to be; `networkLegs` gives the tree-plus-loops it is now.
   */
  legs?: readonly (readonly [number, number])[];
}

/**
 * The two facts an ease produces, which are not the same fact.
 *
 * **`eased` is not the road, and the comment that said it was cost a phase.** It holds only the
 * tiles whose *biome changed* -- so a route running over ground that was already cheap touches
 * nothing at all, and a drawing taken from it is a scatter of scraps where the country happened to
 * be hard. Measured across the four maps: 7 tiles against a 110-tile route on the Aravali, 13
 * against 123 on Dwarka, 21 against 93 on Lothal, 64 against 104 on Narmada. **Between 88% and 97%
 * of the road was missing**, and it was missing exactly where the walking is easiest, which is
 * where a path gets worn in real life.
 *
 * `line` is the road: every tile the route steps on, one wide, in the order it was walked.
 */
export interface EasedRoutes {
  /** Every tile the route stepped on, one tile wide. This is what draws a road. */
  line: Point[];
  /** Only the tiles whose biome the ease changed. This is what asserts the ground got softer. */
  eased: Point[];
}

/**
 * Soften the ground along the routes between `stops`, in place.
 *
 * Returns both the line the route walked and the tiles the easing changed -- see `EasedRoutes` for
 * why those are different and which one draws a road. Stops are joined in the order given: the
 * caller decides what the network looks like, because canon knows which places belong together and
 * this does not.
 *
 * **The line is computed leg by leg against ground earlier legs have already softened**, which is
 * the honest answer rather than an artefact: a second route to the same place follows the track
 * the first one cut, because by then that track is the cheapest ground there is. Re-running
 * `findPath` afterwards on the finished world would give a different and worse line, since every
 * leg would see softening that had not happened when it was walked.
 */
export function easeRoutes(
  tiles: Tile[][],
  width: number,
  height: number,
  stops: readonly Point[],
  { radius = 1, costOf = crossingCost, isWalkable = routable, keep, legs }: EaseOptions = {}
): EasedRoutes {
  const eased: Point[] = [];
  const seen = new Set<string>();
  const line: Point[] = [];
  const walked = new Set<string>();

  const pairs = legs ?? stops.slice(1).map((_, i) => [i, i + 1] as const);
  for (const [a, b] of pairs) {
    const from = stops[a]!;
    const to = stops[b]!;
    // Cost-aware, so the eased route follows the line somebody would have walked anyway rather
    // than cutting a straight scar across the map.
    const path = findPath(tiles, width, height, from, to, isWalkable, costOf);

    for (const step of [from, ...path]) {
      // The line is the road, and it is collected whether or not this tile needed softening --
      // which is the whole difference between the two lists. Deduplicated across legs, because a
      // tour revisits its own junctions and a road drawn twice is a road drawn once.
      const here = `${step.x},${step.y}`;
      if (!walked.has(here)) {
        walked.add(here);
        line.push({ x: step.x, y: step.y });
      }

      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          // Manhattan, so the corridor has soft ends rather than square ones.
          if (Math.abs(dx) + Math.abs(dy) > radius) continue;
          const tile = tiles[step.y + dy]?.[step.x + dx];
          if (!tile) continue;
          const softer = EASED[tile.biome];
          if (!softer) continue;
          const key = `${tile.x},${tile.y}`;
          if (seen.has(key) || keep?.has(key)) continue;
          seen.add(key);
          tile.biome = softer;
          eased.push({ x: tile.x, y: tile.y });
        }
      }
    }
  }

  return { line, eased };
}

/**
 * Which places a road joins: a minimum spanning tree over them, and a loop or two.
 *
 * **This replaced a single chain, and the chain was the fault.** `tourOrder` walked from the start to
 * the nearest place, then to the nearest from there, and so on -- so the road was one long scribble
 * with no junctions and a dead end at its tip, and the last two places were joined only because they
 * happened to be visited in that order. Measured over ten seeds a map: 2.2 junctions on Lothal.
 *
 * A spanning tree joins every place by the shortest total length of road, with junctions where the
 * branches meet, which is how paths between settlements actually form. Then up to `LOOPS` extra legs
 * from the relative-neighbourhood graph -- pairs with no third place closer to both than they are to
 * each other, which is what makes a loop look like a natural second way round rather than a
 * shortcut across the map -- taking the shortest first and only those no longer than the tree's own
 * longest leg. The same construction dungeon and overworld generators use for "connected, with a
 * few loops".
 *
 * Manhattan distance, the grid's own measure. Deterministic: Prim's from index 0, ties to the lower
 * index, so the same places make the same roads.
 */
export const LOOPS = 2;

export function networkLegs(stops: readonly Point[]): [number, number][] {
  const n = stops.length;
  if (n < 2) return [];
  const d = (a: number, b: number) =>
    Math.abs(stops[a]!.x - stops[b]!.x) + Math.abs(stops[a]!.y - stops[b]!.y);

  const legs: [number, number][] = [];
  const inTree = new Set<number>([0]);
  while (inTree.size < n) {
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (const a of inTree) {
      for (let b = 0; b < n; b += 1) {
        if (inTree.has(b)) continue;
        const dist = d(a, b);
        if (dist < bestD || (dist === bestD && best !== null && (a < best[0] || (a === best[0] && b < best[1])))) {
          best = [a, b];
          bestD = dist;
        }
      }
    }
    legs.push(best!);
    inTree.add(best![1]);
  }

  const longest = Math.max(...legs.map(([a, b]) => d(a, b)));
  const joined = new Set(legs.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`));
  const loops: [number, number, number][] = [];
  for (let a = 0; a < n; a += 1) {
    for (let b = a + 1; b < n; b += 1) {
      if (joined.has(`${a}-${b}`)) continue;
      const dist = d(a, b);
      if (dist > longest) continue;
      let neighbourly = true;
      for (let k = 0; k < n && neighbourly; k += 1) {
        if (k === a || k === b) continue;
        if (Math.max(d(a, k), d(k, b)) < dist) neighbourly = false;
      }
      if (neighbourly) loops.push([a, b, dist]);
    }
  }
  loops.sort((p, q) => p[2] - q[2] || p[0] - q[0] || p[1] - q[1]);
  for (const [a, b] of loops.slice(0, LOOPS)) legs.push([a, b]);
  return legs;
}

/**
 * Order stops into a route that does not double back.
 *
 * Nearest-neighbour from the first stop. Not optimal -- a travelling-salesman route would be --
 * but a naturalist walking a delta does not solve for the optimum either, and the difference is
 * invisible on six places. Deterministic, which matters more: ties break on position so the same
 * map eases the same routes every time.
 */
export function tourOrder(stops: readonly Point[], from: Point): Point[] {
  const left = [...stops];
  const order: Point[] = [];
  let at = from;
  while (left.length) {
    let best = 0;
    let bestD = Infinity;
    left.forEach((p, i) => {
      const d = Math.abs(p.x - at.x) + Math.abs(p.y - at.y);
      if (d < bestD || (d === bestD && (p.y < left[best]!.y || (p.y === left[best]!.y && p.x < left[best]!.x)))) {
        bestD = d;
        best = i;
      }
    });
    at = left[best]!;
    order.push(at);
    left.splice(best, 1);
  }
  return order;
}

/**
 * Narrow the road to one tile wherever two legs of the tour ran alongside each other.
 *
 * **This exists because the sixteen-piece road sheet made an old artefact visible.** Legs between
 * different pairs of places often run parallel and adjacent for a stretch, so the flagged line is
 * two tiles wide in places -- measured over ten seeds a map, **5.0% of Lothal's road tiles sit in a
 * 2x2 block, 8.9% of Dwarka's, 9.7% of the Aravali's and 17.2% of Narmada's.** With the old
 * four-frame sheet that drew as two parallel bars; with a sheet that has stubs and tees it draws as
 * a ladder, because each row now reaches across to the other. The art is right either way and the
 * road is what is wrong: a path worn between two places is one path.
 *
 * **Never disconnects anything, and that is the whole safety property.** A road already has gaps in
 * it on purpose -- `fieldMap.ts` refuses the flag on water it fords and on the rail -- so the
 * invariant cannot be "one component". It is that removing a tile leaves the same number of
 * connected runs as before, which is checked rather than assumed: a tile is only dropped if the
 * count is unchanged.
 *
 * Deterministic, like everything in `world/`: blocks are found in raster order and the candidate
 * with the fewest connections outside its own block is dropped first, ties broken on position. The
 * same seed thins the same tiles on every machine.
 *
 * Returns the tiles it cleared, so a caller can say how much it took.
 */
export function thinRoad(tiles: Tile[][], width: number, height: number): Point[] {
  const key = (x: number, y: number) => `${x},${y}`;
  const road = new Set<string>();
  // **Crossings count toward connectivity, and are never removed.** A ford joins the road on either
  // bank, so a run that reaches the water is one run with the run beyond it. Counting `road` alone
  // saw the two banks as separate runs already, and happily cut the one tile that joined a bank to
  // the crossing -- leaving a bridge that led nowhere, found when the network grew branches.
  const crossing = new Set<string>();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tile = tiles[y]![x]!;
      if (tile.road) road.add(key(x, y));
      else if (tile.ford || tile.bridge) crossing.add(key(x, y));
    }
  }

  /** How many separate runs of road there are, four-connected like the frames read them. */
  const runs = (roadNow: ReadonlySet<string>): number => {
    const on = new Set([...roadNow, ...crossing]);
    const seen = new Set<string>();
    let count = 0;
    for (const start of on) {
      if (seen.has(start)) continue;
      count += 1;
      const queue = [start];
      seen.add(start);
      while (queue.length) {
        const [sx, sy] = queue.pop()!.split(',').map(Number) as [number, number];
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
          const next = key(sx + dx, sy + dy);
          if (!on.has(next) || seen.has(next)) continue;
          seen.add(next);
          queue.push(next);
        }
      }
    }
    return count;
  };

  const cleared: Point[] = [];
  let before = runs(road);

  // Repeated passes: dropping one tile can resolve two overlapping blocks, and can also leave a
  // new one that was hidden behind it. Bounded by the road's own size, so it always terminates.
  for (let pass = 0; pass < road.size; pass += 1) {
    let changed = false;
    for (let y = 0; y + 1 < height && !changed; y += 1) {
      for (let x = 0; x + 1 < width && !changed; x += 1) {
        const block: Point[] = [
          { x, y },
          { x: x + 1, y },
          { x, y: y + 1 },
          { x: x + 1, y: y + 1 }
        ];
        if (!block.every((p) => road.has(key(p.x, p.y)))) continue;

        const inBlock = new Set(block.map((p) => key(p.x, p.y)));
        const outside = (p: Point) =>
          ([[0, -1], [1, 0], [0, 1], [-1, 0]] as const).filter(([dx, dy]) => {
            const k = key(p.x + dx, p.y + dy);
            return road.has(k) && !inBlock.has(k);
          }).length;

        // Fewest ties to the rest of the road first: that is the corner of the block, and taking a
        // corner is what turns a square into an elbow rather than cutting a run in half.
        const order = [...block].sort(
          (a, b) => outside(a) - outside(b) || a.y - b.y || a.x - b.x
        );
        for (const candidate of order) {
          const k = key(candidate.x, candidate.y);
          road.delete(k);
          if (runs(road) === before) {
            tiles[candidate.y]![candidate.x]!.road = false;
            cleared.push(candidate);
            changed = true;
            break;
          }
          road.add(k);
        }
        // A block where no tile can go is left alone rather than forced: four tiles that each hold
        // the road together is a junction, not a doubled leg.
      }
    }
    if (!changed) break;
    before = runs(road);
  }

  return cleared;
}
