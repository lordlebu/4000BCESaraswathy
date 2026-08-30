// Where the water goes.
//
// **Rewritten onto the standard hydrology model**, because the previous one produced the thing
// you can see on Lothal: a braided tangle of channels through the middle of a delta, tied up
// with a ridge of hills, going nowhere in particular.
//
// The old method picked the highest N tiles as sources and walked each one downhill, breaking
// ties with a random per-tile `riverBias` so that two rivers starting side by side would pick
// different valleys. On a delta that meant ninety greedy walks starting from the raised centre,
// each wandering until it hit a local minimum, where it gave up and became a marsh. Every one of
// those behaviours was a patch on the same missing idea: **a river is not a walk, it is a
// drainage network**, and you find it by asking where the water collects rather than by choosing
// where it starts.
//
// So this is Priority-Flood plus D4 flow accumulation — the model GIS and terrain generation
// both use, and the one Red Blob Games' mapgen2 arranges its whole elevation scheme to avoid
// needing:
//
//   1. **Fill the depressions.** Flood inward from the map edge and the sea, raising each cell to
//      the highest lip it had to climb over to be reached. The result is a surface with no local
//      minima at all, so no walk can ever be trapped — which retires the pooling fallback and the
//      `riverBias` tie-breaker together.
//   2. **Accumulate the drainage.** Every cell sends its water to its lowest neighbour. Process
//      the cells from high to low and each one arrives carrying everything upstream of it.
//   3. **A river is where enough water collects.** One threshold, instead of "the top ninety
//      tiles, spaced two apart".
//
// What that buys, beyond the tangle going away: tributaries **join**. Accumulation adds where
// channels meet, so a network converges downstream the way real ones do, and the count of rivers
// stops being a number somebody picked. Lothal gets a delta because a delta is what a lot of
// water crossing flat wet ground actually produces.
//
// Amit Patel's insight is worth stating because it is the alternative that was weighed: if
// elevation is made a monotone function of distance from the coast, local minima cannot exist and
// none of step 1 is needed. That is a better model of an *island*, and it is the wrong trade
// here — it would make every map coast-driven, and two of the three are a plateau and a dry
// basin with no sea at all. Filling depressions costs one heap and keeps the landforms.
//
// Pure, seeded through the tiles it is given, and free of React and Phaser.

import type { BiomeId, Point, Tile } from './types';
import { THRESHOLDS } from './classify';

/** Biomes a river may end in. */
const WATER: ReadonlySet<BiomeId> = new Set<BiomeId>(['sea', 'coast', 'wetland']);

/** Biomes a river must not overwrite as it passes through. */
const PROTECTED: ReadonlySet<BiomeId> = new Set<BiomeId>(['sea', 'coast', 'settlement', 'landmark']);

export function orthogonalNeighbours(tile: Point, width: number, height: number): Point[] {
  return [
    { x: tile.x + 1, y: tile.y },
    { x: tile.x - 1, y: tile.y },
    { x: tile.x, y: tile.y + 1 },
    { x: tile.x, y: tile.y - 1 }
  ].filter((p) => p.x >= 0 && p.x < width && p.y >= 0 && p.y < height);
}

/**
 * A binary min-heap, because Priority-Flood needs the lowest unprocessed cell and nothing else.
 *
 * Written out rather than pulled in: it is thirty lines, `world/` deliberately has no
 * dependencies, and sorting an array on every pop would turn an O(n log n) fill into O(n² log n)
 * on the 4,096 cells of a large map.
 */
class MinHeap {
  private readonly items: { at: number; key: number }[] = [];

  push(at: number, key: number): void {
    this.items.push({ at, key });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent]!.key <= this.items[i]!.key) break;
      [this.items[parent], this.items[i]] = [this.items[i]!, this.items[parent]!];
      i = parent;
    }
  }

  pop(): { at: number; key: number } | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length && last) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let small = i;
        if (l < this.items.length && this.items[l]!.key < this.items[small]!.key) small = l;
        if (r < this.items.length && this.items[r]!.key < this.items[small]!.key) small = r;
        if (small === i) break;
        [this.items[small], this.items[i]] = [this.items[i]!, this.items[small]!];
        i = small;
      }
    }
    return top;
  }

  get size(): number {
    return this.items.length;
  }
}

