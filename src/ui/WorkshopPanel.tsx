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

import { type Recipe, item, nameOf, process } from '../content/making';
import type { Step } from '../content/making-chain';
import {
  type Bench,
  type Knows,
  blockedBy,
  makeableNow,
  offeredHere,
  withinReach
} from '../content/crafting';
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
  open,
  onClose
}: WorkshopPanelProps) {
  if (!open) return null;

  // Shown or not shown. `atStation` is identity when nothing is selected, so the unfiltered
  // workshop is exactly the code path it always was rather than a special case.
  const atStation = (r: Recipe) => station === null || station.processes.includes(r.process);

  const everythingReady = makeableNow(satchel, bench, knows).filter(atStation);
  const near = withinReach(satchel, bench, knows).filter(atStation);
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
                <Makeable key={r.id} recipe={r} ready why={[]} onMake={onMake} />
              ))}
            </ul>
          </section>
        )}

        {ready.length > 0 && (
          <section className="diary-section">
            <h3>Ready</h3>
            <ul className="recipes">
              {ready.map((r) => (
                <Makeable key={r.id} recipe={r} ready why={[]} onMake={onMake} />
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
                  why={blockedBy(satchel, r.id, bench)}
                  onMake={onMake}
                />
              ))}
            </ul>
          </section>
        )}

        {ready.length === 0 && near.length === 0 && food.length === 0 && (
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
  onMake
}: {
  recipe: Recipe;
  ready: boolean;
  why: string[];
  onMake: (id: string) => void;
}) {
  // The bare word -- `grinding`, not `process_grinding` -- which is what `PROCESS_MARK` keys on.
  const verb = process(recipe.process)?.id.replace('process_', '') ?? null;
  return (
    <li className={ready ? 'recipe recipe-ready' : 'recipe'}>
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
      {!ready && why.length > 0 && (
        <ul className="recipe-why">
          {why.slice(0, 3).map((w) => (
            <li key={w}>{w}</li>
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
