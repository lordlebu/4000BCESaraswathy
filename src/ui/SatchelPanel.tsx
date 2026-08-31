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

import {
  type Recipe,
  recipes as allRecipes,
  item,
  material,
  nameOf
} from '../content/making';
import { npc } from '../content/places';
import { KIND_MARK, ThingIcon, materialMark } from './ThingIcon';
import {
  type Bench,
  type Knows,
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
  onMake: (recipeId: string) => void;
  /**
   * Whether the player has been shown how.
   *
   * Passed in rather than derived here, because knowing is a fact about the journey and this
   * panel is about the satchel. `App` composes the two, which is the same division `bench`
   * already has.
   */
  knows: Knows;
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
        <ThingIcon
          mark={markFor(recipe)}
          label={item(recipe.outputs[0]?.item ?? '')?.kind ?? 'craft'}
        />
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

/**
 * A recipe wears the mark of what it makes.
 *
 * The output rather than the process, because a player scanning the Making list is looking for
 * the thing they want, not for the verb that produces it -- and three different processes all
 * produce a container.
 */
function markFor(r: Recipe): string {
  const out = r.outputs[0];
  const made = out?.item ? item(out.item) : null;
  if (made) return KIND_MARK[made.kind];
  const stuff = out?.material ? material(out.material) : null;
  return stuff ? materialMark(stuff.classes) : '•';
}

/** Recipes that exist, need a teacher, and have not been taught yet. */
function stillToLearn(knows: Knows): Recipe[] {
  return allRecipes.filter((r) => r.taughtBy.length > 0 && !knows(r.id));
}

export function SatchelPanel({
  satchel,
  bench,
  onMake,
  knows,
  open,
  onClose
}: SatchelPanelProps) {
  if (!open) return null;

  const stuff = materialsHeld(satchel);
  const made = itemsHeld(satchel);
  const ready = makeableNow(satchel, bench, knows);
  // Capped, and the cap is a judgement rather than a limit: a list of everything within reach
  // is 40 rows of things the player cannot do, which reads as a wall rather than as a lead.
  const near = withinReach(satchel, bench, knows).slice(0, 8);

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

        {stillToLearn(knows).length > 0 && (
          <section className="diary-section">
            <h3>Somebody would have to show you</h3>
            <ul className="recipe-why">
              {stillToLearn(knows)
                .slice(0, 6)
                .map((r) => (
                  <li key={r.id}>
                    {r.name} — {r.taughtBy.map((w) => npc(w)?.name ?? w).join(' or ')}
                  </li>
                ))}
            </ul>
          </section>
        )}
      </section>
    </div>
  );
}
