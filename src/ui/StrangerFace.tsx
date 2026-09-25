// A face for somebody the road has and canon never wrote down.
//
// **Two sources, the same as every other art slot in this game.** A painted face from
// `src/ui/faces/` when there is one, dealt out of the pool by a hash of who this is; failing that,
// a face drawn from their look -- skin, the headwear their body wears, and their clothes in the same
// dyes the figure on the road is wearing. So the card and the map can never disagree about what a
// stranger looks like, and nothing waits for a painting.
//
// Not `PersonPortrait`, deliberately. That one is for canon's people, and it refuses to invent
// appearance because canon records none -- it draws their trade and colours by their language.
// Road company have neither a language nor a trade canon gave them, and their look is the game's
// own, so drawing it is the game dressing its own extras. The two share the head and shoulders so a
// stranger and a named person still read as people of one place.

import { weightedPickFor } from '../world/rng';
import type { EventStranger } from '../content/events';
import { headwearOf, swatchesFor, type Headwear } from '../content/looks';
import { art, artNames } from './art';
import { HEAD, SHOULDERS } from './PersonPortrait';

/**
 * What each body wears on its head, on the same 24x24 grid as the silhouette.
 *
 * Drawn over the head, so a wrap only needs its crown and a hood only needs its outer edge.
 */
const HEADWEAR: Record<Headwear, string | null> = {
  // A carrier's head-cloth: a band over the crown and its tail knotted at the side.
  wrap: 'M5 7.9a3.5 3.5 0 0 1 7 0v.5H5zM12 7.4l2.2 1.4-2.2.7z',
  // A drover's turban: fuller than the head, sitting down over the brow.
  turban: 'M4.6 8.2a3.9 4 0 0 1 7.8 0c0 .6-.3.9-.8.9H5.4c-.5 0-.8-.3-.8-.9z',
  // A pilgrim's hood, open at the face and falling to the shoulders.
  hood: 'M8.5 3.4c-3.1 0-4.8 2.5-4.8 5.6v5.8h2V9.2a2.8 2.8 0 0 1 5.6 0v5.6h2V9c0-3.1-1.7-5.6-4.8-5.6z',
  bare: null
};

/**
 * The painted faces a stranger of this people may be given: their own culture's, and the handful
 * named `any-` that could be anybody from anywhere.
 *
 * **Named `<culture>-<f|m>-NN`, so the pool is read off the filenames and nothing is registered.**
 * `harappan-m-03.png` is a Harappan man; `any-01.png` is nobody in particular. A culture with no
 * faces yet falls back to the `any-` ones, and with none of those to the drawn face -- so the pool
 * can fill one painting at a time, in any order.
 *
 * The gender in the name is the painting's, and it goes no further: every line of event prose
 * calls a stranger "they", so no face can put a word in the text that contradicts it.
 */
export function facesFor(culture: string | null, names: readonly string[] = artNames('faces')): string[] {
  const own = culture ? names.filter((n) => n.startsWith(`${culture}-`)) : [];
  const anybody = names.filter((n) => n.startsWith('any-'));
  return [...own, ...anybody];
}

/** The painted face for this stranger, if the pool holds one for them. Seeded, so it never changes. */
export function paintedFaceFor(id: string, culture: string | null = null): string | null {
  const name = weightedPickFor(facesFor(culture), 'face', { x: 0, y: 0 }, id, (n) => n, () => 1);
  return name ? art('faces', name) : null;
}

export interface StrangerFaceProps {
  stranger: EventStranger;
  size?: number;
}

/** Presentational, like `PersonPortrait`: the title beside it already says who this is. */
export function StrangerFace({ stranger, size = 40 }: StrangerFaceProps) {
  const painted = paintedFaceFor(stranger.id, stranger.culture);
  if (painted) {
    return (
      <img
        className="person-portrait is-painted stranger-face"
        src={painted}
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    );
  }

  const { skin, headwear: onHead, shoulders } = swatchesFor(stranger.look);
  const headwear = HEADWEAR[headwearOf(stranger.look.body)];
  return (
    <svg
      className="person-portrait stranger-face"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      data-look={`${stranger.look.skin} ${stranger.look.cloth} ${stranger.look.second}`}
    >
      <path d={SHOULDERS} fill={shoulders} />
      <path d={HEAD} fill={skin} />
      {headwear && <path d={headwear} fill={onHead} />}
    </svg>
  );
}
