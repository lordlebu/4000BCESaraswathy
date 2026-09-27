// Somebody speaking first.
//
// **The owner, 27 September:** "some to have a chance the chitchat to start without us initiating,
// just by bumping into people, specially for named npcs, specially when it's the first time or they
// want something from us." Until now only the Asura-Tainted Princess ever spoke first, because she
// walks up to you (`visitors.ts`); everybody else waited to be chosen from a list.
//
// This bends a ruling rather than breaking it. "Listening is an act" stays true of the list: a place
// still names who is there and you choose. What is new is that a person with a reason may, on a
// seeded chance, call out as you pass or walk in -- and the reasons are the brief's own:
//
//   first   -- you have never spoken, and they introduce themselves
//   wants   -- they have something to ask of you: a question they cannot settle, or a thing of
//              theirs they have just seen you carrying
//   passing -- a stranger on the road, who has no lines of their own and may simply fall in
//
// A named person with nothing new to say never speaks first: calling you over to repeat themselves
// is a chore, which is what the conversation rework fixed. And nobody speaks first more than once a
// day, so walking back and forth past somebody is not a way to be buttonholed.
//
// Pure: the caller says who is near, what it knows about each, and brings the roll.

import type { Line } from './places';

export type Reason = 'first' | 'wants' | 'passing';

/**
 * How likely somebody with each reason is to speak first, when you bump into them.
 *
 * A chance rather than a certainty, because the brief says "some", and a person who always calls
 * out is a trigger rather than a person. A first meeting is the likeliest; a stranger the least,
 * since the road has two or three of them and they would otherwise be constant.
 */
export const SPEAKS_FIRST: Readonly<Record<Reason, number>> = {
  first: 0.6,
  wants: 0.5,
  passing: 0.2
};

/** Which reason ranks first when two people could both speak: the brief's own order. */
const RANK: Readonly<Record<Reason, number>> = { first: 0, wants: 1, passing: 2 };

/**
 * Whether one of a person's lines asks something of the player.
 *
 * Canon already marks both kinds: a line that hands over a field question is somebody asking for
 * help with it, and a line with a `costs` is somebody who wants a thing of theirs back. `linesFor`
 * only offers a priced line once the thing is carried, so an offered one means they have just seen
 * it on you. Only lines not yet spent count: a question already carried is not asked twice.
 */
export function asksSomething(line: Line, spent: boolean): boolean {
  if (spent) return false;
  return line.costs !== null || line.gives.some((g) => g.startsWith('question_'));
}

export interface Bumped {
  /** Stable across the day: the named person's id, or the stranger's map-qualified key. */
  key: string;
  /** The named person, or null for a stranger. */
  npcId: string | null;
  /** The traveller who is walking, when it is somebody on the road. */
  travellerId: string | null;
  reason: Reason;
}

/**
 * Who speaks first among the people just bumped into, or null.
 *
 * `spoken` is who has already spoken first today, as `<key>@<day>`. `roll` gives 0..1 for a salt,
 * seeded by the caller, so the same seed, day and meeting always answer the same way.
 */
export function whoSpeaksFirst(
  candidates: readonly Bumped[],
  day: number,
  spoken: ReadonlySet<string>,
  roll: (salt: string) => number
): Bumped | null {
  const willing = candidates
    .filter((c) => !spoken.has(`${c.key}@${day}`))
    .filter((c) => roll(`speaks-first:${c.key}:${day}`) < SPEAKS_FIRST[c.reason])
    .sort((a, b) => RANK[a.reason] - RANK[b.reason] || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return willing[0] ?? null;
}
