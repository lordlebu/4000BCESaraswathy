import type { Npc } from '../content/places';
import { portraitFor } from './portraits';

export interface PersonPortraitProps {
  person: Pick<Npc, 'id' | 'name' | 'role' | 'language'>;
  size?: number;
  /**
   * Whether this person is mid-sentence.
   *
   * Drives a small idle shift while they talk and stillness when they stop. It is two frames and
   * a few pixels on purpose: enough that the eye reads somebody as present rather than as a label,
   * and far short of animation, which at this size turns into fidgeting. Motion is dropped
   * entirely under `prefers-reduced-motion` -- see `styles.css`.
   */
  speaking?: boolean;
}

/**
 * The mark for one person.
 *
 * Presentational: the name sits beside it and already says who this is, so a screen reader
 * announcing "portrait, Thrali" would be worse than one announcing "Thrali".
 */
export function PersonPortrait({ person, size = 26, speaking = false }: PersonPortraitProps) {
  const painted = portraitFor(person.id);
  if (!painted) return null;
  return (
    <img
      className={`person-portrait is-painted${speaking ? ' is-speaking' : ''}`}
      src={painted}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
