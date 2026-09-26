// Something happening to you, as opposed to something you did.
//
// **A framework with no content yet, and that is the whole intent.** A dream on the third night. An
// animal at the edge of the firelight. Somebody arriving in the dark with a question. A find on the
// road. None of those are written; what is written here is the shape they will arrive in, so that
// adding one is a data entry and a painting rather than a feature.
//
// **Why it exists before the content.** Every mechanic in this game that arrived content-first grew
// its own surface -- the diary has one, a conversation has one, the activity card has one -- and
// three of them turned out to be the same screen wearing different code. An event is going to want
// exactly the surface the activity card already has: **a painting, a passage, and a short list of
// plain choices.** Building the shape first is what stops the fourth one being written.
//
// **And it is the answer to a question the shelter ladder asked and could not answer well.** Six
// kinds of night exist; `NIGHT_RESTORES` is flat, because the interesting thing about sleeping in a
// town rather than the woods is not a percentage, it is *what can happen to you there*. That is an
// event, and `where` below is how a night filters them.
//
// Pure and free of React and Phaser, like the rest of `content/`. No clock: the caller says when.

import placesBundle from '../../data/canon/places.json';
import type { Look } from './looks';
import type { StrangerCulture } from './travellers';

/**
 * Where an event can find you.
 *
 * Deliberately a small closed set rather than a predicate, because the trigger has to be *readable
 * at the point the event is authored* -- somebody writing a dream should be able to say "this
 * happens at night, in a settlement" without writing code. A predicate would be more general and
 * would put the rule in eighty different places.
 *
 * `shelter` narrows a night to the kinds of place it can happen in, and an empty list means
 * anywhere you can sleep. That is the axis the flat rest table left open.
 *
 * **`working` is the fourth, and it is what joins the activity layer to this one.** It fires when a
 * take settles and its card closes -- a heron landing while you cut reeds, a second thing turned
 * up under the first. Taking was the one act with no chance of anything happening around it, which
 * made the busiest verb in the game the least eventful.
 */
export type Occasion = 'night' | 'arriving' | 'road' | 'working';

/** What an event needs to be true before it can happen. All of them, or it does not fire. */
export interface Conditions {
  /** Shelter kinds this can happen in. Empty means any of them. */
  shelter: string[];
  /** Field map ids this can happen on. Empty means all of them. */
  fieldMaps: string[];
  /** The earliest day of the journey it may fire on. Zero means the first night. */
  fromDay: number;
  /** Discovery or word ids the player must already hold. Empty means no requirement. */
  requires: string[];
  /**
   * Points of interest an arrival belongs to. Empty means anywhere on the map.
   *
   * Canon's `at`: *Where you stop* happens on reaching the Caravan Ground, not on reaching any
   * point of North Dwarka. Only an arrival has a point, so only an arrival is narrowed by it.
   */
  pois: string[];
}

/**
 * One thing the player can do about it.
 *
 * **Every option must be takeable.** There is no option that fails, no option gated behind a check
 * the player cannot see, and no option that is worse than not having been here -- the same ruling
 * `activity.ts` holds for gathering and for the same reason: this is a cozy game and an event is
 * something that happened to you, not a test you can be caught out by.
 *
 * An option that needs something the player lacks is simply **not offered**, and the ones that are
 * offered are all real. That is the opposite of the action rail's convention, and deliberately so:
 * a greyed row in the rail teaches that a mechanic exists, where a greyed choice in a scene teaches
 * that you have already lost something.
 */
