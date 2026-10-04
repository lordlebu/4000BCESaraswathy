// Animals that are somewhere, rather than everywhere.
//
// **An animal in this game has never been an actor.** `creatureFor(tile, seed)` answers *which
// creature this square of ground implies* -- a property of the ground, true of every matching tile
// at once and true of it for ever. That is right for a bestiary and wrong for a meeting: you cannot
// walk up to a property, and nothing in `game/` has ever drawn a creature anywhere.
//
// A wanderer is the other thing. **One animal, on one tile, at one moment**, which is somewhere
// else an hour later. Meeting it is an event with a place and a time, and missing it is possible.
//
// **This is `travellers.ts` with a different circuit, and deliberately so.** That module walks
// drovers between points of interest as a pure function of seed, day and hour; the only thing that
// makes it about people is that its stops come from an npc's `found_at`. Swap the stops for a
// handful of tiles of the right biome and the same arithmetic walks an animal. So `whereabouts`
// is imported rather than reimplemented -- one position model, one set of hours, one place for the
// next bug in it to be fixed.
//
// **Nothing here is saved, which is the load-bearing decision and the reason this was cheap.** A
// wanderer's position is derived from the seed, its species id, the day and the hour, exactly as a
// traveller's is. Storing it would mean a new field on `Journey`, which means bumping
// `SAVE_VERSION`, which discards every journey in existence. Deriving it also means the same seed
// puts the same whale in the same bend on every machine.
//
// **And a craft with somebody aboard is the same thing.** The Sinauli wagon on North Dwarka keeps a
// round of dry ground near the Caravan Ground the way the whale keeps its bend, so it is a wanderer
// too -- one with a vehicle where an animal has a species, its own hours, and its stops chosen near a
// place rather than anywhere its ground is. See `PATROLS`.
//
// Pure: no React, no Phaser, no clock. The caller owns the hour.

import type { BiomeId, Point, Tile, World } from '../world/types';
import type { Creature } from '../world/types';
import { isWalkable } from '../world/generate';
import { tileHash } from '../world/rng';
import { engineId } from './canon';
import { vehicles } from './making';
import { campGround } from './encampments';
import { isCamp } from './camps';
import { poi } from './places';
import { metSpecies } from './species';
import { COMMON_HOURS, type Hours, wayBetween, whereabouts, type Whereabouts } from './travellers';

/**
 * How many tiles a wanderer's round takes in.
 *
 * Four, which is enough that it is somewhere different at dawn than it was yesterday and few enough
 * that the round is a *place* rather than the whole map. A circuit of two would pace back and forth
 * like a caged thing; a circuit of ten would mean the animal is effectively anywhere and finding it
 * stops being a fact about where you looked.
 *
 * `whereabouts` takes the day modulo the stop count, so four also means the round closes on a
 * four-day cycle -- long enough that a player who finds it once has learned something that is still
 * true tomorrow, and short enough that missing it is not a week's wait.
 */
export const CIRCUIT_TILES = 4;

/**
 * How far from its first haunt the rest of the circuit may fall.
 *
 * In tiles, as a radius. A wanderer keeps a range rather than roaming freely: the whale is *in the
 * bend below the quarry*, not in the Narmada. This is what makes local knowledge worth having --
 * an animal that could be anywhere cannot be looked for, only stumbled upon, and the difference
 * between those two is most of what this feature is for.
 *
 * **Twelve because the spread was measured first, not because it made a test pass.** Over
 * twenty-five seeds of the Narmada (64x64, 142 river tiles), a circuit picked with no range rule
 * spans **17 tiles at the narrowest, 40 at the median and 63 at the widest** -- so 12 sits below
 * every unconstrained case and the guard separates on every seed rather than on the lucky ones.
 *
 * That measurement is also what caught the first version of this constant. The whale was authored
 * `river` *and* `hills`, which put 815 tiles in its habitat instead of 142 and spread them over
 * the whole map; the range guard passed while proving nothing, because an unconstrained pick
 * happened to land inside 12 anyway. Narrowing canon to `river` is what gave this number something
 * to bite on -- the threshold was never the bug.
 */
