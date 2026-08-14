// The collection: which flora and fauna the traveller has met.
//
// This replaces `journey.observed`, which was a dead end. That array held creature *names*,
// was appended to by a button, and was read in exactly one place -- to print a list in the
// travel log. It gated nothing and fed no discovery, so the "Observe creature" button was an
// action whose only consequence was that the button then said something else.
//
// Two changes make it a real thing rather than a tally:
//
// Keyed by species id, not by name. Names come from canon and are prose; ids are the stable
// handle canon actually guarantees. A re-export that improves a name silently orphaned every
// entry recorded under the old one, and nothing would have reported it.
//
// Filled by meeting, not by pressing. A naturalist's collection records what they encountered;
// it does not require them to have drawn it. The starting tile seeds it so the album is never
// empty on arrival.
//
// Deliberately *not* progression. Nothing in `journey.ts` reads this, no discovery requires it,
// and `check_playability.py` never needs to know it exists -- which is what lets it be a
// pleasure rather than a checklist. If that ever changes it stops being free and starts being
// a thing that can deadlock.
//
// Pure: no React, no DOM, no Phaser. Exercised under Node.

/**
 * All this needs is an id.
 *
 * Taking the full `Creature`/`Flora` record would make every caller and every test construct
 * eight fields to record one, and would couple the collection to a shape it never reads.
 */
interface Identified {
  id: string;
}

/** What kind of thing was met. Flora and fauna are shown apart, so the record keeps them apart. */
export type SpeciesKind = 'creature' | 'flora';

export interface Meeting {
  /** Canon's stable handle. The key of the record too, but repeated so an entry stands alone. */
  id: string;
  kind: SpeciesKind;
}

/** Species id to what is known about meeting it. */
export type Collection = Record<string, Meeting>;

export function emptyCollection(): Collection {
  return {};
}

/**
 * Record having met something. Meeting it again changes nothing.
 *
 * There was a `times` count here, and it measured the wrong thing: `metOnTile` runs on every
 * arrival, so pacing back and forth across one tile read as "met 14 times" while telling the
 * reader nothing, and a species met once in four different places was indistinguishable from
 * one met four times in the same spot. It counted footsteps, not encounters.
 *
 * Dropping it rather than fixing it, because the album is explicitly not for completion: a
 * number on an entry invites treating it as something to grow. Each entry is now a plain fact
 * -- you have met this -- which is what "discovered once" should mean.
 *
 * Returning the same object when nothing changed also means React re-renders only on a genuine
 * first meeting rather than on every step.
 */
export function met(
  collection: Collection,
  species: Identified | null | undefined,
  kind: SpeciesKind
): Collection {
  if (!species?.id) return collection;
  if (collection[species.id]) return collection;
  return {
    ...collection,
    [species.id]: { id: species.id, kind }
  };
}

/**
 * Record whatever is on a tile: the creature if one is out, the flora growing there.
 *
 * Both in one call because standing somewhere is a single event from the player's side, and
 * two separate calls would be two chances to forget one.
 */
export function metOnTile(
  collection: Collection,
  found: { creature?: Identified | null; flora?: Identified | null }
): Collection {
  let next = met(collection, found.creature ?? null, 'creature');
  next = met(next, found.flora ?? null, 'flora');
  return next;
}

export function hasMet(collection: Collection, id: string): boolean {
  return Boolean(collection[id]);
}

export function countOf(collection: Collection, kind: SpeciesKind): number {
  return Object.values(collection).filter((m) => m.kind === kind).length;
}

export function size(collection: Collection): number {
  return Object.keys(collection).length;
}

/**
 * Every species met, in the order they were first met.
 *
 * Insertion order is what `Object.values` gives for string keys, and it is the order an album
 * fills -- which is more use to a reader than alphabetical, because it is the shape of their
 * own walk.
 */
export function everythingMet(collection: Collection): Meeting[] {
  return Object.values(collection);
}

/**
 * Read a stored collection back, discarding anything malformed.
 *
 * The save discards on a version mismatch, so this only ever sees the current shape -- but it
 * still checks, because `localStorage` is editable by anyone with a browser console and a
 * half-read entry would render as an album full of blanks.
 */
export function readCollection(value: unknown): Collection {
  if (!value || typeof value !== 'object') return emptyCollection();
  const out: Collection = {};
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Partial<Meeting>;
    if (entry.kind !== 'creature' && entry.kind !== 'flora') continue;
    out[id] = { id, kind: entry.kind };
  }
  return out;
}
