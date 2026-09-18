// Which bench a place has, and what that bench can work.
//
// **The gap this closes.** Canon's seventeen processes name a site as `performed_at`, and six of
// them say only `settlement`. So every settlement works everything, and no place says what it
// actually *has*: the Nomad Ground -- a drover, a hunter, no buildings -- smelts bronze exactly as
// well as the Camp in the Kilns, which is named after its kilns.
//
// That is not a canon bug. `performed_at` answers "does this need a building at all", which is a
// real question and canon's to answer. What was missing is the next question down, and it is a
// *game* question: **which bench.**
//
// **Canon already answers it, and not through a field.** The 37 points of interest carry no
// `stations` list -- they carry who is standing there, what their trade is, and which recipes they
// teach. And canon has already broken its own flat model with that data: **Ila the apothecary
// stands in `poi_quiet_atelier`, which is an `archaeological_site`** -- somewhere
// `performed_at: [settlement]` says cannot work anything at all. The data is ahead of the rule.
//
// So the derivation is a reading rather than an invention:
//
//   > **A station is a person at a bench.** A workshop with nobody who knows the craft is a shed.
//
// This is the same move `gestures.ts` and `routine.ts` already make and document: derive from
// fields canon has, say plainly what the authored field would need to say, and let canon add it
// later without the game waiting. The exceptions collected here are exactly what a future
// `poi.stations` should enumerate.
//
// **Additive, never subtractive, and that is a safety property rather than a phase.** A station can
// *open* a process somewhere `performed_at` would refuse; it never closes one. Canon's
// `check_playability.py` decides a recipe is performable from `performed_at` alone, so a narrowing
// made game-side would be invisible to it and the two repositories would disagree about what is
// makeable while every check on both sides stayed green. That is the cross-repo blind spot
// `session-craft` names, and it has bitten this project before. Strictly-more-permissive cannot
// strand anything, so this direction is safe without canon having to know.
//
// Pure and free of React and Phaser, like the rest of `content/`.

import { type Process, process as processById, processes } from './making';
import { type PointOfInterest, npcsAt } from './places';

/**
 * The eight benches.
 *
 * **Grouped by what the bench physically is, never by what comes off it.** Three different
 * processes produce a container and one fire does firing, smelting and casting, so grouping by
 * output would put the same hearth in three places and split one kiln into three.
 *
 * Eight is the number that fell out rather than one chosen first. Two tests of the grouping:
 * *would one person build both of these in the same corner?* and *does one of canon's roles own
 * it?* The kiln passes both -- smelting and casting are the same fire at different heats, which
 * `making-gestures.ts` already says in its process-to-gesture table.
 */
export type StationId =
  | 'hearth'
  | 'kiln'
  | 'quern'
  | 'tannery'
  | 'loom'
  | 'bench'
  | 'apothecary'
  | 'slip';

export interface Station {
  id: StationId;
  /** What the board calls it. */
  name: string;
  /** One line on what it is, for the row underneath. */
  description: string;
  /** Canon process ids this bench works. */
  processes: string[];
}

/**
 * The stations, in the order a board should list them.
 *
 * Ordered by how much of a *building* each one is -- a bench and a hearth are things a traveller
 * improvises, a kiln and a slip are things a settlement owns. That puts the rows a player can
 * always use first and the ones that make a place special last, which is the way round a board
 * wants to be read.
 */
export const STATIONS: readonly Station[] = [
  {
    id: 'bench',
    name: 'Bench',
    description: 'A seat and a blade. Carving and knapping, which want nothing but hands.',
    processes: ['process_carving', 'process_knapping']
  },
  {
    id: 'hearth',
    name: 'Hearth',
    description: 'A fire and a pot. Anywhere somebody stops long enough to build one.',
    processes: ['process_cooking', 'process_brewing']
  },
  {
    id: 'apothecary',
    name: 'Apothecary',
    description: 'Sorting, drying and keeping. A bench, a shelf, and somebody who knows the leaf.',
    processes: ['process_purifying', 'process_drying']
  },
  {
    id: 'loom',
    name: 'Loom',
    description: 'A frame and tension. Spinning first, then weaving.',
    processes: ['process_weaving', 'process_spinning']
  },
  {
    id: 'tannery',
    name: 'Tannery',
    description: 'Soaking, and the smell. Retting reed and tanning hide are the same patience.',
    processes: ['process_tanning', 'process_retting']
  },
  {
    id: 'quern',
    name: 'Quern',
    description: 'Stone on stone. Grinding and pressing, and a back that knows it.',
    processes: ['process_grinding', 'process_pressing']
  },
  {
    id: 'kiln',
    name: 'Kiln',
    description: 'One fire, hot enough. Firing, smelting and casting are heats of the same thing.',
    processes: ['process_firing', 'process_smelting', 'process_casting']
  },
  {
    id: 'slip',
    name: 'Slip',
    description: 'Water, and room to lay a hull down beside it.',
    processes: ['process_boatbuilding']
  }
];

const byId = new Map(STATIONS.map((s) => [s.id, s]));

export function station(id: StationId): Station | null {
  return byId.get(id) ?? null;
}

/**
 * Which bench a process belongs to, or null.
 *
 * **`process_gathering` is the deliberate null.** Canon names it a process for a reason it states
 * itself -- every recipe chain has to start somewhere, and a layer whose raw materials arrive by
 * magic cannot be checked for reachability -- but no recipe uses it, and picking a thing up is not
 * a bench job. `making-gestures.ts` maps it anyway to keep its coverage test honest; here it is
 * right for it to have no station, because a board should not offer a bench for stooping.
 */
export function stationForProcess(processId: string): Station | null {
  return STATIONS.find((s) => s.processes.includes(processId)) ?? null;
}