export const RANGE = 12;

/**
 * One animal, walking its own ground.
 *
 * `species` is the canon creature itself rather than an id, because every caller that has a
 * wanderer wants its name, its mood and its journal prompt, and looking it up again in four places
 * is how two of them end up doing it differently.
 */
export interface Wanderer {
  /**
   * The **engine** id -- `narmada-walking-whale`, not `fauna_narmada_walking_whale`; for a craft,
   * the vehicle's, `sinauli-wagon`.
   *
   * The engine's id space rather than canon's, because everything that will be handed this -- the
   * collection, the plate lookup, the scene's texture key -- is keyed that way, and a wanderer
   * carrying the one id in the repository that does not match its neighbours is a conversion
   * waiting to be forgotten at one of four call sites.
   */
  id: string;
  /** What it is called: the species' name, or the craft's. */
  name: string;
  /** The animal. Null for a craft somebody drives -- see `PATROLS`. */
  species: Creature | null;
  /** The game's vehicle id, for a craft. Null for an animal. */
  vehicle: string | null;
  /** The ground it keeps to, first one first. What the stand-in takes its colour from. */
  ground: BiomeId[];
  /** The tiles it moves between, in order. Between two and `CIRCUIT_TILES` of them. */
  circuit: Point[];
  /** When it is on the move. An animal keeps everybody's hours; a patrol stands most of the day. */
  hours: Hours;
}

/**
 * The species that wander on a map, as opposed to the ones that are scenery.
 *
 * **Deliberately a short authored list and not a rule over canon.** Every `placement: encounter`
 * creature could be made to walk, and making them all walk would turn a quiet map into a zoo and
 * cost a path search per animal per tick. More to the point, a wanderer is a *quest fixture* --
 * something written on purpose, with art and a discovery behind it -- and that is an authorial
 * decision rather than a property of the data.
 *
 * Keyed by field map id. A species named here that canon does not carry, or that has no tile of
 * its biome on the generated map, is dropped by `wanderersOn` rather than guessed at.
 *
 * **Written in canon ids and translated by `engineId`, not in engine slugs.** The bundle's species
 * are keyed `narmada-walking-whale` where canon writes `fauna_narmada_walking_whale`, and typing
 * the bare slug here would be a second place that knows how to do that transform -- which is
 * exactly what `engineId` is exported to prevent. It also keeps this list greppable against the
 * database, which is where somebody authoring the next wanderer will be looking.
 */
const WANDERS: Record<string, string[]> = {
  field_map_narmada: ['fauna_narmada_walking_whale', 'fauna_sivatherium'],
  field_map_dwarka: ['fauna_vasuki_indicus']
};

/**
 * Every tile a species could stand on, on this world.
 *
 * Walkability is checked as well as biome because the circuit is walked with the same pathfinder a
 * traveller uses, and a stop the animal cannot reach would strand it at the previous one for ever.
 * The whale is a wading animal and `river` is walkable here, which is why it can have a circuit at
 * all -- a purely aquatic species would come back empty and be dropped, which is the honest answer
 * rather than a whale standing on a hill.
 */
function habitatTiles(world: World, species: Creature): Point[] {
  return groundTiles(world, species.biomes);
}

/** Every walkable tile of these kinds of ground. */
function groundTiles(world: World, biomes: readonly string[]): Point[] {
  const wants = new Set<string>(biomes);
  const out: Point[] = [];
  for (let y = 0; y < world.height; y += 1) {
    const row: Tile[] | undefined = world.tiles[y];
    if (!row) continue;
    for (let x = 0; x < world.width; x += 1) {
      const tile = row[x];
      if (!tile) continue;
      if (!wants.has(tile.biome)) continue;
      if (!isWalkable(tile)) continue;
      out.push({ x, y });
    }
  }
  return out;
}

