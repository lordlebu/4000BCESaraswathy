// What you are carrying, always on screen.
//
// **In an idle game the resource readout is the one thing that never hides.** Kittens Game pins a
// column down the left and never moves it; A Dark Room fixes a panel to the right; Cookie Clicker
// makes the count the largest thing on the page. The reason is the same in all three: every other
// decision is read *against* what you have, so a bag behind a button means opening the bag to
// answer a question you are asking about something else on screen.
//
// That is exactly what the workshop made obvious. A recipe list saying "needs 4 Reed fibre, has 1"
// is doing the satchel's job in the satchel's absence, and doing it one recipe at a time.
//
// **This is a strip, not the satchel.** The full panel still exists and still holds the detail --
// what a thing is, what it is for, the description canon wrote. This answers one question only:
// what have I got, right now. So it shows counts and marks and no prose, and it is quiet enough
// to sit under the map without competing with it.
//
// Presentation only. `content/satchel.ts` owns what is carried and `ThingIcon` owns what a thing
// looks like; nothing here decides either.

import { type Satchel, count, itemsHeld, materialsHeld } from '../content/satchel';
import { item, material } from '../content/making';
import { KIND_MARK, ThingIcon, materialMark } from './ThingIcon';

export interface SatchelStripProps {
  satchel: Satchel;
  /** Opens the full satchel, for the detail this deliberately leaves out. */
  onOpen: () => void;
}

export function SatchelStrip({ satchel, onOpen }: SatchelStripProps) {
  // Stuff before made things, which is the order they arrive in and the order the full panel
  // uses. Not sorted by count: a strip that reorders itself as you gather is a strip you have to
  // re-read every time you pick something up.
  const held = [...materialsHeld(satchel), ...itemsHeld(satchel)];

  return (
    <button
      type="button"
      className="satchel-strip"
      onClick={onOpen}
      aria-label={
        held.length === 0
          ? 'Satchel, empty. Open for detail.'
          : `Satchel, ${held.length} kinds carried. Open for detail.`
      }
    >
      {held.length === 0 ? (
        // Says what would fill it rather than that it is empty. "Empty" is a state; "pick things
        // up" is the next move, and an empty satchel is the one moment a player most needs to be
        // told that gathering exists.
        <span className="satchel-strip-empty">Nothing carried yet — take what the ground offers</span>
      ) : (
        <ul className="satchel-strip-list">
          {held.map((id) => (
            <Held key={id} satchel={satchel} id={id} />
          ))}
        </ul>
      )}
    </button>
  );
}

function Held({ satchel, id }: { satchel: Satchel; id: string }) {
  const n = count(satchel, id);
  const stuff = material(id);
  const made = item(id);
  const what = stuff ?? made;

  // Stuff is marked by what it is; a made thing by what it is for. The same division the full
  // panel makes, and for the same reason: reed fibre and reed rope must not share a glyph at the
  // moment a player is learning they are not the same thing.
  const mark = stuff ? materialMark(stuff.classes) : made ? (KIND_MARK[made.kind] ?? '•') : '•';
  const word = stuff
    ? ({ namespace: 'class', value: stuff.classes[0] ?? 'stone' } as const)
    : made
      ? ({ namespace: 'kind', value: made.kind } as const)
      : undefined;

  return (
    <li className="satchel-held">
      <ThingIcon mark={mark} label={what?.name ?? id} word={word} />
      {/* The count is the point of the strip, so it is never hidden at one -- unlike the full
          panel, where a bare name reads better. Somebody scanning this is counting. */}
      <span className="satchel-held-n">{n}</span>
    </li>
  );
}
