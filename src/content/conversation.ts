// Talking to somebody, as a conversation rather than a form.
//
// **What was wrong was presentation, not content.** Every available line rendered at once as a
// list, each with a "Write it down" button beside it, so meeting a person was a queue of rows to
// clear. Measured before changing anything: almost everybody has exactly *one* line available on
// arrival, so the list was usually a list of one — all of the paperwork and none of the volume.
//
// The writing underneath is already the right shape. Every person opens with something offered
// freely, and their later lines unlock from discoveries the player makes: Thrali's grandfather had
// half a word for silver water, and he gives you the other half once you have seen it. That is a
// relationship developing, and the panel was rendering it as a spreadsheet.
//
// So this decides what somebody says *now* — one thing, the most relevant thing — and whether
// there is more where that came from. Writing it down stops being a click: the diary is Varuna's
// and he does not need permission to use it.

import type { Line } from './places';

/** What a person says on being spoken to. */
export interface Said {
  /** The line itself. Null when they have nothing new, which is not the same as nothing at all. */
  line: Line | null;
  /** Index into the list `linesFor` returned, so the caller can record what was heard. */
  index: number;
  /** Whether they still have something after this one. Drives "there is more here" in the UI. */
  more: boolean;
  /** True when the line hands over a word, a question or a discovery. */
  gives: boolean;
}

/**
 * Which of the available lines to say, and whether to expect another.
 *
 * **The newest useful thing first.** A person's lines are authored in the order their life
 * unfolds — an opening offer, then what they will tell you once you have seen something — so the
 * last available line is the one furthest into that relationship and the one the player has just
 * earned. Saying the first would replay the introduction every visit.
 *
 * **`spent` is derived, not remembered.** A line that hands something over is recorded by the
 * thing it handed over: once you hold `word_kia_thal`, Thrali's line about his grandfather has
 * plainly been heard. Asking the caller "has this been given already?" avoids putting a list of
 * line texts into `Progress`, which is saved — and a saved list of prose would break every time
 * a line was reworded.
 *
 * Lines that give nothing may repeat. People do say the same thing twice, and a panel that runs
 * dry reads as broken.
 */
export function saysNow(available: readonly Line[], spent: (line: Line) => boolean): Said {
  if (available.length === 0) return { line: null, index: -1, more: false, gives: false };

  // Anything still to hand over comes first, newest to oldest.
  for (let i = available.length - 1; i >= 0; i -= 1) {
    const line = available[i]!;
    if (line.gives.length > 0 && !spent(line)) {
      return { line, index: i, more: hasMore(available, spent, i), gives: true };
    }
  }

  // Nothing left to give. Say the most recent thing they have, which is where the relationship
  // actually stands, rather than the introduction they opened with.
  const i = available.length - 1;
  return { line: available[i]!, index: i, more: false, gives: false };
}

/** Whether anything else remains to be given after the line at `except`. */
function hasMore(
  available: readonly Line[],
  spent: (line: Line) => boolean,
  except: number
): boolean {
  return available.some((l, i) => i !== except && l.gives.length > 0 && !spent(l));
}

/**
 * How to describe somebody with nothing new, in the UI's own words.
 *
 * Never "has nothing to say to you yet", which is what the panel used to print. That is a locked
 * door with a face on it — it tells the player they have failed a check they did not know about.
 * Somebody with nothing new is simply somebody you have already talked to.
 */
export function quietNote(name: string): string {
  return `${name} has said their piece for now.`;
}
