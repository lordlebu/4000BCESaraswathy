// What you can make, and where you would have to be to make it.
//
// **Crafting used to live inside the satchel**, which put "what am I carrying" and "what could I
// build" on one surface because both touch the same materials. That is a data relationship, not a
// player one: a bag is a thing you have and a workshop is a thing you do, and the genre this game
// is actually in keeps those apart. Kittens Game has a Workshop tab; A Dark Room builds where the
// building happens; Melvor gives every making skill its own page. None of them makes you open your
// bag to craft.
//
// **This panel asks; it never reimplements.** Every question on it -- can this be made, why not,
// what does this place allow -- is answered by `content/crafting.ts`, which is tested under Node.
// A panel that walked a recipe's ingredients itself to colour a row would be a second
// implementation of the rule, and this codebase has the scars: three mechanics shipped with the
// rule written, tested and never called.
//
// The one thing this panel is *for*, beyond listing: **saying what a place is good for.** Six of
// canon's seventeen processes can only be performed somewhere -- smelting, firing, casting,
// tanning, brewing, boatbuilding all want a settlement. That rule has been enforced since the
// making layer landed and no surface has ever mentioned it, so a player could stand in the only
// kind of place in the world that can smelt and never find out. A blocked recipe here keeps its
// row and says `needs to be done at a settlement`, which is the whole of how anyone learns that
// places have capabilities at all.

import { useEffect } from 'react';
import { goalOf, wanting } from '../content/goals';
import { type Recipe, item, nameOf, process, recipes } from '../content/making';
import { type Step, plan } from '../content/making-chain';
import {
  type Bench,
  type Knows,
  makeableNow,
  offeredHere,
  shortfalls,
  withinReach
} from '../content/crafting';
import { sourceOf, taughtOn, taughtWhere } from '../content/sources';
import { cookableNow } from '../content/cooking';
import { type Station } from '../content/stations';
import type { Satchel } from '../content/satchel';
import { KIND_MARK, PROCESS_MARK, ThingIcon } from './ThingIcon';
import { Modal } from './Modal';

export interface WorkshopPanelProps {
  satchel: Satchel;
  /** Where the traveller stands, which decides whether a sited process is available. */
  bench: Bench;
  /** Whether the player has been shown how. A fact about the journey, composed by `App`. */
  knows: Knows;
  onMake: (recipeId: string) => void;
  /**
   * The rungs of the last thing made, newest run only.
   *
   * One click can run four recipes, and a panel that consumed four materials in silence is
   * indistinguishable from a cheat. Printing what it did teaches the process it just spared the
   * player -- which is the whole bargain of doing the chain for them.
   */
  lastMade: readonly Step[];
  /**
   * The bench the player walked up to, or null for the whole workshop.
   *
   * **Set when the workshop is opened from a place's station board**, so eighty-three recipes stop
   * being one list and become the bench in front of them. Null from the control bar, which is the
   * old behaviour and still the right one when you are standing in a field.
   *
   * A filter, never a gate: what can actually be made is `crafting.canMake` as before, and this
   * only decides what is *shown*. A station cannot make something unmakeable or refuse something
   * makeable — see `content/stations.ts` for why that direction is load-bearing.
   */
  station: Station | null;
  /**
   * The map underfoot, so a recipe somebody teaches names the teacher here first, and leaves the
   * country off when it is this one. Optional: without it every teacher carries their country.
   */
  fieldMapId?: string | null;
  /** The recipe pinned to the dock, and how to change it. Both optional: without them no Pin buttons. */
  pinned?: string | null;
  onPin?: (recipeId: string | null) => void;
  /**
   * A recipe to open at: scrolled to, its section unfolded, and its Pin button focused. Set when the
   * pinned line in the dock is tapped, which is how a player finds the recipe to change or unpin.
   */
  focus?: string | null;
  /** The journey's flags, so a pinned building stage can be named. */
  flags?: readonly string[];
  open: boolean;
  onClose: () => void;
}

