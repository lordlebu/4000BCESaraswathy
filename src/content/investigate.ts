// Helping Varuna: the work of settling a question.
//
// Canon authors a field question as an open problem with several readings, at most one of
// which survives later evidence. The rules for which readings are reachable have existed since
// the knowledge layer landed — but nothing ever called `answer`, so the signature mechanic of
// the game could not be performed. This is the half that makes it possible: gather what you
// hold, see it beside the accounts other people give, and settle.
//
// Everything here is derived from the canon bundle, which is inlined at build time. That is
// deliberate: three of the four investigation tools are structured queries over data the game
// already has, so they work instantly and offline. Only free-text research needs the retrieval
// service, and that stays opt-in like everything else that touches the network.
//
// Free of React and Phaser, like the rest of `content/`.

import { creatures, flora, engineId } from './canon';
import { discoveries, discovery, fieldQuestion } from './knowledge';
import { entryFor, isComplete, rungOf, type Progress } from '../journey';
import type { Creature, Flora } from '../world/types';

/** A discovery a question rests on, and how far the player has got with it. */
export interface Evidence {
  id: string;
  name: string;
  discipline: string;
  /** Seen closely enough to reason from — the same bar a reading is held to. */
  held: boolean;
  understood: boolean;
  /** What the player has currently written, or null if they have never looked. */
  written: string | null;
}

/**
 * What the player actually has to argue from.
 *
 * Ordered as canon lists it rather than by how far the player has got: the evidence chain is
 * an argument, and reordering it by progress would rewrite the argument.
 */
export function evidenceFor(progress: Progress, questionId: string): Evidence[] {
  const q = fieldQuestion(questionId);
  if (!q) return [];
  return q.evidence
    .map((id) => discovery(id))
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .map((d) => ({
      id: d.id,
      name: d.name,
      discipline: d.discipline,
      held: rungOf(progress, d.id) >= 1,
      understood: isComplete(progress, d.id),
      written: entryFor(progress, d.id)
    }));
}

/** One possible answer, and whether the player can currently give it. */
export interface Reading {
  index: number;
  conclusion: string;
  /** Whether it survives later evidence. Never shown before the player commits. */
  sound: boolean;
  available: boolean;
  /** What is still missing, as readable names rather than ids. */
  missing: string[];
  chosen: boolean;
  /**
   * Whether later evidence has begun to trouble this reading.
   *
   * Settling on a wrong answer must not be announced as wrong — that would turn a mistake
   * into a wrong-answer buzzer and remove the reason to keep looking. Instead canon names, on
   * each unsound resolution, the discovery that eventually contradicts it. This turns true
   * only once the player has found that discovery for themselves, which is the moment they
   * would have started to doubt anyway.
   */
  troubled: boolean;
  /** The observation that troubles this reading, for showing once `troubled` is true. */
  doubt: string | null;
}

/**
 * Every reading, including the ones out of reach.
 *
 * Unlike the diary, which shows nothing a player has not found, a question shows all of its
 * readings from the start — because the shape of the disagreement *is* the content. Knowing
 * there are three accounts and you can only support one of them is the game working.
 *
 * `sound` is carried but a caller must not render it before the player has settled. The whole
 * mechanic depends on the wrong answer looking exactly as reasonable as the right one.
 */
export function readingsFor(progress: Progress, questionId: string): Reading[] {
  const q = fieldQuestion(questionId);
  if (!q) return [];
  const chosen = progress.answered[questionId];

  return q.resolutions.map((r, index) => {
    const missing = r.requires
      .filter((req) => (req.startsWith('word_') ? !progress.words.includes(req) : rungOf(progress, req) < 1))
      .map((req) => discovery(req)?.name ?? 'something you have not found');
    return {
      index,
      conclusion: r.conclusion,
      sound: r.sound,
      available: missing.length === 0,
      missing,
      chosen: chosen === index,
      troubled:
        chosen === index &&
        !r.sound &&
        Boolean(r.revisitAfter) &&
        rungOf(progress, r.revisitAfter!) >= 1,
      /** What the doubt actually is, once there is one. */
      doubt: r.revisit
    };
  });
}

/** A species as canon holds it, for putting two of them side by side. */
type Species = Creature | Flora;

const speciesByCanonId = new Map<string, Species>(
  [...creatures, ...flora].map((s) => [s.id, s])
);

/** Follow a canon cross-reference — `subject`, `evidence` — back to a species. */
export function speciesFor(canonId: string): Species | null {
  return speciesByCanonId.get(engineId(canonId)) ?? null;
}

export interface Difference {
  field: string;
  a: string;
  b: string;
  same: boolean;
}

/**
 * Two specimens, field by field.
 *
 * Built for `question_two_names`, where the archive lists one bird under two entries and the
 * player has to decide whether that is two species or one animal at two ages. Laying the
 * records beside each other is exactly the work, and the answer is not in any single row —
 * it is in noticing that only one row differs.
 */
export function compare(aCanonId: string, bCanonId: string): Difference[] {
  const a = speciesFor(aCanonId);
  const b = speciesFor(bCanonId);
  if (!a || !b) return [];

  const rows: [string, string, string][] = [
    ['Name', a.name, b.name],
    ['Binomial', a.binomial ?? 'unnamed', b.binomial ?? 'unnamed'],
    ['Region', a.region, b.region],
    ['Ground', a.biomes.join(', ') || 'nowhere placed', b.biomes.join(', ') || 'nowhere placed'],
    ['How often', a.rarity, b.rarity]
  ];
  return rows.map(([field, x, y]) => ({ field, a: x, b: y, same: x === y }));
}

/**
 * What canon says a thing is, and which disciplines have looked at it.
 *
 * `subject` is the link from a discovery back to the entity it concerns. It had no consumer
 * until now, which is why the ids in it had never been checked against anything.
 */
export interface Classification {
  canonId: string;
  name: string;
  facts: { label: string; value: string }[];
  /** Discoveries about this entity, whether or not the player has found them. */
  studiedBy: { id: string; name: string; discipline: string; found: boolean }[];
}

export function classify(progress: Progress, canonId: string): Classification | null {
  const s = speciesFor(canonId);
  const about = discoveries.filter((d) => d.subject === canonId);
  if (!s && about.length === 0) return null;

  return {
    canonId,
    name: s?.name ?? canonId,
    facts: s
      ? [
          { label: 'Binomial', value: s.binomial ?? 'unnamed' },
          { label: 'Region', value: s.region },
          { label: 'Ground', value: s.biomes.join(', ') || 'nowhere the map can draw' },
          { label: 'How often', value: s.rarity }
        ]
      : [],
    studiedBy: about.map((d) => ({
      id: d.id,
      name: d.name,
      discipline: d.discipline,
      found: rungOf(progress, d.id) >= 0
    }))
  };
}

/**
 * What else in canon touches this — the cross-reference.
 *
 * Restricted to what the player has at least noticed. A tool that listed everything canon
 * connects to a thing would be a spoiler engine, and the diary's rule holds here too: never
 * show an inventory of what has not been found.
 */
export function crossReference(
  progress: Progress,
  canonId: string
): { discoveries: string[]; questions: string[] } {
  const about = discoveries.filter((d) => d.subject === canonId && rungOf(progress, d.id) >= 0);
  const questions = new Set<string>();
  for (const d of about) {
    for (const q of d.answers) if (progress.questions.includes(q)) questions.add(q);
  }
  return { discoveries: about.map((d) => d.id), questions: [...questions] };
}