/**
 * Every process a bench works that canon actually holds.
 *
 * Filtered against the bundle rather than trusting the table above, so a canon release that
 * renames or drops a process shows up as a shorter list rather than as a row that quietly offers
 * nothing. `test/stations.test.ts` asserts the two agree.
 */
export function processesAt(id: StationId): Process[] {
  const s = station(id);
  if (!s) return [];
  return processes.filter((p) => s.processes.includes(p.id));
}

/**
 * The trades that imply a bench, from canon's `npc.role`.
 *
 * **Read as a substring rather than matched whole, because canon's roles are prose.** They are
 * "keeper of what is left" and "wall-keeper and sweeper", not an enum -- fifteen people and
 * fifteen distinct roles, authored as descriptions. So this asks whether the *word* is in the role,
 * which is the only thing that survives canon writing a sixteenth in the same register.
 *
 * Kept narrow on purpose. A herder implies a tannery because hide and fleece are what a herd
 * gives; a fisher does not imply a slip, because a man with a weir is not a boatwright. Where a
 * trade is ambiguous it is left out and the place's own kind decides instead -- an absent station
 * is recoverable, an invented one teaches the player something untrue.
 */
const ROLE_IMPLIES: readonly [string, StationId][] = [
  ['apothecary', 'apothecary'],
  ['herder', 'tannery'],
  ['drover', 'tannery'],
  ['roofer', 'loom'],
  ['copyist', 'apothecary'],
  ['archivist', 'apothecary'],
  ['stonewaller', 'quern'],
  ['stone-reader', 'quern'],
  ['iron-scavenger', 'kiln'],
  ['bone-picker', 'bench'],
  ['line-keeper', 'slip'],
  ['fisher', 'hearth']
];

/**
 * What a kind of place has before anybody is counted.
 *
 * The floor, and it is deliberately generous: this layer is additive, so a station listed here can
 * only ever open a process somewhere canon's `performed_at` would have refused it. A settlement
 * keeps everything it could already do, which is what makes this safe to ship without canon
 * knowing about it.
 */
const KIND_HAS: Record<string, StationId[]> = {
  settlement: ['bench', 'hearth', 'loom', 'quern', 'tannery', 'kiln', 'slip'],
  travel_node: ['bench', 'hearth', 'slip'],
  // Somewhere people work the ground rather than live on it. A fire and a seat, and no more.
  eco_site: ['bench', 'hearth'],
  archaeological_site: ['bench', 'hearth'],
  anomaly: ['bench', 'hearth'],
  wilderness: ['bench', 'hearth']
};

/**
 * Which benches this place has.
 *
 * **The people are added to the kind, never subtracted from it** -- see the note at the top of this
 * file on why this layer only ever opens things. Ila standing in an archaeological site is what
 * makes the Quiet Atelier an apothecary; nobody standing in a settlement takes its kiln away.
 *
 * Returned in `STATIONS` order rather than in the order they were found, so a board does not
 * reshuffle when canon moves somebody.
 */
export function stationsAt(poi: PointOfInterest): Station[] {
  const here = new Set<StationId>(KIND_HAS[poi.kind] ?? ['bench', 'hearth']);
  for (const npc of npcsAt(poi.id)) {
    const role = npc.role.toLowerCase();
    for (const [word, id] of ROLE_IMPLIES) {
      if (role.includes(word)) here.add(id);
    }
  }
  return STATIONS.filter((s) => here.has(s.id));
}

/**
 * Whether this place works that process.
 *
 * **Canon's answer first, this file's second, and the `||` is the safety property.** An earlier
 * version of this returned the station-derived answer alone and left the caller to compose it with
 * `crafting.placeAllows`. That is exactly the kind of rule somebody forgets, and the test caught it
 * the first time it ran: eleven of canon's seventeen processes name **no** site at all -- retting,
 * spinning, weaving, carving, cooking, pressing, drying, purifying, knapping and gathering are
 * allowed *anywhere* -- and several of them sit on benches only some places have. So a bare
 * station check refused `process_retting` at the Alms Step, which canon says is fine, and that is a
 * narrowing invisible to canon's `check_playability.py`.
 *
 * Putting the composition **inside** the function means no caller can get it wrong. The station
 * layer can now only ever add: it opens a sited process somewhere canon would refuse -- Ila's bench
 * at the Quiet Atelier -- and it is incapable of closing one.
 */
export function worksProcess(poi: PointOfInterest, processId: string): boolean {
  if (allowedByCanon(poi.kind, processId)) return true;
  return stationsAt(poi).some((s) => s.processes.includes(processId));
}

/**
 * What canon's own `performed_at` says about this kind of place.
 *
 * Duplicated in shape from `crafting.placeAllows`, which asks the same question of a *recipe* and
 * a bench. Asked here of a process and a `poi.kind` because this module reasons about places
 * rather than about what the traveller is standing on -- and an empty `performed_at` means
 * anywhere, which is the honest default for hand work and the case that was missed.
 */
function allowedByCanon(kind: string, processId: string): boolean {
  const p = processById(processId);
  if (!p) return false;
  return p.performedAt.length === 0 || p.performedAt.includes(kind);
}

/**
 * The benches a place does *not* have, for the line that names them.
 *
 * A board draws what is here and says the rest in prose -- "No kiln here, and nobody to work one."
 * That is the one place this interface departs from its own "list every action, greyed, with its
 * reason" convention, and the reason is in `docs/activity-boards-plan.md`: drawing all eight
 * everywhere would make every place say the same thing, which is the flatness the board exists to
 * fix.
 */
export function stationsMissing(poi: PointOfInterest): Station[] {
  const here = new Set(stationsAt(poi).map((s) => s.id));
  return STATIONS.filter((s) => !here.has(s.id));
}