/**
 * The circuit one species walks on one world.
 *
 * **Seeded on the world and the species id, never on a stream position.** Two wanderers on the same
 * map must not be able to shift each other's ground by being created in a different order, which is
 * the fault `weightedPickFor` exists to prevent in `species.ts` and the same one here.
 *
 * The first haunt is picked from every habitat tile; the rest are picked from the tiles within
 * `RANGE` of it. That ordering is what gives the animal a range rather than a scatter -- picking
 * four independently would put the whale in four unrelated bends and make the walk between them the
 * length of the map.
 */
export function circuitFor(world: World, species: Creature): Point[] {
  return circuitAmong(world, habitatTiles(world, species), species.id);
}

/**
 * A circuit picked from these tiles, seeded on `salt`. `circuitFor` for an animal, `patrolCircuit`
 * for a craft.
 *
 * `joins` may refuse a stop: one is taken only if the way to it from the stop before, and the way
 * from it home to the first, are both acceptable. Absent, every stop is.
 */
function circuitAmong(
  world: World,
  tiles: readonly Point[],
  salt: string,
  joins: (from: Point, to: Point) => boolean = () => true
): Point[] {
  if (tiles.length === 0) return [];

  const anchor = tiles[tileHash(world.seed, 0, 0, `wander:${salt}`) % tiles.length]!;
  const near = tiles.filter(
    (t) => Math.abs(t.x - anchor.x) <= RANGE && Math.abs(t.y - anchor.y) <= RANGE
  );

  const circuit: Point[] = [anchor];
  const taken = new Set<string>([`${anchor.x},${anchor.y}`]);
  // Walks the candidates in a seeded order and takes the first few it has not taken, rather than
  // picking an index repeatedly -- which would need a retry loop to avoid standing on the same tile
  // twice, and a retry loop on a seeded hash is how a "deterministic" pick stops being one.
  const ordered = [...near].sort(
    (a, b) =>
      tileHash(world.seed, a.x, a.y, `wander-step:${salt}`) -
      tileHash(world.seed, b.x, b.y, `wander-step:${salt}`)
  );
  // The `taken` check is defensive rather than load-bearing: `ordered` is drawn from a tile list
  // that is distinct by construction, so only the anchor can repeat. Deliberately kept anyway --
  // it is the one line that would still hold if the candidate list ever stopped being distinct,
  // and it costs a set lookup. Checked by breaking it: with the anchor pushed twice the suite
  // fails "never stands on the same tile twice", expected 3 to be 4.
  for (const tile of ordered) {
    if (circuit.length >= CIRCUIT_TILES) break;
    const key = `${tile.x},${tile.y}`;
    if (taken.has(key)) continue;
    if (!joins(circuit[circuit.length - 1]!, tile) || !joins(tile, anchor)) continue;
    taken.add(key);
    circuit.push(tile);
  }

  // One tile is not a circuit. `whereabouts` returns null below two stops, so returning a
  // single-tile circuit would make a wanderer that exists and never appears -- this codebase's
  // signature fault. Dropping it is the honest answer.
  return circuit.length < 2 ? [] : circuit;
}

/**
 * The animals authored to walk one map, as engine ids, before anything is known about its ground.
 *
 * For `preload`, which has the map's id and not yet its world. `wanderersOn` may go on to drop one
 * whose habitat the generated map lacks; loading the painting of an animal that then does not
 * appear costs one file, where loading every map's animals cost 4 MB on a map that has none.
 */
export function wandererIdsOn(fieldMapId: string): string[] {
  return [...(WANDERS[fieldMapId] ?? []), ...(PATROLS[fieldMapId] ?? []).map((p) => p.vehicle)].map(engineId);
}

