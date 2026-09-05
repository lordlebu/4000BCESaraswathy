// Who you have met, and what came of it.
//
// The last record with nowhere to live. Eight people stand across twenty places, they carry
// forty-four lines between them, and until now nothing kept an account of any of it: a word you
// were given appeared in the diary with no note of whose grandfather half-remembered it.
//
// **Nothing new is stored.** Every fact below is derived from `Progress`, on the same reasoning as
// `lineIsSpent` and `gatherable`: a saved roster is state that has to be migrated, kept in step
// with a re-exported bundle, and defended against a reworded line. What the player did is already
// written down in the words, questions, recipes and discoveries they hold; this only reads it back
// and says who it came from.

import type { Progress } from '../journey';
import { isComplete, isFirstMeeting, lineIsSpent, rungOf } from '../journey';
import { discoveries } from './knowledge';
import { allNpcs, type Npc } from './places';

/** One person, as a record rather than as somebody standing in front of you. */
export interface Acquaintance {
  person: Npc;
  /** Words, questions, recipes and discoveries they handed over, in the order they were given. */
  gave: string[];
  /**
   * Whether a discovery the player has *finished* names this person as somebody it helps.
   *
   * The game's whole claim about helping: knowledge is how you do it, and there is no separate
   * favour to run. `gatherable` and `staying` split on exactly this, so the ending cannot
   * disagree with what this tab says.
   */
  helped: boolean;
}

/**
 * Everybody the player has actually spoken to.
 *
 * **Met is derived, not remembered**, from `isFirstMeeting` — somebody has been met once they have
 * handed something over, because that is the trace talking to them leaves. It works only because
 * every introduction in canon contains at least one line that gives something freely; a person
 * whose opening gave nothing would be invisible here, having been talked to. `test/people.test.ts`
 * asserts that property of the writing rather than trusting it.
 *
 * Unmet people are left out entirely. A list of everybody, greyed, would be a checklist of content
 * the player has not reached — which is a different thing from a record of who they know, and it
 * would say where to go next in a game whose subject is finding out.
 */
export function met(progress: Progress): Acquaintance[] {
  const helps = helpedBy(progress);
  return allNpcs()
    .filter((person) => !isFirstMeeting(progress, person.id))
    .map((person) => ({
      person,
      gave: person.lines.filter((l) => lineIsSpent(progress, l)).flatMap((l) => l.gives),
      helped: helps.has(person.id)
    }));
}

/**
 * The people a finished discovery names as helped.
 *
 * Lifted from the two copies in `journey.ts`, which walked the same loop to opposite ends. Kept
 * here rather than exported from there because this is a reading of progress for a panel, and
 * `journey.ts` owns the rules — but the loop is the same one, deliberately, so the tab and the
 * ending can never disagree about who was helped.
 */
function helpedBy(progress: Progress): Set<string> {
  const helped = new Set<string>();
  for (const d of discoveries) {
    if (!isComplete(progress, d.id)) continue;
    for (const who of d.helps) helped.add(who);
  }
  return helped;
}

/**
 * What is still open with somebody, in the panel's own words.
 *
 * Never a count of lines remaining, and never a lock. "2 of 6 heard" turns a person into a
 * completion bar, which is the register this whole phase has been moving away from — and it would
 * also be a promise the writing cannot always keep, since a line can be gated on a discovery three
 * maps away.
 *
 * Null when there is nothing to say, so the caller renders nothing rather than a reassuring blank.
 */
export function threadWith(progress: Progress, person: Npc): string | null {
  const unheard = person.lines.filter((l) => !lineIsSpent(progress, l) && l.gives.length > 0);
  if (unheard.length === 0) return null;

  // Something they will say once you have seen a particular thing. Naming the *kind* of thing is
  // as far as this goes: naming the thing itself would be a quest marker.
  const waiting = unheard.some((l) => l.requires.some((r) => rungOf(progress, r) < 0));
  return waiting
    ? 'There is more here, once you have seen more.'
    : 'There is more they could tell you.';
}
