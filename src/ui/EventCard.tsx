// Something that happened to you, on the card the activity already uses.
//
// **Deliberately the same furniture as `ActivityModal`, down to the class names.** A painting fills
// the top, a passage sits under it in the game's own voice, and the choices are plain full-width
// rows at the bottom. That is the composition the activity card settled on and it is exactly what
// an event wants -- so this reuses `.activity-card`, `.activity-scene`, `.activity-prose` and
// `.activity-choice` rather than growing a fourth set.
//
// The reuse is the point rather than a shortcut. Three surfaces in this interface turned out to be
// the same screen wearing different code -- the diary, a conversation and the activity card -- and
// `content/events.ts` was written before any event content precisely so the fourth one would not be
// written too. If an event ever needs something this card cannot do, the honest fix is to change
// the shared card, not to fork it.
//
// **What is different from an activity, and it is only one thing:** an activity has one action and
// a way out, and an event has *n* choices and no way out. You do not decline a dream. So there is
// no "Leave it" row here, and `choicesFor` guarantees at least one choice is always offered -- a
// scene a player cannot leave is a soft lock.
//
// Presentation only. What can happen, where, and what each choice grants are all
// `content/events.ts`.

import { useCallback, useState } from 'react';
import { type Choice, type GameEvent, choicesFor } from '../content/events';
import { art } from './art';
import { sceneFor } from './scenes';
import { Modal } from './Modal';
import { StrangerFace } from './StrangerFace';

export interface EventCardProps {
  event: GameEvent;
  /** Everything the player holds, for deciding which choices are real. */
  holds: readonly string[];
  /**
   * The shelter this night was spent in, when the event is a night one.
   *
   * Only used to pick a fallback painting: an event with no art of its own borrows the scene of the
   * place it happened in, which is better than a blank panel and is usually the right picture
   * anyway. **Nothing is blocked while the art is missing.**
   */
  shelter?: string | null;
  /** Which painting, when there is more than one. Seeded by the caller — see `art.ts`. */
  pick?: number;
  /** Called once, with the choice taken and the line it writes. */
  onChoose: (choice: Choice) => void;
  onClose: () => void;
}

export function EventCard({ event, holds, shelter, pick = 0, onChoose, onClose }: EventCardProps) {
  /**
   * The line the chosen option wrote, once one has been taken.
   *
   * An object rather than the bare string, for the reason `ActivityModal` records paying for: a
   * `string | null` doing duty as both *has it resolved* and *what does it say* stops latching the
   * moment some outcome is legitimately empty.
   */
  const [taken, setTaken] = useState<{ line: string } | null>(null);

  const choose = useCallback(
    (choice: Choice) => {
      if (taken) return;
      setTaken({ line: choice.line });
      onChoose(choice);
    },
    [taken, onChoose]
  );

  // The event's own painting, then the night's, then nothing. Every step is optional and the card
  // keeps its shape at each one, so it does not jump when art lands.
  const picture = art('events', event.art, pick) ?? (shelter ? sceneFor('rest', shelter, pick) : null);
  const choices = choicesFor(event, holds);

  return (
    <Modal open label={event.title} onClose={onClose} veilClassName="diary-veil activity-veil">
      <section className="activity-card">
        {picture ? (
          <img className="activity-scene" src={picture} alt="" aria-hidden="true" />
        ) : (
          <div className="activity-scene activity-scene-blank" aria-hidden="true" />
        )}

        <div className="activity-body">
          {/* The stranger this is about, beside the title, when it is about somebody. The painting
              above is the moment; this is who is in it -- the same person, in the same dyes, as
              the figure walking the map. */}
          {event.stranger ? (
            <div className="event-heading">
              <StrangerFace stranger={event.stranger} size={40} />
              <h2 className="activity-title">{event.title}</h2>
            </div>
          ) : (
            <h2 className="activity-title">{event.title}</h2>
          )}
          <p className="activity-prose">{taken?.line || event.prose}</p>

          <div className="activity-choices">
            {taken ? (
              <button type="button" className="activity-choice primary" onClick={onClose}>
                Go on
              </button>
            ) : (
              choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className="activity-choice"
                  onClick={() => choose(choice)}
                >
                  {choice.label}
                </button>
              ))
            )}
          </div>
        </div>
      </section>
    </Modal>
  );
}
