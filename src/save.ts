import { type Collection, readCollection } from './content/collection';
import { type Satchel, emptySatchel } from './content/satchel';
import { type Drawn, type Nodes, noNodes } from './content/nodes';
import { type Progress, emptyProgress } from './journey';
import type { DiaryEventEntry, EventOrigin } from './content/diaryEvents';
import { readEncounters, type EncounterState } from './content/encounterState';
import { readNpcAppearances, type NpcAppearanceJournal } from './content/npcAppearance';
import { JOURNEY_VERSION, journeyStorageKey as key } from './storageKeys';

/** The current journey and its cached ground share a storage lifecycle. */
export const SAVE_VERSION = JOURNEY_VERSION;

export interface Journey {
  version: number;
  encounters?: EncounterState;
  /**
   * Who was walking.
   *
   * Optional rather than versioned: every save written before there was a choice has no field, and
   * absent means Varuna, which is who those journeys were. A bump would have invalidated them to
   * record something that was already true of all of them.
   */
  characterId?: string;
  /**
   * Which field map the traveller is on.
   *
   * Optional on `characterId`'s precedent: absent means Lothal, which is where every journey written
   * before this was kept began -- and, since nothing remembered otherwise, where a reload put them
   * back. A `?map=` in the address still wins, so a link to the crossing opens the crossing.
   */
  fieldMapId?: string;
  discovered: string[];
  /**
   * The flora and fauna met, keyed by species id.
   *
   * Was `observed: string[]` -- creature names, appended by a button, read only to print a
   * list. See `content/collection.ts` for why both the key and the filling changed.
   */
  collection: Collection;
  /** Whether the landmark was found. Kept so the travel log survives a reload. */
  reached: boolean;
  /**
   * What the player knows.
   *
   * The game has no experience points, so this is the whole of progression: how far up each
   * discovery's ladder they have got, which words they hold, and which reading they settled
   * on for each field question. `src/journey.ts` holds every rule about advancing it; this
   * only stores it.
   */
  progress: Progress;
  /**
   * What the traveller is carrying, keyed by canon id.
   *
   * A flat record of counts, which is the whole of it: there is no weight, no slots and
   * nothing that spoils. See `content/satchel.ts` for why that is narrower than it sounds.
   */
  satchel: Satchel;
  /**
   * What the traveller has drawn down, and when.
   *
   * The first thing in this save that records an *absence*. Everything else is what a player
   * has gained -- rungs, words, things carried -- and this is what a place no longer has,
   * which is why it could not be derived from the seed like the rest of the world.
   *
   * Only the tiles somebody actually drew from are stored, and a node that has grown back to
   * full is deleted rather than kept, so an untouched world costs nothing here.
   *
   * **Kept per field map.** It was one flat record keyed `x,y,material`, with no map in the key --
   * so reeds stripped at 12,30 on Lothal left 12,30 picked over on the Narmada as well, on ground
   * the traveller had never stood on. An older save's flat `nodes` is read as Lothal's: nothing
   * remembered which map it was, and Lothal is where those journeys were.
   */
  nodesByMap: NodesByMap;
  /**
   * How much of the journey's time has been spent, in milliseconds.
   *
   * The scene owns the clock and resets it to nought on every boot, which was invisible while
   * nothing depended on elapsed time. It stops being invisible the moment a reed bed regrows on
   * a schedule: without this, closing the tab would put the traveller back at dawn of day one
   * and every node would be as freshly cut as the hour it was cut.
   */
  travelled: number;
  /**
   * Which events have already happened, so a `once` event does not come round again.
   *
   * **Optional rather than versioned, and that follows `characterId`'s precedent above.** Absent
   * means "none, so far" — which is true of every journey written before events existed, because
   * there were none to have. Bumping `SAVE_VERSION` would discard every save in the world to
   * record something that is already true of all of them, and throwing away a player's progress
   * to remember an empty list is the wrong trade by a wide margin.
   *
   * A flat list of ids rather than a record, because the only question ever asked of it is
   * membership. `content/events.ts` decides what goes in; this only stores it.
   */
  seenEvents?: string[];
  /** Resolved narrative occurrences, in diary order. Optional for older saves. */
  diaryEvents?: DiaryEventEntry[];
  /**
   * The strangers the player has met in an event, by the id their event carried.
   *
   * What lets somebody on the road recognise you the second time. Optional and unversioned on
   * `seenEvents`' precedent: absent is "nobody yet", which is true of every older save.
   */
  met?: string[];
  npcAppearances?: NpcAppearanceJournal;
  /**
   * The day each event last happened, by id. What lets a storylet come round again after its
   * `again_after`, and the pacer know how long the road has been quiet. Optional on `met`'s
   * precedent: absent is "never", which is true of every older save.
   */
  eventDays?: Record<string, number>;
  /** Flags earlier choices left behind, for a later event to find -- `sheltered:<stranger>`. */
  flags?: string[];
  /**
   * The recipe pinned in the workshop, whose needs the dock keeps on screen. Optional on `flags`'
   * precedent: absent is "nothing pinned", which is true of every older save.
   */
  pinned?: string;
}

