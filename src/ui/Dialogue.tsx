// Somebody talking, at the speed somebody talks.
//
// **The writing was never the problem.** Canon holds eight people and forty-four lines averaging
// thirty-eight words, and the panel rendered each one as a finished paragraph that was simply
// *there* when the player arrived — complete before it was read, answering a question nobody got
// to ask. That is a caption, not a conversation, and the difference is entirely in the delivery.
//
// So: one beat at a time, typed out, advanced by the player. This is the device every cozy game
// uses -- Stardew, Spiritfarer, A Short Hike -- and it is doing something specific. Text that
// arrives at reading speed reads as *being told*; the same text arriving instantly reads as being
// handed a note. It costs one timer and it changes the whole register.
//
// Two rules it does not break:
//
// **A click completes the beat, it never skips it.** A player who clicks impatiently gets the
// whole line at once, not the next line — nobody should be able to lose a sentence by being quick.
// Only a second click, on a beat that has finished, moves on.
//
// **`prefers-reduced-motion` means all of it, now.** Typing is motion, and for some people it is
// motion that makes text unreadable. Under that setting every beat is complete the moment it
// appears and the control still says what it does.

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Characters per second.
 *
 * Read aloud against the actual lines: comfortable reading is around 15 characters a second, and
 * text that arrives *at* reading speed feels sluggish because the eye is always waiting. Typing
 * faster than one reads keeps the sense of arrival without ever being the thing you wait for.
 * Bekh's longest beat is 118 characters, which lands in a little under two seconds.
 */
const CHARS_PER_SECOND = 62;

/** One tick per frame is wasted work at this speed; 16ms of granularity is invisible. */
const TICK_MS = 16;

