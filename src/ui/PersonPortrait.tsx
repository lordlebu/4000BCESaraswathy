// A face for each of the ten people.
//
// They have names, roles, four hundred years of family history and some of the best writing in the
// game, and they appear as a line of text with a bullet in it. This gives each one a small drawn
// portrait beside their name.
//
// Two things it is careful not to do.
//
// **It does not invent appearance.** Canon records none -- no age, no build, no colouring -- and a
// portrait that decided those would be asserting something canon has not said, in a project whose
// whole discipline is that canon owns what is true. So the drawing works from what canon *does*
// record: the trade in the `role` field, and the language in `language`. Thrali is a fisher, so he
// carries a net; Pell sweeps, so he holds a broom.
//
// **It does not make anyone a wise elder.** Canon is pointed about this -- Marn is "pointedly not a
// wise elder, he is a working herder with a job on" -- so the silhouettes are working people caught
// mid-task, and nobody gets a beard, a staff or a robe. Varuna has those, and the contrast is the
// point: he is the traveller and they are the people who live here.
//
// Drawn rather than prompted, for the same reason the species icons are. At this size a portrait is
// a head, a shoulder line and one held object, and an image model asked for that returns something
// far more detailed that resamples into mush.

import type { Npc } from '../content/places';

/**
 * Ink by language.
 *
 * Language is the axis worth colouring by, because it is the one the game turns on: words are
 * learned from people, and which language a word belongs to decides who else can hear it. A player
 * scanning a place sees at a glance that these two speak Kia and that one does not.
 *
 * Uma has no language in canon -- she is the roofer at the Lothal camp and teaches no words -- so
 * she takes the neutral ink rather than being assigned one.
 *
 * **`sarv` currently draws nothing.** Canon has no speaker of it and no word in it -- the string
 * appears nowhere in the database -- so this entry has never rendered. It is kept rather than
 * deleted because the cost of a spare colour is nothing and the cost of a person arriving in a
 * language with no ink is a portrait that silently reads as "no language". If canon still has no
 * `sarv` by the time anybody is tidying this file, delete it; it is not load-bearing.
 */
export const LANGUAGE_INK: Record<string, string> = {
  kia: '#3d7a8c',
  maru: '#8a6a3a',
  sarv: '#7a5a7c'
};

const NEUTRAL_INK = '#6b5c6f';

/**
 * The shape of a working life, on a 24x24 grid.
 *
 * Every portrait shares a head and shoulders; `tool` is what distinguishes one from another, drawn
 * beside or across the body. Keeping the shared part shared is what stops ten portraits reading as
 * ten unrelated marks -- these are people of one place, doing different jobs in it.
 */
const HEAD = 'M8.5 5a3.2 3.2 0 0 1 0 6.4 3.2 3.2 0 0 1 0-6.4z';
const SHOULDERS = 'M2 21c0-4 2.9-6.6 6.5-6.6S15 17 15 21z';

/**
 * What each person is holding or wearing, keyed by the trade canon gives them.
 *
 * Matched on the `role` string rather than the id, so a person who changes jobs in canon changes
 * picture without anything here being edited -- and a role nobody has drawn yet falls through to
 * the plain figure rather than to nothing.
 */
const TOOLS: [string[], string][] = [
  // A fisher's net: a hanging mesh, which is the shape a net makes when it is carried rather than
  // cast. Two crossing runs read as mesh at this size; more would be a smudge.
  [['fisher'], 'M17 6v10M23 6v10M17 6h6M17 11h6M17 16h6M20 6v10'],
  // A roofer's cut reeds, a bundle stood on end.
  [['roofer'], 'M17 21V7M20 21V6M23 21V8M16 12h8'],
  // A herder's crook. Hooked, and held rather than leant on -- he is working, not presiding.
  [['herder'], 'M20 21V9a3 3 0 0 0-6 0'],
  // A sweeper's broom: a handle and a splayed head. Pell sweeps an interdimensional gate as
  // municipal maintenance, and the broom is the entire joke.
  [['sweeper', 'wall-keeper'], 'M22 5l-5 11M15 14l5 3M14 17h6'],
  // A stylus over a tablet edge, for the copyists and archivists.
  [['copyist', 'archivist', 'scholar'], 'M20 5v9M17 17h7M17 17v3h7v-3M20 5l-1.5 3h3z'],
  // A well-keeper's rope, coiled on its hook.
  [['well-keeper'], 'M20 8v3M17 14a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0M18.5 14a2 2 0 1 0 4 0 2 2 0 1 0-4 0'],
  // A bone-picker's sieve, seen face on.
  [['bone-picker'], 'M16 8h8v9h-8zM19 8v9M22 8v9M16 11h8M16 14h8'],
  // A tally of four generations, which is what a custodian with nothing to guard actually keeps.
  [['keeper', 'customs'], 'M17 7v13M20 7v13M23 7v13M15 13h10']
];

/** The tool for a role, or null for a person whose trade has no drawing yet. */
export function toolFor(role: string): string | null {
  const lowered = role.toLowerCase();
  for (const [words, path] of TOOLS) {
    if (words.some((word) => lowered.includes(word))) return path;
  }
  return null;
}

export interface PersonPortraitProps {
  person: Pick<Npc, 'name' | 'role' | 'language'>;
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
  const ink = LANGUAGE_INK[person.language] ?? NEUTRAL_INK;
  const tool = toolFor(person.role);

  return (
    <svg
      className={`person-portrait${speaking ? ' is-speaking' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d={HEAD} fill={ink} />
      <path d={SHOULDERS} fill={ink} />
      {tool && (
        <path
          d={tool}
          fill="none"
          stroke={ink}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
