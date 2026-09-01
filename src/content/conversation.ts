// Talking to somebody, as a conversation rather than a form.
//
// **What was wrong was presentation, not content.** Every available line rendered at once as a
// list, each with a "Write it down" button beside it, so meeting a person was a queue of rows to
// clear. Writing it down stopped being a click: the diary is Varuna's and he does not need
// permission to use it.
//
// The writing underneath is already the right shape. Every person opens with something offered
// freely, and their later lines unlock from discoveries the player makes: Thrali's grandfather had
// half a word for silver water, and he gives you the other half once you have seen it. That is a
// relationship developing, and the panel was rendering it as a spreadsheet.
//
// So this decides what somebody says *now*, in what order, and in how many pieces at a time.

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

// ---------------------------------------------------------------------------
// A meeting, rather than a line
// ---------------------------------------------------------------------------

/**
 * One line of a person's, and its place in the exchange.
 *
 * `index` is carried per turn because the caller records each line as heard by its index, and a
 * meeting can now play several. Losing that mapping is how the wrong line gets marked spent.
 */
export interface Turn {
  line: Line;
  index: number;
  gives: boolean;
}

/**
 * What somebody says on being spoken to, as an exchange with more than one thing in it.
 *
 * **This exists because a measurement in the comment above turned out to be wrong.** That comment
 * claimed "almost everybody has exactly one line available on arrival". Re-run against the shipped
 * bundle, nobody has one: Bekh, Pell and Uma open with three ungated lines and everybody else with
 * two — nineteen across the eight of them. `saysNow` returns exactly one, so **roughly two fifths
 * of the opening writing was authored, exported, and never shown to anybody.**
 *
 * So a first meeting plays every line the person is offering freely, in the order their author
 * wrote them, and stops. That is an introduction: a person telling you who they are, in a few
 * sentences, the way a person does. Later visits go back through `saysNow` — one newest, most
 * relevant thing — because that is what a returning visitor gets and it is already correct.
 *
 * `firstMeeting` is the caller's to decide. `PlacePanel` knows it as "have I heard anything from
 * this person before", which is derived from `Progress` rather than remembered, for the same
 * reason `spent` is.
 */
export function meeting(
  available: readonly Line[],
  spent: (line: Line) => boolean,
  firstMeeting: boolean
): Turn[] {
  if (available.length === 0) return [];

  if (firstMeeting) {
    // Everything offered freely, in authored order. `available` is already filtered to what the
    // player can hear, so an ungated line here is one whose requirements are met — which on a
    // first meeting is the introduction and nothing else.
    const opening = available
      .map((line, index) => ({ line, index, gives: line.gives.length > 0 }))
      .filter((turn) => !spent(turn.line));
    if (opening.length > 0) return opening;
  }

  const said = saysNow(available, spent);
  return said.line ? [{ line: said.line, index: said.index, gives: said.gives }] : [];
}

/**
 * Whether anything remains after this exchange.
 *
 * Kept separate from `meeting` so the panel can say "there is more they could tell you" without
 * the list of turns having to carry a flag that is only true on its last element.
 */
export function moreAfter(
  available: readonly Line[],
  spent: (line: Line) => boolean,
  played: readonly Turn[]
): boolean {
  const heard = new Set(played.map((t) => t.index));
  return available.some((l, i) => !heard.has(i) && l.gives.length > 0 && !spent(l));
}

// ---------------------------------------------------------------------------
// Beats
// ---------------------------------------------------------------------------

/**
 * A line, split into the pieces it should arrive in.
 *
 * **Split on the author's own punctuation, never on a character count.** Bekh opens with "Mask
 * Family, yes. There is no family and there are no masks, so it is mostly a way of saying which
 * brick I sleep under." — two sentences, and the first is a four-word answer that lands on its own.
 * A split at sixty characters would cut it mid-clause and turn a considered pause into a stutter.
 *
 * **A dash after a full stop is a scene break, and it is the best thing in this writing.** Canon
 * uses `--` two ways and they are not the same mark. Mid-clause it is an aside inside one thought
 * — Marn's "Not step -- khet." is a single breath and must never be split. But *after* sentence
 * punctuation it is time passing with Varuna doing something in the gap: Uma says "Sit." and then
 * "-- No, like that, butt the reeds against the frame", which is her watching him get it wrong.
 * Six lines use the first form and five use the second. Splitting on both would break Marn's
 * teaching; splitting on neither loses every one of those five silences.
 *
 * A very short trailing fragment is joined back onto its neighbour rather than flashing by on its
 * own: "She would not say what." rides along with the sentence it belongs to.
 */
export function beats(text: string): string[] {
  // Cut where a dash follows sentence punctuation, before splitting sentences — the dash itself
  // is stage direction and does not survive into what is shown.
  const scenes = text.split(SCENE_BREAK);

  const out: string[] = [];
  for (const scene of scenes) {
    const pieces = scene.trim().match(/[^.!?]+(?:[.!?]+|$)/g);
    if (!pieces) continue;
    // Where a scene starts is always a new beat, however short — that pause is the point.
    let opening = true;
    for (const raw of pieces) {
      const piece = raw.trim();
      if (!piece) continue;
      const previous = out[out.length - 1];
      if (!opening && previous && piece.length < SHORT_BEAT) {
        out[out.length - 1] = `${previous} ${piece}`;
      } else {
        out.push(piece);
      }
      opening = false;
    }
  }
  return out.length > 0 ? out : [text];
}

/**
 * A dash standing where a sentence has already ended: time passing, not punctuation.
 *
 * Anchored to the preceding `.`/`?`/`!` so a mid-clause dash cannot match it. The lookbehind keeps
 * that terminator attached to the sentence it closes.
 */
const SCENE_BREAK = /(?<=[.!?])\s+--+\s+/;

/**
 * Below this, a sentence is a fragment rather than a beat.
 *
 * Twenty-four characters keeps "Mask Family, yes." (17) standing alone — it opens its line, so it
 * has no predecessor to glue to, which is right. It catches trailing scraps only when something
 * precedes them within the same scene.
 */
const SHORT_BEAT = 24;
