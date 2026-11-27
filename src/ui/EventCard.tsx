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
// Event choices resolve the scene. Conversation topics can change the displayed line before
// the player takes one of those choices.
//
// Presentation only. What can happen, where, and what each choice grants are all
// `content/events.ts`.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { type Choice, type GameEvent, choicesFor } from '../content/events';
import type { AmbientTopic } from '../content/twinAmbientTalk';
import { firstArtSelection, preferredArtSelection, type ArtSelection } from './art';
import { sceneNames } from './scenes';
import { Modal } from './Modal';
import { StrangerFace } from './StrangerFace';
import { ProfileButton } from './Profile';

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
  /**
   * Strangers met, as the save keeps them. A face opens its portrait card by name only once the
   * name has been learned; until then it says what they are. Empty means nobody has been met.
   */
  met?: readonly string[];
  /** Called once, with the choice taken and the line it writes. */
  onChoose: (choice: Choice, art: ArtSelection | null, topic?: AmbientTopic) => void;
  onClose: () => void;
  onTopicHeard?: (topic: AmbientTopic) => void;
}

export function EventCard(props: EventCardProps) {
  return (
    <Modal open label={props.event.title} onClose={props.onClose} veilClassName="diary-veil activity-veil">
      <EventCardBody key={props.event.id} {...props} />
    </Modal>
  );
}

export function EventCardBody({
  event, holds, shelter, pick = 0, met = [], onChoose, onClose, onTopicHeard, continuation = 'Go on', alternatives, children
}: EventCardProps & { continuation?: string; alternatives?: ReactNode; children?: ReactNode }) {
  /**
   * The line the chosen option wrote, once one has been taken.
   *
   * An object rather than the bare string, for the reason `ActivityModal` records paying for: a
   * `string | null` doing duty as both *has it resolved* and *what does it say* stops latching the
   * moment some outcome is legitimately empty.
   */
  const [taken, setTaken] = useState<{ line: string; art: ArtSelection | null } | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<AmbientTopic['id'] | null>(null);
  const topic = taken ? undefined : event.topics?.find(({ id }) => id === selectedTopic) ?? event.topics?.[0];
  useEffect(() => {
    if (topic) onTopicHeard?.(topic);
  }, [topic, onTopicHeard]);
  const nextButton = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (taken) nextButton.current?.focus();
  }, [taken]);

  // Resolve the painting before creating the choice handler so a card updated in place records
  // the image the player actually saw.
  const contextualSelection = event.artCandidates?.map(({ collection, key }) =>
    collection === 'scenes'
      ? firstArtSelection(collection, [key], pick)
      : preferredArtSelection(collection, [key], pick)
  ).find((candidate) => candidate !== null) ?? null;
  const selection = contextualSelection ??
    (!event.artCandidates
      ? preferredArtSelection('events', [event.artMoment, event.artVariant, event.art, event.artFallback], pick)
      : null) ??
    (shelter ? firstArtSelection('scenes', sceneNames('rest', shelter), pick) : null);

  const choose = useCallback(
    (choice: Choice) => {
      if (taken) return;
      const outcome = choice.outcomeArt ? preferredArtSelection('events', [choice.outcomeArt], pick) : null;
      setTaken({ line: choice.line, art: outcome });
      onChoose(choice, outcome ?? selection, topic);
    },
    [taken, onChoose, selection, topic, pick]
  );

  // The painting of this moment, then the event's own, then one that will do (a road's, for a road's
  // happening), then the night's, then nothing. Every step is optional and the card keeps its shape
  // at each one, so it does not jump when art lands.
  const picture = (taken?.art ?? selection)?.url ?? null;
  const choices = choicesFor(event, holds);

  return (
      <section className="activity-card">
        {picture ? (
          <img className="activity-scene" src={picture} alt="" aria-hidden="true" />
        ) : event.origin !== 'discovery' && event.origin !== 'sub-location' ? (
          <div className="activity-scene activity-scene-blank" aria-hidden="true" />
        ) : null}

        <div className="activity-body">
          {/* The stranger this is about, beside the title, when it is about somebody. The painting
              above is the moment; this is who is in it -- the same person, in the same dyes, as
              the figure walking the map. */}
          {event.stranger ? (
            <div className="event-heading">
              {/* Pressed, the face opens at the size it was painted. By name only once you know it. */}
              <ProfileButton
                who={{ kind: 'stranger', key: event.stranger.id, known: met.includes(event.stranger.id) }}
                name={met.includes(event.stranger.id) && event.stranger.givenName ? event.stranger.givenName : event.stranger.role}
              >
                <StrangerFace stranger={event.stranger} size={40} />
              </ProfileButton>
              <h2 className="activity-title">{event.title}</h2>
            </div>
          ) : (
            <h2 className="activity-title">{event.title}</h2>
          )}
          <p className="activity-prose">{taken?.line || event.prose}</p>

          {topic && (
            <div className="event-topics">
              <div className="event-topic-buttons" role="group" aria-label="Conversation topics">
                {event.topics?.map(({ id, label }) => (
                  <button key={id} type="button" className="activity-choice" aria-pressed={id === topic.id}
                    onClick={() => setSelectedTopic(id)}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="event-topic-reply" aria-live="polite">{topic.line}</p>
            </div>
          )}
          <div className="activity-choices">
            {taken ? (
              <button ref={nextButton} type="button" className="activity-choice primary" onClick={onClose}>
                {continuation}
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
          {!taken && alternatives}
          {children}
        </div>
      </section>
  );
}
