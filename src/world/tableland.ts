// The country a scarp encloses, and what is stamped on it.
//
// Canon's arrival text for the Narmada is the specification: *"black rock in steps a hundred feet
// high, holding a flat green country the sea never reached."* The generator already makes that
// shape — `landform.ts` lifts a plateau's surface into the plains window and puts all the relief
// in the outer ring — but nothing could **name** it, so nothing could put anything on it.
//
// This names it, and the naming is the whole module: everything after is the settlement patch's
// trick applied to ground that has been identified rather than to a random tile.
//
// Pure and free of React and Phaser.

import { band } from './classify';
import { tileHash } from './rng';
import type { BiomeId, Point, World } from './types';

/**
 * How big an enclosed patch has to be before it counts as a tableland.
 *
 * **This is what keeps the rule from naming Narmada by name.** Flood-filled, Narmada's enclosed
 * ground is one patch of 541 tiles; Lothal's largest is 23 and Dwarka's 30 — incidental dips in
 * a delta and a coastal basin rather than country. A floor of a hundred separates them by two
 * orders of magnitude, so a rule that describes what a tableland *is* picks out the one map that
 * has one, and the next plateau canon authors joins it without an edit here.
 */
const TABLELAND_FLOOR = 100;

/**
 * Which band a tile is in, or -1 off the map.
 *
 * `classify.band` is the authority -- it is the same three bands `frames.ts` draws cliffs
 * between, so the interior of band 1 is exactly the ground a scarp rings. This only adds the
 * off-map case, which matters at the edge: a map that runs off the side is not enclosed there.
 */
function bandAt(world: World, x: number, y: number): number {
  const tile = world.tiles[y]?.[x];
  return tile ? band(tile.elevation) : -1;
}

/** Upland whose four neighbours are all as high or higher: inside the scarp rather than on it. */
function enclosed(world: World, x: number, y: number): boolean {
  if (bandAt(world, x, y) !== 1) return false;
  return (
    bandAt(world, x + 1, y) >= 1 &&
    bandAt(world, x - 1, y) >= 1 &&
    bandAt(world, x, y + 1) >= 1 &&
    bandAt(world, x, y - 1) >= 1
  );
}

/**
 * Every patch of enclosed country big enough to be a tableland, largest first.
 *
 * Flood-filled rather than counted, because "how much enclosed ground is there" and "is there a
 * tableland" are different questions: a map could have four hundred scattered enclosed tiles and
 * no country at all. What matters is whether they join up.
 */
export function tablelands(world: World): Point[][] {
  const seen = new Set<string>();
  const found: Point[][] = [];

  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const key = `${x},${y}`;
      if (seen.has(key) || !enclosed(world, x, y)) continue;

      const patch: Point[] = [];
      const stack: Point[] = [{ x, y }];
      seen.add(key);
      while (stack.length > 0) {
        const at = stack.pop()!;
        patch.push(at);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1]
        ] as const) {
          const nx = at.x + dx;
          const ny = at.y + dy;
          const nk = `${nx},${ny}`;
          if (seen.has(nk) || !enclosed(world, nx, ny)) continue;
          seen.add(nk);
          stack.push({ x: nx, y: ny });
        }
      }
      if (patch.length >= TABLELAND_FLOOR) found.push(patch);
    }
  }
  return found.sort((a, b) => b.length - a.length);
}

/**
 * How much of a tableland is under old snow.
 *
 * **Drifts rather than a snowline**, and the difference is the whole design. The obvious rule is
 * "everything above elevation X turns to snow", and measured it puts snow on Narmada's *peaks*
 * and on eleven tiles of Lothal, which is a river delta. Snow is a sub-biome here, not a climate:
 * three or four patches across five hundred tiles read as drifts that have not gone yet, which is
 * what a high summer tableland actually looks like and what gives the five species canon moved to
 * `snow` somewhere to be met.
 */
const DRIFTS = 4;
const DRIFT_RADIUS = 3;

