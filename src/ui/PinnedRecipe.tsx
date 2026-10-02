// The one thing the traveller is working towards, and what it still wants.
//
// **Why.** Crafting stalled in the first play-through partly because a recipe's needs lived only in
// the workshop: a player gathering reeds out on the delta could not see that the rope wanted four
// and they had two, or that it wanted a tool at all. Survival and crafting games settled this long
// ago -- Subnautica and Valheim both pin one recipe to the screen and tick its needs off as you
// gather -- and this is that, at the size of one line.
//
// **A control since 2 October 2026** (`docs/satchel-and-hearth.md`, phase 2). It was a readout, kept
// out of the tap floor so the dock's rows stayed inside their measured height -- and the owner then
// pinned a recipe and could not find how to unpin it. Tapping the line opens the workshop at that
// recipe, where its button reads Unpin. It owes the 44-pixel floor like any control, and
// `e2e/standing.spec.ts` holds the standing row on screen beside it at four device sizes.
//
// It can hold a building stage as well as a recipe: `content/goals.ts` reads the pin and decides
// what is missing, so this and everything else that asks cannot disagree.

import type { Bench } from '../content/crafting';
import { goalOf, wanting } from '../content/goals';
import type { Satchel } from '../content/satchel';

export interface PinnedRecipeProps {
  /** The pin: a recipe id, or a building stage's `stage:<map>`. */
  recipeId: string | null;
  satchel: Satchel;
  bench: Bench;
  /** The journey's flags, for which building stage is next. */
  flags?: readonly string[];
  /** Open the workshop at the pinned recipe. Absent: the line is a readout. */
  onOpen?: () => void;
  /**
   * Where the nearest thing it wants is: "bamboo cane, 12 steps north-east" among the ground already
   * seen, or where to look when none has been ("in forest or river"). See `content/finding.ts`.
   */
  where?: string | null;
}

export function PinnedRecipe({ recipeId, satchel, bench, flags = [], onOpen, where = null }: PinnedRecipeProps) {
  const goal = goalOf(recipeId);
  const w = goal ? wanting(goal, satchel, bench, flags) : null;
  if (!goal || !w) return null;
  // Being somewhere else is not something to gather, so ready-but-not-here still reads as ready.
  const verb = goal.kind === 'stage' ? 'raise' : 'make';
  const line =
    w.wants.length === 0
      ? w.other.length === 0
        ? `ready to ${verb}`
        : `ready, ${w.other[0]}`
      : w.wants.map((x) => x.label).join(' · ');
  const ready = w.wants.length === 0;
  const body = (
    <>
      <span className="pinned-name">{w.name}</span>
      <span className="pinned-needs">{line}</span>
      {where && !ready && <span className="pinned-where">{where}</span>}
    </>
  );
  return onOpen ? (
    <button
      type="button"
      className="pinned-recipe"
      data-ready={ready}
      aria-label={`Working towards ${w.name}: ${line}${where && !ready ? `; ${where}` : ''}. Open it to change or unpin.`}
      onClick={onOpen}
    >
      {body}
    </button>
  ) : (
    <p className="pinned-recipe" data-ready={ready} aria-label="Working towards">
      {body}
    </p>
  );
}