/** Whether this player has asked for less motion. Read live — the setting can change mid-session. */
function wantsStillness(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export interface DialogueProps {
  /** The beats to play, in order. Changing this restarts the exchange. */
  beats: readonly string[];
  /**
   * Called as each beat finishes, with its index.
   *
   * **Finishing is what counts as heard.** The panel used to record a line on mount, so it was
   * written into the diary before it was legible — and a player who walked away mid-sentence had
   * still "heard" it. Now the diary agrees with what was on screen.
   */
  onBeatDone?: (index: number) => void;
  /** Called once every beat has been played and the player has dismissed the last one. */
  onDone?: () => void;
  /** What the control says when there is another beat waiting. */
  moreLabel?: string;
  /** What the control says on the final beat. Null hides it — the caller is drawing its own. */
  doneLabel?: string | null;
  /**
   * Whether walking out mid-exchange still counts as having been told.
   *
   * **Default true, and the default is the important case.** "Finishing is what counts as heard"
   * fixed a line being recorded before it was legible, but taken alone it adds a rule nobody asked
   * for: close the panel early and every beat still to come is lost, so a question somebody was
   * halfway through giving you was never given. That is worse than the bug it replaced, because it
   * takes progress away rather than granting it early. The player did stand there and let them
   * talk — the only thing they skipped is the animation.
   */
  keepOnLeave?: boolean;
}

/**
 * One person's turn, played out.
 *
 * Beats already shown stay on screen. A conversation that replaced its own text would make the
 * player choose between reading and continuing, and these lines are worth re-reading — half of
 * them are the only place a word or a discovery is ever explained.
 */
export function Dialogue({
  beats,
  onBeatDone,
  onDone,
  moreLabel = 'Go on',
  doneLabel = 'Thank them',
  keepOnLeave = true
}: DialogueProps) {
  const [shown, setShown] = useState(0);
  const [typed, setTyped] = useState('');
  const still = useRef(wantsStillness());

  const current = beats[shown] ?? '';
  const complete = typed.length >= current.length;
  const last = shown >= beats.length - 1;

  // A new exchange starts at the beginning. Keyed on the joined text rather than the array, so a
  // caller that rebuilds an equal array on every render does not restart the conversation.
  const key = beats.join(' ');
  useEffect(() => {
    setShown(0);
    setTyped('');
  }, [key]);

  /**
   * The reveal in progress.
   *
   * **Held in a ref because completing a beat has to be able to stop it.** Without this the click
   * that finishes a sentence set the text to the whole thing and the interval, still running,
   * overwrote it on its very next tick with the few characters it had reached — so the line
   * visibly snapped back to partial and the documented "a click completes the beat" did nothing
   * until the typing caught up on its own.
   *
   * It survived a unit test that clicked mid-typing and asserted the text was whole, because that
   * test never let the clock run afterwards. What caught it was the browser suite on CI, where
   * software rendering stretches the typing out far enough that a click almost always lands
   * inside the window: `e2e/talking.spec.ts` clicked, got nothing, and timed out.
   */
  const ticking = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTyping = useCallback(() => {
    if (ticking.current !== null) {
      clearInterval(ticking.current);
      ticking.current = null;
    }
  }, []);

  // Type the current beat.
  useEffect(() => {
    if (!current) return;
    if (still.current) {
      setTyped(current);
      return;
    }
    setTyped('');
    const step = Math.max(1, Math.round((CHARS_PER_SECOND * TICK_MS) / 1000));
    let at = 0;
    ticking.current = setInterval(() => {
      at = Math.min(current.length, at + step);
      setTyped(current.slice(0, at));
      if (at >= current.length) stopTyping();
    }, TICK_MS);
    return stopTyping;
  }, [current, shown, key, stopTyping]);

  // Report a finished beat exactly once. `shown` is in the dependency list because the same text
  // can legitimately appear twice in one exchange.
  const reported = useRef(-1);
  useEffect(() => {
    reported.current = -1;
  }, [key]);
  useEffect(() => {
    if (complete && current && reported.current !== shown) {
      reported.current = shown;
      onBeatDone?.(shown);
    }
  }, [complete, current, shown, onBeatDone]);

  const advance = useCallback(() => {
    // Impatience finishes the sentence rather than losing it. Stop the reveal first, or its next
    // tick undoes what this just did.
    if (!complete) {
      stopTyping();
      setTyped(current);
      return;
    }
    if (last) onDone?.();
    else setShown((n) => n + 1);
  }, [complete, current, last, onDone, stopTyping]);

  // On the way out, report whatever was never reached. Held in a ref and read from the cleanup
  // because an unmount cleanup closes over the render it was created in, and the count of beats
  // already reported is only correct at the moment of leaving.
  const onLeave = useRef<() => void>(() => {});
  onLeave.current = () => {
    if (!keepOnLeave) return;
    // **Only once the exchange has actually begun.** React runs every effect's cleanup on mount
    // under StrictMode, to prove it is safe to run twice -- and that simulated unmount fired this,
    // so merely walking up to somebody reported every one of their lines as heard before a
    // character of the first had been drawn. That is precisely the bug this component was written
    // to remove, reintroduced through its own leave path, and it hid in development only, which is
    // where the browser suite runs.
    //
    // Nothing has been typed at that moment and something always has been by the time a player can
    // leave, so the emptiness of the reveal is the discriminator. It needs no timer and no second
    // mount flag, both of which were tried and are harder to reason about than this.
    if (typed.length === 0) return;
    for (let i = reported.current + 1; i < beats.length; i += 1) onBeatDone?.(i);
  };
  useEffect(() => () => onLeave.current(), []);

  if (beats.length === 0) return null;

  const label = complete ? (last ? doneLabel : moreLabel) : 'Go on';
  const showControl = !(last && complete && doneLabel === null);

  return (
    <div className="dialogue">
      {/* Everything already said stays put. */}
      {beats.slice(0, shown).map((beat, i) => (
        <p key={`${i}-${beat}`} className="dialogue-beat said">
          {beat}
        </p>
      ))}

      {/* `aria-live` on the current beat only: a screen reader should announce what has just been
          said, not re-read the whole exchange every time a letter lands. `aria-atomic` keeps it
          from reading character by character. */}
      <p className="dialogue-beat said dialogue-current" aria-live="polite" aria-atomic="true">
        {complete ? current : typed}
        {!complete && <span className="dialogue-cursor" aria-hidden="true" />}
      </p>

      {showControl && (
        <button type="button" className="dialogue-on" onClick={advance}>
          {label}
        </button>
      )}
    </div>
  );
}
