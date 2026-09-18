// What this place can work, as a strip of marks under its name.
//
// **Not a grid of cards, not a second modal, not a tab bar.** A place already answers three
// questions in order -- what is here to look at, who is here to talk to, what is further in -- and
// what it can *work* is the fourth of the same question. So it belongs in the same panel, above
// the prose, and not behind a button.
//
// **Present benches are drawn; absent ones are named in a line of prose.** That is the one place
// this interface departs from its own convention -- `TileActions` lists every action at every
// height, greyed with its reason, because a greyed row is how a mechanic is taught. The reasoning
// does not carry here, and the difference is worth stating: a player learns what a kiln is the
// first time they meet one, and drawing all eight at every place would make the board say the same
// thing everywhere, which is the exact flatness it exists to fix. What a place *lacks* is still
// said -- in one sentence, which is cheaper than eight greyed marks and reads better.
//
// Presentation only. Which benches a place has is `content/stations.ts`, derived from who stands
// there; this renders the answer and calls back.

import type { Station } from '../content/stations';
import { ThingIcon } from './ThingIcon';

/**
 * The emoji each bench wears until somebody draws it.
 *
 * Stand-ins, and the queue to replace them is `docs/art-handover.md` -- a drawn mark lands in
 * `src/ui/marks/` as `station-kiln.svg` and appears with no code, exactly like every other mark.
 * Four of these are honest fits and four are approximations; the kiln is the worst of them, which
 * is why it is first on the list to be drawn.
 */
const STATION_MARK: Record<string, string> = {
  bench: '🪚',
  hearth: '🍲',
  apothecary: '⚱️',
  loom: '🧶',
  tannery: '🐄',
  quern: '⚙️',
  kiln: '🏺',
  slip: '🛶'
};

export interface StationBoardProps {
  /** What this place has, in `STATIONS` order, from `stationsAt`. */
  here: readonly Station[];
  /** What it does not, for the line underneath. */
  missing: readonly Station[];
  /**
   * Open the workshop filtered to one bench, or null to make the board a readout.
   *
   * Null at `peek`, where a tappable mark would owe the 44px touch floor against a readout's 26 --
   * measured on the standing row, that difference is what pushes a chip out of the dock on a
   * landscape phone. The board says what is here at every height; whether it can be *pressed*
   * is what the height decides.
   */
  onOpen: ((station: Station) => void) | null;
}

export function StationBoard({ here, missing, onOpen }: StationBoardProps) {
  if (here.length === 0) return null;

  return (
    <section className="station-board" aria-label="What can be worked here">
      <ul className="station-list">
        {here.map((s) =>
          onOpen ? (
            <li key={s.id}>
              <button
                type="button"
                className="station station-open"
                onClick={() => onOpen(s)}
                title={s.description}
              >
                <ThingIcon mark={STATION_MARK[s.id] ?? '•'} label={s.name} />
                <span className="station-name">{s.name}</span>
              </button>
            </li>
          ) : (
            <li key={s.id} className="station">
              <ThingIcon mark={STATION_MARK[s.id] ?? '•'} label={s.name} />
              <span className="station-name">{s.name}</span>
            </li>
          )
        )}
      </ul>
      {missing.length > 0 && <p className="station-absent">{absentLine(missing)}</p>}
    </section>
  );
}

/**
 * What this place cannot do, in one sentence.
 *
 * Capped at three names, then counted. A place with no buildings is missing six benches, and
 * listing all of them is a wall that says less than "no kiln, no loom, no tannery, and three
 * others" -- the first three are the ones `STATIONS` order puts nearest to being a real building,
 * which is what a player is most likely to have wanted.
 */
function absentLine(missing: readonly Station[]): string {
  const names = missing.map((s) => s.name.toLowerCase());
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;
  const list =
    shown.length === 1
      ? shown[0]
      : `${shown.slice(0, -1).join(', ')} or ${shown[shown.length - 1]}`;
  return rest > 0
    ? `No ${list} here, and ${rest} other${rest === 1 ? '' : 's'} besides.`
    : `No ${list} here.`;
}
