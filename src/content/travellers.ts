// Who else is on the road, and where they have got to.
//
// **Canon already said these people move, and the game drew them standing in every place at once.**
// An `npc`'s `found_at` is a list, and eleven of canon's fifteen carry more than one entry: Marn the
// herder is authored at the terraces, the walking spring and the High Camp; Terke the drover at the
// Nomad Ground *and* the Vedda Ford. `npcsAt` answers that list as a set of simultaneous positions,
// so the map held three Marns. Reading the same field as a **circuit** -- an order to be walked
// rather than a set to be in -- is the whole of this module, and it needs no new canon.
//
// That is the same move `routine.ts` and `gestures.ts` make and document: derive from a field canon
// has, say plainly what the authored field would need to say, and let canon add it later without
// the game waiting. What a future `npc.circuit` would carry is exactly `found_at` in order.
//
// **Nothing here is saved, and that is the load-bearing decision.** A traveller's position is a
// pure function of the seed, their own id, the day and the hour. Storing it would mean a new field
// on `Journey`, which means bumping `SAVE_VERSION`, which discards every journey in existence --
// and throwing away a diary to remember where a drover got to is the wrong trade. Deriving it also
// means the same seed puts the same person on the same tile on every machine, which is the rule
// `world/rng.ts` exists to keep.
//
// Pure: no React, no Phaser, and no clock. The caller owns the hour, exactly as `routine.ts` and
// `momentAt` do.

import { findPath } from '../world/pathfind';
import { isWalkable } from '../world/generate';
import type { Point, Tile, World } from '../world/types';
import { allNpcs, fieldMap, npc, poi, type Npc } from './places';
import { vehicles } from './making';

/**
 * How many travellers a map carries.
 *
 * Three, which is what was asked for and is also about what a map can hold without the road
 * becoming a procession. The Aravali has five people whose `found_at` is a circuit, so the cap
 * genuinely bites there; Narmada has one, so it is filled out with road company.
 *
 * A cap on the *roster* rather than on the drawing, deliberately. Drawing fewer than exist would
 * mean a person who is on the map and not on the screen, which is the kind of half-state that makes
 * a later bug impossible to reason about.
 */
export const TRAVELLERS_PER_MAP = 3;

/**
 * When a traveller sets out and when they arrive, as a fraction of the day.
 *
 * Out shortly after first light and in by evening, so a traveller is **at a place at dawn and at a
 * place at dusk** and only ever found on the road in between. That is what makes a meeting feel
 * like a meeting rather than like catching a tram: the hours you are most likely to be walking are
 * the hours they are. It also means night never has to be special-cased -- nobody is out in it.
 *
 * **Phase zero is first light, not midnight, and getting that wrong is what the browser check
 * caught.** `phaseFromClock` shifts the day by a quarter so a journey opens on the player's own
 * hour without the map being amber at midday; the first version of these two constants read as
 * "a quarter into the day" and put every traveller on the road from **noon until midnight**, with
 * the map empty all morning. Nothing in the Node suite could see it -- the rules were all
 * self-consistent -- and `e2e/road-company.spec.ts` reported "nobody is on the road at noon".
 *
 * Written as clock hours over the offset rather than as bare fractions, because bare fractions are
 * what hid the fault: 0.25 reads as "a quarter into the day" and means noon. `dayNight.ts` spells
 * the same arithmetic `hoursToPhase`, and its own comment records `isNight` making this exact
 * mistake once already -- compared against a bare `hour / 24`, it was false at every hour of the
 * day. The two are deliberately **not** shared: `content/` does not import `game/`, and the
 * dependency runs the other way. `test/travellers.test.ts` asserts they agree instead.
 *
 * Seven in the morning until six in the evening, which is a day's walk.
 */
const AT_HOUR = (hour: number): number => ((hour - 6) / 24 + 1) % 1;
const SETS_OUT = AT_HOUR(7);
const ARRIVES = AT_HOUR(18);

/**
 * Somebody walking between places.
 *
 * Four fields and no state. `circuit` is where they go, `conveyance` is what carries them, and both
 * come from canon -- the first from `found_at`, the second from a `vehicle` whose `crosses` list
 * suits the ground they cover.
 */
