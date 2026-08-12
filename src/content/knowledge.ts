// Discoveries, questions and words, adapted out of the canon bundle.
//
// The third of the adapters, after `canon.ts` for species and `places.ts` for ground. This
// one carries the game's progression: there are no experience points, so a discovery moving
// up its ladder is what advancement means.
//
// The split to keep straight: canon says what CAN be known and what it takes to know it.
// What a particular player has got to lives in their save and never here. Everything in
// this file is a definition; `src/journey.ts` holds the state.
//
// Free of React and Phaser, like the rest of `content/`.

import knowledgeBundle from '../../data/canon/knowledge.json';

export type Discipline =
  | 'zoology'
  | 'botany'
  | 'archaeology'
  | 'geography'
  | 'linguistics'
  | 'evolution'
  | 'anomalies';

export interface Conditions {
  timeOfDay: string[];
  weather: string[];
}

/** One rung of the ladder, and what it takes to stand on it. */
export interface Rung {
  /** What the diary reads here. Written for the player, and less certain lower down. */
  entry: string;
  /** Discovery or vocabulary ids needed. Empty means it follows from the rung below. */
  requires: string[];
  /** When the world has to cooperate — a night, a rainfall — for this to be reachable. */
  conditions: Conditions | null;
}

export interface Discovery {
  id: string;
  name: string;
  discipline: Discipline;
  /** The canon entity this is about, if it is about one. */
  subject: string | null;
  foundAt: string[];
  rungs: Rung[];
  /** Field questions this contributes evidence toward. */
  answers: string[];
  /** People whose lives this mends, once it reaches the last rung. */
  helps: string[];
  /** What it can put back — a poisoned field, a silted channel. */
  restores: string[];
}

export interface Resolution {
  conclusion: string;
  requires: string[];
  /** Whether this reading survives later evidence. At most one per question. */
  sound: boolean;
  /**
   * The observation that eventually troubles this reading, in a field diary's words.
   *
   * Prose, not an id — it had drifted into meaning both, because nothing read it. `revisitAfter`
   * carries the id, and the pair is deliberate: the prose says what the doubt is, the id says
   * when the player is in a position to have it.
   */
  revisit: string | null;
  /** The discovery that raises that doubt. Until it is seen, a wrong answer is not questioned. */
  revisitAfter: string | null;
}

export interface FieldQuestion {
  id: string;
  question: string;
  discipline: Discipline;
  raisedAt: string | null;
  raisedBy: string | null;
  evidence: string[];
  resolutions: Resolution[];
  /** How the people who live here explain it. Often right, in its own terms. */
  localKnowledge: string | null;
  /** How a Narmada scholar would. Equally often wrong. */
  academicHypothesis: string | null;
}

export interface Word {
  id: string;
  word: string;
  language: string;
  gloss: string;
  literal: string | null;
  learnedFrom: string[];
}

interface RawRung {
  entry: string;
  requires?: string[];
  conditions?: { time_of_day?: string[]; weather?: string[] };
}
interface RawDiscovery {
  id: string; name: string; discipline: string; subject?: string;
  found_at?: string[]; levels: RawRung[]; answers?: string[];
  helps?: string[]; restores?: string[];
}
interface RawQuestion {
  id: string; question: string; discipline: string;
  raised_at?: string; raised_by?: string; evidence?: string[];
  resolutions: {
    conclusion: string; requires?: string[]; sound?: boolean;
    revisit?: string; revisit_after?: string;
  }[];
  local_knowledge?: string; academic_hypothesis?: string;
}
interface RawWord {
  id: string; word: string; language: string; gloss: string;
  literal?: string; learned_from?: string[];
}

const raw = knowledgeBundle as {
  discoveries: RawDiscovery[];
  field_questions: RawQuestion[];
  vocabulary: RawWord[];
};

export const discoveries: Discovery[] = raw.discoveries.map((d) => ({
  id: d.id,
  name: d.name,
  discipline: d.discipline as Discipline,
  subject: d.subject ?? null,
  foundAt: d.found_at ?? [],
  rungs: d.levels.map((l) => ({
    entry: l.entry,
    requires: l.requires ?? [],
    conditions: l.conditions
      ? { timeOfDay: l.conditions.time_of_day ?? [], weather: l.conditions.weather ?? [] }
      : null
  })),
  answers: d.answers ?? [],
  helps: d.helps ?? [],
  restores: d.restores ?? []
}));

export const fieldQuestions: FieldQuestion[] = raw.field_questions.map((q) => ({
  id: q.id,
  question: q.question,
  discipline: q.discipline as Discipline,
  raisedAt: q.raised_at ?? null,
  raisedBy: q.raised_by ?? null,
  evidence: q.evidence ?? [],
  resolutions: q.resolutions.map((r) => ({
    conclusion: r.conclusion,
    requires: r.requires ?? [],
    sound: r.sound === true,
    revisit: r.revisit ?? null,
    revisitAfter: r.revisit_after ?? null
  })),
  localKnowledge: q.local_knowledge ?? null,
  academicHypothesis: q.academic_hypothesis ?? null
}));

export const vocabulary: Word[] = raw.vocabulary.map((w) => ({
  id: w.id,
  word: w.word,
  language: w.language,
  gloss: w.gloss,
  literal: w.literal ?? null,
  learnedFrom: w.learned_from ?? []
}));

const discoveryById = new Map(discoveries.map((d) => [d.id, d]));
const questionById = new Map(fieldQuestions.map((q) => [q.id, q]));
const wordById = new Map(vocabulary.map((w) => [w.id, w]));

export function discovery(id: string): Discovery | null {
  return discoveryById.get(id) ?? null;
}
export function fieldQuestion(id: string): FieldQuestion | null {
  return questionById.get(id) ?? null;
}
export function word(id: string): Word | null {
  return wordById.get(id) ?? null;
}

/** Discoveries findable at a point of interest. */
export function discoveriesAt(poiId: string): Discovery[] {
  return discoveries.filter((d) => d.foundAt.includes(poiId));
}

/** The last rung. Reaching it is what turns understanding into help. */
export function lastRung(d: Discovery): number {
  return d.rungs.length - 1;
}

/**
 * Whether a discovery can mend anything at all.
 *
 * Most cannot, and should not: knowing how the marsh-lurker banks heat is worth knowing on
 * its own. Only a few carry `helps`, and those are the ones the ending is built from.
 */
export function isActionable(d: Discovery): boolean {
  return d.helps.length > 0 || d.restores.length > 0;
}
