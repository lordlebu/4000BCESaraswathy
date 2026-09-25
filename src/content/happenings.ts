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
import { type Material, materialsIn } from './making';
import { dyeName } from './looks';
import { fieldMap, poi, type PointOfInterest } from './places';
import { rhythmOf } from './routine';
import { biomeFor, creatureFor, creaturesIn, floraFor, isAnimal } from './species';
import { COMPANY_EASES, MEAL_EASES, WOVEN_ONE_IN } from './tiers';
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
      ? { id: `${fieldMapId}:${who.id}`, role: who.role, look: who.look!, culture: who.culture }
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

const choice = (id: string, label: string, line: string, extra: Partial<Choice> = {}): Choice => ({
  id,
  label,
  needs: [],
  line,
  grants: [],
  ...extra
});

const woven = (
  occasion: Occasion,
  kind: string,
  subject: string,
  title: string,
  prose: string,
  choices: Choice[],
  stranger?: EventStranger
): GameEvent => ({
  id: `woven:${kind}:${subject}`,
  title,
  occasion,
  conditions: anyConditions(),
  prose,
  // Named for the template rather than the subject, so one painting of tracks serves every animal.
  // Missing today, like every event painting, and the card borrows the night's scene or a blank.
  art: `woven-${kind}`,
  choices,
  once: true,
  ...(stranger ? { stranger } : {})
});

type Template = (around: Surroundings, roll: Roll, now: Circumstance) => GameEvent | null;

// ---------------------------------------------------------------------------------------------
// The road. Asked once per day of walking.

const tracks: Template = ({ creature, biome }) => {
  if (!creature || !isAnimal(creature.id)) return null;
  const name = lower(creature.name);
  return woven(
    'road',
    'tracks',
    creature.id,
    'Tracks across the path',
    `Pressed into the ground across your way, and fresh: the tracks of ${a(name)}. They cross from one side to the other and are lost in ${ground(biome)} a few strides on.`,
    [
      choice(
        'follow',
        'Follow them a little way',
        `You follow the ${name}'s tracks until the ground stops holding them. You never see it. You know now where it crosses, which is most of what anybody who tracks for a living knows.`
      ),
      choice(
        'leave',
        'Step round them',
        'You step round the tracks rather than over them, and leave them for whoever comes by next.'
      )
    ]
  );
};

const dropped: Template = ({ onRoad, biome, taken }, roll) => {
  if (!onRoad) return null;
  const can = droppable(biome, taken);
  if (can.length === 0) return null;
  const m = can[roll('dropped') % can.length]!;
  const name = lower(m.name);
  return woven(
    'road',
    'dropped',
    m.id,
    'Something on the road',
    `Somebody has dropped a little ${name} at the side of the road. Fallen from a load, by the look of it, and not worth going back for.`,
    [
      choice('take', 'Pick it up', `You pick up the ${name}. Whoever dropped it was carrying more than they could keep hold of.`, {
        gives: [{ id: m.id, n: 1 }]
      }),
      choice(
        'leave',
        'Leave it where it fell',
        `You leave the ${name} where it fell, in case whoever dropped it comes back along the road.`
      )
    ]
  );
};

const company: Template = ({ stranger, elsewhere, moment }, _roll, now) => {
  if (!stranger || !elsewhere) return null;
  // Road company are only on the road by day -- `whereabouts` has them at a place from dusk to
  // morning -- so meeting one after dark would contradict the map.
  if (moment && !['morning', 'afternoon'].includes(moment.timeOfDay)) return null;
  // Somebody you have met is met differently -- see `companyAgain`.
  if (now.met?.includes(stranger.id)) return null;
  return woven(
    'road',
    'company',
    stranger.id,
    'Company on the road',
    `A ${stranger.role}, falls in beside you for a stretch. Dressed in ${dyeName(stranger.look.cloth)} gone pale with the road's dust, and in no hurry to be anywhere but walking.`,
    [
      choice(
        'walk',
        'Walk together a while',
        'You walk together as far as the next turning. Neither of you says much, and the miles go easier for it.',
        { eases: COMPANY_EASES }
      ),
      choice(
        'ask',
        'Ask the way',
        `They point you on toward ${placeName(elsewhere)}, and say it is further than it looks. It usually is.`
      )
    ],
    stranger
  );
};

/**
 * The same stranger, the second time.
 *
 * **What the save's `met` list is for.** A face on the road that knows yours is the smallest thing
 * that makes a road feel lived on, and it needs exactly one fact kept between days. Still no name
 * and no words -- they lift a hand, they do not introduce themselves.
 */