export interface Traveller {
  id: string;
  name: string;
  /** What they are, in the register a player reads. Canon's `role` for a named person. */
  role: string;
  /**
   * The canon person this is, or null for road company.
   *
   * **Null is not a lesser traveller, it is a different kind.** A named traveller is somebody canon
   * wrote lines for and `npcsAt` will hand you at a place. Road company are the people a road has
   * that nobody wrote down: they give a direction, a material or the weather ahead, and never a
   * word -- canon owns vocabulary, and inventing some here would be the engine writing canon.
   */
  npcId: string | null;
  /** Point-of-interest ids, walked in order and looped. At least two, or they are not travelling. */
  circuit: string[];
  /** A canon `vehicle_` id, or null on foot. */
  conveyance: string | null;
  /** Which built character sheet draws them. */
  art: string;
}

/**
 * Sheets that draw a traveller and nobody else.
 *
 * **Empty on purpose, and filling it is the whole of the fix.** The complaint is that everybody met
 * on the road is a playable character: `PLAYABLE_SHEETS` below is the five the player chooses from,
 * so a traveller always wears a face the player can also be wearing -- and on the map you are on,
 * one of the three may be wearing yours.
 *
 * Three entries is not a target, it is the exact number. `sheetFor` guarantees no two travellers on
 * a map share a sheet only while the roster is no longer than the list it walks, and
 * `TRAVELLERS_PER_MAP` is 3 -- so three traveller-only sheets give every map three distinct
 * strangers and make a collision with the player impossible rather than unlikely. A fourth would
 * add variety and fix nothing.
 *
 * See `docs/art-brief.md`, Asset 7. When the art lands this list gets the three names, and nothing
 * else in this file changes.
 */
const TRAVELLER_SHEETS: readonly string[] = [
  'traveller-carrier',
  'traveller-drover',
  'traveller-pilgrim'
];

/**
 * The playable five, used only until there are enough traveller sheets to go round.
 *
 * **Assigned by position in the roster rather than by a hash of the id, and the first attempt got
 * that wrong.** Hashing the id is stable and reads as the tidier rule, but two ids can hash to the
 * same sheet -- measured, Thrali and the carrier both came out `malacite` on Lothal, so two of the
 * three people on that map were the same figure. Walking down the list guarantees no repeat while
 * the roster is no longer than this array, which `TRAVELLERS_PER_MAP` makes certain.
 *
 * The offset is a hash of the *map*, so the four maps do not all lead with the same face, and
 * adding a place to canon does not restyle anybody.
 */
const PLAYABLE_SHEETS: readonly string[] = ['mithra', 'mehtar', 'malacite', 'guyuk', 'varuna'];

/**
 * Which list to draw travellers from.
 *
 * **All or nothing, deliberately.** Mixing a part-filled traveller list with the playable five
 * would put one stranger and two player faces on a map, which reads as a bug rather than as
 * progress -- and it would break the no-repeat guarantee, because a name appearing in both lists
 * can be dealt twice. So the switch happens only once the traveller list can cover a whole map on
 * its own.
 *
 * Pure and parameterised so the *rule* is testable rather than only its current answer: the day the
 * art lands there must be a test that already proved the switchover, not one written afterwards to
 * describe it.
 */
export function sheetsToUse(
  travellerOnly: readonly string[],
  playable: readonly string[],
  perMap: number = TRAVELLERS_PER_MAP
): readonly string[] {
  return travellerOnly.length >= perMap ? travellerOnly : playable;
}

/** The sheet for the nth traveller on a map, with no two alike. */
function sheetFor(fieldMapId: string, index: number): string {
  const sheets = sheetsToUse(TRAVELLER_SHEETS, PLAYABLE_SHEETS);
  return sheets[(hashOf(fieldMapId) + index) % sheets.length]!;
}

/** A cheap stable hash over a string, so an id picks the same sheet on every machine. */
function hashOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

/**
 * The road company: the people a road has that nobody wrote down.
 *
 * **Two of them, and they carry no words.** Everything a named person says is authored in canon and
 * reached through `lines`; these have none and must never grow any. What they have instead is a
 * trade and a load, which is what a road actually shows you about somebody before they speak.
 *
 * Their circuits are filled in from whatever places the map has, because that is the honest thing
 * an unnamed carrier does: they are going between two of the places that exist, and which two is
 * not a fact about the world.
 */
const COMPANY: readonly { id: string; name: string; role: string }[] = [
  { id: 'company_carrier', name: 'A carrier', role: 'carrier, with a loaded back' },
  { id: 'company_drover', name: 'A drover', role: 'drover, behind six animals' }
];