/**
 * A craft somebody drives in a round near one place: a patrol.
 *
 * **The owner's ask of 4 October 2026**: the Sinauli wagon -- canon's grave-goods car, still driven
 * on North Dwarka -- rolls around the Caravan Ground on open dry country, desert, grass or hill, and
 * never through marsh or water. No errand hangs on it; meeting it is a card (`happenings.ts`,
 * `passing`).
 *
 * **It moves on the scene's own clock, as the strait's ship does, not on the day's** (`patrolAt`).
 * It first kept the day's hours, rolling from ten until half past twelve, and the owner saw it move
 * badly: the day's clock jumps about 45 seconds with every step the traveller takes, so a position
 * read from it lurched a tile or more at a time while its legs walked on the spot. Now it rolls at an
 * ox's pace, glides between tiles, and halts at each stop -- "stop from time to time".
 */
export interface Patrol {
  /** The game's vehicle id. */
  vehicle: string;
  /** The point of interest its round is kept near. */
  near: string;
  /** The ground it stops on. */
  ground: BiomeId[];
}

/** Who patrols where. Keyed by field map, like `WANDERS`, and as short on purpose. */
const PATROLS: Record<string, Patrol[]> = {
  field_map_dwarka: [
    {
      vehicle: 'vehicle_sinauli_wagon',
      near: 'poi_caravan_camp',
      ground: ['desert', 'plains', 'hills']
    }
  ]
};

/**
 * How fast a patrol rolls, in tiles a second of the scene's clock: an ox's walk. The traveller walks
 * about 2.4 on plains and the strait's ship goes 0.5 (`strait.SHIP_PACE`); a cart behind an ox is a
 * little slower than the ship -- stately, and slower than anybody on foot.
 */
export const PATROL_PACE = 0.4;

/** How long a patrol halts at each stop of its round, in seconds, before it rolls on. */
export const PATROL_HALT_S = 20;

/**
 * How far from the place it is kept near a patrol may stop, in tiles. Within sight of the Caravan
 * Ground rather than anywhere in the basin: a patrol of somewhere is near it.
 */
export const PATROL_RANGE = 8;

/** Ground a wheel will not cross, unless there is a bridge. Marsh and water. */
const WET: ReadonlySet<string> = new Set(['wetland', 'river', 'sea', 'coast', 'sky_water']);

/** Whether the way between two stops stays out of marsh and water the whole way. */
function dryWay(world: World, from: Point, to: Point): boolean {
  return wayBetween(world, from, to).every((at) => {
    const tile = world.tiles[at.y]?.[at.x];
    return Boolean(tile && (tile.bridge || !WET.has(tile.biome)));
  });
}

/**
 * The round one patrol keeps, on one world: dry stops near its place, joined by dry ways.
 *
 * Empty when the place did not get placed or no dry ground lies near it -- the honest answer, as for
 * an animal whose habitat the map lacks.
 */
export function patrolCircuit(world: World, patrol: Patrol, places: readonly { poiId: string; at: Point }[]): Point[] {
  const home = places.find((p) => p.poiId === patrol.near)?.at;
  if (!home) return [];
  const near = groundTiles(world, patrol.ground).filter(
    (t) => Math.abs(t.x - home.x) <= PATROL_RANGE && Math.abs(t.y - home.y) <= PATROL_RANGE
  );
  return circuitAmong(world, near, patrol.vehicle, (a, b) => dryWay(world, a, b));
}

/**
 * The wanderers on one map, with their ground resolved.
 *
 * Takes the world because a circuit is a fact about one generated map rather than about canon, the
 * same reason `stopsOf` takes the placed points of interest instead of looking them up.
 */