const empty = (): Journey => ({
  version: SAVE_VERSION,
  discovered: [],
  collection: {},
  reached: false,
  progress: emptyProgress(),
  satchel: emptySatchel(),
  nodesByMap: {},
  travelled: 0,
  seenEvents: [],
  diaryEvents: [],
  met: [],
  npcAppearances: {},
  eventDays: {},
  flags: []
});

/** A record of whole, non-negative day numbers, or none. Anything else in it is dropped. */
function readDays(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [id, day] of Object.entries(value as Record<string, unknown>)) {
    if (typeof day === 'number' && Number.isInteger(day) && day >= 0) out[id] = day;
  }
  return out;
}

/** A list of strings, or none. A stored value from some other shape must never reach a caller. */
function readIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
}

const EVENT_ORIGINS: readonly EventOrigin[] = ['happening', 'discovery', 'sub-location', 'woven'];

function readDiaryEvents(value: unknown): DiaryEventEntry[] {
  if (!Array.isArray(value)) return [];
  const out: DiaryEventEntry[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const e = raw as Partial<DiaryEventEntry>;
    if (
      typeof e.id !== 'string' || typeof e.eventId !== 'string' ||
      !EVENT_ORIGINS.includes(e.origin as EventOrigin) || typeof e.title !== 'string' ||
      typeof e.prose !== 'string' || typeof e.choiceId !== 'string' ||
      typeof e.choiceLabel !== 'string' || typeof e.outcome !== 'string' ||
      typeof e.day !== 'number' || !Number.isInteger(e.day) || e.day < 0 ||
      typeof e.fieldMapId !== 'string'
    ) continue;
    const art = e.art && typeof e.art === 'object' &&
      (e.art.collection === 'events' || e.art.collection === 'places' || e.art.collection === 'scenes') &&
      typeof e.art.key === 'string' && typeof e.art.take === 'number' && Number.isInteger(e.art.take)
      ? { collection: e.art.collection, key: e.art.key, take: e.art.take }
      : null;
    out.push({
      id: e.id, eventId: e.eventId, origin: e.origin as EventOrigin,
      ...(typeof e.subjectId === 'string' ? { subjectId: e.subjectId } : {}),
      title: e.title, prose: e.prose, choiceId: e.choiceId, choiceLabel: e.choiceLabel,
      outcome: e.outcome, day: e.day, fieldMapId: e.fieldMapId,
      ...(Array.isArray(e.campResidents) ? { campResidents: readIds(e.campResidents) } : {}),
      ...(typeof e.poiId === 'string' ? { poiId: e.poiId } : {}), art
    });
  }
  return out;
}

/** Anything unrecognisable becomes an empty progress rather than a half-read one. */
function readProgress(value: unknown): Progress {
  if (!value || typeof value !== 'object') return emptyProgress();
  const raw = value as Partial<Progress>;
  return {
    rungs: raw.rungs && typeof raw.rungs === 'object' ? { ...raw.rungs } : {},
    words: Array.isArray(raw.words) ? raw.words : [],
    recipes: Array.isArray(raw.recipes) ? raw.recipes : [],
    made: Array.isArray(raw.made) ? raw.made : [],
    answered: raw.answered && typeof raw.answered === 'object' ? { ...raw.answered } : {},
    questions: Array.isArray(raw.questions) ? raw.questions : []
  };
}

/** Anything unrecognisable becomes an empty satchel, on the same terms as progress. */
function readSatchel(value: unknown): Satchel {
  if (!value || typeof value !== 'object') return emptySatchel();
  const out: Satchel = {};
  for (const [id, n] of Object.entries(value as Record<string, unknown>)) {
    // A count that is not a positive whole number is a corrupted stack, not a hint. Dropping
    // it keeps `carried()` honest -- every key in a satchel is something actually held.
    if (typeof n === 'number' && Number.isInteger(n) && n > 0) out[id] = n;
  }
  return out;
}