/**
 * Which conveyance suits a circuit, or null for on foot.
 *
 * Read off canon's `crosses` rather than named, for the reason `carriageFor` gives about the
 * Lodestone carriage: a fact stored in two places is a fact waiting to disagree. A circuit that
 * stays on plains and settlement is a cart's; one that touches water wants a hull. Nothing is
 * *required* -- a traveller with no suitable craft simply walks, which is what most people did.
 */
function conveyanceFor(grounds: ReadonlySet<string>): string | null {
  if (grounds.size === 0) return null;
  const fits = vehicles.filter((v) => v.crosses.some((b) => grounds.has(b)));
  if (fits.length === 0) return null;
  // The one that covers most of this circuit's ground, ties broken on canon's own order so the
  // answer does not depend on how the bundle happens to be sorted.
  let best = fits[0]!;
  let bestCover = -1;
  for (const v of fits) {
    const cover = v.crosses.filter((b) => grounds.has(b)).length;
    if (cover > bestCover) {
      bestCover = cover;
      best = v;
    }
  }
  return best.id;
}

/** Canon people whose `found_at` names two or more places on this map, in canon's order. */
function circuitPeople(fieldMapId: string): Npc[] {
  const here = new Set(fieldMap(fieldMapId)?.pointsOfInterest ?? []);
  return allNpcs().filter((n) => n.foundAt.filter((id) => here.has(id)).length >= 2);
}

/**
 * Everybody travelling on this map.
 *
 * Canon's own circuit-walkers first and road company after, capped at `TRAVELLERS_PER_MAP`. That
 * ordering is the point: a map with people who genuinely move gets those people, and only a map
 * without enough of them invents anybody.
 *
 * Measured across the four maps, canon supplies five on the Aravali, three on Dwarka, two on Lothal
 * and one on Narmada -- so the Aravali is capped, Dwarka is exactly filled, and the other two are
 * topped up.
 */
export function travellersOn(fieldMapId: string): Traveller[] {
  const places = fieldMap(fieldMapId)?.pointsOfInterest ?? [];
  const here = new Set(places);
  const out: Traveller[] = [];

  for (const person of circuitPeople(fieldMapId)) {
    if (out.length >= TRAVELLERS_PER_MAP) break;
    const circuit = person.foundAt.filter((id) => here.has(id));
    const grounds = new Set(circuit.flatMap((id) => poi(id)?.terrain ?? []));
    out.push({
      id: person.id,
      name: person.name,
      role: person.role,
      npcId: person.id,
      circuit,
      conveyance: conveyanceFor(grounds),
      art: sheetFor(fieldMapId, out.length)
    });
  }

  // Road company fills what canon did not, walking between places the map actually has. Their
  // circuit is chosen by a hash of the map and their own id, so it is the same on every machine and
  // does not move when a place is added ahead of them in canon's list.
  for (const who of COMPANY) {
    if (out.length >= TRAVELLERS_PER_MAP) break;
    if (places.length < 2) break;
    const salt = hashOf(`${fieldMapId}:${who.id}`);
    const first = places[salt % places.length]!;
    const second = places[(salt + 1 + (salt >> 8) % (places.length - 1)) % places.length]!;
    if (first === second) continue;
    const circuit = [first, second];
    const grounds = new Set(circuit.flatMap((id) => poi(id)?.terrain ?? []));
    out.push({
      id: who.id,
      name: who.name,
      role: who.role,
      npcId: null,
      circuit,
      conveyance: conveyanceFor(grounds),
      art: sheetFor(fieldMapId, out.length)
    });
  }

  return out;
}

/** Where somebody is, and which way they are facing, at one moment. */
export interface Whereabouts {
  at: Point;
  /** Which way they are walking, for the sprite. Null while they are standing still. */
  heading: 'north' | 'east' | 'south' | 'west' | null;
  /** True between dusk and the next morning, when they are stopped at a place. */
  resting: boolean;
  /** Where they set out from, and where they are going. Both are stops on the circuit. */
  from: Point;
  to: Point;
}

/**
 * The way between two stops, preferring the road.
 *
 * **Cached, because it is a pure function of the ground and this is asked once a tick.** The cache
 * is keyed on the world's seed and the two ends, so two worlds never share an answer and a
 * regenerated map never reads a stale one.
 *
 * The road is preferred rather than required: a route between two places may cross a ford, where
 * `fieldMap.ts` deliberately refuses the flag, and a traveller who would not get their feet wet
 * would be stuck on the bank for ever.
 */
