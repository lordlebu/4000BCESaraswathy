// What people on the road have heard, and where it sends you.
//
// **Conversation that makes events.** The owner's brief: apart from the main conversation, talk with
// the people a map has should generate its happenings, and that is what makes each map its own. A
// rumour is a pointer -- to a place you have not been, to somebody with something to tell you, to a
// question somebody is turning over -- and walking to where it points is what fires the happening
// that follows it up (`rumour-kept` in `happenings.ts`).
//
// **Every rumour is true of the world, and none is knowledge.** A stranger can say that a place
// exists, where a named person is today, and that somebody is asking something. They never say
// what a word means or what a discovery shows: canon owns those, and `travellers.ts` draws the same
// line for road company. The words a stranger says it in are in `data/happenings.json`.
//
// Pure, and deterministic: which rumour a stranger has is a seeded pick.

import { fieldQuestions } from './knowledge';
import { fieldMap, npc, npcsAt, poi } from './places';

export type RumourKind = 'place' | 'person' | 'question';

export interface Rumour {
  /** `rumour:<kind>:<subject>`. What the `heard:` and `told:` flags carry. */
  id: string;
  kind: RumourKind;
  /** Where it sends you. */
  poiId: string;
  /** The place's name mid-sentence, and the person it is about when it is about somebody. */
  place: string;
  person: string | null;
}

export interface RumourFacts {
  /** Places reached already: a rumour about somewhere you have been is not news. */
  reached: (poiId: string) => boolean;
  /** Whether the player carries this field question already. */
  knowsQuestion: (questionId: string) => boolean;
  /** Whether a named person has something new to say: `hasSomethingNew`. */
  hasNews: (npcId: string) => boolean;
  /** Where a named person is right now, or null while they are on the road. See `presence.ts`. */
  whereIs: (npcId: string) => string | null;
  /** Flags the journey carries, for the rumours already heard. */
  flags: readonly string[];
}

const placeName = (poiId: string): string => (poi(poiId)?.name ?? 'somewhere').replace(/^The /, 'the ');

/** The flag a heard rumour leaves. */
export const heardFlag = (rumourId: string): string => `heard:${rumourId}`;

/**
 * Everything the road could tell you on this map now, in a stable order.
 *
 * Three kinds, and each is only offered while it is news: a place you have not reached, a person
 * with something new to say who is at a place rather than on the road, a question raised on this map
 * that you do not carry yet. A rumour already heard is left out.
 */
export function rumoursOn(fieldMapId: string, facts: RumourFacts): Rumour[] {
  const places = fieldMap(fieldMapId)?.pointsOfInterest ?? [];
  const here = new Set(places);
  const heard = (id: string) => facts.flags.includes(heardFlag(id));
  const out: Rumour[] = [];

  for (const poiId of places) {
    if (facts.reached(poiId)) continue;
    out.push({ id: `rumour:place:${poiId}`, kind: 'place', poiId, place: placeName(poiId), person: null });
  }

  const people = new Set<string>();
  for (const poiId of places) for (const person of npcsAt(poiId)) people.add(person.id);
  for (const npcId of people) {
    if (!facts.hasNews(npcId)) continue;
    const at = facts.whereIs(npcId);
    if (!at || !here.has(at)) continue;
    out.push({
      id: `rumour:person:${npcId}`,
      kind: 'person',
      poiId: at,
      place: placeName(at),
      person: npc(npcId)?.name ?? null
    });
  }

  for (const q of fieldQuestions) {
    if (!q.raisedAt || !here.has(q.raisedAt) || facts.knowsQuestion(q.id)) continue;
    out.push({
      id: `rumour:question:${q.id}`,
      kind: 'question',
      poiId: q.raisedAt,
      place: placeName(q.raisedAt),
      person: q.raisedBy ? (npc(q.raisedBy)?.name ?? null) : null
    });
  }

  return out.filter((r) => !heard(r.id));
}

/** One rumour for this stranger today, or null when the road has nothing new. A seeded pick. */
export function rumourFor(rumours: readonly Rumour[], roll: (salt: string) => number): Rumour | null {
  if (rumours.length === 0) return null;
  return rumours[roll('rumour') % rumours.length]!;
}

/**
 * A rumour heard and not yet followed, that sends you to this place.
 *
 * Read off the flags alone, because a rumour's id says where it points except for a person, who
 * may have moved on -- so the `told:` flag carries the place it named when it was told.
 */
export function rumourAt(poiId: string, flags: readonly string[]): { rumourId: string; teller: string } | null {
  for (const flag of flags) {
    // told:<rumour id>@<poi id>@<teller key>
    if (!flag.startsWith('told:')) continue;
    const [rumourId, at, teller] = flag.slice('told:'.length).split('@');
    if (at === poiId && rumourId && teller) return { rumourId, teller };
  }
  return null;
}
