// What the player chose about their own screen, kept between visits.
//
// **Why this is not in the save.** `Journey` in `src/save.ts` is *world* state -- where the
// traveller is, what they know, what the ground has left -- and it is versioned: adding a field to
// it means bumping `SAVE_VERSION`, which **discards every existing journey**. Throwing away a
// player's progress to remember a toggle is the wrong trade by a wide margin, and a preference is
// not part of a journey anyway. A journey is per-seed; whether somebody wants to look at their
// satchel is not.
//
// **And why it is not in `surface.ts`.** That reducer is pure and runs under Node in `test/`, which
// is the whole reason the arbitration is testable. Reaching for `localStorage` there would put a
// browser global in the one file most carefully kept free of them.
//
// So: a third place, deliberately, holding the smallest thing it can. Read once when the reducer is
// seeded, written when the flag moves.
//
// **Every access is wrapped, because `localStorage` throws rather than returning null.** A private
// window, blocked site data, or a browser that has simply decided not today -- the accessor itself
// raises, before any value is read. An unguarded read here would take the whole application down on
// the first render, which is a much worse outcome than forgetting a toggle.

const KEY = 'varuna:showing';

/** What is kept. Deliberately one flag: see the note on the field notes below. */
export interface Showing {
  /** Whether the satchel strip is on screen. */
  satchelRibbon: boolean;
}

// **The field notes' own toggle is not here, and that is a decision rather than an omission.**
// Whether the notes are showing is `surface === 'here'` -- one of a set that also holds the diary,
// the album and the people, and that a place or a conversation takes over. Persisting it would mean
// persisting which *surface* was open, which is a different and much larger question: restoring a
// player into an album they left open a week ago is not obviously right. The satchel strip is a
// flag on its own, independent of everything, which is exactly what makes it safe to remember.

/** What was chosen last time, or nothing when there is nothing to say. */
export function readShowing(): Partial<Showing> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const { satchelRibbon } = parsed as Partial<Showing>;
    // Only a real boolean. A stored `"false"` or a `0` from some future version must not be read as
    // a choice -- an unreadable preference is no preference, and the default is a good one.
    return typeof satchelRibbon === 'boolean' ? { satchelRibbon } : {};
  } catch {
    return {};
  }
}

/** Remember a choice. Silent when the browser will not have it. */
export function writeShowing(showing: Showing): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(showing));
  } catch {
    // Nothing to do and nothing worth saying. The interface still works; it just forgets.
  }
}