const paths = new Map<string, Point[]>();

export function wayBetween(world: World, from: Point, to: Point): Point[] {
  const key = `${world.seed}:${from.x},${from.y}>${to.x},${to.y}`;
  const had = paths.get(key);
  if (had) return had;

  const walked = findPath(
    world.tiles,
    world.width,
    world.height,
    from,
    to,
    (tile: Tile) => isWalkable(tile),
    // A road is a road because people walk it, so a traveller walking it is the reason it is there.
    // Eight against one is enough to pull a route onto a path that runs roughly the right way and
    // not enough to send somebody a long way round to find one.
    (tile: Tile) => (tile.road ? 1 : 8)
  );
  const full = [from, ...walked];
  paths.set(key, full);
  return full;
}

/**
 * Where a traveller has got to, given the day and where in it we are.
 *
 * **The whole of the position model, and it stores nothing.** The day picks the leg -- a circuit of
 * two stops alternates, one of three goes round -- and the hour picks how far along it they are.
 * Before `SETS_OUT` they are still at the stop they slept at; after `ARRIVES` they are at the one
 * they reached. So dawn and dusk always find somebody at a place, and only the middle of the day
 * finds them on the road.
 *
 * `phase` is the same 0-to-1 fraction `phaseAt` returns, and `day` the same count the journey
 * keeps. Both are passed in rather than read, because this module must not own a clock.
 *
 * Returns null when the circuit has fewer than two stops it can resolve -- a person who is only
 * ever in one place is not travelling, and inventing a walk for them would put somebody on the road
 * canon never sent anywhere.
 */
export function whereabouts(
  world: World,
  stops: readonly Point[],
  day: number,
  phase: number
): Whereabouts | null {
  if (stops.length < 2) return null;

  const leg = ((day % stops.length) + stops.length) % stops.length;
  const from = stops[leg]!;
  const to = stops[(leg + 1) % stops.length]!;

  const way = wayBetween(world, from, to);
  // Nowhere to walk: the two stops are the same tile, or nothing joins them. Standing at the first
  // is the honest answer -- better a person in a place than a person nowhere.
  if (way.length < 2) return { at: from, heading: null, resting: true, from, to };

  if (phase < SETS_OUT) return { at: from, heading: null, resting: true, from, to };
  if (phase >= ARRIVES) return { at: to, heading: null, resting: true, from, to };

  const along = (phase - SETS_OUT) / (ARRIVES - SETS_OUT);
  // `way` includes both ends, so the last index is the destination and `along` of 1 would land on
  // it exactly at the moment `ARRIVES` takes over. Clamped so a rounding error cannot read past it.
  const index = Math.min(way.length - 1, Math.floor(along * (way.length - 1)));
  const at = way[index]!;
  const next = way[Math.min(way.length - 1, index + 1)]!;

  const dx = next.x - at.x;
  const dy = next.y - at.y;
  const heading =
    dx === 0 && dy === 0
      ? null
      : Math.abs(dx) >= Math.abs(dy)
        ? dx > 0
          ? 'east'
          : 'west'
        : dy > 0
          ? 'south'
          : 'north';

  return { at, heading, resting: false, from, to };
}

/**
 * The stops of a circuit, resolved to tiles.
 *
 * Takes the placed points of interest rather than looking them up, because where a place landed is
 * a fact about one generated world and this module does not hold one. A stop canon names that did
 * not get placed is dropped rather than guessed at, which is why the result can be shorter than the
 * circuit and why `whereabouts` checks its length.
 */
export function stopsOf(
  traveller: Traveller,
  placed: readonly { poi: { id: string }; at: Point }[]
): Point[] {
  return placedCircuit(traveller, placed).map((s) => s.at);
}

/**
 * The same stops, still carrying which place each one is.
 *
 * **`stopsOf` throws the ids away, and the card needs them back.** Saying *on the road to the
 * Nomad Ground* means naming the stop being walked to, and a tile cannot say which place it is.
 * The filter lives here rather than in both: a stop canon names that did not get placed is dropped
 * from the ids and the points together, so the two can never fall out of step and have an index
 * mean two different legs.
 */
export function placedCircuit(
  traveller: Traveller,
  placed: readonly { poi: { id: string }; at: Point }[]
): { poiId: string; at: Point }[] {
  const where = new Map(placed.map((p) => [p.poi.id, p.at]));
  return traveller.circuit
    .map((poiId) => ({ poiId, at: where.get(poiId) }))
    .filter((s): s is { poiId: string; at: Point } => s.at !== undefined);
}


