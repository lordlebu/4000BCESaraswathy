// Events made on the spot, from what is actually here.
//
// **`events.ts` is a registry nobody has written into, and this does not change that.** An
// authored event -- a dream on the third night, somebody with a question -- is still the better
// thing, and whenever one can happen it wins. What this adds is the *ordinary* happening: tracks
// across the path, rain coming over the plain, a carrier falling in beside you for a mile. Those
// are not stories anybody needs to write one at a time, because everything they are made of is
// already on the tile -- the creature `species.ts` put there, the plant, the ground, the weather
// `moment.ts` says it is, the road company `travellers.ts` has walking the map.
//
// So a template here is a sentence with holes and a rule for when the holes can be filled. The
// event it weaves is an ordinary `GameEvent`, goes through the same `EventCard`, the same `seen`
// list and the same seeded roll, and a player cannot tell which kind they got. That is the design:
// **one surface, two sources.**
//
// Three rulings hold it in shape.
//
// **A woven event never grants knowledge.** `grants` is empty on every choice here. Words and
// discoveries are canon's progression, authored rung by rung, and a template that handed one over
// would be the engine writing canon -- the same line `travellers.ts` draws for road company, who
// "give a direction, a material or the weather ahead, and never a word". What a woven event can
// give is what that sentence allows: a material, a direction, an eased pair of legs.
//
// **Every choice is takeable and none is worse than the other.** Same rule as `events.ts`.
// "Leave it where it fell" is a real choice with its own line, not a way of losing the material.
//
// **Rationed by `WOVEN_ONE_IN`, and once per subject.** The id names the template and the thing it
// is about -- `woven:tracks:fauna_x` -- so the same tracks are not found twice, but a different
// animal's can be. That keeps `seen` bounded by what the maps hold rather than by how long the
// journey runs.
//
// Pure: no React, no Phaser, no clock. The caller passes the moment and the roll.

import type { BiomeId, Creature, Flora, Point, World } from '../world/types';
import {
  type Choice,
  type Circumstance,
  type EventStranger,
  type GameEvent,
  type Occasion,
  anyConditions,
  eventNow,
  events as authored
} from './events';
import happeningsText from '../../data/happenings.json';
import { type Material, material, materialsIn } from './making';
import { fieldMap, poi, type PointOfInterest } from './places';
import { rhythmOf } from './routine';
import { biomeFor, creatureFor, creaturesIn, floraFor, isAnimal } from './species';
import {
  COMPANY_EASES,
  MEAL_EASES,
  PACE,
  PACE_CEILING,
  VARIETY_DAMP,
  VARIETY_DAYS,
  WOVEN_FROM_DAY,
  WOVEN_ONE_IN
} from './tiers';
import { rendezvousPick } from '../world/rng';
import { travellersOn } from './travellers';

/** A seeded roll, as `eventNow` takes it: the same salt always gives the same number. */
export type Roll = (salt: string) => number;

/**
 * What is around the player when the question is asked. Everything a template may mention.
 *
 * Built by `surroundingsAt` from a world and a tile, so a template never reaches into a world
 * itself -- which is what lets `test/happenings.test.ts` hand one a fixture and read the prose.
 */
export interface Surroundings {
  biome: BiomeId;
  /** Whether the tile is road, which decides whether anything can have been dropped on it. */
  onRoad: boolean;
  creature: Creature | null;
  flora: Flora | null;
  /** Canon's five words for the hour, and the sky. Null before the scene has said. */
  moment: { timeOfDay: string; weather: string } | null;
  /** The place just arrived at, for `arriving`. */
  place: PointOfInterest | null;
  /** Another place on this map, to send somebody on toward. */
  elsewhere: PointOfInterest | null;
  /** A road-company stranger walking this map, if there is one. */
  stranger: EventStranger | null;
  /** Material ids just taken, so `working` does not turn up the same thing twice. */
  taken: readonly string[];
}

/**
 * Read the surroundings off a generated world.
 *
 * `roll` picks which stranger and which other place, so the same tile on the same day names the
 * same ones -- the determinism rule again. Strangers are road company only: a named person is
 * canon's, and meeting them is a conversation with authored lines, not a woven scene.
 */
