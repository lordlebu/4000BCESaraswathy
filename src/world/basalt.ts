// The rock a city was laid on top of.
//
// Canon's arrival text for The Black Pavement is the specification, and it is unusually literal:
// *"Hexagons underfoot, packed like a honeycomb and rubbed smooth by feet and salt. It goes under
// the wall, under the court, under the market. Somebody laid a city on top of it and never had to
// quarry a stone."* The place entry adds the rest: *"the ground everything here is built on"*, an
// old eruption reaching the coast and hardening, with the city arriving long afterwards.
//
// **Nothing was drawing it.** `lava_field` had painted ground, six decor props, basalt columns on
// the overdraw sheet and a frame in the terrain sheet; canon had it in Dwarka's `seed_biomes` and
// four points of interest asking to stand on it. What it did not have was a stamp. `classify.ts`
// only ever emits the eight biomes in `ALL_TERRAIN`, and `lava_field` is not one of them -- it is
// a *place*, like snow and the floating islands, and places are stamped after classification.
// So the map generated zero tiles of it on every seed, and all four places quietly took their
// second-choice terrain: both gates, the shore the trackways run down, and the fang bed.
//
// This is the same shape as `tableland.ts`: describe what the thing *is*, so the rule picks out
// the map that has one rather than naming Dwarka.
//
// Pure and free of React and Phaser, like the rest of `world/`.

import { tileHash } from './rng';
import type { BiomeId, Point, World } from './types';

/**
 * How far the flow reaches from its centre, in tiles.
 *
 * Wide enough to go under the wall, the court and the market -- canon names all three -- and to be
 * walked across getting to them, without becoming the country. Measured on a 48-tile map: about a
 * seventh of it, which is roughly the footprint of the city plus its approaches.
 */
const REACH_X = 11;
const REACH_Y = 8;

/**
 * Lay the basalt: an old flow, with a city built on top of it.
 *
 * **Anchored to the city, and that is canon's own arrangement rather than a convenience.** The
 * first version put the flow along the coast, on the reasoning that a lava flow runs to the sea --
 * true, and useless here, because *Dwarka has no sea*. The harbour emptied inside living memory
 * and the map generates zero tiles of water, so "the row where the land begins" was row 0 and the
 * pavement came out as a slab pinned to the top edge with the city twenty rows away from it.
 *
 * Which is exactly backwards. The Black Pavement's arrival text is not about the water: *"It goes
 * under the wall, under the court, under the market. Somebody laid a city on top of it and never
 * had to quarry a stone."* The rock is why the city is where it is. So the city is where the rock
 * is, and the flow is centred on the settlement and spread from there.
 *
 * Runs after the settlement patch for that reason, and **only writes over ground**. The streets
 * stay streets: canon has the city *on* the rock, and paving over the settlement would delete the
 * city in order to draw its foundation. Rivers stay rivers, and there is no sea to worry about.
 *
 * Gated on the palette, like every other stamp. `lava_field` is in exactly one field map's
 * `seed_biomes` and canon put it there.
 */
export function stampBasalt(world: World, palette: ReadonlySet<BiomeId>): Point[] {
  if (!palette.has('lava_field')) return [];

  const city = world.settlement;
  if (!city) return [];

  const laid: Point[] = [];
  for (let dy = -REACH_Y; dy <= REACH_Y; dy += 1) {
    for (let dx = -REACH_X; dx <= REACH_X; dx += 1) {
      const x = city.x + dx;
      const y = city.y + dy;
      const tile = world.tiles[y]?.[x];
      if (!tile) continue;

      // An oval, roughened per column so the flow front is a front rather than a ruled edge. Per
      // column rather than per tile, for the reason `crossing.ts` gives: a per-tile decision is
      // static along the boundary instead of an outline.
      const rough = (tileHash(world.seed, x, 0, 'basalt') % 3) - 1;
      const ex = dx / (REACH_X + rough);
      const ey = dy / (REACH_Y + rough);
      if (ex * ex + ey * ey > 1) continue;

      // Water is not paved, and neither is the city -- see the note above.
      if (tile.biome === 'sea' || tile.biome === 'river' || tile.biome === 'settlement') continue;

      // **Hills stay high when the rock takes them, which is what the Fang Bed needs.**
      // `event_fang_vs_scale_wars` puts the archosaurs in "the volcanic highlands", and the Fang
      // Bed is bone in basalt on high ground -- canon gives it `terrain: [lava_field, hills]` and
      // `stands: high`. A flow that flattened everything it covered left nowhere for it: the
      // basalt was all band 0 and the place fell back to bare hills with no rock in them.
      //
      // So the biome changes and the height does not. A lava field that ran over a rise is a rise
      // made of lava, and the cliff and decor layers read elevation rather than biome, so the
      // terraces keep their faces.
      tile.biome = 'lava_field';
      laid.push({ x, y });
    }
  }

  reachTheHighlands(world, city, laid);
  return laid;
}

/**
 * How far past the flow's edge the highlands are looked for, in tiles.
 *
 * A flow came from somewhere. Six tiles of reach lets it run back up onto a rise that is nearly
 * touching it, and stops it crossing the map to find one.
 */
const HIGHLAND_REACH = 6;

/**
 * Let the flow climb any high ground it is already up against.
 *
 * **Because canon has volcanic *highlands*, and a flat flow has none.**
 * `event_fang_vs_scale_wars` puts the archosaurs in the volcanic highlands, and The Fang Bed is
 * bone in basalt on high ground -- `terrain: [lava_field, hills]`, `stands: high`. Whether the
 * flow happened to cover a rise was down to where the city landed: on three seeds in four the
 * basalt was entirely band 0, so the one place that needs high rock fell back to bare hills with
 * no rock in them.
 *
 * This is not the flow spreading further. It is the flow finishing what it is already touching:
 * high ground orthogonally adjacent to basalt becomes basalt too, out to `HIGHLAND_REACH`, so a
 * rise the lava lapped against is covered rather than half-covered. On a map where the city sits
 * in the middle of a plain it finds nothing and changes nothing.
 *
 * Elevation is untouched throughout -- a lava field that ran over a rise is a rise made of lava,
 * and the cliff layer reads height rather than biome, so the terraces keep their faces.
 */
function reachTheHighlands(world: World, city: Point, laid: Point[]): void {
  if (laid.length === 0) return;

  let front = laid.filter((p) => Math.abs(p.x - city.x) <= REACH_X && Math.abs(p.y - city.y) <= REACH_Y);
  const covered = new Set(laid.map((p) => `${p.x},${p.y}`));

  for (let step = 0; step < HIGHLAND_REACH; step += 1) {
    const next: Point[] = [];
    for (const at of front) {
      for (const side of [
        { x: at.x - 1, y: at.y },
        { x: at.x + 1, y: at.y },
        { x: at.x, y: at.y - 1 },
        { x: at.x, y: at.y + 1 }
      ]) {
        const key = `${side.x},${side.y}`;
        if (covered.has(key)) continue;
        const tile = world.tiles[side.y]?.[side.x];
        // Only upward, and only onto rock. Grass and sand are not what a flow climbs.
        if (!tile || (tile.biome !== 'hills' && tile.biome !== 'mountains')) continue;
        covered.add(key);
        tile.biome = 'lava_field';
        laid.push(side);
        next.push(side);
      }
    }
    if (next.length === 0) return;
    front = next;
  }
}