/**
 * Where a traveller has got to, in the few facts a card can say out loud.
 *
 * **Deliberately smaller than `Whereabouts`, and that is the point of it existing.** `Whereabouts`
 * is tiles and a heading -- everything the scene needs to put a sprite somewhere and nothing a
 * player would read. This is what somebody would answer if you asked them where they were going,
 * and it is what crosses the `EventBus` seam, because a tile coordinate is not an answer to that
 * question and React has no business holding one.
 */
export interface TravellerState {
  /** True while they are stopped at a place: before they set out, and once they have arrived. */
  resting: boolean;
  /** The place they are stopped at, or null while they are between two. */
  atPoi: string | null;
  /** The stop they are walking to, or null while they are not walking. */
  boundFor: string | null;
}

/**
 * Read the state off a position, without re-deriving the rule that made it.
 *
 * The hours a traveller keeps live in `SETS_OUT` and `ARRIVES` and are applied once, in
 * `whereabouts`. Asking *which place is this tile* is enough to recover the rest, so the rule is
 * not written twice and cannot be changed in one copy -- the same argument `stopsOf` makes about
 * dropping an unplaced stop in one place.
 */
export function travellerState(
  circuit: readonly { poiId: string; at: Point }[],
  where: Whereabouts | null
): TravellerState | null {
  if (!where) return null;
  const idAt = (p: Point) => circuit.find((s) => s.at.x === p.x && s.at.y === p.y)?.poiId ?? null;
  return {
    resting: where.resting,
    atPoi: where.resting ? idAt(where.at) : null,
    boundFor: where.resting ? null : idAt(where.to)
  };
}

/**
 * One thing a card says about somebody, in the register a chip is read in.
 *
 * `kind` rather than a position in the array: the stylesheet and the tests both want to name one
 * of these, and counting them is how a guard starts passing for the wrong reason.
 */
export interface TravellerAttribute {
  kind: 'doing' | 'who' | 'speaks';
  label: string;
}

/**
 * What a traveller's card says about them while you are talking to them.
 *
 * **This is what replaced drawing the mount.** Every traveller carries a `conveyance` and none of
 * it is drawn; the call was that a player does not need to see the cart to know there is one, and
 * that a line of standing facts on the person -- what they are doing, what they are, what they
 * speak -- says more about a stranger met on a road than a cart sprite would.
 *
 * **The derived conveyance is deliberately not one of them.** `conveyanceFor` picks a canon vehicle
 * off the ground a circuit crosses, which is a reasonable guess for road company the engine
 * invented and a contradiction for a person canon wrote: it gives Kunch a reed raft, and canon has
 * him *"road singer, up on a bird"*. Canon's `role` is where how-somebody-travels is said, so the
 * role is shown verbatim and nothing is derived over the top of it. The day canon authors the field
 * outright -- an `npc.travels_by` -- it becomes a fourth chip and this comment is why it is not one
 * now.
 *
 * Pure, and takes the state rather than a world: the same person on the same leg reads the same on
 * every machine, which is the rule the whole module is built to keep.
 */
export function travellerAttributes(
  traveller: Traveller,
  state: TravellerState | null
): TravellerAttribute[] {
  const out: TravellerAttribute[] = [];

  if (state) {
    const place = (id: string | null) => (id ? (poi(id)?.name ?? null) : null);
    const at = place(state.atPoi);
    const to = place(state.boundFor);
    out.push({
      kind: 'doing',
      label: state.resting
        ? at
          ? `Stopped at ${at}`
          : 'Stopped, and in no hurry'
        : to
          ? `On the road to ${to}`
          : 'On the road since first light'
    });
  }

  // Canon writes a role lower-case and mid-sentence -- "road singer, up on a bird". A chip is not
  // mid-sentence, so it takes a capital and nothing else: rewriting it would be the engine
  // paraphrasing canon, and the phrase is the part worth keeping.
  if (traveller.role) {
    out.push({ kind: 'who', label: traveller.role[0]!.toUpperCase() + traveller.role.slice(1) });
  }

  const language = traveller.npcId ? (npc(traveller.npcId)?.language ?? null) : null;
  if (language) {
    out.push({
      kind: 'speaks',
      label: `Speaks ${language[0]!.toUpperCase()}${language.slice(1)}`
    });
  }

  return out;
}
