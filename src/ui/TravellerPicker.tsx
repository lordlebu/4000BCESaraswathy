// Who you are walking as.
//
// Five travellers, and the only difference between them is the drawing. They walk at the same
// pace, carry the same satchel, meet the same people and find the same things -- so this is a
// change of appearance rather than a change of game, and it is worded that way. Promising more
// than that with a fanfare would be a promise the game does not keep.
//
// It sits on the map sheet beside the seed for one reason: **that is the only place you can see
// all five without starting five journeys.** A first-run screen would make it a decision you live
// with, which is a better feeling and a worse fit for something purely cosmetic.

import { everyCharacter } from '../game/characters';

export interface TravellerPickerProps {
  /** Who is walking now. */
  characterId: string;
  onChoose: (characterId: string) => void;
}

export function TravellerPicker({ characterId, onChoose }: TravellerPickerProps) {
  return (
    <div className="travellers" role="radiogroup" aria-label="Who you are walking as">
      {everyCharacter().map((who) => {
        const current = who.key === characterId;
        return (
          <button
            key={who.key}
            type="button"
            role="radio"
            aria-checked={current}
            className={current ? 'traveller is-on' : 'traveller'}
            onClick={() => onChoose(who.key)}
          >
            {/* The sheet's first frame, which is the character facing the player. Drawn from the
                walking sheet rather than a second set of portraits: there is no other art, and a
                picker that needed some would have blocked on it. */}
            <span
              className="traveller-face"
              style={{ backgroundImage: `url(${who.url})` }}
              aria-hidden="true"
            />
            <span className="traveller-name">{who.name}</span>
          </button>
        );
      })}
    </div>
  );
}