const companyAgain: Template = ({ stranger, moment }, _roll, now) => {
  if (!stranger || !now.met?.includes(stranger.id)) return null;
  if (moment && !['morning', 'afternoon'].includes(moment.timeOfDay)) return null;
  return woven(
    'road',
    'company-again',
    stranger.id,
    'A face you know',
    `The ${stranger.role.split(',')[0]} from the other day is on the road ahead, still in ${dyeName(stranger.look.cloth)}, and lifts a hand when they see it is you.`,
    [
      choice(
        'catch-up',
        'Catch them up',
        'You fall in together as if you had arranged it. They remember which way you were going, which is more than most people do.',
        { eases: COMPANY_EASES }
      ),
      choice(
        'wave',
        'Lift a hand back',
        'You lift a hand back and let the road carry them on ahead. It is good to be known somewhere.'
      )
    ],
    stranger
  );
};

const WEATHER_TITLE: Record<string, string> = {
  rain: 'Rain on the road',
  mist: 'The mist comes down',
  storm: 'The sky breaks'
};

const weather: Template = ({ moment, biome, flora }) => {
  const sky = moment?.weather;
  if (!sky || !WEATHER_TITLE[sky]) return null;
  const where = ground(biome);
  const prose =
    sky === 'rain'
      ? `Rain comes across ${where} in a grey sheet, and then it is on you.`
      : sky === 'mist'
        ? `The mist comes down so quickly that ${where} behind you is gone before you have turned to look.`
        : `The sky goes the colour of a bruise, and the first of the wind flattens ${where} ahead of you.`;
  const onward =
    sky === 'rain'
      ? 'You walk on through it, soaked within a hundred steps, after which there is nothing more it can do to you.'
      : sky === 'mist'
        ? 'You walk on slowly, counting steps, and the ground comes back one stride at a time.'
        : 'You walk on with your head down, and the storm goes over you rather than through you.';
  const choices = [choice('on', 'Walk on through it', onward)];
  if (flora && SHELTERING.includes(flora.growthForm)) {
    const plant = lower(flora.name);
    choices.unshift(
      choice(
        'wait',
        `Wait it out under the ${plant}`,
        `You wait under the ${plant} until the worst has passed. It is not a roof, but it is a good deal better than none.`,
        { eases: COMPANY_EASES }
      )
    );
  } else {
    // Nothing to shelter under is not no choice. Standing it out is a real one, and it keeps the
    // card at two options wherever it is met -- a weather card with one button is a notice.
    choices.unshift(
      choice(
        'stand',
        'Stand and let it pass',
        `You turn your back to it and wait where you are. It passes, as it always does, and ${where} comes back washed.`
      )
    );
  }
  return woven('road', 'weather', `${sky}:${biome}`, WEATHER_TITLE[sky]!, prose, choices);
};

// ---------------------------------------------------------------------------------------------
// The night. Asked every time somebody sleeps.

const nightSounds: Template = ({ biome }, roll) => {
  // Something awake at night in this country -- not necessarily the creature on this tile, which
  // `species.ts` picks for the day and may well be asleep.
  const out = creaturesIn(biome).filter((c) => isAnimal(c.id) && rhythmOf(c) === 'nocturnal');
  if (out.length === 0) return null;
  const c = out[roll('night-sounds') % out.length]!;
  const name = lower(c.name);
  return woven(
    'night',
    'night-sounds',
    c.id,
    'Something beyond the lamp',
    `Late, with the lamp turned low, something moves at the edge of its light. By the sound of it, ${a(name)}: out at the hour it likes best, and not much interested in you.`,
    [
      choice(
        'listen',
        'Keep still and listen',
        'You keep still and listen until it has gone about its business. You could not have drawn it, but you would know that sound again.'
      ),
      choice(
        'lamp',
        'Turn up the lamp',
        'You turn up the lamp. For a moment there are two eyes at the edge of the light, and then there are none.'
      )
    ]
  );
};

const dream: Template = ({ biome }) =>
  woven(
    'night',
    'dream',
    biome,
    'A dream',
    `You dream of ${ground(biome)} before anybody had walked there: the same ground, the same light, and nobody at all to write it down.`,
    [
      choice(
        'write',
        'Write it down before it goes',
        'You write it down by feel in the dark. In the morning half of it will not read, and the other half is better than you remembered.'
      ),
      choice('let', 'Let it go', 'You let it go. By first light you remember only that it was quiet.')
    ]
  );

/** Nights with a threshold somebody could come to. A bedroll in the open has none. */
const KNOCKABLE = ['tent', 'camp', 'roof', 'settlement', 'palace'];

const knock: Template = ({ stranger, elsewhere }, _roll, now) => {
  if (!stranger || !elsewhere || !now.shelter || !KNOCKABLE.includes(now.shelter)) return null;
  return woven(
    'night',
    'knock',
    stranger.id,
    'Somebody after dark',
    `After dark there is a voice at the edge of your shelter: a ${stranger.role}, caught out by the night and asking whether there is room for one more.`,
    [
      choice(
        'room',
        'Make room',
        'They sleep sitting up against their load and are gone before you wake. The night was warmer for two.',
        { eases: COMPANY_EASES }
      ),
      choice(
        'point',
        'Point them on',
        `You point them on toward ${placeName(elsewhere)}. They thank you and go, and the night is quiet again.`
      )
    ],
    stranger
  );
};