/**
 * Priority-Flood: the elevation surface with every depression filled to its lowest outlet.
 *
 * Flood inward from the edge and from the sea, always continuing from the lowest cell reached so
 * far. A cell's filled height is the highest lip the flood had to climb to arrive, so a hollow
 * comes out level with its outlet rather than raised to the surrounding peaks — which is the
 * difference between filling a lake and burying a valley.
 *
 * Returned as a separate grid. The tiles' own `elevation` is what `classifyBiome` reads and what
 * decides where hills and mountains are; raising it here would silently move the biomes.
 *
 * **The ε is not a rounding fudge; it is what makes flats drain.** Filling a hollow leaves it
 * perfectly level, and on a level surface no neighbour is strictly lower, so flow has nowhere to
 * go and a river simply stops in the middle of a field — which is exactly what the first run of
 * this did, ending a channel at 20,13 in a patch of plains. Raising each cell a hair above the
 * one the flood reached it from lays a monotone slope along the filling order, so every flat
 * drains toward the outlet it was filled from. This is the standard Priority-Flood+ε variant.
 *
 * At 1e-6 over at most 4,096 cells the total distortion is under 0.005 of an elevation range of
 * 1, which is far below the gap between any two biome thresholds — and it is applied to the
 * routing surface, never to the tiles.
 */
const EPSILON = 1e-6;
export function fillDepressions(tiles: Tile[][], width: number, height: number): Float64Array {
  const filled = new Float64Array(width * height).fill(Number.POSITIVE_INFINITY);
  const closed = new Uint8Array(width * height);
  const open = new MinHeap();

  const seed = (x: number, y: number) => {
    const at = y * width + x;
    if (closed[at]) return;
    closed[at] = 1;
    filled[at] = tiles[y]![x]!.elevation;
    open.push(at, filled[at]!);
  };

  // The sea is the outlet, and so is the map edge — water that leaves the frame has left.
  for (let x = 0; x < width; x += 1) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    seed(0, y);
    seed(width - 1, y);
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (tiles[y]![x]!.biome === 'sea') seed(x, y);
    }
  }

  while (open.size) {
    const cell = open.pop()!;
    const x = cell.at % width;
    const y = (cell.at - x) / width;
    for (const n of orthogonalNeighbours({ x, y }, width, height)) {
      const at = n.y * width + n.x;
      if (closed[at]) continue;
      closed[at] = 1;
      // The lip it had to climb, or its own height if that was already higher -- and never
      // exactly level with where the flood came from, so flats have a direction.
      filled[at] = Math.max(tiles[n.y]![n.x]!.elevation, cell.key + EPSILON);
      open.push(at, filled[at]!);
    }
  }

  return filled;
}

/**
 * How much land drains through each cell, in cells.
 *
 * Every cell sends its water to its lowest orthogonal neighbour on the *filled* surface. D4
 * rather than the usual D8 because the traveller walks orthogonally and a river is ground they
 * follow: a diagonal channel would read as a dotted line and could not be walked along.
 *
 * Cells are processed from high to low, so by the time one is reached every cell that drains
 * into it has already given up its water. Flat ground — which depression filling creates a lot
 * of, being flat by definition — is broken by index order, which is arbitrary but deterministic,
 * and that matters more here than realism: the same seed must build the same rivers.
 */
export function accumulate(
  tiles: Tile[][],
  filled: Float64Array,
  width: number,
  height: number
): Float64Array {
  const flow = new Float64Array(width * height).fill(1);
  const order = Array.from({ length: width * height }, (_, i) => i).sort(
    (a, b) => filled[b]! - filled[a]! || a - b
  );

  for (const at of order) {
    const x = at % width;
    const y = (at - x) / width;
    if (tiles[y]![x]!.biome === 'sea') continue;

    let lowest = -1;
    let lowestKey = filled[at]!;
    for (const n of orthogonalNeighbours({ x, y }, width, height)) {
      const to = n.y * width + n.x;
      if (filled[to]! < lowestKey) {
        lowestKey = filled[to]!;
        lowest = to;
      }
    }
    // Nowhere lower: this is the sea, the edge, or a filled flat with no outlet found. The water
    // stops here rather than being lost, which keeps the totals honest.
    if (lowest >= 0) flow[lowest]! += flow[at]!;
  }

  return flow;
}

