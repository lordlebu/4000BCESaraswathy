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

import { type Recipe, item, material, nameOf } from '../content/making';
import {
  type Bench,
  blockedBy,
  canMake,
  makeableNow,
  withinReach
} from '../content/crafting';
import { type Satchel, count, distinct, itemsHeld, materialsHeld } from '../content/satchel';

export interface SatchelPanelProps {
  satchel: Satchel;
  /** Where the traveller stands, which decides whether a sited process is available. */
  bench: Bench;
  /** True when the tile under foot has something on it. */
  canGather: boolean;
  /** What is under foot, in the diary's words, or null when there is nothing. */
  gatherHint: string | null;
  onGather: () => void;
  onMake: (recipeId: string) => void;
  open: boolean;
  onClose: () => void;
}

function Stack({ satchel, id }: { satchel: Satchel; id: string }) {
  const n = count(satchel, id);
  const what = material(id) ?? item(id);
  return (
    <li className="stack">
      <span className="stack-name">{what?.name ?? id}</span>
      {n > 1 && <span className="stack-count">×{n}</span>}
      {what?.description && <p className="stack-note">{what.description}</p>}
    </li>
  );
}

function Makeable({
  recipe,
  ready,
  why,
  onMake
}: {
  recipe: Recipe;
  ready: boolean;
  why: string[];
  onMake: (id: string) => void;
}) {
  return (
    <li className={ready ? 'recipe recipe-ready' : 'recipe'}>
      <div className="recipe-head">
        <span className="recipe-name">{recipe.name}</span>
        <button type="button" disabled={!ready} onClick={() => onMake(recipe.id)}>
          {ready ? 'Make' : 'Not yet'}
        </button>
      </div>
      <p className="recipe-out">
        {recipe.outputs
          .map((o) => nameOf(o.item ?? o.material ?? ''))
          .join(', ')}
      </p>
      {/* The reasons come from `blockedBy`, in the words it chose. Rewriting them here would
          be the panel deciding what a shortfall means. */}
      {!ready && why.length > 0 && (
        <ul className="recipe-why">
          {why.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function SatchelPanel({
  satchel,
  bench,
  canGather,
  gatherHint,
  onGather,
  onMake,
  open,
  onClose
}: SatchelPanelProps) {
  if (!open) return null;

  const stuff = materialsHeld(satchel);
  const made = itemsHeld(satchel);
  const ready = makeableNow(satchel, bench);
  // Capped, and the cap is a judgement rather than a limit: a list of everything within reach
  // is 40 rows of things the player cannot do, which reads as a wall rather than as a lead.
  const near = withinReach(satchel, bench).slice(0, 8);

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

        <section className="diary-section">
          <h3>Under foot</h3>
          {canGather ? (
            <>
              <p>{gatherHint}</p>
              <button type="button" onClick={onGather}>
                Pick it up
              </button>
            </>
          ) : (
            <p className="muted">Nothing here worth stooping for.</p>
          )}
        </section>

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

        <section className="diary-section">
          <h3>What you could make</h3>
          {ready.length === 0 && near.length === 0 ? (
            <p className="muted">
              Nothing yet. Pick things up as you walk and this fills on its own.
            </p>
          ) : (
            <ul className="recipes">
              {ready.map((r) => (
                <Makeable key={r.id} recipe={r} ready onMake={onMake} why={[]} />
              ))}
              {near.map((r) => (
                <Makeable
                  key={r.id}
                  recipe={r}
                  ready={canMake(satchel, r.id, bench)}
                  why={blockedBy(satchel, r.id, bench)}
                  onMake={onMake}
                />
              ))}
            </ul>
          )}
        </section>
      </section>
    </div>
  );
}
