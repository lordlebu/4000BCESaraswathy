// The activity that happens when you decide to take something: a painted scene, a line of
// prose, and three beats to answer.
//
// **The reference is Six Ages, and what is borrowed is the composition rather than the system.**
// A painting fills the top of a centred card, a short passage sits under it in the game's own
// voice, and the choices are plain full-width rows at the bottom. Nothing is a HUD; nothing sits
// in a corner. The player is reading a page and then acting on it, which is exactly this game's
// register -- the whole progression is a written journal, and an activity should feel like a
// paragraph in it rather than like a combat log.
//
// **Presentation only, like every other panel here.** What a gesture is, how hard it is, whether
// it can be attempted and what it pays are all `content/gestures.ts` and `content/activity.ts`.
// This owns the timer and the pixels, and nothing else -- which is what lets the whole layer be
// unit-tested without a browser.
//
// The modal pattern is `Ending.tsx`'s, deliberately reused rather than reinvented: a fixed veil,
// `role="dialog"`, Escape to close, focus moved on open.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BEATS,
  begin,
  press,
  timeout,
  isOver,
  gradeOf,
  settle,
  attemptLine,
  type Attempt
} from '../content/activity';
import { GESTURE_VERB, gestureLine, type Gesture } from '../content/gestures';
import type { Taking } from '../content/nodes';
import { sceneFor } from './scenes';
import { plateFor } from './plates';

/**
 * How long one beat gives you, in milliseconds.
 *
 * **Presentation, not balance.** How *hard* a beat is lives in `activity.ts` as the width of the
 * band; this is only how fast the marker crosses it, and it is the same for every gesture so a
 * player learns one rhythm rather than three. Slow enough to be unhurried -- this is a cozy walk
 * and not a reflex test -- and fast enough that three beats is under five seconds.
 */
const BEAT_MS = 1500;

/** How often the marker's position is recomputed. 60fps is pointless for a bar this size. */
const TICK_MS = 32;

export interface ActivityModalProps {
  open: boolean;
  gesture: Gesture;
  /** What the tile already promised. The floor: a run that goes badly still hands this over. */
  promised: readonly Taking[];
  difficulty: number;
  /** Seeded, so a tile plays the same way twice. Comes from the caller's `tileHash`. */
  roll: (salt: string) => number;
  /** The animal being followed, when there is one — its plate is the picture for a stalk. */
  creatureId: string | null;
  creatureName: string | null;
  onClose: () => void;
  /** Called once, with what the player actually leaves with. */
  onFinish: (taken: Taking[], line: string) => void;
}