export interface Choice {
  id: string;
  /** What the button says. A verb, in the traveller's register. */
  label: string;
  /** Ids the player must hold for this to be offered at all. Empty means always. */
  needs: string[];
  /** What the diary records once it is taken. This is the outcome; there is no other. */
  line: string;
  /**
   * Ids this grants -- a word, a discovery, a recipe somebody shows you.
   *
   * **The seam to the story, and it is deliberately narrow.** An event hands over the same kinds of
   * thing a conversation does, so it reaches `journey.ts` through the doors that already exist
   * rather than growing a parallel way to change a Progress. A side quest is a chain of events that
   * grant each other's `requires`, which needs no further machinery.
   */
  grants: string[];
  /**
   * Materials put into the satchel, for something found or given.
   *
   * **Separate from `grants`, because they reach different stores.** A grant changes what the
   * player *knows* and goes through `journey.receiveAll`; a material is something *carried* and goes
   * into the satchel. Folding them into one list would put a `mat_` prefix rule in the rules layer.
   * Optional, so every event written before it still type-checks.
   */
  gives?: { id: string; n: number }[];
  /**
   * How much tiredness it takes off, on the same scale as `REMEDY_EASES` and `MEAL_EASES`.
   *
   * Through the scene's existing `ease` door, which is what a remedy already uses -- a bowl by
   * somebody's fire eases you exactly the way a bowl out of your own satchel does.
   */
  eases?: number;
  /**
   * Flags this choice leaves behind, for a later event to find -- `sheltered:<stranger>`.
   *
   * **How one event leads to another without a quest system.** A flag is a fact about this
   * journey that only the game cares about, kept in the save's what-you-know half. It is never a
   * word or a discovery -- those are canon's and go through `grants`.
   */
  sets?: string[];
}

/**
 * Somebody an event is about, so the card can show their face.
 *
 * The road company `travellers.ts` puts on the map, carried with the look they wear there -- which
 * is what makes the face on the card the person on the road rather than a stranger who happens to
 * share their trade.
 */
export interface EventStranger {
  id: string;
  role: string;
  look: Look;
  /** Which of canon's peoples they are, so the face comes from the right part of the pool. */
  culture: StrangerCulture | null;
  /** The name their people gave them, from canon. Told to you in the first event they are in. */
  givenName: string | null;
}

export interface GameEvent {
  id: string;
  /** What the card is titled. */
  title: string;
  occasion: Occasion;
  conditions: Conditions;
  /** The passage, in the diary's voice. This is the event. */
  prose: string;
  /**
   * What the painting is called, in `src/ui/events/`.
   *
   * Defaults to the id, so a file named after the event simply appears. **Nothing is blocked while
   * it is missing** -- the card draws the shelter's own scene instead, and an event with no art at
   * all still fires, still reads and still resolves. Same contract as every other art slot; see
   * `docs/art-placement.md`.
   */
  art: string;
  choices: Choice[];
  /**
   * Whether it can happen more than once.
   *
   * Most will not: a dream that recurs every night is wallpaper. `once` is the default a caller
   * should assume when authoring, which is why it is named for the restrictive case.
   */
  once: boolean;
  /** Who it is about, when it is about somebody. Only woven events carry one today. */
  stranger?: EventStranger;
}

/** A written happening as canon exports it, in `places.json` beside the people standing there. */
interface RawHappening {
  id: string;
  title: string;
  occasion: Occasion;
  field_maps?: string[];
  at?: string[];
  requires?: string[];
  prose: string;
  choices: { label: string; line: string; needs?: string[]; grants?: string[] }[];
}

/**
 * One of canon's happenings, as the game's event.
 *
 * **Canon says where, on what occasion, and what must have been seen; the game says the rest.**
 * `fromDay` is zero and `shelter` empty because canon never speaks of days or of the game's kinds
 * of night -- the same line `renews` draws. Once, because a written scene is a scene and not
 * weather: the woven layer is what comes round again.
 *
 * A choice's id is its position, `c0`, `c1`: canon's choices have no ids, and nothing outside this
 * event ever names one.
 */
export function fromCanon(h: RawHappening): GameEvent {
  return {
    id: h.id,
    title: h.title,
    occasion: h.occasion,
    conditions: anyConditions({
      fieldMaps: h.field_maps ?? [],
      pois: h.at ?? [],
      requires: h.requires ?? []
    }),
    prose: h.prose,
    art: h.id,
    choices: h.choices.map((c, i) => ({
      id: `c${i}`,
      label: c.label,
      needs: c.needs ?? [],
      line: c.line,
      grants: c.grants ?? []
    })),
    once: true
  };
}

