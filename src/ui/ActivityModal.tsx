// The card a player meets when they decide to do something: a painted scene, a line of prose,
// what they have in hand, and one press.
//
// **The reference is Six Ages, and what is borrowed is the composition rather than the system.**
// A painting fills the top of a centred card, a short passage sits under it in the game's own
// voice, and the choices are plain full-width rows at the bottom. Nothing is a HUD; nothing sits
// in a corner. The player is reading a page and then acting on it, which is exactly this game's
// register -- the whole progression is a written journal, and an act should feel like a paragraph
// in it rather than like a combat log.
//
// **What this card no longer has is a timer, and the deletion is the point.** It used to run a
// three-beat timing track: a marker swept a bar for four and a half seconds, and the player
// pressed inside a moving band, once per material, once per craft, once per night. `activity.ts`
// carries the full reasoning for why that is the wrong instrument for this genre. What it cost
// *here* is worth recording separately, because it is a lesson about interfaces rather than about
// design:
//
//   * a `setInterval` on a wall clock, re-entered on every render, whose dependency list had to be
//     read from a ref because a caller passing an inline function re-dealt the bands mid-run;
//   * a settle effect that paid twice when its flag doubled as its content;
//   * a button that was replaced mid-reach because a beat timed out between Playwright resolving
//     it and clicking it -- a real race a player on a slow machine could hit, which read as CI
//     flakiness for four runs.
//
// All three were fixed, and all three were only ever reachable because there was a clock in a
// modal. **There is no clock in this file now**, so none of them can come back, and the component
// is a pure function of its props for the first time.
//
// **Presentation only, like every other panel here.** What a gesture is, what it asks you to be
// carrying, whether the moment is with you and what it pays are all `content/gestures.ts` and
// `content/activity.ts`. This owns the pixels and nothing else, which is what lets the whole layer
// be unit-tested without a browser.

import { useCallback, useEffect, useRef, useState } from 'react';
import { type Grade, type Preparation, attemptLine, gradeOf, settle } from '../content/activity';
import { GESTURE_VERB, gestureLine, type Gesture } from '../content/gestures';
import type { Taking } from '../content/nodes';
import { nameOf } from '../content/making';
import { sceneFor } from './scenes';
import { plateFor } from './plates';
import { Modal } from './Modal';

/**
 * The way out, before the act and after it.
 *
 * "Put it in the satchel" is the wrong promise for a night, which puts nothing anywhere -- and
 * "Leave it" is worse than wrong on a rest: the night is spent on the way out of this card
 * whatever the player chose (see the `camp` event in `App.tsx`), so a label offering to back out
 * would be a lie about the one thing they are deciding.
 */
const WAY_OUT: Partial<Record<Gesture, string>> = {
  rest: 'Sleep now'
};

const WAY_OUT_DONE: Partial<Record<Gesture, string>> = {
  rest: 'Start the day'
};

/**
 * What the card says about how ready you are, in one clause, **before** the press.
 *
 * **This is the teaching, and it is the whole reason the card survived losing its timer.** A
 * player who is told "nothing in the satchel cuts" has been handed the next thing to make; one who
 * is told "the deer is feeding" has been handed a reason to watch the hour. Neither sentence could
 * exist while the grade came from reflexes, because reflexes are not a thing the interface can
 * describe in advance.
 *
 * Written per case rather than assembled, for the reason `describeRoutine` gives: this game's
 * progression *is* the writing, and a sentence stitched from fragments reads like a status bar.
 */
function readyLine(gesture: Gesture, p: Preparation, toolName: string | null): string {
  const grade = gradeOf(p);
  if (gesture === 'rest') {
    return p.favourable
      ? 'You have somewhere to lie that is not the bare ground.'
      : 'Nothing but the bedroll and the sky. It counts as a night.';
  }
  const tool = p.equipped
    ? `${toolName ?? 'Something you are carrying'} will do the work.`
    : `Nothing in the satchel ${WANT_VERB[gesture] ?? 'helps'}, so this is hands and patience.`;
  const moment =
    gesture === 'stalk' || gesture === 'fish'
      ? p.favourable
        ? 'It is busy and has not decided whether you matter.'
        : 'It is alert. You will not get close without being seen.'
      : p.favourable
        ? 'Your hands are steady.'
        : 'You have walked a long way today and it is in your hands.';
  return grade === 'clean' ? `${tool} ${moment}` : `${tool} ${moment}`;
}