export function wanderersOn(
  fieldMapId: string,
  world: World,
  places: readonly { poiId: string; at: Point }[] = []
): Wanderer[] {
  const out: Wanderer[] = [];
  for (const canonId of WANDERS[fieldMapId] ?? []) {
    const id = engineId(canonId);
    const species = metSpecies(id);
    // Not in canon, or not an animal: dropped rather than guessed at. A bundle can be older than
    // the code that names a species, and a missing whale is better than a crash on load.
    if (!species || !('mood' in species)) continue;
    const away = KEEPS_AWAY[canonId];
    const circuit = away ? circuitAwayFor(world, species as Creature, places, away) : circuitFor(world, species as Creature);
    if (circuit.length === 0) continue;
    const creature = species as Creature;
    out.push({
      id,
      name: creature.name,
      species: creature,
      vehicle: null,
      ground: [...creature.biomes],
      circuit,
      hours: COMMON_HOURS
    });
  }
  // The patrols, after the animals. A vehicle the making data does not carry is dropped, as an
  // animal canon does not carry is.
  for (const patrol of PATROLS[fieldMapId] ?? []) {
    const craft = vehicles.find((v) => v.id === patrol.vehicle);
    if (!craft) continue;
    const circuit = patrolCircuit(world, patrol, places);
    if (circuit.length === 0) continue;
    out.push({
      id: engineId(patrol.vehicle),
      name: craft.name,
      species: null,
      vehicle: craft.id,
      ground: [...patrol.ground],
      circuit,
      // Unused: a patrol keeps the scene's clock, not the day's (`patrolAt`).
      hours: COMMON_HOURS
    });
  }
  return out;
}

/**
 * How far an animal keeps from people, in tiles: from the places people live or stop (`camps.isCamp`
 * -- settlements and cart stops -- and the settlement ground itself), and from every tile a
 * temporary camp could pitch on (`encampments.campGround`). `stops` holds for the four tiles it
 * rests on; `way` for every tile walked between them, a little closer, so it may cross a road but
 * never walk one into a town.
 */
export interface KeepsAway {
  settlements: number;
  camps: number;
  waySettlements: number;
  wayCamps: number;
}

/**
 * **Vasuki keeps far from people** (the owner, 4 October 2026): far from any settlement and any
 * temporary camp, crossing a road where it must. Measured over twelve seeds of North Dwarka (48 x 48,
 * with 117 to 370 tiles a camp could pitch on): stops ten tiles from settlements and four from camp
 * ground, ways eight and three, leave a full round of four stops on every seed. Five from camp
 * ground left one seed a single stop.
 */
const KEEPS_AWAY: Record<string, KeepsAway> = {
  fauna_vasuki_indicus: { settlements: 10, camps: 4, waySettlements: 8, wayCamps: 3 }
};

/** The tiles people live on or stop at, and the tiles a temporary camp could pitch on. */
function peopleOn(world: World, places: readonly { poiId: string; at: Point }[]): { lived: Point[]; camps: Point[] } {
  const lived = places.filter((p) => {
    const place = poi(p.poiId);
    return place ? isCamp(place) : false;
  }).map((p) => p.at);
  for (const row of world.tiles) for (const t of row) if (t.biome === 'settlement') lived.push({ x: t.x, y: t.y });
  // The same ground a camp chooses from, and the same half of it (`encampmentOn`): the better-hidden
  // half, furthest from the roads. A round is one world's and a camp moves each turn, so the round
  // keeps from every tile a camp could ever stand on.
  const ground = campGround(world, places.map((p) => p.at));
  return { lived, camps: ground.slice(0, Math.max(1, Math.ceil(ground.length / 2))) };
}

const chebyshev = (a: Point, b: Point): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/**
 * An animal's round, kept away from people (`KEEPS_AWAY`). Its stops are habitat far enough from
 * every settlement and camp site; its ways stay a little less far, all the way along.
 *
 * Needs the placed points of interest: without them nothing is known of where people are, and the
 * honest answer is no round at all rather than one that walks into the market.
 */
export function circuitAwayFor(
  world: World,
  species: Creature,
  places: readonly { poiId: string; at: Point }[],
  away: KeepsAway
): Point[] {
  if (places.length === 0) return [];
  const { lived, camps } = peopleOn(world, places);
  const far = (p: Point, fromLived: number, fromCamps: number) =>
    lived.every((q) => chebyshev(p, q) >= fromLived) && camps.every((q) => chebyshev(p, q) >= fromCamps);
  const tiles = habitatTiles(world, species).filter((p) => far(p, away.settlements, away.camps));
  return circuitAmong(world, tiles, species.id, (a, b) =>
    wayBetween(world, a, b).every((p) => far(p, away.waySettlements, away.wayCamps))
  );
}

