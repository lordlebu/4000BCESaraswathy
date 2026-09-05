// The way in.
//
// Until now the game had no front door: it resumed straight into wherever the traveller was
// standing, which is the right behaviour for coming back and a flat one for arriving. There was
// nowhere to *begin* — no moment of choosing, and nowhere for the traveller picker to live except
// wedged onto the map sheet beside the seed, where it only ever sat because there was nowhere
// better.
//
// **This exists because the save does, and the save is not going anywhere.** Dropping persistence
// was the other answer to the flat open, and it is not available: 169 discovery rungs across 31
// discoveries, 7 field questions and 8 words are the *whole* of progression — there are no
// experience points, `progress` is the only record that the traveller knows anything, and
// `Ending.tsx` is built entirely on it. Nobody climbs 169 rungs in one sitting, so a game that
// forgets is a game whose ending nobody reaches.
//
// So: keep the diary, and give it a cover.

import { useState } from 'react';
import { everyCharacter } from '../game/characters';

export interface FrontDoorProps {
  /** Whether to show at all. False once the traveller is walking. */
  open: boolean;
  /** Whether there is a journey under this seed to go back to. */
  canContinue: boolean;
  /** The seed the door opens onto, shown so a shared link explains itself. */
  seed: string;
  /** Who would be walking. */
  characterId: string;
  onChoose: (characterId: string) => void;
  /** Pick up where the traveller left off. Only offered when `canContinue`. */
  onContinue: () => void;
  /** Start a fresh walk under this seed, forgetting whatever was here. */
  onBegin: () => void;
}

export function FrontDoor({
  open,
  canContinue,
  seed,
  characterId,
  onChoose,
  onContinue,
  onBegin
}: FrontDoorProps) {
  /**
   * Starting over asks twice, and only starting over.
   *
   * The one irreversible thing on this screen. Everything else here is a choice you can change by
   * coming back; this throws away a diary that cannot be rebuilt, and 169 rungs is a long walk to
   * lose to a mis-click on a screen somebody is trying to get past.
   *
   * A second press rather than a modal, because a modal over a front door is a door with a door.
   */
  const [sure, setSure] = useState(false);

  if (!open) return null;

  return (
    <div className="front-door" role="dialog" aria-label="Begin">
      <div className="front-door-panel">
        <h1 className="front-door-title">Varuna&rsquo;s Field Diary</h1>
        <p className="front-door-line">
          A walk through the Saraswati country, and a notebook to keep it in.
        </p>

        {/* The picker's proper home. On the map sheet it was a setting; here it is the question
            the screen exists to ask. */}
        <div className="front-door-who" role="radiogroup" aria-label="Who you are walking as">
          {everyCharacter().map((who) => {
            const current = who.key === characterId;
            return (
              <button
                key={who.key}
                type="button"
                role="radio"
                aria-checked={current}
                className={current ? 'front-door-face is-on' : 'front-door-face'}
                onClick={() => onChoose(who.key)}
              >
                <span
                  className="front-door-portrait"
                  style={{ backgroundImage: `url(${who.url})` }}
                  aria-hidden="true"
                />
                <span className="front-door-name">{who.name}</span>
              </button>
            );
          })}
        </div>

        <div className="front-door-ways">
          {canContinue && (
            <button type="button" className="front-door-go" onClick={onContinue}>
              Go on walking
            </button>
          )}
          <button
            type="button"
            className={canContinue ? 'front-door-fresh' : 'front-door-go'}
            onClick={() => (canContinue && !sure ? setSure(true) : onBegin())}
          >
            {canContinue ? (sure ? 'Yes — start over' : 'Start a new walk') : 'Set out'}
          </button>
        </div>

        {sure && (
          <p className="front-door-warning">
            The diary under this seed will be put aside — everything read, made and understood.
          </p>
        )}

        {/* The seed, because a link carries the whole world and somebody handed this one over. */}
        <p className="front-door-seed">
          <span aria-hidden="true">seed </span>
          <span className="front-door-seed-value">{seed}</span>
        </p>
      </div>
    </div>
  );
}