export function surroundingsAt(
  world: World,
  at: Point,
  fieldMapId: string,
  moment: { timeOfDay: string; weather: string } | null,
  roll: Roll,
  extra: { poiId?: string | null; taken?: readonly string[] } = {}
): Surroundings | null {
  const tile = world.tiles[at.y]?.[at.x];
  if (!tile) return null;
  const place = extra.poiId ? poi(extra.poiId) : null;
  const others = (fieldMap(fieldMapId)?.pointsOfInterest ?? [])
    .filter((id) => id !== place?.id)
    .map((id) => poi(id))
    .filter((p): p is PointOfInterest => p !== null);
  const company = travellersOn(fieldMapId).filter((t) => t.npcId === null && t.look !== null);
  const who = company.length > 0 ? company[roll('stranger') % company.length]! : null;
  return {
    biome: tile.biome,
    onRoad: Boolean(tile.road),
    creature: creatureFor(tile, world.seed),
    flora: floraFor(tile, world.seed),
    moment,
    place,
    elsewhere: others.length > 0 ? others[roll('elsewhere') % others.length]! : null,
    // Qualified by the map, because the carrier on Lothal and the carrier on Dwarka are two people --
    // the same rule their looks are keyed by. Unqualified, meeting one would count as meeting both.
    stranger: who
      ? {
          id: `${fieldMapId}:${who.id}`,
          role: who.role,
          look: who.look!,
          culture: who.culture,
          givenName: who.givenName
        }
      : null,
    taken: extra.taken ?? []
  };
}

// ---------------------------------------------------------------------------------------------
// Prose helpers. Written for a reader; the templates below should read as sentences, not slots.

/** "a heron", "an ibis". */
function a(noun: string): string {
  return /^[aeiou]/i.test(noun) ? `an ${noun}` : `a ${noun}`;
}

/** Mid-sentence, the way `routine.ts` names an animal. */
function lower(name: string): string {
  return name.toLowerCase();
}

/**
 * The ground, as somebody would say it: "the plains", "the high snow".
 *
 * Two biome names are the engine's rather than anybody's word for a place -- `landmark` and
 * `settlement` -- so they read as what they are underfoot.
 */
function ground(biome: BiomeId): string {
  if (biome === 'settlement') return 'the lanes';
  if (biome === 'landmark') return 'the old ground';
  const name = biomeFor(biome)?.name;
  return name ? `the ${lower(name)}` : 'the country';
}

/**
 * A place's name mid-sentence. Canon titles most of them with their article -- "The Rail-Head" --
 * which reads as a stray capital after "at".
 */
function placeName(place: PointOfInterest): string {
  return place.name.replace(/^The /, 'the ');
}

/** Something common enough to have been dropped from somebody's load. */
function droppable(biome: BiomeId, except: readonly string[]): Material[] {
  return materialsIn(biome).filter((m) => m.rarity === 'common' && !except.includes(m.id));
}

/**
 * Something the *ground* holds: common, and won from no living thing.
 *
 * Narrower than `droppable`, and the difference was found by reading the output. Turning up
 * sawfish bone "under what you were taking" is the ground giving up an animal; canon's `won_from`
 * says where a material comes from, and one with a source is not in the soil. The same rule
 * `gathering.ts` keeps for what the ground itself gives.
 */
function underfoot(biome: BiomeId, except: readonly string[]): Material[] {
  return droppable(biome, except).filter((m) => m.wonFrom.length === 0);
}

/**
 * Whether a plant is something to shelter under. A tree, a palm or a shrub; not a lotus, a grass
 * or a lichen, which were all offered as cover from a storm the first time this ran.
 */
const SHELTERING: readonly string[] = ['tree', 'palm', 'shrub'];

// ---------------------------------------------------------------------------------------------
// The words, which live in `data/happenings.json`.

/** A piece of text: one string, or a record of variants chosen by the template. */
type Text = string | Readonly<Record<string, string>>;

interface TemplateText {
  /** How often this kind is picked among those that could happen. */
  weight: number;
  /** A kind sharing a tag with something recent is picked less. See `VARIETY_DAMP`. */
  tags: readonly string[];
  /** Days before this kind can happen again at all. */
  cooldown: number;
  /** Days before the same subject can come round again; null means once. */
  again_after: number | null;
  /** Flags each choice leaves behind. `{stranger}` is the stranger the event is about. */
  sets?: Readonly<Record<string, readonly string[]>>;
  /** Flags this kind needs before it can happen, in the same terms. */
  requires?: readonly string[];
  /** What a stranger of each people gives, by canon material id. */
  gifts?: Readonly<Record<string, string>>;
  slots: readonly string[];
  title: Text;
  prose: Text;
  choices: Readonly<Record<string, { label: Text; line: Text }>>;
}

