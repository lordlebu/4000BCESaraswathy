// A person's arc, beat by beat: Guyuk's and the Asura princess's.
//
// **Canon's words, the game's moments.** Each storyline is a lore entity (`database/storylines/`):
// an ordered run of beats on one map, each a story card with its prose, its painting and its
// choices, saying *when* it can come -- arriving at a place, a night slept on the map, a step on
// the road -- what the traveller must hold, and what they hand over. This module says only whether
// a beat's moment has come, and turns it into the event card the game already draws.
//
// **No quest system, on purpose.** A beat done is a flag in the save, `story:<arc>:<beat>`, set by
// the card's choice like every other flag an event leaves behind; the next beat is the first one
// without its flag. Someone who joins at the end of their arc leaves `walker:<person>`, and the
// roster reads that (`walkers`). The owner's arcs of 2 October 2026.
//
// Pure, and free of React and Phaser.

import placesBundle from '../../data/canon/places.json';
import { type Choice, type GameEvent, anyConditions } from './events';

export type BeatWhen = 'arriving' | 'night' | 'road';

export interface Beat {
  id: string;
  title: string;
  when: BeatWhen;
  at: string | null;
  requires: string[];
  asks: { id: string; count: number }[];
  art: string | null;
  prose: string;
  choices: { label: string; line: string; grants: string[] }[];
  joins: boolean;
}

export interface Storyline {
  id: string;
  name: string;
  person: string;
  fieldMapId: string;
  joins: boolean;
  beats: Beat[];
}

interface RawStoryline {
  id: string;
  name: string;
  person: string;
  field_map: string;
  joins: boolean;
  beats: {
    id: string;
    title: string;
    when: BeatWhen;
    at?: string;
    requires?: string[];
    asks?: { id: string; count: number }[];
    art?: string;
    prose: string;
    choices: { label: string; line: string; grants?: string[] }[];
    joins?: boolean;
  }[];
}

export const storylines: readonly Storyline[] = ((placesBundle as { storylines?: RawStoryline[] }).storylines ?? []).map(
  (s) => ({
    id: s.id,
    name: s.name,
    person: s.person,
    fieldMapId: s.field_map,
    joins: s.joins,
    beats: s.beats.map((b) => ({
      id: b.id,
      title: b.title,
      when: b.when,
      at: b.at ?? null,
      requires: b.requires ?? [],
      asks: b.asks ?? [],
      art: b.art ?? null,
      prose: b.prose,
      choices: b.choices.map((c) => ({ label: c.label, line: c.line, grants: c.grants ?? [] })),
      joins: b.joins ?? false
    }))
  })
);

/** The flag a beat leaves once it has happened. */
export const beatFlag = (arc: Storyline, beat: Beat): string => `story:${arc.id}:${beat.id}`;

/** The flag somebody leaves on joining the walkers. */
export const walkerFlag = (person: string): string => `walker:${person}`;

/** The beat this arc is waiting on, or null once it is all told. */
export function nextBeat(arc: Storyline, flags: readonly string[]): Beat | null {
  return arc.beats.find((b) => !flags.includes(beatFlag(arc, b))) ?? null;
}

/** How far through an arc the traveller is, for a diary line: beats done, of how many. */
export function arcProgress(arc: Storyline, flags: readonly string[]): { done: number; of: number } {
  return { done: arc.beats.filter((b) => flags.includes(beatFlag(arc, b))).length, of: arc.beats.length };
}

export interface StoryFacts {
  fieldMapId: string;
  /** The place just reached, for `arriving`. */
  poiId: string | null;
  flags: readonly string[];
  /** Whether the traveller holds a requirement: a discovery understood, a word, a recipe, a question. */
  holds: (id: string) => boolean;
  /** How many of something are carried. */
  carried: (id: string) => number;
}

/**
 * The beat whose moment this is, as an event card, or null.
 *
 * **A beat waits until it can be taken whole**: its place, its requirements, and everything it asks
 * to be handed over all present. Nothing half-happens, and no card offers a choice the satchel
 * cannot pay -- the same rule every event in this game keeps. The first arc with a beat due wins.
 */
export function beatNow(when: BeatWhen, facts: StoryFacts): GameEvent | null {
  for (const arc of storylines) {
    if (arc.fieldMapId !== facts.fieldMapId) continue;
    const beat = nextBeat(arc, facts.flags);
    if (!beat || beat.when !== when) continue;
    if (beat.at && beat.at !== facts.poiId) continue;
    if (!beat.requires.every((id) => facts.holds(id))) continue;
    if (!beat.asks.every((a) => facts.carried(a.id) >= a.count)) continue;
    return beatEvent(arc, beat);
  }
  return null;
}

/** A beat as the card the game draws for any event: its painting, its prose, its choices. */
export function beatEvent(arc: Storyline, beat: Beat): GameEvent {
  const sets = [beatFlag(arc, beat), ...(beat.joins ? [walkerFlag(arc.person)] : [])];
  const takes = beat.asks.map((a) => ({ id: a.id, n: a.count }));
  return {
    id: `story:${arc.id}:${beat.id}`,
    title: beat.title,
    occasion: beat.when,
    conditions: anyConditions(),
    prose: beat.prose,
    // A beat with no painting of its own borrows the arc's person's face nowhere: the card keeps its
    // shape and shows the night's scene or nothing, as every event without art does.
    art: beat.art ?? `story-${arc.id}`,
    choices: beat.choices.map(
      (c, i): Choice => ({
        id: `c${i}`,
        label: c.label,
        needs: [],
        line: c.line,
        grants: c.grants,
        ...(takes.length > 0 ? { takes } : {}),
        sets
      })
    ),
    once: true
  };
}

/**
 * Whether somebody is met through their arc rather than by walking up to them: the person of a
 * storyline. Guyuk the Seed-Gleaner stands nowhere and has no lines; her beats are her words.
 */
export function broughtByStory(npcId: string): boolean {
  return storylines.some((s) => s.person === npcId);
}

/** What somebody's arc teaches: every grant in every beat of the storylines they are the person of. */
export function storyGrants(npcId: string): string[] {
  return storylines
    .filter((s) => s.person === npcId)
    .flatMap((s) => s.beats.flatMap((b) => b.choices.flatMap((c) => c.grants)));
}