/**
 * Turn the drainage network into river tiles, and return each channel as a walkable path.
 *
 * `wetness` is **the share of carvable ground that ends up as channel**, not an absolute
 * drainage figure, and that distinction was learned the hard way. An absolute bar looked like
 * the honest knob -- it is the literal question, how much land has to drain through a cell
 * before it is a river -- and it does not survive contact with flat terrain. Filling a plateau
 * leaves it level, ε-routing then lays long parallel chains across the flat, and every cell in a
 * chain carries everything upstream of it: at a bar that gave a delta 13% river, the Narmada
 * plateau came out **56.7%** river and 2.3% hills. The same number cannot mean the same thing on
 * ground that flat and ground that is not.
 *
 * A quantile is immune to it. Rank the carvable cells by drainage, take the wettest share, and
 * the shape of the terrain decides *where* the water goes while this decides *how much* of it
 * shows -- which is the part that is a look rather than a fact.
 */
export function carveRivers(
  tiles: Tile[][],
  width: number,
  height: number,
  wetness: number
): Point[][] {
  const filled = fillDepressions(tiles, width, height);
  const flow = accumulate(tiles, filled, width, height);

  // Only ground a channel could be cut into is ranked: sea and beach are already water, and
  // including them would spend the budget on cells that can never become river.
  const carvable: number[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const tile = tiles[y]![x]!;
      if (WATER.has(tile.biome) || tile.elevation < THRESHOLDS.COAST) continue;
      carvable.push(y * width + x);
    }
  }
  carvable.sort((a, b) => flow[b]! - flow[a]! || a - b);

  const isChannel = new Uint8Array(width * height);
  const take = Math.min(carvable.length, Math.max(2, Math.round(wetness * carvable.length)));
  for (let i = 0; i < take; i += 1) isChannel[carvable[i]!] = 1;

  // Paint before tracing, so a path can follow a channel that is already there rather than
  // racing the painting.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (isChannel[y * width + x] && !PROTECTED.has(tiles[y]![x]!.biome)) {
        tiles[y]![x]!.biome = 'river';
      }
    }
  }

  // A headwater is a channel cell with no channel draining into it. Walking down from each gives
  // one path per branch, and a tributary joining a trunk simply stops when it meets it — which is
  // why these are drawn as separate rivers with separate names, exactly as a map names them.
  const downhillOf = (at: number): number => {
    const x = at % width;
    const y = (at - x) / width;
    let lowest = -1;
    let lowestKey = filled[at]!;
    for (const n of orthogonalNeighbours({ x, y }, width, height)) {
      const to = n.y * width + n.x;
      if (filled[to]! < lowestKey) {
        lowestKey = filled[to]!;
        lowest = to;
      }
    }
    return lowest;
  };

  const feedsInto = new Uint8Array(width * height);
  for (let at = 0; at < isChannel.length; at += 1) {
    if (!isChannel[at]) continue;
    const to = downhillOf(at);
    if (to >= 0 && isChannel[to]) feedsInto[to] = 1;
  }

  const carved: Point[][] = [];
  for (let at = 0; at < isChannel.length; at += 1) {
    if (!isChannel[at] || feedsInto[at]) continue;

    const path: Point[] = [];
    const seen = new Set<number>();
    let cursor = at;
    while (cursor >= 0 && !seen.has(cursor)) {
      seen.add(cursor);
      const x = cursor % width;
      const y = (cursor - x) / width;
      path.push({ x, y });
      const tile = tiles[y]![x]!;
      // Stop on arriving at water rather than after overwriting it.
      if (WATER.has(tile.biome) && tile.biome !== 'river') break;
      const next = downhillOf(cursor);
      if (next < 0) break;
      const nx = next % width;
      const ny = (next - nx) / width;
      if (!isChannel[next] && !WATER.has(tiles[ny]![nx]!.biome)) break;
      cursor = next;
    }
    if (path.length >= 2) carved.push(path);
  }

  return carved;
}
