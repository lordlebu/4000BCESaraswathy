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
// **It can be put away from where it is, and until now it could not.** Closing the strip has been
// possible for months -- reported from play, because a permanent band that cannot be dismissed is
// an obstruction rather than a convenience -- but the switch moved into the map sheet under *What
// is on screen*, which was right for the control bar and left the thing a player actually asked for
// **two taps deep inside a menu**, with nothing on the strip itself saying it could be dismissed.
// So the strip carries its own `x`, and the sheet keeps the switch for putting it back.
//
// **That is why this is a `div` and not a `button`, which is the whole of the work here.** The
// readout used to be one `<button>` wrapping everything. A `<button>` inside a `<button>` is
// invalid HTML and browsers resolve it by discarding the inner one, so the dismiss could not simply
// be added: it is two controls side by side now, the readout that opens the full satchel and the
// one that puts the strip away, in a container that is neither.
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
  /** Takes the strip off the screen. The map sheet's switch brings it back. */
  onHide: () => void;
}

export function SatchelStrip({ satchel, onOpen, onHide }: SatchelStripProps) {
  // Stuff before made things, which is the order they arrive in and the order the full panel
  // uses. Not sorted by count: a strip that reorders itself as you gather is a strip you have to
  // re-read every time you pick something up.
  const held = [...materialsHeld(satchel), ...itemsHeld(satchel)];

  return (
    <div className="satchel-strip">
      <button
        type="button"
        className="satchel-strip-open"
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
          <span className="satchel-strip-empty">
            Nothing carried yet — take what the ground offers
          </span>
        ) : (
          <ul className="satchel-strip-list">
            {held.map((id) => (
              <Held key={id} satchel={satchel} id={id} />
            ))}
          </ul>
        )}
      </button>

      {/* **The label says where it goes, because a control that hides something has to.** "Close"
          or a bare cross leaves a player who pressed it with no idea whether the strip is gone for
          this session, for ever, or by mistake -- and the way to it is a sheet behind another
          button, which is exactly the thing they will not go looking for on a guess.

          **This label broke five specs, twice, and the second time settles where the fix belongs.**
          Playwright matches `getByRole(name)` as a case-insensitive *substring*, so the first
          wording -- *"bring it back from the Map sheet"* -- answered to `{ name: 'Back' }`, the
          diary's close button. The obvious lesson was "do not put another control's name in a
          label", so it became *"show it again from the Map sheet"* -- which still contains **Map**,
          and collided with `{ name: /Map/ }` in two more specs one run later.

          Which is the useful part: the copy is right both times. A player who has just hidden
          something needs to be told where it went, and the place it went is called the Map sheet.
          **The durable fix is on the query side** -- a query for a short common word takes
          `exact: true` -- and trimming product copy to dodge a loose selector is the tail wagging
          the dog. */}
      <button
        type="button"
        className="satchel-strip-hide"
        onClick={onHide}
        aria-label="Put the satchel away — show it again from the Map sheet"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
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