// ---------------------------------------------------------------------------------------------
// Arriving. Asked once per place per journey.

const cairn: Template = ({ place }, roll) => {
  if (!place || place.kind === 'settlement') return null;
  const stones = 20 + (roll('cairn') % 60);
  return woven(
    'arriving',
    'cairn',
    place.id,
    'Stones at the edge',
    `At the edge of ${placeName(place)} somebody once began a little pile of stones, and everybody who has arrived since has added one.`,
    [
      choice(
        'add',
        'Add a stone',
        'You add a stone to the pile. It is not a large one, but it is yours, and it will be here after you have gone.'
      ),
      choice(
        'count',
        'Count them',
        `You count ${stones} before you lose your place, which is a great many arrivals for somewhere this quiet.`
      )
    ]
  );
};

const cookfire: Template = ({ place }) => {
  if (!place || (place.kind !== 'settlement' && place.kind !== 'travel_node')) return null;
  return woven(
    'arriving',
    'cookfire',
    place.id,
    'A fire already lit',
    `There is smoke going up at ${placeName(place)}, and the smell of something in a pot. Whoever is tending it waves you over before you have properly arrived.`,
    [
      choice(
        'eat',
        'Accept a bowl',
        'You eat sitting on your heels by the fire. Nobody asks where you have come from until the bowl is empty, which is good manners anywhere.',
        { eases: MEAL_EASES }
      ),
      choice(
        'wave',
        'Wave back and go on',
        `You wave back and go on into ${placeName(place)}. The smell follows you further than the smoke does.`
      )
    ]
  );
};

// ---------------------------------------------------------------------------------------------
// Working. Asked when a take settles.

const watched: Template = ({ creature }) => {
  if (!creature || !isAnimal(creature.id)) return null;
  const name = lower(creature.name);
  return woven(
    'working',
    'watched',
    creature.id,
    'Being watched',
    `You look up from the work to find ${a(name)} watching you from close by, with the air of something that has seen this done before and thinks you are doing it wrong.`,
    [
      choice(
        'carry-on',
        'Carry on regardless',
        'You carry on. When you look up again it has gone, satisfied or disappointed; there is no telling which.'
      ),
      choice(
        'watch',
        'Stop and watch it back',
        'You stop and watch it back. Neither of you moves for a long moment, and then it decides you are not interesting and goes.'
      )
    ]
  );
};

const underneath: Template = ({ biome, taken }, roll) => {
  const can = underfoot(biome, taken);
  if (can.length === 0) return null;
  const m = can[roll('underneath') % can.length]!;
  const name = lower(m.name);
  return woven(
    'working',
    'underneath',
    m.id,
    'Something underneath',
    `Under what you were taking, the ground gives up something else: a little ${name}, turned up by the work.`,
    [
      choice('keep', 'Keep it', `You keep the ${name}. The ground is generous to anybody who bothers to look at it.`, {
        gives: [{ id: m.id, n: 1 }]
      }),
      choice('back', 'Put it back', 'You put it back where it was and press the earth down over it.')
    ]
  );
};

/**
 * Every template, by the occasion it answers.
 *
 * Adding one is a function and a line here. The order is the order a tie would break in and
 * nothing else -- the pick is seeded over the ones that can happen, not the first that can.
 */
export const TEMPLATES: Readonly<Record<Occasion, readonly Template[]>> = {
  road: [tracks, dropped, company, companyAgain, weather],
  night: [nightSounds, dream, knock],
  arriving: [cairn, cookfire],
  working: [watched, underneath]
};

/** Every woven event that could happen right now, before the ration. For tests and for tuning. */
export function wovenFor(now: Circumstance, around: Surroundings, roll: Roll): GameEvent[] {
  const out: GameEvent[] = [];
  for (const template of TEMPLATES[now.occasion]) {
    const event = template(around, roll, now);
    if (event && !now.seen.includes(event.id)) out.push(event);
  }
  return out;
}

/**
 * The one thing that happens now, authored or woven, or null.
 *
 * **Authored first, always, and unrationed.** Somebody who wrote a scene wrote it to be seen, and
 * `conditions` already say when. Only when none can happen is a woven one considered, and then only
 * one time in `WOVEN_ONE_IN[occasion]`.
 *
 * `around` may be null -- no world yet, or a tile off the map -- and then only an authored event
 * can happen, which is exactly what `eventNow` did before this existed.
 */
export function happeningNow(
  now: Circumstance,
  roll: Roll,
  around: Surroundings | null,
  from: readonly GameEvent[] = authored
): GameEvent | null {
  const written = eventNow(now, roll, from);
  if (written || !around) return written;
  if (roll(`woven:${now.occasion}:${now.day}`) % WOVEN_ONE_IN[now.occasion] !== 0) return null;
  const could = wovenFor(now, around, roll);
  if (could.length === 0) return null;
  return could[roll(`woven-pick:${now.occasion}:${now.day}`) % could.length] ?? null;
}
