// What you are carrying, and what you could make of it.
//
// **This panel asks; it never reimplements.** Every question it puts on screen — can this be
// made, why not, what is nearly possible — is answered by `content/crafting.ts`, which is
// tested under Node. A panel that walked a recipe's ingredients itself to colour a row would
// be a second implementation of the rule, and this codebase has the scars: three mechanics
// have shipped with the rule written, tested and never called.
//
// The register is the diary's. Nothing here is a stat line, there is no weight bar, and
// nothing is running out — see `content/satchel.ts` for why that is a narrower reversal of
// `kit.ts` than it looks.

import { item, material } from '../content/making';
import { KIND_MARK, ThingIcon, materialMark } from './ThingIcon';
import { type Satchel, count, distinct, itemsHeld, materialsHeld } from '../content/satchel';

export interface SatchelPanelProps {
  satchel: Satchel;
  /** True when the tile under foot has something on it. */
  open: boolean;
  onClose: () => void;
}

function Stack({ satchel, id }: { satchel: Satchel; id: string }) {
  const n = count(satchel, id);
  const stuff = material(id);
  const made = item(id);
  const what = stuff ?? made;
  // Stuff is marked by what it is; a made thing by what it is for. Drawing both from the same
  // table would give reed fibre and reed rope one glyph, at exactly the moment a player is
  // learning they are not the same thing.
  const mark = stuff ? materialMark(stuff.classes) : made ? KIND_MARK[made.kind] : '•';
  const label = stuff ? stuff.classes[0]! : (made?.kind ?? 'thing');
  return (
    <li className="stack">
      <ThingIcon mark={mark} label={label} />
      <span className="stack-name">{what?.name ?? id}</span>
      {n > 1 && <span className="stack-count">×{n}</span>}
      {what?.description && <p className="stack-note">{what.description}</p>}
    </li>
  );
}

export function SatchelPanel({
  satchel,
  open,
  onClose
}: SatchelPanelProps) {
  if (!open) return null;

  const stuff = materialsHeld(satchel);
  const made = itemsHeld(satchel);
  // Capped, and the cap is a judgement rather than a limit: a list of everything within reach
  // is 40 rows of things the player cannot do, which reads as a wall rather than as a lead.

  // Craft somebody would have to show you. Named rather than hidden: a player who has met
  // nobody should be able to see that the craft exists and that a person is the way in, which
  // is the whole point of gating it on people rather than on a level.

  return (
    <div className="diary-veil" role="dialog" aria-modal="true" aria-label="Satchel">
      <section className="diary diary-filling">
        <header className="diary-head">
          <div>
            <h2>Satchel</h2>
            <p className="diary-sub">
              {distinct(satchel) === 0
                ? 'Empty. Things are picked up as you walk.'
                : `${distinct(satchel)} kinds of thing, and nothing weighs anything.`}
            </p>
          </div>
          <button type="button" className="diary-close" onClick={onClose}>
            Close
          </button>
        </header>

        {stuff.length > 0 && (
          <section className="diary-section">
            <h3>Stuff</h3>
            <ul className="stacks">
              {stuff.map((id) => (
                <Stack key={id} satchel={satchel} id={id} />
              ))}
            </ul>
          </section>
        )}

        {made.length > 0 && (
          <section className="diary-section">
            <h3>Made</h3>
            <ul className="stacks">
              {made.map((id) => (
                <Stack key={id} satchel={satchel} id={id} />
              ))}
            </ul>
          </section>
        )}

        {/* **Making moved to `WorkshopPanel`.** A bag is a thing you have and a workshop is a
            thing you do, and putting them on one surface meant crafting required opening your
            bag. The two only ever shared a screen because they touch the same materials, which
            is a data relationship rather than a player one. */}
      </section>
    </div>
  );
}