/**
 * Put snow on the high ground and a camp beside it.
 *
 * Runs after classification, like the settlement patch — a drift is a thing that happened to the
 * ground rather than a climate the ground has, and the classifier deals only in climates. Stamped
 * from the seed, so the same world always has the same drifts.
 */
export function stampTableland(world: World, palette: ReadonlySet<BiomeId>): Point[] {
  if (!palette.has('snow')) return [];

  const country = tablelands(world)[0];
  if (!country) return [];

  const drifts: Point[] = [];
  {
    for (let i = 0; i < DRIFTS; i += 1) {
      const centre = country[tileHash(world.seed, i, 0, 'drift') % country.length]!;
      drifts.push(centre);
      for (let dy = -DRIFT_RADIUS; dy <= DRIFT_RADIUS; dy += 1) {
        for (let dx = -DRIFT_RADIUS; dx <= DRIFT_RADIUS; dx += 1) {
          // A rounded patch rather than a square: a drift has no corners.
          if (Math.abs(dx) + Math.abs(dy) > DRIFT_RADIUS) continue;
          const tile = world.tiles[centre.y + dy]?.[centre.x + dx];
          // Only within the enclosed country, so a drift cannot spill off the scarp.
          if (tile && enclosed(world, centre.x + dx, centre.y + dy)) tile.biome = 'snow';
        }
      }
    }
  }
  return drifts;
}

/**
 * How wide the herders' camp is. Small: a handful of tents, not a town.
 *
 * The settlement patch on the plain is a twelfth of the map across, because canon's Lothal is a
 * ruined city. This is four tiles of ground on a high tableland, which is what a summer camp is.
 */
const CAMP_RADIUS = 2;

/**
 * How far from a drift the camp is pitched.
 *
 * **Beside the snow, never on it.** A camp is pitched where there is shelter and grazing, and the
 * drift a few tiles off is the *reason* somebody is up here rather than in the valley -- meltwater
 * through the summer. Pitching on the snow would be pitching on the water supply.
 */
const CAMP_FROM_DRIFT = 4;

/**
 * A herders' camp on the tableland, beside the old snow.
 *
 * Uses the settlement biome rather than inventing a camp one, which means it inherits everything
 * a settlement already gets for free: the huts and yurts, and now the fence that goes round a
 * whole perimeter. **That inheritance is the reason this is small work** -- a camp is a settlement
 * that happens to be four tiles across and a thousand feet up.
 */
export function stampCamp(world: World, palette: ReadonlySet<BiomeId>, drifts: Point[]): void {
  if (!palette.has('settlement') || drifts.length === 0) return;

  const country = tablelands(world)[0];
  if (!country) return;
  const onTop = new Set(country.map((p) => `${p.x},${p.y}`));

  // Beside the first drift, in a direction the seed picks -- so the camp is on the same side of
  // the same drift every time this world is built.
  const drift = drifts[0]!;
  const spin = tileHash(world.seed, drift.x, drift.y, 'camp-side') % 4;
  const [ox, oy] = [
    [CAMP_FROM_DRIFT, 0],
    [-CAMP_FROM_DRIFT, 0],
    [0, CAMP_FROM_DRIFT],
    [0, -CAMP_FROM_DRIFT]
  ][spin]!;

  const cx = drift.x + ox;
  const cy = drift.y + oy;

  for (let dy = -CAMP_RADIUS; dy <= CAMP_RADIUS; dy += 1) {
    for (let dx = -CAMP_RADIUS; dx <= CAMP_RADIUS; dx += 1) {
      if (Math.abs(dx) + Math.abs(dy) > CAMP_RADIUS) continue;
      const x = cx + dx;
      const y = cy + dy;
      const tile = world.tiles[y]?.[x];
      // Only on the tableland, and never over the snow it is pitched beside.
      if (!tile || !onTop.has(`${x},${y}`) || tile.biome === 'snow') continue;
      tile.biome = 'settlement';
    }
  }
}