/** Where a patrol is, to the fraction of a tile, and whether it is rolling. */
export interface PatrolPlace {
  /** The tile it is over, for coming alongside and for depth. */
  at: Point;
  /** Where it is drawn, in tiles, between the tile it left and the next. */
  exact: { x: number; y: number };
  /** Which way it is rolling; null while it halts. */
  heading: Whereabouts['heading'];
}

/**
 * Where a patrol is at this moment of the scene's clock, in seconds.
 *
 * **The whole round as one loop**: halt at a stop for `PATROL_HALT_S`, roll the way to the next at
 * `PATROL_PACE`, halt, and on round. Pure, and stores nothing, like the strait's traffic: the start
 * of the loop is seeded on the world and the craft, so two sessions are not in step but one session
 * never jumps. Null for a round of fewer than two stops.
 */
export function patrolAt(world: World, wanderer: Wanderer, seconds: number): PatrolPlace | null {
  const stops = wanderer.circuit;
  if (stops.length < 2) return null;
  const legs = stops.map((from, i) => wayBetween(world, from, stops[(i + 1) % stops.length]!));
  const lengths = legs.map((way) => PATROL_HALT_S + Math.max(0, way.length - 1) / PATROL_PACE);
  const loop = lengths.reduce((a, b) => a + b, 0);
  const offset = tileHash(world.seed, 0, 0, `patrol:${wanderer.id}`) % Math.max(1, Math.floor(loop));
  let t = (((seconds + offset) % loop) + loop) % loop;
  for (let i = 0; i < legs.length; i += 1) {
    const way = legs[i]!;
    if (t >= lengths[i]!) {
      t -= lengths[i]!;
      continue;
    }
    if (t < PATROL_HALT_S || way.length < 2) {
      const at = way[0] ?? stops[i]!;
      return { at, exact: { x: at.x, y: at.y }, heading: null };
    }
    const along = Math.min(way.length - 1, (t - PATROL_HALT_S) * PATROL_PACE);
    const index = Math.min(way.length - 2, Math.floor(along));
    const from = way[index]!;
    const to = way[index + 1]!;
    const frac = along - index;
    const exact = { x: from.x + (to.x - from.x) * frac, y: from.y + (to.y - from.y) * frac };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const heading =
      Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : dy > 0 ? 'south' : 'north';
    return { at: frac < 0.5 ? from : to, exact, heading };
  }
  const at = stops[0]!;
  return { at, exact: { x: at.x, y: at.y }, heading: null };
}

/**
 * Where a wanderer has got to, given the day and where in it we are.
 *
 * Straight through to `travellers.whereabouts`, which is the point: an animal keeps the same hours
 * as everybody else on the map, is at a stop at dawn and dusk, and is only found moving in between.
 * Sharing it means the two can never drift into two different ideas of what an hour is -- and the
 * one bug that model has already had, phase zero being first light rather than midnight, is fixed
 * in one place for both.
 */
export function wandererAt(
  world: World,
  wanderer: Wanderer,
  day: number,
  phase: number
): Whereabouts | null {
  return whereabouts(world, wanderer.circuit, day, phase, wanderer.hours);
}

/**
 * Is the player close enough to have come alongside this animal?
 *
 * **One tile, including diagonals, and not the tile itself.** A wanderer is a body standing on
 * ground rather than a thing lying on it, so requiring the player to occupy the same square would
 * mean walking *through* the animal to meet it. Adjacency is also what makes the meeting readable
 * on screen: both sprites are visible, side by side, which a single shared tile cannot show.
 */
export function isAlongside(at: Point, player: Point): boolean {
  return Math.abs(at.x - player.x) <= 1 && Math.abs(at.y - player.y) <= 1;
}