/** Every template's words, keyed by kind. See the file's own `$comment` for the rules. */
export const TEXT: Readonly<Record<string, TemplateText>> = (
  happeningsText as unknown as { templates: Record<string, TemplateText> }
).templates;

/** The slots a string asks for, in order: `{a_animal}` and `{ground}` from one sentence. */
export function slotsIn(text: string): string[] {
  return [...text.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]!);
}

/**
 * Put the tile's facts into a sentence.
 *
 * A slot with no value is **left written as a slot** rather than dropped, so a missing fact shows
 * as `{plant}` in the prose, which `test/happenings.test.ts` refuses, instead of as a sentence that
 * quietly reads "under the ".
 */
export function fill(text: string, slots: Readonly<Record<string, string | number>>): string {
  return text.replace(/\{([a-z_]+)\}/g, (whole, key: string) => (key in slots ? String(slots[key]) : whole));
}

/** One variant of a piece of text. A plain string has only one. */
function pick(text: Text, variant: string | undefined): string {
  if (typeof text === 'string') return text;
  return (variant !== undefined ? text[variant] : undefined) ?? Object.values(text)[0] ?? '';
}

/** Which kind's choices have been built at least once, so the test can find a choice nobody uses. */
const used = new Set<string>();
export function choicesUsed(): ReadonlySet<string> {
  return used;
}

interface ChoiceSpec {
  id: string;
  /** Which variant of this choice's label and line, when it has several. */
  variant?: string;
  gives?: Choice['gives'];
  eases?: number;
}

/**
 * Build a woven event from its kind's words and the facts that fill them.
 *
 * Throws on a kind or a choice the words file does not have. That is a mismatch between code and
 * data, not a state a player can reach, and failing loudly under test is how it is found.
 */
function woven(
  occasion: Occasion,
  kind: string,
  subject: string,
  slots: Readonly<Record<string, string | number>>,
  choices: readonly ChoiceSpec[],
  options: { variant?: string; stranger?: EventStranger } = {}
): GameEvent {
  const words = TEXT[kind];
  if (!words) throw new Error(`data/happenings.json has no template '${kind}'`);
  return {
    id: `woven:${kind}:${subject}`,
    title: fill(pick(words.title, options.variant), slots),
    occasion,
    conditions: anyConditions(),
    prose: fill(pick(words.prose, options.variant), slots),
    // Named for the template rather than the subject, so one painting of tracks serves every animal.
    // Missing today, like every event painting, and the card borrows the night's scene or a blank.
    art: `woven-${kind}`,
    choices: choices.map((spec) => {
      const text = words.choices[spec.id];
      if (!text) throw new Error(`data/happenings.json: '${kind}' has no choice '${spec.id}'`);
      used.add(`${kind}.${spec.id}`);
      const variant = spec.variant ?? options.variant;
      const sets = (words.sets?.[spec.id] ?? []).map((flag) => flagFor(flag, options.stranger));
      return {
        id: spec.id,
        label: fill(pick(text.label, variant), slots),
        needs: [],
        line: fill(pick(text.line, variant), slots),
        grants: [],
        ...(spec.gives ? { gives: spec.gives } : {}),
        ...(spec.eases ? { eases: spec.eases } : {}),
        ...(sets.length > 0 ? { sets } : {})
      };
    }),
    // Once, unless the kind says the same subject may come round again -- `wovenFor` decides when.
    once: words.again_after === null,
    ...(options.stranger ? { stranger: options.stranger } : {})
  };
}

type Template = (around: Surroundings, roll: Roll, now: Circumstance) => GameEvent | null;

/** A flag written in the words file, with `{stranger}` made into the stranger it is about. */
function flagFor(flag: string, stranger: EventStranger | undefined | null): string {
  return flag.replace('{stranger}', stranger?.id ?? '');
}

/** Whether you would know this stranger's name, which decides the variant a line is told in. */
const named = (stranger: EventStranger) => (stranger.givenName ? 'named' : 'unnamed');

/** Road company are only on the road by day -- `whereabouts` has them at a place from dusk. */
const byDay = (moment: Surroundings['moment']) => !moment || ['morning', 'afternoon'].includes(moment.timeOfDay);

// ---------------------------------------------------------------------------------------------
// The road. Asked once per day of walking.

const tracks: Template = ({ creature, biome }) => {
  if (!creature || !isAnimal(creature.id)) return null;
  const animal = lower(creature.name);
  return woven('road', 'tracks', creature.id, { animal, a_animal: a(animal), ground: ground(biome) }, [
    { id: 'follow' },
    { id: 'leave' }
  ]);
};