/**
 * Anything unrecognisable becomes an untouched world, on the same terms as the satchel.
 *
 * A malformed node is dropped rather than repaired, and dropping one means that place is full
 * again -- which is the safe direction to be wrong in. The other way round would take something
 * from a player on the strength of a corrupted number.
 */
/** What a journey has drawn down, by field map. */
export type NodesByMap = Record<string, Nodes>;

function readNodesByMap(value: unknown): NodesByMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: NodesByMap = {};
  for (const [mapId, nodes] of Object.entries(value)) {
    const read = readNodes(nodes);
    if (Object.keys(read).length > 0) out[mapId] = read;
  }
  return out;
}

function readNodes(value: unknown): Nodes {
  if (!value || typeof value !== 'object') return noNodes();
  const out: Nodes = {};
  for (const [at, drawn] of Object.entries(value as Record<string, unknown>)) {
    if (!drawn || typeof drawn !== 'object') continue;
    const { left, day } = drawn as Partial<Drawn>;
    if (typeof left !== 'number' || !Number.isInteger(left) || left < 0) continue;
    if (typeof day !== 'number' || !Number.isFinite(day) || day < 0) continue;
    out[at] = { left, day };
  }
  return out;
}

export function loadJourney(seed: string): Journey {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key(seed));
  } catch {
    // Private browsing and blocked storage both throw here. The game still plays; it just forgets.
    return empty();
  }
  if (!raw) return empty();

  try {
    const parsed = JSON.parse(raw) as Partial<Journey>;
    if (parsed.version !== SAVE_VERSION || !Array.isArray(parsed.discovered) ||
        !parsed.progress || !parsed.collection || !parsed.satchel || !parsed.nodesByMap ||
        !Number.isFinite(parsed.travelled) || parsed.travelled! < 0) {
      localStorage.removeItem(key(seed));
      return empty();
    }
    return {
      version: SAVE_VERSION,
      characterId: typeof parsed.characterId === 'string' ? parsed.characterId : undefined,
      fieldMapId: typeof parsed.fieldMapId === 'string' ? parsed.fieldMapId : undefined,
      discovered: readIds(parsed.discovered),
      reached: parsed.reached === true,
      collection: readCollection(parsed.collection),
      progress: readProgress(parsed.progress),
      satchel: readSatchel(parsed.satchel),
      nodesByMap: readNodesByMap(parsed.nodesByMap),
      travelled: parsed.travelled!,
      seenEvents: readIds(parsed.seenEvents),
      diaryEvents: readDiaryEvents(parsed.diaryEvents),
      met: readIds(parsed.met),
      eventDays: readDays(parsed.eventDays),
      flags: readIds(parsed.flags),
      pinned: typeof parsed.pinned === 'string' ? parsed.pinned : undefined,
      npcAppearances: readNpcAppearances(parsed.npcAppearances),
      encounters: readEncounters(parsed.encounters)
    };
  } catch {
    clearJourney(seed);
    return empty();
  }
}

export function saveJourney(seed: string, journey: Omit<Journey, 'version'>): void {
  try {
    localStorage.setItem(key(seed), JSON.stringify({ ...journey, version: SAVE_VERSION }));
  } catch {
    // The current session remains playable if storage is blocked or full.
  }
}

/**
 * Whether this seed has a journey in progress, as opposed to one waiting to start.
 *
 * What the front door asks before deciding whether to offer *continue*. Read from the save
 * rather than kept as a flag, on the same discipline as everything else here: a flag would be a
 * second source of truth about a question the payload already answers.
 *
 * **Fog is the test, and it is the earliest thing to move.** `discovered` fills as the traveller
 * walks, before a single rung is climbed or anything is picked up -- so a journey that has gone
 * ten steps and found nothing still counts as begun, which is what a player who walked ten steps
 * would expect. Progress, the satchel and the collection all lag it, and using any of them would
 * offer to start over on a walk somebody was in the middle of.
 *
 * The clock is checked too, because a traveller can stand still and let the hours pass -- resting
 * at a camp moves `travelled` without moving anybody.
 */
export function hasBegun(journey: Journey): boolean {
  return journey.discovered.length > 0 || journey.travelled > 0;
}

export function clearJourney(seed: string): void {
  try {
    localStorage.removeItem(key(seed));
  } catch {
    /* nothing to do */
  }
}