export function ActivityModal({
  open,
  gesture,
  promised,
  difficulty,
  roll,
  creatureId,
  creatureName,
  onClose,
  onFinish
}: ActivityModalProps) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [marker, setMarker] = useState(0);
  const [done, setDone] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const startedAt = useRef(0);

  /**
   * A fresh attempt every time the modal opens -- and **only** when it opens.
   *
   * Keyed on `open` rather than built in the parent, so closing and reopening on the same tile
   * deals new bands rather than resuming a half-played run the player has forgotten the state of.
   *
   * `roll`, `gesture` and `difficulty` are deliberately **not** dependencies, and that is a fix
   * rather than an oversight. They were, and a caller passing an inline `roll` -- a new function
   * identity on every render -- re-dealt the bands on every tick of this component's own timer.
   * Beats never accumulated and the run never settled. Nine unit tests passed throughout, because
   * none of them re-rendered mid-run; the browser found it in one click.
   *
   * Reading them from a ref keeps the fix local. A caller should still memoise, but forgetting to
   * can no longer break the run -- which is the right place for the guarantee, because the
   * component is the thing that knows a run is in flight.
   */
  const latest = useRef({ gesture, difficulty, roll });
  latest.current = { gesture, difficulty, roll };

  useEffect(() => {
    if (!open) return;
    const { gesture: g, difficulty: d, roll: r } = latest.current;
    setAttempt(begin(g, d, r));
    setMarker(0);
    setDone(null);
    startedAt.current = performance.now();
    closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /**
   * The marker sweeps, and a beat that is never answered times out.
   *
   * Driven by wall clock rather than by counting ticks, because an interval that misses a frame
   * would otherwise drift the marker out of step with the band and make a fair press read as a
   * miss. `performance.now` is the same source the app clock uses.
   */
  useEffect(() => {
    if (!open || !attempt || done) return;
    if (isOver(attempt)) return;
    const id = window.setInterval(() => {
      const elapsed = performance.now() - startedAt.current;
      const into = (elapsed % BEAT_MS) / BEAT_MS;
      setMarker(into);
      // One full sweep with no press is a missed beat.
      const beatsElapsed = Math.floor(elapsed / BEAT_MS);
      setAttempt((a) => (a && beatsElapsed > a.beats.length ? timeout(a) : a));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [open, attempt, done]);

  const strike = useCallback(() => {
    setAttempt((a) => {
      if (!a || isOver(a)) return a;
      return press(a, marker);
    });
  }, [marker]);

  // Settle once the last beat lands, and hand the result up. In an effect rather than inside
  // `strike`, so a run that ends on a timeout finishes exactly like one that ends on a press.
  useEffect(() => {
    if (!attempt || !isOver(attempt) || done) return;
    const taken = settle(attempt, promised);
    const first = taken[0]?.material ?? promised[0]?.material;
    const line = first ? attemptLine(gesture, gradeOf(attempt), first) : '';
    setDone(line);
    onFinish(taken, line);
  }, [attempt, done, promised, gesture, onFinish]);

  // The space bar is the natural key for a rhythm, and it must not also scroll the page or
  // re-fire while held.
  useEffect(() => {
    if (!open || done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      e.preventDefault();
      strike();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, done, strike]);

  if (!open || !attempt) return null;

  // A stalk shows the animal itself where a plate exists, because the animal *is* the subject --
  // the gesture scene is the fallback rather than the other way round.
  const picture = (gesture === 'stalk' && creatureId ? plateFor(creatureId) : null) ?? sceneFor(gesture);
  const what = promised[0]?.material.name ?? 'it';
  const band = attempt.bands[Math.min(attempt.beats.length, BEATS - 1)] ?? 0;

  return (
    <div
      className="diary-veil activity-veil"
      role="dialog"
      aria-modal="true"
      aria-label={GESTURE_VERB[gesture]}
    >
      <section className="activity-card">
        {picture ? (
          <img className="activity-scene" src={picture} alt="" aria-hidden="true" />
        ) : (
          <div className="activity-scene activity-scene-blank" aria-hidden="true" />
        )}

        <div className="activity-body">
          <h2 className="activity-title">{GESTURE_VERB[gesture]}</h2>
          <p className="activity-prose">
            {/* Only a stalk is about the animal; everything else is about the material. Passing
                the creature regardless put "Painted Deer comes out of the ground" on a flint
                quarry, which the browser caught and no unit test could. */}
            {done ?? gestureLine(gesture, gesture === 'stalk' ? creatureName ?? what : what)}
          </p>

          {!done && (
            <>
              {/* The band is drawn, not described. A player should be able to see that a rare
                  thing is harder rather than be told a number. */}
              <div
                className="activity-track"
                role="progressbar"
                aria-label="Timing"
                aria-valuemin={0}
                aria-valuemax={BEATS}
                aria-valuenow={attempt.beats.length}
              >
                <span
                  className="activity-band"
                  style={{ left: `${band * 100}%`, width: `${attempt.width * 100}%` }}
                />
                <span className="activity-marker" style={{ left: `${marker * 100}%` }} />
              </div>

              <ol className="activity-beats" aria-label="Beats">
                {Array.from({ length: BEATS }, (_, i) => (
                  <li
                    key={i}
                    className={`activity-beat ${attempt.beats[i] ?? 'waiting'}`}
                    aria-label={attempt.beats[i] ?? 'to come'}
                  />
                ))}
              </ol>
            </>
          )}

          <div className="activity-choices">
            {done ? (
              <button type="button" ref={closeRef} className="activity-choice" onClick={onClose}>
                Put it in the satchel
              </button>
            ) : (
              <>
                <button type="button" className="activity-choice primary" onClick={strike}>
                  {gesture === 'stalk' ? 'Move now' : 'Strike'}
                </button>
                <button type="button" ref={closeRef} className="activity-choice" onClick={onClose}>
                  Leave it
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