const dropped: Template = ({ onRoad, biome, taken }, roll) => {
  if (!onRoad) return null;
  const can = droppable(biome, taken);
  if (can.length === 0) return null;
  const m = can[roll('dropped') % can.length]!;
  return woven('road', 'dropped', m.id, { material: lower(m.name) }, [
    { id: 'take', gives: [{ id: m.id, n: 1 }] },
    { id: 'leave' }
  ]);
};

const company: Template = ({ stranger, elsewhere, moment }, _roll, now) => {
  if (!stranger || !elsewhere || !byDay(moment)) return null;
  // Somebody you have met is met differently -- see `companyAgain`.
  if (now.met?.includes(stranger.id)) return null;
  return woven(
    'road',
    'company',
    stranger.id,
    {
      role: stranger.role,
      elsewhere: placeName(elsewhere),
      name: stranger.givenName ?? ''
    },
    // Their name is in the line of whichever choice you make: walking with somebody or asking them
    // the way is how you learn what they are called.
    [{ id: 'walk', eases: COMPANY_EASES }, { id: 'ask' }],
    { variant: named(stranger), stranger }
  );
};

/**
 * The same stranger, the second time.
 *
 * **What the save's `met` list is for.** A face on the road that knows yours is the smallest thing
 * that makes a road feel lived on, and it needs exactly one fact kept between days. By now you
 * know their name, because every first meeting ends with it.
 */
const companyAgain: Template = ({ stranger, moment }, _roll, now) => {
  if (!stranger || !now.met?.includes(stranger.id) || !byDay(moment)) return null;
  return woven(
    'road',
    'company-again',
    stranger.id,
    { trade: stranger.role.split(',')[0]!, name: stranger.givenName ?? '' },
    [{ id: 'catch-up', eases: COMPANY_EASES }, { id: 'wave' }],
    { variant: named(stranger), stranger }
  );
};

const weather: Template = ({ moment, biome, flora }) => {
  const sky = moment?.weather;
  if (sky !== 'rain' && sky !== 'mist' && sky !== 'storm') return null;
  const shelter = flora && SHELTERING.includes(flora.growthForm) ? lower(flora.name) : null;
  // Nothing to shelter under is not no choice. Standing it out is a real one, and it keeps the card
  // at two options wherever it is met -- a weather card with one button is a notice.
  return woven(
    'road',
    'weather',
    `${sky}:${biome}`,
    { ground: ground(biome), plant: shelter ?? '' },
    [shelter ? { id: 'wait', eases: COMPANY_EASES } : { id: 'stand' }, { id: 'on' }],
    { variant: sky }
  );
};

// ---------------------------------------------------------------------------------------------
// The night. Asked every time somebody sleeps.

const nightSounds: Template = ({ biome }, roll) => {
  // Something awake at night in this country -- not necessarily the creature on this tile, which
  // `species.ts` picks for the day and may well be asleep.
  const out = creaturesIn(biome).filter((c) => isAnimal(c.id) && rhythmOf(c) === 'nocturnal');
  if (out.length === 0) return null;
  const c = out[roll('night-sounds') % out.length]!;
  return woven('night', 'night-sounds', c.id, { a_animal: a(lower(c.name)) }, [{ id: 'listen' }, { id: 'lamp' }]);
};

const dream: Template = ({ biome }) =>
  woven('night', 'dream', biome, { ground: ground(biome) }, [{ id: 'write' }, { id: 'let' }]);

/** Nights with a threshold somebody could come to. A bedroll in the open has none. */
const KNOCKABLE = ['tent', 'camp', 'roof', 'settlement', 'palace'];

const knock: Template = ({ stranger, elsewhere }, _roll, now) => {
  if (!stranger || !elsewhere || !now.shelter || !KNOCKABLE.includes(now.shelter)) return null;
  return woven(
    'night',
    'knock',
    stranger.id,
    { role: stranger.role, elsewhere: placeName(elsewhere), name: stranger.givenName ?? '' },
    [{ id: 'room', eases: COMPANY_EASES }, { id: 'point' }],
    { variant: named(stranger), stranger }
  );
};

// ---------------------------------------------------------------------------------------------
// Arriving. Asked once per place per journey.

