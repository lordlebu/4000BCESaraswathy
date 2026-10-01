// The one recipe the traveller is working towards, and what it still wants.
//
// **Why.** Crafting stalled in the first play-through partly because a recipe's needs lived only in
// the workshop: a player gathering reeds out on the delta could not see that the rope wanted four
// and they had two, or that it wanted a tool at all. Survival and crafting games settled this long
// ago -- Subnautica and Valheim both pin one recipe to the screen and tick its needs off as you
// gather -- and this is that, at the size of one line.
//
// **A readout, never a control.** The dock's rows are measured to the pixel (see `StandingRow`): a
// chip that can be pressed owes the 44-pixel tap floor and pushed the standing row's third chip out
// of the dock at peek. So pinning and unpinning live in the workshop, and this only says.
//
// Presentation only: `crafting.shortfalls` decides what is missing.

import { type Bench, shortfalls } from '../content/crafting';
import { recipe } from '../content/making';
import type { Satchel } from '../content/satchel';

export interface PinnedRecipeProps {
  recipeId: string | null;
  satchel: Satchel;
  bench: Bench;
}

/** "4 Reed fibre, has 2" -> "2 more reed fibre"; a tool -> "something that can work". */
function shortWord(why: string): string {
  const needs = /^needs (\d+) (.+), has (\d+)$/.exec(why);
  if (needs) return `${Number(needs[1]) - Number(needs[3])} more ${needs[2]!.toLowerCase()}`;
  return why.replace(/^needs (to be done at )?/, '');
}

export function PinnedRecipe({ recipeId, satchel, bench }: PinnedRecipeProps) {
  const r = recipeId ? recipe(recipeId) : null;
  if (!r) return null;
  const short = shortfalls(satchel, r.id, bench);
  // Being somewhere else is not something to gather, so ready-but-not-here still reads as ready.
  const missing = short.filter((s) => s.kind !== 'place');
  const line =
    missing.length === 0
      ? short.length === 0
        ? 'ready to make'
        : `ready, ${shortWord(short[0]!.why)}`
      : missing.map((s) => shortWord(s.why)).join(' · ');
  return (
    <p className="pinned-recipe" data-ready={missing.length === 0} aria-label="Working towards">
      <span className="pinned-name">{r.name}</span>
      <span className="pinned-needs">{line}</span>
    </p>
  );
}
