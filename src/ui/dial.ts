// Where to draw the sun, and whether it is the sun at all.
//
// **The interface never said what time it was, and three systems ask the player to reason about
// it.** Measured across four hours of the same day, the whole of `#root` differed by one line, and
// only after the light had started to go: *"The light is going."*, then *"It is dark."*. At first
// light and at noon there was nothing at all. Meanwhile `routineFor` decides whether an animal can
// be approached -- a swift that is *feeding* can be stalked and one that is asleep cannot --
// `canCamp` refuses a rest in daylight, and canon's discovery conditions gate on `time_of_day`.
//
// Pure, and tested under Node like `surface.ts` beside it. The component draws what this returns
// and decides nothing.

import { skyAt } from '../game/dayNight';

/** What the dial shows. */
export interface Dial {
  /**
   * Where the mark sits, as a fraction of one turn clockwise from the left.
   *
   * The geometry is the day's own: **phase 0 is six in the morning**, so 0 puts the sun on the left
   * at the horizon, 0.25 is noon at the top, 0.5 is six in the evening on the right, and 0.75 is
   * midnight at the bottom. It is the shape of a sundial because that is the shape of the thing.
   */
  turn: number;
  /** Sun through the day, moon through the night. */
  body: 'sun' | 'moon';
  /** The engine's own word for this hour — six of them, including the noon canon has no word for. */
  label: string;
}

/**
 * The dial for a point in the day.
 *
 * `phase` wraps, and is allowed to arrive outside 0..1: the scene counts time up from the start of
 * the journey and `phaseAt` already wraps it, but a caller doing arithmetic on it should not have to
 * remember that.
 */
export function dialAt(phase: number): Dial {
  const turn = ((phase % 1) + 1) % 1;
  const { label } = skyAt(turn);

  return {
    turn,
    // **Read from the label rather than from the number**, so the dial and the wash over the map
    // can never disagree about whether it is night. The alternative -- a pair of thresholds here --
    // is a second opinion about the same question, and the two would drift the first time somebody
    // moved a keyframe in `dayNight.ts`.
    body: label === 'night' ? 'moon' : 'sun',
    label
  };
}

/**
 * Where the mark goes, in the unit circle a component can hand to SVG.
 *
 * Separate from `dialAt` because it is trigonometry rather than a fact about the day, and because a
 * test that asserts "noon is at the top" should be able to say so in coordinates.
 *
 * `0` is the left-hand horizon and the turn runs clockwise over the top, which is the direction the
 * sun actually goes. `y` grows downward, as SVG's does.
 */
export function markAt(turn: number, radius = 1): { x: number; y: number } {
  const angle = Math.PI - turn * 2 * Math.PI;
  return { x: Math.cos(angle) * radius, y: -Math.sin(angle) * radius };
}

/** What a weather spell is drawn as, or nothing when the sky is clear. */
export const WEATHER_MARK: Record<string, string> = {
  mist: '≈',
  rain: '⋮',
  storm: '⚡'
};