const cairn: Template = ({ place }, roll) => {
  if (!place || place.kind === 'settlement') return null;
  return woven('arriving', 'cairn', place.id, { place: placeName(place), count: 20 + (roll('cairn') % 60) }, [
    { id: 'add' },
    { id: 'count' }
  ]);
};

const cookfire: Template = ({ place }) => {
  if (!place || (place.kind !== 'settlement' && place.kind !== 'travel_node')) return null;
  return woven('arriving', 'cookfire', place.id, { place: placeName(place) }, [
    { id: 'eat', eases: MEAL_EASES },
    { id: 'wave' }
  ]);
};

// ---------------------------------------------------------------------------------------------
// Working. Asked when a take settles.

const watched: Template = ({ creature }) => {
  if (!creature || !isAnimal(creature.id)) return null;
  return woven('working', 'watched', creature.id, { a_animal: a(lower(creature.name)) }, [
    { id: 'carry-on' },
    { id: 'watch' }
  ]);
};

const underneath: Template = ({ biome, taken }, roll) => {
  const can = underfoot(biome, taken);
  if (can.length === 0) return null;
  const m = can[roll('underneath') % can.length]!;
  return woven('working', 'underneath', m.id, { material: lower(m.name) }, [
    { id: 'keep', gives: [{ id: m.id, n: 1 }] },
    { id: 'back' }
  ]);
};

// ---------------------------------------------------------------------------------------------
// Chains. An event that needs another to have happened first.

/**
 * The stranger you sheltered, met again on the road with something for you.
 *
 * **The chain the flags exist for.** Making room after dark leaves `sheltered:<stranger>`; this
 * needs it. What they give is their people's -- rice from a Harappan carrier, reed from a Kia
 * pilgrim, goat hair from a Maru drover -- so the gift says who they are. Both choices are real:
 * turning it down is a kindness too, and costs nothing.
 */
const kindnessReturned: Template = ({ stranger, moment }, _roll, now) => {
  if (!stranger || !byDay(moment)) return null;
  const words = TEXT['kindness-returned']!;
  if (!(words.requires ?? []).every((flag) => now.flags?.includes(flagFor(flag, stranger)))) return null;
  const giftId = stranger.culture ? words.gifts?.[stranger.culture] : undefined;
  const gift = giftId ? material(giftId) : null;
  if (!gift) return null;
  return woven(
    'road',
    'kindness-returned',
    stranger.id,
    { name: stranger.givenName ?? '', gift: lower(gift.name), trade: stranger.role.split(',')[0]! },
    [{ id: 'accept', gives: [{ id: gift.id, n: 1 }] }, { id: 'decline' }],
    { variant: named(stranger), stranger }
  );
};

/**
 * Every template, by the occasion it answers, and the kind its words are filed under.
 *
 * Adding one is a function, a line here and an entry in `data/happenings.json`. The order is the
 * order a tie would break in and nothing else -- the pick is seeded over the ones that can happen,
 * not the first that can.
 */
export const TEMPLATES: Readonly<Record<Occasion, readonly { kind: string; make: Template }[]>> = {
  road: [
    { kind: 'tracks', make: tracks },
    { kind: 'dropped', make: dropped },
    { kind: 'company', make: company },
    { kind: 'company-again', make: companyAgain },
    { kind: 'kindness-returned', make: kindnessReturned },
    { kind: 'weather', make: weather }
  ],
  night: [
    { kind: 'night-sounds', make: nightSounds },
    { kind: 'dream', make: dream },
    { kind: 'knock', make: knock }
  ],
  arriving: [
    { kind: 'cairn', make: cairn },
    { kind: 'cookfire', make: cookfire }
  ],
  working: [
    { kind: 'watched', make: watched },
    { kind: 'underneath', make: underneath }
  ]
};

/** The kind an event id belongs to: `woven:tracks:x` is `tracks`. Null for an authored event. */
export function kindOf(id: string): string | null {
  return id.startsWith('woven:') ? (id.split(':')[1] ?? null) : null;
}

/** The last day anything of this kind happened, from the journey's record. */
function lastOfKind(kind: string, last: Readonly<Record<string, number>>): number | null {
  let latest: number | null = null;
  for (const [id, day] of Object.entries(last)) {
    if (kindOf(id) === kind && (latest === null || day > latest)) latest = day;
  }
  return latest;
}

/**
 * Whether this event may happen now, by its storylet rules.
 *
 * **Seen is not the end any more.** A kind with `again_after` can bring the same subject round
 * once that many days have passed -- a second dream of the same wetland a month on is texture, the
 * same one the next night is a stuck record. A kind with `cooldown` waits that long after *any* of
 * its kind. An event seen before `last` was kept (an older save) counts as long ago.
 */