/** How the want reads in a sentence, so the clause is English rather than an affordance id. */
const WANT_VERB: Partial<Record<Gesture, string>> = {
  stoop: 'cuts',
  work: 'breaks ground',
  stalk: 'would keep an animal at arm’s length',
  fish: 'would reach into the water'
};

export interface ActivityModalProps {
  open: boolean;
  gesture: Gesture;
  /** What the tile already promised. The floor: a poorly prepared act still hands this over. */
  promised: readonly Taking[];
  /**
   * What the player brought to this, from `content/activity.ts`.
   *
   * Composed by `App`, which is the only thing holding the satchel, the hour and the ground at
   * once -- the same arrangement `knowsRecipeHere` uses, and for the same stated reason. This
   * card never works any of it out.
   */
  preparation: Preparation;
  /** The name of the thing in hand that answers `preparation.wants`, for the clause above. */
  toolName: string | null;
  /** The animal being followed, when there is one — its plate is the picture for a stalk. */
  creatureId: string | null;
  creatureName: string | null;
  /**
   * Which kind of this gesture it is, when that changes the picture.
   *
   * The shelter kind for a night, the process word for a making -- so a night at a camp is not
   * painted as a night on bare ground, and a pot at a kiln is not painted as a man splitting
   * reeds. `sceneFor` falls back to the plain gesture, so this is always optional and **no art is
   * ever a blocker**: a variant with no painting simply draws the gesture's own scene, and a
   * gesture with no painting draws nothing and still works.
   */
  variant?: string | null;
  /**
   * What this act is *about*, when there is no material to name it.
   *
   * A rest has an empty `promised` — nothing is won — so without this the prose reads "It. The
   * light is going", and the shelter label ("Make camp for the night") is the phrase the rest of
   * the game already uses for exactly this.
   */
  subject?: string | null;
  /**
   * Which painting to show, when this thing has more than one.
   *
   * **Seeded by the caller, never random.** Two paintings of a night both stay — a second never
   * replaces a first — so something has to choose, and the determinism rule is absolute here: the
   * same seed must produce the same world and the same journal text, and a picture is part of what
   * a player sees. `App` passes a `tileHash`. Zero, the default, is the first take, which is what
   * every caller did before there were two of anything.
   */
  pick?: number;
  onClose: () => void;
  /** Called once, with what the player actually leaves with. */
  onFinish: (taken: Taking[], line: string) => void;
}