/**
 * Every written event there is: canon's happenings.
 *
 * **Canon's, because they are true of the world** -- a dream the delta has, a herder on the terrace
 * wall, what the Caravan Ground is doing when you arrive. That was the open question this array
 * used to keep cheap to answer (Q3 in `docs/strangers-and-happenings.md`), and the owner settled it:
 * what is true of the world is canon's, and what the game weaves from a tile stays here in
 * `happenings.ts`. So these come from the bundle like people and places do, and a new one is a
 * canon entity and a re-export, never an edit here.
 *
 * It was empty for a long time on purpose -- the framework shipped before its content, and was
 * wired to a caller the whole while, so the first entry needed no feature.
 */
export const events: readonly GameEvent[] = (
  (placesBundle as { happenings?: RawHappening[] }).happenings ?? []
).map(fromCanon);

/** Sensible blanks, so an author writes only what is unusual about their event. */
export function anyConditions(over: Partial<Conditions> = {}): Conditions {
  return { shelter: [], fieldMaps: [], fromDay: 0, requires: [], pois: [], ...over };
}

/** What the caller knows when it asks whether anything is happening. */
export interface Circumstance {
  occasion: Occasion;
  /** The shelter kind, for a night. Null on any other occasion. */
  shelter: string | null;
  fieldMapId: string;
  day: number;
  /** Everything the player holds: discovery ids, word ids, recipe ids. */
  holds: readonly string[];
  /** Event ids already seen, so a `once` event does not come round again. */
  seen: readonly string[];
  /** Strangers an event has already introduced, by their event id. Absent means nobody yet. */
  met?: readonly string[];
  /** The day each event last happened, by id, so a storylet can come round again. Absent means never. */
  last?: Readonly<Record<string, number>>;
  /** Flags earlier choices left behind. Absent means none. */
  flags?: readonly string[];
  /** The point of interest just reached, for an arrival. Absent or null anywhere else. */
  poiId?: string | null;
}

/** Whether this event can happen, given where and when the player is. */
export function canHappen(event: GameEvent, now: Circumstance): boolean {
  if (event.occasion !== now.occasion) return false;
  if (event.once && now.seen.includes(event.id)) return false;
  const { shelter, fieldMaps, fromDay, requires, pois } = event.conditions;
  if (now.day < fromDay) return false;
  if (pois.length > 0 && (!now.poiId || !pois.includes(now.poiId))) return false;
  if (shelter.length > 0 && (now.shelter === null || !shelter.includes(now.shelter))) return false;
  if (fieldMaps.length > 0 && !fieldMaps.includes(now.fieldMapId)) return false;
  return requires.every((id) => now.holds.includes(id));
}

/** Every event that could happen right now, in the order they are authored. */
export function eventsFor(now: Circumstance, from: readonly GameEvent[] = events): GameEvent[] {
  return from.filter((e) => canHappen(e, now));
}

/**
 * The one event that happens, or null -- which is the answer today and will be most nights.
 *
 * **Seeded, never random.** `world/rng.ts` is the only source of chance in this codebase and the
 * determinism rule is absolute: the same seed must produce the same world and the same journal
 * text. An event chosen with `Math.random` would make a seed unshareable and a test unwritable, and
 * it would be the first thing in `content/` to break that.
 *
 * The caller passes the roll, exactly as the activity card's caller does, so this module stays free
 * of both the clock and the world.
 */
export function eventNow(
  now: Circumstance,
  roll: (salt: string) => number,
  from: readonly GameEvent[] = events
): GameEvent | null {
  const could = eventsFor(now, from);
  if (could.length === 0) return null;
  return could[roll(`event:${now.occasion}:${now.day}`) % could.length] ?? null;
}

/**
 * The choices worth offering, given what the player holds.
 *
 * An option needing something they lack is not offered rather than offered greyed -- see `Choice`
 * for why that is the opposite of the action rail's rule and right here.
 *
 * **Never returns empty for an event that has any choices at all.** A scene a player cannot leave
 * is a soft lock, and the first authored event with a conditional option would find that out the
 * hard way. If every option is gated, the last one is offered anyway on the grounds that an event
 * with no way out is worse than one that bends its own rule.
 */
export function choicesFor(event: GameEvent, holds: readonly string[]): Choice[] {
  const open = event.choices.filter((c) => c.needs.every((id) => holds.includes(id)));
  if (open.length > 0 || event.choices.length === 0) return open;
  return [event.choices[event.choices.length - 1]!];
}