function mayHappen(event: GameEvent, kind: string, now: Circumstance): boolean {
  const words = TEXT[kind];
  if (!words) return false;
  const last = now.last ?? {};
  const kindDay = lastOfKind(kind, last);
  if (kindDay !== null && now.day - kindDay < words.cooldown) return false;
  if (!now.seen.includes(event.id) && last[event.id] === undefined) return true;
  if (words.again_after === null) return false;
  const when = last[event.id];
  return when === undefined || now.day - when >= words.again_after;
}

/** Every woven event that could happen right now, before the ration. For tests and for tuning. */
export function wovenFor(now: Circumstance, around: Surroundings, roll: Roll, kind?: string): GameEvent[] {
  const out: GameEvent[] = [];
  for (const template of TEMPLATES[now.occasion]) {
    if (kind && template.kind !== kind) continue;
    const event = template.make(around, roll, now);
    if (event && mayHappen(event, template.kind, now)) out.push(event);
  }
  return out;
}

/**
 * How much likelier than `WOVEN_ONE_IN` a woven event is today, from how long the road has been
 * quiet. See `PACE`: fewer right after something, more after a long stretch of nothing.
 */
export function paceFor(now: Pick<Circumstance, 'day' | 'last'>): number {
  const days = Object.entries(now.last ?? {})
    .filter(([id]) => kindOf(id) !== null)
    .map(([, day]) => day);
  // A journey with nothing yet is an ordinary day, not a long quiet one. Counting it as the long gap
  // made the very first arrival the likeliest moment for a card, which is the worst moment for one.
  const quiet = days.length === 0 ? 2 : now.day - Math.max(...days);
  let times = PACE[0]!.times;
  for (const step of PACE) if (quiet >= step.fromDay) times = step.times;
  return times;
}

/**
 * Pick one of the events that could happen, by weight, favouring what has not happened lately.
 *
 * Rendezvous over event ids, so adding a template takes only the days it wins. A kind sharing a
 * tag with anything from the last `VARIETY_DAYS` days weighs `VARIETY_DAMP` as much.
 */
export function pickWoven(could: readonly GameEvent[], now: Circumstance, roll: Roll): GameEvent | null {
  const recent = new Set<string>();
  for (const [id, day] of Object.entries(now.last ?? {})) {
    const kind = kindOf(id);
    if (kind && now.day - day < VARIETY_DAYS) for (const tag of TEXT[kind]?.tags ?? []) recent.add(tag);
  }
  return rendezvousPick(
    could,
    (id) => roll(`woven-pick:${now.occasion}:${now.day}:${id}`),
    (e) => e.id,
    (e) => {
      const words = TEXT[kindOf(e.id) ?? ''];
      if (!words) return 0;
      return words.weight * (words.tags.some((t) => recent.has(t)) ? VARIETY_DAMP : 1);
    }
  );
}

/**
 * The one thing that happens now, authored or woven, or null.
 *
 * **Authored first, always, and unrationed.** Somebody who wrote a scene wrote it to be seen, and
 * `conditions` already say when. Only when none can happen is a woven one considered, and then with
 * a chance of `WOVEN_ONE_IN[occasion]` leaned on by the pacer (`paceFor`), and picked by weight with
 * variety favoured (`pickWoven`).
 *
 * `around` may be null -- no world yet, or a tile off the map -- and then only an authored event
 * can happen, which is exactly what `eventNow` did before this existed.
 *
 * `force` is for the inspector: skip the ration, and optionally ask for one `kind`. It is how a
 * browser test, or somebody writing a new template, opens a card without walking for three days.
 */
export function happeningNow(
  now: Circumstance,
  roll: Roll,
  around: Surroundings | null,
  from: readonly GameEvent[] = authored,
  force: { kind?: string } | null = null
): GameEvent | null {
  const written = force?.kind ? null : eventNow(now, roll, from);
  if (written || !around) return written;
  if (!force) {
    if (now.day < WOVEN_FROM_DAY) return null;
    const chance = Math.min(PACE_CEILING, paceFor(now) / WOVEN_ONE_IN[now.occasion]);
    if ((roll(`woven:${now.occasion}:${now.day}`) % 10_000) / 10_000 >= chance) return null;
  }
  const could = wovenFor(now, around, roll, force?.kind);
  if (could.length === 0) return null;
  return pickWoven(could, now, roll);
}
