// What the Vedda say on the road, for the moments between the walking.
//
// **Canon's, read whole.** Each saying is a lore entity (`database/sayings/`): the words, the
// in-world credit the card prints, and the moments it suits -- the opening, dawn, leaving, the road,
// a crossing, arriving, night, the fire, settling. The owner's rulings: the sayings belong to the
// lore's various peoples (2 October 2026) -- the Vedda keep the migration lines, the rest are the
// Tushara's, the Maru's, the Kia's and others' -- and the game credits each in the world only
// ("Tushara saying", "The Walking Song, attributed to the first Vedda"). Where a
// line was written after a Rigvedic hymn, canon keeps that as `inspired_by` for the lore portal and
// does not export it, so nothing here can print an original line as though it were a quotation.
//
// The opening, the rides between maps and the fireside cards read this (Roads and Hands, Phases 3
// to 5). Pure, and free of React and Phaser.

import placesBundle from '../../data/canon/places.json';

export type Occasion =
  | 'opening'
  | 'dawn'
  | 'departure'
  | 'road'
  | 'crossing'
  | 'arrival'
  | 'night'
  | 'fireside'
  | 'settling';

export interface Saying {
  id: string;
  name: string;
  /** The words, with line breaks where they are said as verse. */
  text: string;
  /** What the card prints under it: "Vedda saying", "The Walking Song, attributed to the first Vedda". */
  attribution: string;
  /** The people who carry it, as a culture id. */
  carriedBy: string | null;
  occasions: Occasion[];
  /** The maps it belongs to; empty means any. */
  fieldMaps: string[];
}

interface RawSaying {
  id: string;
  name: string;
  text: string;
  attribution: string;
  carried_by?: string;
  occasions: string[];
  field_maps?: string[];
}

export const sayings: readonly Saying[] = ((placesBundle as { sayings?: RawSaying[] }).sayings ?? []).map((s) => ({
  id: s.id,
  name: s.name,
  text: s.text,
  attribution: s.attribution,
  carriedBy: s.carried_by ?? null,
  occasions: s.occasions as Occasion[],
  fieldMaps: s.field_maps ?? []
}));

export function saying(id: string): Saying | null {
  return sayings.find((s) => s.id === id) ?? null;
}

/**
 * One saying for this moment on this map, chosen by the roll so the same moment says the same thing.
 *
 * **A saying tied to this map is preferred over one that suits anywhere**: the scarp road's "the
 * mountains do not move" belongs on the climb to the Narmada, and drawing it one time in thirty-three
 * would waste it. `avoid` keeps a card from repeating the line the last card said.
 */
export function sayingFor(
  occasion: Occasion,
  fieldMapId: string | null,
  roll: (salt: string) => number,
  avoid: readonly string[] = []
): Saying | null {
  const fits = sayings.filter(
    (s) => s.occasions.includes(occasion) && (s.fieldMaps.length === 0 || (fieldMapId !== null && s.fieldMaps.includes(fieldMapId)))
  );
  const fresh = fits.filter((s) => !avoid.includes(s.id));
  const pool = fresh.length > 0 ? fresh : fits;
  const local = pool.filter((s) => fieldMapId !== null && s.fieldMaps.includes(fieldMapId));
  const from = local.length > 0 ? local : pool;
  if (from.length === 0) return null;
  return from[roll(`saying:${occasion}`) % from.length]!;
}