export function ActivityModal({
  open,
  gesture,
  promised,
  preparation,
  toolName,
  creatureId,
  creatureName,
  variant,
  subject,
  pick = 0,
  onClose,
  onFinish
}: ActivityModalProps) {
  /**
   * The act's outcome once it has settled, wrapping the sentence it ended on.
   *
   * **An object rather than the bare string, and that is a fix rather than a style.** This was a
   * `string | null` doing two jobs at once -- *has it happened* and *what does it say* -- which
   * holds exactly as long as every act has something to say. A rest has nothing: it promises no
   * material, so the line came back `''`, and the flag never latched. Three faults followed, all
   * of them visible in the game: the prose went blank on settling, the card never looked finished,
   * and the settle effect ran again and called `onFinish` a second time -- the double payment this
   * file's own tests call the most expensive fault it can have.
   *
   * An act that settles on an empty sentence is a real state, so the flag cannot be the sentence.
   */
  const [done, setDone] = useState<{ line: string; taken: Taking[] } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // A fresh card every time it opens, so reopening on the same tile is a new decision rather than
  // a settled one the player has forgotten the state of.
  useEffect(() => {
    if (open) setDone(null);
  }, [open]);

  /**
   * Do it.
   *
   * **One press, and there is nothing between the press and the result.** No clock, no beat to
   * miss, no window to hit. `gradeOf` reads what the player already decided by what they are
   * carrying and when they came, `settle` applies the floor, and the caller is paid exactly once
   * -- guarded by `done`, which is set in the same call rather than in an effect that could run
   * twice.
   */
  const commit = useCallback(() => {
    if (done) return;
    const grade: Grade = gradeOf(preparation);
    const taken = settle(grade, promised);
    // A rest is the one gesture with no material behind it, and its lines never name one. The
    // others always come from a tile that promised something, so the guard stays the old
    // defensive one rather than becoming a second rule about which gesture gets prose.
    const first = taken[0]?.material ?? promised[0]?.material ?? null;
    const line = first || gesture === 'rest' ? attemptLine(gesture, grade, first) : '';
    setDone({ line, taken });
    onFinish(taken, line);
  }, [done, preparation, promised, gesture, onFinish]);

  /**
   * Enter does it, and then Enter closes it.
   *
   * The keyboard convention the rest of the interface already sets: `TileActions` shows the key
   * that triggers every row, because "a thing not written on screen does not exist". The card has
   * one action at a time, so one key is the whole of it — and unlike the space bar this replaces,
   * it cannot be held down to re-fire into a timing window, because there is no longer a window.
   *
   * Escape belongs to `Modal`, which closes on it. That is left alone.
   */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Enter' || e.repeat) return;
      e.preventDefault();
      if (done) onClose();
      else commit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, done, commit, onClose]);

  if (!open) return null;

  // A stalk shows the animal itself where a plate exists, because the animal *is* the subject --
  // the gesture scene is the fallback rather than the other way round.
  const picture =
    ((gesture === 'stalk' || gesture === 'fish') && creatureId ? plateFor(creatureId) : null) ??
    sceneFor(gesture, variant, pick);
  const what = subject ?? promised[0]?.material.name ?? 'it';

  return (
    <Modal
      open
      label={GESTURE_VERB[gesture]}
      onClose={onClose}
      veilClassName="diary-veil activity-veil"
      initialFocus={closeRef}
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
            {/* Only a stalk or a cast is about the animal; everything else is about the material.
                Passing the creature regardless put "Painted Deer comes out of the ground" on a
                flint quarry, which the browser caught and no unit test could. */}
            {done?.line ||
              gestureLine(
                gesture,
                gesture === 'stalk' || gesture === 'fish' ? creatureName ?? what : what
              )}
          </p>

          {/* **What you brought, said before you press.** The replacement for the timing track,
              and a better one: it is the same information a player needed, available early enough
              to act on, and it names the thing to go and make. */}
          {!done && (
            <p className="activity-ready" data-grade={gradeOf(preparation)}>
              {readyLine(gesture, preparation, toolName)}
            </p>
          )}

          {/* What actually came back. The prose says how it went; this says how much, because
              "two of reed fibre" in a sentence is easy to miss and the satchel is a screen away. */}
          {done && done.taken.length > 0 && (
            <ul className="activity-haul" aria-label="Taken">
              {done.taken.map((t) => (
                <li key={t.material.id}>
                  {nameOf(t.material.id)}
                  {t.count > 1 && <span className="activity-haul-count"> ×{t.count}</span>}
                </li>
              ))}
            </ul>
          )}

          {/**
            * **The way out is one button that never goes away.**
            *
            * It used to be two, swapped on settling -- and because settling could happen on a
            * timer, the button a player was reaching for could be replaced mid-reach. It was: in
            * the CI container Playwright resolved "Leave it", went to click, and got "element was
            * detached from the DOM". Nothing can settle on its own here any more, but the element
            * stays stable regardless: it costs nothing and it is the shape that cannot race.
            */}
          <div className="activity-choices">
            {!done && (
              <button type="button" className="activity-choice primary" onClick={commit}>
                {GESTURE_VERB[gesture]}
                <kbd className="activity-key" aria-hidden="true">
                  ↵
                </kbd>
              </button>
            )}
            <button type="button" ref={closeRef} className="activity-choice" onClick={onClose}>
              {done
                ? WAY_OUT_DONE[gesture] ?? 'Put it in the satchel'
                : WAY_OUT[gesture] ?? 'Leave it'}
            </button>
          </div>
        </div>
      </section>
    </Modal>
  );
}
