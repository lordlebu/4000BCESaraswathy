// What the traveller is working towards, and what it still wants.
//
// **One answer, asked by four things** (`docs/satchel-and-hearth.md`). The pinned line in the dock
// says it; the events that turn something up lean towards it (phase 6); the pointer names the
// nearest place it grows (phase 7); and the next-step line reads it (phase 8). Each of them asking
// `shortfalls` or `mayBuild` for itself would be four readings of "what is missing" that drift.
//
// **A pin is a recipe or a building stage.** The save holds one string, `pinned`, and it has always
// been a recipe id. A stage is `stage:<field map id>`, so pinning one costs no `KNOWLEDGE_VERSION`
// bump and an old save's recipe id reads exactly as it did. Which stage is next is the homestead's
// flags' answer, asked at the moment, so a pinned stage moves on by itself as each one is raised.
//
// Pure, and free of React and Phaser.

import { type Bench, shortfalls, tagCount } from './crafting';
import { carriedFor, homesteadOn, nextStage, stateOf } from './homestead';
import { type MaterialClass, material, nameOf, recipe } from './making';
import { count, type Satchel } from './satchel';

/** What `pinned` means, once read. */
export type Goal = { kind: 'recipe'; id: string } | { kind: 'stage'; fieldMapId: string };

const STAGE = 'stage:';

/** The pin for a map's next building stage. */
export function stagePin(fieldMapId: string): string {
  return `${STAGE}${fieldMapId}`;
}

/** Read a pin. An unknown recipe or a map with no homestead is null, so a stale pin shows nothing. */
export function goalOf(pinned: string | null | undefined): Goal | null {
  if (!pinned) return null;
  if (pinned.startsWith(STAGE)) {
    const fieldMapId = pinned.slice(STAGE.length);
    return homesteadOn(fieldMapId) ? { kind: 'stage', fieldMapId } : null;
  }
  return recipe(pinned) ? { kind: 'recipe', id: pinned } : null;
}

/** One thing still wanted: a material or item by id, any of a kind by tag, or (neither) a tool. */
export interface Want {
  id: string | null;
  tag: string | null;
  /** How many more are needed. */
  more: number;
  /** "2 more bamboo cane", "1 more any fibre". */
  label: string;
}

/** What a goal is called, what it still wants, and anything else in the way. */
export interface Wanting {
  name: string;
  /** Things to gather or make, short by how many. */
  wants: Want[];
  /** Everything else in the way, as words: a place to work, or "It is built". */
  other: string[];
  /** Nothing left to gather: it can be made or raised as soon as the rest allows. */
  ready: boolean;
}

function labelOf(id: string | null, tag: string | null, more: number): string {
  return `${more} more ${tag ? `any ${tag}` : nameOf(id ?? '').toLowerCase()}`;
}

/**
 * What the goal still wants from this satchel.
 *
 * A recipe answers through `shortfalls`, the same reasons the workshop prints, with the counts
 * worked out rather than parsed back out of the sentence. A stage answers from the homestead's next
 * stage and the flags, which is what `mayBuild` reads -- the hands it also needs are people, not
 * things, and the settling panel says so.
 */
export function wanting(
  goal: Goal,
  satchel: Satchel,
  bench: Bench,
  flags: readonly string[]
): Wanting | null {
  if (goal.kind === 'recipe') {
    const r = recipe(goal.id);
    if (!r) return null;
    const wants: Want[] = [];
    const other: string[] = [];
    for (const s of shortfalls(satchel, r.id, bench)) {
      if (s.kind === 'ingredient') {
        const need = r.ingredients.find((i) => (s.tag ? i.tag === s.tag : (i.material ?? i.item) === s.id));
        const have = s.tag ? tagCount(satchel, s.tag as MaterialClass) : count(satchel, s.id ?? '');
        const more = Math.max(1, (need?.count ?? 1) - have);
        wants.push({ id: s.id, tag: s.tag, more, label: labelOf(s.id, s.tag, more) });
      } else if (s.kind === 'tool') {
        // A tool is wanted like a material: until something carried can do the work, it is not
        // ready. It names no id or kind, so it asks nothing of the ground.
        wants.push({ id: null, tag: null, more: 1, label: `something that can ${s.affordance}` });
      } else {
        other.push(s.why.replace(/^needs to be done /, ''));
      }
    }
    return { name: r.name, wants, other, ready: wants.length === 0 };
  }
  const homestead = homesteadOn(goal.fieldMapId);
  if (!homestead) return null;
  const stage = nextStage(homestead, stateOf(goal.fieldMapId, flags));
  if (!stage) return { name: homestead.name, wants: [], other: ['It is built'], ready: true };
  const wants = stage.needs
    .filter((n) => carriedFor(satchel, n) < n.count)
    .map((n) => {
      const more = n.count - carriedFor(satchel, n);
      return { id: n.id, tag: n.tag, more, label: labelOf(n.id, n.tag, more) };
    });
  return { name: stage.name, wants, other: [], ready: wants.length === 0 };
}

/**
 * The raw materials a goal is short of, by id.
 *
 * What the ground can be asked for: a material wanted by id, or every material of a wanted kind. An
 * item is made rather than found, so it contributes nothing here -- the pointer and the events deal
 * in what lies on the ground.
 */
export function wantedMaterials(w: Wanting | null): string[] {
  if (!w) return [];
  const out = new Set<string>();
  for (const want of w.wants) {
    if (want.id && material(want.id)) out.add(want.id);
  }
  return [...out];
}

/** The kinds (`fibre`, `timber`) a goal is short of, for asking the ground by class. */
export function wantedKinds(w: Wanting | null): string[] {
  return w ? [...new Set(w.wants.map((x) => x.tag).filter((t): t is string => t !== null))] : [];
}

/**
 * Everything the traveller is working towards at once, as the events that turn something up read
 * it: the pin, and the next building stage on this map whether or not it is pinned -- the owner
 * asked for events to nudge towards "material I have pinned or missions", and a homestead's stage is
 * this game's mission.
 */
export function wantedNow(
  pins: readonly (string | null)[],
  satchel: Satchel,
  bench: Bench,
  flags: readonly string[]
): { materials: string[]; kinds: string[] } {
  const all = pins
    .map((p) => goalOf(p))
    .filter((g): g is Goal => g !== null)
    .map((g) => wanting(g, satchel, bench, flags));
  return {
    materials: [...new Set(all.flatMap((w) => wantedMaterials(w)))],
    kinds: [...new Set(all.flatMap((w) => wantedKinds(w)))]
  };
}
