// What kind of night this will be, drawn.
//
// The shelter mechanic's whole presentation is its label — "Sleep under the roof", "Unroll the
// bedding here" — with no icon, no legend and no meter. That has been right and stays right: the
// words say what sort of night this is before the player commits to it. But a row in a list of
// actions wants a mark beside it like every other row, and a font glyph was doing nothing except
// filling the slot.
//
// So this draws every case, and the drawing carries the same distinction the label does:
// **a town is lived in, a roof is built, a camp is made, a tent is pitched, a bedroll is unrolled,
// and sitting out the night is none of those.** Each is a different amount of shelter and each
// looks like a different amount.
//
// **Seven now, and the vocabulary is about grandness rather than about rest.** `NIGHT_RESTORES` is
// flat -- sleeping in the woods and sleeping in a town are worth the same. What these say is what
// the night *looked* like, and later which events could happen in it. A `tent` is the only one in
// the list the player made, so it is drawn as a thing that was put up rather than found:
// guy-lines, pegged, and a seam up the front.
//
// Inline SVG rather than a sprite. These are four small line drawings that have to sit on the
// panel's paper at whatever size the row is, in both light and dark, and `currentColor` gets that
// for nothing — where a bitmap would need a palette, a sheet, and a builder in `tools/`. The
// terrain art earns its pipeline because it tiles a world; four glyphs do not.
//
// Drawn from what canon says the kit is, in `content/kit.ts`: oiled cloth over a reed mat, rolled
// and strapped. The bedroll is a roll, not a sleeping bag.

// Re-exported rather than redeclared. This was its own four-member union and drifted the moment
// the ladder grew: `night.ts` owns what a night can be, and a second copy here would have gone on
// rendering four cases for a six-case type without failing anything.
export type { Shelter } from '../game/night';
import type { Shelter } from '../game/night';

export interface ShelterMarkProps {
  shelter: Shelter;
  /** Drawn at the row's text size unless a caller wants otherwise. */
  size?: number;
}

export function ShelterMark({ shelter, size = 20 }: ShelterMarkProps) {
  return (
    <svg
      className="shelter-mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      // Decorative: the label beside it already names the night, and a screen reader announcing
      // both would say it twice. Same call `SpeciesIcon` and `ThingIcon` make.
      aria-hidden="true"
      focusable="false"
    >
      {shelter === 'palace' && (
        <>
          {/* A great house on a terrace, with a colonnade under it. Grand, and deliberately not
              royal -- no crown, no throne. It is the biggest building in the biggest town. */}
          <path d="M2 20h20" />
          <path d="M4 20v-7h16v7" />
          <path d="M3 13 12 7l9 6" />
          <path d="M8 20v-4M12 20v-4M16 20v-4" />
        </>
      )}

      {shelter === 'settlement' && (
        <>
          {/* Rooftops, plural, with smoke off one of them. A settlement is not a building -- it is
              the fact that somebody else is awake nearby. */}
          <path d="M2 20h20" />
          <path d="M3 20v-6l4-3 4 3v6" />
          <path d="M13 20v-8l4-3 4 3v8" />
          <path d="M17 5.5c.9-.8.2-1.6 0-2.5" />
        </>
      )}

      {shelter === 'tent' && (
        <>
          {/* Pitched and pegged, with the seam up the front and the guys out to the ground. The
              only rung on the ladder the player built, so it reads as put up rather than found. */}
          <path d="M2 19h20" />
          <path d="M12 5 4.5 19h15z" />
          <path d="M12 5v14" />
          <path d="M4.5 19 2.5 15" />
          <path d="M19.5 19 21.5 15" />
        </>
      )}

      {shelter === 'roof' && (
        <>
          {/* A wall and a pitched roof: somebody else built this and you are inside it. */}
          <path d="M4 11 12 4l8 7" />
          <path d="M6 11v8h12v-8" />
          <path d="M10.5 19v-4h3v4" />
        </>
      )}

      {shelter === 'camp' && (
        <>
          {/* A lean-to over a fire: made, not found, and not yours tomorrow. */}
          <path d="M3 18h18" />
          <path d="M5 18 12 6l7 12" />
          <path d="M12 18v-5" />
        </>
      )}

      {shelter === 'bedroll' && (
        <>
          {/* Oiled cloth over a reed mat, rolled and strapped -- a roll seen end-on, with the
              strap across it. Canon's own description, in three strokes. */}
          <path d="M3 15h18" />
          <ellipse cx="7" cy="11.5" rx="3.4" ry="3.4" />
          <path d="M7 15h10a3.4 3.4 0 0 0 0-6.8H7" />
          <path d="M13.5 8.4v6.6" />
        </>
      )}

      {shelter === 'none' && (
        <>
          {/* Open ground and a horizon. Nothing over you at all, which is the point. */}
          <path d="M2 16h20" />
          <path d="M6 16c1.6-2.4 3-3.4 4.5-3.4" />
          <path d="M15 12.8c1.4.5 2.4 1.6 3 3.2" />
          <path d="M12 5v3" />
          <path d="M9.4 6.2 10.8 8" />
          <path d="M14.6 6.2 13.2 8" />
        </>
      )}
    </svg>
  );
}
