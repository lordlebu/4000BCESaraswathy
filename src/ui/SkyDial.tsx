// What hour it is, as a picture of the sky.
//
// **Nothing on screen said, and three systems asked the player to reason about it.** Measured across
// four hours of the same day, the whole of `#root` as text differed by one line and only after the
// light had started to go -- *"The light is going."* at seven, *"It is dark."* at ten -- while at
// first light and at noon there was nothing at all. Meanwhile `routineFor(creature, moment)` decides
// whether an animal can be approached, `canCamp` refuses a rest in daylight, and canon's discovery
// conditions gate on `time_of_day`. Two binary warnings, arriving once it is nearly too late, is not
// a clock.
//
// **A dial and not a number.** "14:32" is precise about a world that has never once been precise:
// canon says `renews: fast` rather than "in four days", and the whole `tiers.ts` split exists to
// keep durations out of it. The game says *evening*; so does this.
//
// **It is a readout, not a control.** There is nothing to press it for -- the hour is not a thing a
// player sets -- and a button that does nothing teaches a player to stop pressing things. So it is
// an `img` role with a name that says the hour in words, which is also the whole of what a screen
// reader needs: the drawing carries no information the label does not.
//
// Presentation only. `dial.ts` decides where the mark goes and whether it is the sun or the moon,
// and is tested under Node.

import { WEATHER_MARK, dialAt, markAt } from './dial';

export interface SkyDialProps {
  /** Where the day is, from the scene's `sky-changed`. */
  phase: number;
  /** The weather, from `moment-changed`. Anything but a spell draws nothing. */
  weather?: string;
}

/** How far out from the centre the mark sits, as a fraction of the box. */
const ORBIT = 0.33;

export function SkyDial({ phase, weather }: SkyDialProps) {
  const { turn, body, label } = dialAt(phase);
  const mark = markAt(turn, ORBIT);
  const spell = weather ? WEATHER_MARK[weather] : undefined;

  return (
    <div
      className="sky-dial"
      data-body={body}
      // **Named in words, because the drawing is the only other way to know.** "Noon" and "night"
      // are what the rest of the game calls these hours, so the label is the same vocabulary a
      // player reads in the notes rather than a clock face described aloud.
      role="img"
      aria-label={spell ? `${label}, ${weather}` : label}
    >
      <svg viewBox="-0.5 -0.5 1 1" aria-hidden="true" focusable="false">
        {/* The horizon. Everything above it is day and everything below is night, which is what
            makes the mark's position readable at a glance rather than needing the colour too. */}
        <line className="sky-dial-horizon" x1={-0.42} y1={0} x2={0.42} y2={0} />
        {/* The arc the sun walks. Drawn faintly, so the mark reads as being somewhere along a path
            rather than floating. */}
        <circle className="sky-dial-track" cx={0} cy={0} r={ORBIT} />
        <circle className="sky-dial-mark" cx={mark.x} cy={mark.y} r={0.12} />
      </svg>

      {/* The weather rides on the dial rather than beside it: it is the same fact about the sky,
          and a second element in the control bar would cost a row on a narrow phone -- which the
          last plan spent a whole stage getting back. */}
      {spell && (
        <span className="sky-dial-weather" aria-hidden="true">
          {spell}
        </span>
      )}
    </div>
  );
}
