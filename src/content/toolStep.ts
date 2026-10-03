// Which tool to make, when a recipe needs one.
//
// **Why this exists.** Measured on 3 October 2026, a traveller with plenty of every raw thing a map
// gives was blocked on 43 to 48 of the 70-odd recipes they know by a tool -- something that can cut,
// contain, work or burn -- and the workshop's answer was `sources.sourceOf`, which names every tool
// that would do and how the first untaught one is made. It never looked at the satchel, the bench
// or what the player knows, so it could point at a bow drill while a flint knife was one press away,
// and it never said "you can make this now". The owner asked about crafting more than once before
// the whole system was audited; this is the part of that audit a player reads.
//
// So this answers one question per missing affordance: **the best tool to make next, and whether
// it can be made here and now.** Ready beats nearly ready beats far, and when the best tool needs a
// tool of its own, that one is named too -- one level, because a longer chain is a pin's job.
//
// Pure, and free of React and Phaser, like the rest of `content/`.

import { type Affordance, items, nameOf, recipesMaking } from './making';
import { type Bench, type Knows, type Shortfall, canMake, shortfalls } from './crafting';
import { plan } from './making-chain';
import { type Satchel } from './satchel';

export interface ToolStep {
  /** What the recipe that asked needs done. */
  affordance: string;
  /** The recipe that makes the tool. */
  recipeId: string;
  /** The tool itself. */
  item: string;
  /** Whether it can be made here, now -- directly, or by making its parts first. */
  ready: boolean;
  /** The first thing in its way when it cannot, in `shortfalls`' words. */
  short: Shortfall | null;
  /** When the tool needs a tool of its own first, that tool's step. */
  first: ToolStep | null;
}

/** How far a tool recipe is from being made: 0 is ready, and a missing tool counts double. */
function distance(satchel: Satchel, recipeId: string, bench: Bench, knows: Knows): number {
  if (canMake(satchel, recipeId, bench)) return 0;
  const run = plan(satchel, recipeId, bench, knows);
  if (run.blocked === null && run.steps.length > 0) return 0;
  return shortfalls(satchel, recipeId, bench).reduce((n, s) => n + (s.kind === 'tool' ? 2 : 1), 0);
}

/**
 * The tool to make for `affordance`, or null when nothing the player knows makes one.
 *
 * Only recipes the player knows are offered: a tool somebody would have to teach is the workshop's
 * "Somebody could show you" list, not a next step.
 */
export function toolStep(
  affordance: Affordance | string,
  satchel: Satchel,
  bench: Bench,
  knows: Knows,
  depth = 0
): ToolStep | null {
  let best: { recipeId: string; item: string; d: number } | null = null;
  for (const it of items) {
    if (!it.affords.includes(affordance as Affordance)) continue;
    for (const r of recipesMaking(it.id)) {
      if (!knows(r.id)) continue;
      const d = distance(satchel, r.id, bench, knows);
      if (!best || d < best.d) best = { recipeId: r.id, item: it.id, d };
    }
  }
  if (!best) return null;
  const ready = best.d === 0;
  const short = ready ? null : (shortfalls(satchel, best.recipeId, bench)[0] ?? null);
  const toolShort = ready ? null : shortfalls(satchel, best.recipeId, bench).find((s) => s.kind === 'tool');
  const first =
    toolShort && toolShort.kind === 'tool' && depth < 1 && toolShort.affordance !== affordance
      ? toolStep(toolShort.affordance, satchel, bench, knows, depth + 1)
      : null;
  return { affordance, recipeId: best.recipeId, item: best.item, ready, short, first };
}

/** "a flint knife", "an oil lamp". */
function a(id: string): string {
  const noun = nameOf(id).toLowerCase();
  return `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;
}

/**
 * The step said in one line, for the workshop's reason row.
 *
 * "make a flint knife -- you can, here and now"; "a stone adze, which first needs something that
 * can cut: a flint knife, which you can make now"; "a cooking pot -- needs 1 Grog, has 0".
 */
export function toolLine(step: ToolStep): string {
  if (step.ready) return `make ${a(step.item)} -- you can, here and now`;
  if (step.first) {
    const then = step.first.ready ? ', which you can make now' : '';
    return `${a(step.item)}, which first needs something that can ${step.first.affordance}: ${a(step.first.item)}${then}`;
  }
  return step.short ? `${a(step.item)} -- ${step.short.why}` : a(step.item);
}

/**
 * The recipe a button on that line should act on: the deepest one that is ready to make, or else
 * the tool itself, to pin.
 */
export function toolAction(step: ToolStep): { recipeId: string; ready: boolean } {
  if (step.ready) return { recipeId: step.recipeId, ready: true };
  if (step.first?.ready) return { recipeId: step.first.recipeId, ready: true };
  return { recipeId: step.recipeId, ready: false };
}