export function WorkshopPanel({
  satchel,
  bench,
  knows,
  onMake,
  lastMade,
  station,
  fieldMapId = null,
  pinned = null,
  onPin,
  focus = null,
  flags = [],
  open,
  onClose
}: WorkshopPanelProps) {
  // Open at the pinned recipe when asked: unfold the list it is in, bring it into view, and put
  // focus on its button so Enter unpins it. After the modal's own focus, hence the frame's wait.
  useEffect(() => {
    if (!open || !focus) return;
    const id = requestAnimationFrame(() => {
      const row = document.querySelector<HTMLElement>(`.workshop [data-recipe="${CSS.escape(focus)}"]`);
      if (!row) return;
      const fold = row.closest('details');
      if (fold) fold.open = true;
      row.scrollIntoView?.({ block: 'center' });
      row.querySelector<HTMLButtonElement>('.recipe-pin')?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open, focus]);

  if (!open) return null;

  const pinnedGoal = (() => {
    const goal = goalOf(pinned);
    return goal ? wanting(goal, satchel, bench, flags) : null;
  })();

  /** The Pin button's state for one recipe, or nothing where pinning is not offered. */
  const pinFor = (r: Recipe) =>
    onPin ? { on: pinned === r.id, toggle: () => onPin(pinned === r.id ? null : r.id) } : undefined;

  // Shown or not shown. `atStation` is identity when nothing is selected, so the unfiltered
  // workshop is exactly the code path it always was rather than a special case.
  const atStation = (r: Recipe) => station === null || station.processes.includes(r.process);

  const everythingReady = makeableNow(satchel, bench, knows).filter(atStation);
  const reachable = withinReach(satchel, bench, knows).filter(atStation);

  /**
   * **What can be made by making its parts first.** `craft` has always run the whole chain --
   * smelt, pour, cast, haft -- but the button only lit for a recipe makeable *directly*, so a chain
   * could never be started from here and the work `making-chain.ts` does was unreachable. A recipe
   * whose plan runs whole moves up to Ready, saying what it will make on the way; one that cannot
   * stays Within reach with its reasons.
   *
   * Every known recipe is asked, not only the ones within reach: "within reach" means one of its
   * own ingredients is carried, and a fish weir's ingredient is the rope that has not been made
   * yet -- so the recipes a chain exists for are exactly the ones that list would never show.
   */
  const firstMakes = new Map<string, string[]>();
  const directly = new Set(everythingReady.map((r) => r.id));
  for (const r of recipes) {
    if (directly.has(r.id) || !knows(r.id) || !atStation(r)) continue;
    const run = plan(satchel, r.id, bench, knows);
    if (run.blocked === null && run.steps.length > 1) {
      firstMakes.set(r.id, run.steps.slice(0, -1).map((step) => step.made));
    }
  }
  const chained = recipes.filter((r) => firstMakes.has(r.id));
  const near = reachable.filter((r) => !firstMakes.has(r.id));

  /**
   * **Recipes somebody could show you, and who.** A taught recipe used to be invisible until it was
   * learned, so a player could not know that Pell's hawser or Okhi's ink existed, let alone that
   * the person who knows it stands on another map. Collapsed, because it is a directory and not a
   * to-do list; the teachers on this map come first.
   */
  const unknown = recipes
    .filter((r) => !knows(r.id) && atStation(r))
    .map((r) => ({ r, line: taughtWhere(r.id, fieldMapId) }))
    .filter((x): x is { r: Recipe; line: string } => x.line !== null)
    .sort((a, b) => Number(taughtOn(b.r.id, fieldMapId)) - Number(taughtOn(a.r.id, fieldMapId)));

  /**
   * Everything known and not listed above, so anything can be pinned -- including the stone adze a
   * player carrying nothing yet needs most. "Within reach" only lists a recipe once one of its own
   * ingredients is carried, which is exactly the recipe a player starting out cannot see.
   */
  const listed = new Set([...everythingReady, ...chained, ...near].map((r) => r.id));
  const known = recipes.filter((r) => knows(r.id) && atStation(r) && !listed.has(r.id));
  const here = offeredHere(bench, knows).filter(atStation);

  /**
   * **Food, given its own heading, and that heading is a repair rather than a flourish.**
   *
   * `content/cooking.ts` had **zero importers** for the whole of its life -- this codebase's
   * signature fault, and the fourth instance of it. Every question it answers was already
   * answerable, so nothing failed; what was missing was anybody asking. Cooking is not a second
   * crafting system and the module says so itself -- it is crafting whose output happens to be
   * edible -- so it gets a section rather than a screen, and one import is the whole of the fix.
   *
   * It also reads better. A player who has just made a fire and a pot is looking for dinner, and
   * twelve dishes scattered through a list of eighty-three by alphabet is not a menu.
   */
  const readyIds = new Set(everythingReady.map((r) => r.id));
  const food = cookableNow(satchel, bench).filter((d) => readyIds.has(d.id));
  const foodIds = new Set(food.map((d) => d.id));
  const ready = everythingReady.filter((r) => !foodIds.has(r.id));

  return (
    // The same modal the satchel uses. `.sheet` is the narrow map panel pinned top-left and was
    // the wrong furniture entirely for a list of recipes -- the screenshot showed it clipped to
    // two lines with the place panel over the top of it.
    <Modal open label="Workshop" onClose={onClose}>
      <section className="diary diary-filling workshop">
        <header className="diary-head">
          <div>
            <h2>{station ? station.name : 'Workshop'}</h2>
            {/* At a bench, the bench says what it is; in the open, the place says what it allows.
                Two different facts, and showing the wrong one is how a header stops being read. */}
            <p className="muted">{station ? station.description : whereLine(bench, here.length)}</p>
          </div>
          <button type="button" className="diary-close" onClick={onClose}>
            Close
          </button>
        </header>

        {/* **What is pinned, and the way to take it off, first.** Whatever is pinned -- a recipe
            listed further down, or a building stage that is not a recipe at all -- can be unpinned
            here without hunting for its row. */}
        {pinnedGoal && onPin && (
          <section className="diary-section workshop-pinned">
            <p>
              <span className="muted">Working towards </span>
              <b>{pinnedGoal.name}</b>
            </p>
            <button type="button" className="recipe-pin" aria-label={`Unpin ${pinnedGoal.name}`} onClick={() => onPin(null)}>
              Unpin
            </button>
          </section>
        )}

        {lastMade.length > 0 && (
          <section className="diary-section made-log">
            <h3>{lastMade.length > 1 ? 'You worked through' : 'You made'}</h3>
            <ol className="made-steps">
              {lastMade.map((step, i) => (
                <li key={`${step.recipeId}-${i}`}>
                  <span className="made-what">{step.name}</span>
                  <span className="made-out">{step.made}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {food.length > 0 && (
          <section className="diary-section">
            {/* Named for the evening rather than for the process. `whereCooked` says it needs no
                building -- a hearth is a fire somebody built, and a traveller builds one wherever
                they stop -- so this section is available on open ground and says so by being here
                at all. */}
            <h3>To cook</h3>
            <ul className="recipes">
              {food.map((r) => (
                <Makeable key={r.id} recipe={r} ready why={[]} pin={pinFor(r)} onMake={onMake} />
              ))}
            </ul>
          </section>
        )}

        {ready.length + chained.length > 0 && (
          <section className="diary-section">
            <h3>Ready</h3>
            <ul className="recipes">
              {ready.map((r) => (
                <Makeable key={r.id} recipe={r} ready why={[]} pin={pinFor(r)} onMake={onMake} />
              ))}
              {chained.map((r) => (
                <Makeable key={r.id} recipe={r} ready why={[]} first={firstMakes.get(r.id)} pin={pinFor(r)} onMake={onMake} />
              ))}
            </ul>
          </section>
        )}

        {near.length > 0 && (
          <section className="diary-section">
            {/* Named for what it is rather than "Not yet": a player scanning this wants to know
                which of these is close, and the reasons underneath say how close. */}
            <h3>Within reach</h3>
            <ul className="recipes">
              {near.map((r) => (
                <Makeable
                  key={r.id}
                  recipe={r}
                  ready={false}
                  why={shortfalls(satchel, r.id, bench).map((s) => ({ text: s.why, from: sourceOf(s) }))}
                  pin={pinFor(r)}
                  onMake={onMake}
                />
              ))}
            </ul>
          </section>
        )}

        {onPin && known.length > 0 && (
          <details className="diary-section workshop-teachers">
            <summary>Everything you know how to make ({known.length})</summary>
            <ul className="recipes">
              {known.map((r) => (
                <Makeable
                  key={r.id}
                  recipe={r}
                  ready={false}
                  why={shortfalls(satchel, r.id, bench).map((s) => ({ text: s.why, from: sourceOf(s) }))}
                  pin={pinFor(r)}
                  onMake={onMake}
                />
              ))}
            </ul>
          </details>
        )}

        {unknown.length > 0 && (
          <details className="diary-section workshop-teachers">
            <summary>Somebody could show you ({unknown.length})</summary>
            <ul className="recipes">
              {unknown.map(({ r, line }) => (
                <li key={r.id} className="recipe recipe-taught">
                  <span className="recipe-name">{r.name}</span>
                  <p className="recipe-first muted">{line}.</p>
                </li>
              ))}
            </ul>
          </details>
        )}

        {ready.length === 0 && chained.length === 0 && near.length === 0 && food.length === 0 && (
          <p className="muted">
            {station
              ? `Nothing for the ${station.name.toLowerCase()} yet. Gather something it can work.`
              : 'Nothing to make yet. Gather something, or find somewhere that can work it.'}
          </p>
        )}
      </section>
    </Modal>
  );
}

/**
 * What this place is, in one line.
 *
 * The header earns its space only by saying something the list does not, so it names the
 * capability rather than the location: standing somewhere that unlocks six recipes is the fact
 * worth leading with, and standing in a field is worth saying plainly rather than leaving blank.
 */
function whereLine(bench: Bench, offered: number): string {
  if (bench.kind === null) {
    return 'Out in the open. Hand work only — anything needing a bench waits for a settlement.';
  }
  const place = withArticle(bench.kind.replace(/_/g, ' '));
  if (offered === 0) {
    return `Standing at ${place}. Nothing here works a material.`;
  }
  return `Standing at ${place} — ${offered} thing${
    offered === 1 ? '' : 's'
  } can be made here that cannot be made in the open.`;
}

/**
 * "an eco site", not "a eco site".
 *
 * Crude on purpose: canon's `poi.kind` is a closed list of six and none of them is a silent-h or
 * a "eu-" word, so the vowel test is exactly right for every value it will ever see. A general
 * solution would be more code and no more correct.
 */
function withArticle(noun: string): string {
  return `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;
}

function Makeable({
  recipe,
  ready,
  why,
  first = [],
  pin,
  onMake
}: {
  recipe: Recipe;
  ready: boolean;
  /** What stands in the way, each with where the missing thing comes from when canon can say. */
  why: { text: string; from: string | null }[];
  /** What a chain makes before this, in order, when the parts are made too. */
  first?: string[];
  /** Whether this is the pinned recipe, and how to pin or unpin it. Absent: no button. */
  pin?: { on: boolean; toggle: () => void };
  onMake: (id: string) => void;
}) {
  // The bare word -- `grinding`, not `process_grinding` -- which is what `PROCESS_MARK` keys on.
  const verb = process(recipe.process)?.id.replace('process_', '') ?? null;
  return (
    <li className={ready ? 'recipe recipe-ready' : 'recipe'} data-recipe={recipe.id}>
      <div className="recipe-head">
        <ThingIcon
          mark={markFor(recipe)}
          label={item(recipe.outputs[0]?.item ?? '')?.kind ?? 'craft'}
          word={wordFor(recipe)}
          /* The thing it makes, so a painted plate in `src/ui/things/` replaces the category mark
             when one lands. A recipe has no plate of its own — what a player is looking for in
             this list is the object. */
          id={recipe.outputs[0]?.item ?? recipe.outputs[0]?.material ?? undefined}
        />
        <span className="recipe-name">{recipe.name}</span>
        {pin && (
          // Says what pressing it does. It read "Pinned" while pinned, which is a state and not an
          // action, and the owner pinned a recipe and could not find how to take it off.
          <button
            type="button"
            className="recipe-pin"
            aria-pressed={pin.on}
            aria-label={pin.on ? `Unpin ${recipe.name}` : `Pin ${recipe.name}`}
            onClick={pin.toggle}
          >
            {pin.on ? 'Unpin' : 'Pin'}
          </button>
        )}
        <button type="button" disabled={!ready} onClick={() => onMake(recipe.id)}>
          {ready ? 'Make' : 'Not yet'}
        </button>
      </div>
      <p className="recipe-out">
        {recipe.outputs.map((o) => nameOf(o.item ?? o.material ?? '')).join(', ')}
        {verb && (
          <span className="recipe-verb">
            {' · '}
            {/* Through `ThingIcon` rather than printing the emoji directly, so a drawn mark in
                `src/ui/marks/` replaces it. Four of the seventeen processes have one -- the
                Bronze-Age crafts Unicode never encoded -- and rendering the emoji here meant
                they could never appear. */}
            <ThingIcon
              mark={PROCESS_MARK[verb] ?? ''}
              label={verb}
              word={{ namespace: 'process', value: verb }}
            />{' '}
            {verb}
          </span>
        )}
      </p>
      {/* The reasons come from `blockedBy`, in the words it chose. Rewriting them here would be
          the panel deciding what a shortfall means -- and one of them, "needs to be done at a
          settlement", is the only place a player is ever told that. */}
      {/* Capped at three. Standing in a settlement carrying nothing lists fifteen recipes, and
          every one of them wanting four lines of "has 0" is a wall rather than a hint -- the
          player already knows they are empty-handed. The first reasons are the ones `blockedBy`
          puts first, which are the place and the tools. */}
      {ready && first.length > 0 && (
        <p className="recipe-first muted">Makes {first.join(', then ')} first.</p>
      )}
      {!ready && why.length > 0 && (
        <ul className="recipe-why">
          {why.slice(0, 3).map((w) => (
            <li key={w.text}>
              {w.text}
              {w.from && <span className="recipe-from">{w.from}</span>}
            </li>
          ))}
          {why.length > 3 && <li className="muted">…and {why.length - 3} more</li>}
        </ul>
      )}
    </li>
  );
}

/**
 * A recipe wears the mark of what it makes.
 *
 * The output rather than the process, because a player scanning this list is looking for the
 * thing they want, not the verb that produces it -- and three different processes all produce a
 * container. The verb gets its own small mark on the line below, where it answers a different
 * question: *where would I have to be*.
 */
function markFor(r: Recipe): string {
  const out = r.outputs[0];
  const made = out?.item ? item(out.item) : null;
  return made ? (KIND_MARK[made.kind] ?? '•') : '•';
}

function wordFor(r: Recipe): { namespace: 'kind'; value: string } | undefined {
  const out = r.outputs[0];
  const made = out?.item ? item(out.item) : null;
  return made ? { namespace: 'kind', value: made.kind } : undefined;
}
