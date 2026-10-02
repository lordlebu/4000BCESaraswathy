// What to do next, and where: the pinned line's pointer, what the events lean towards, the next
// step when nothing is pinned, and the diary's Goals (`docs/satchel-and-hearth.md`, phases 6 to 8).
//
// **The fourth hook out of `App.tsx`**, and the first written for new rules rather than moved: the
// plan put each split just before the features that would land in it, so the guidance went in here
// rather than growing the file. Every rule is in `content/` -- `goals.ts`, `finding.ts`, `guide.ts`
// -- and this only gathers the facts they need from what App holds.

import { useEffect, useMemo, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { EventBus } from '../game/EventBus';
import { hasSomethingNew, type Progress } from '../journey';
import type { Bench } from '../content/crafting';
import { nearestSeen, pointerLine } from '../content/finding';
import { goalOf, stagePin, wanting, wantedNow } from '../content/goals';
import { nextStep } from '../content/guide';
import { agreed as groundAgreed, homesteadOn, nextStage, stateOf as homesteadState } from '../content/homestead';
import { nameOf } from '../content/making';
import type { Nodes } from '../content/nodes';
import { npc, poi } from '../content/places';
import type { Satchel } from '../content/satchel';
import { whereFrom } from '../content/sources';
import type { World } from '../world/types';
import type { GoalRow } from './GoalsSection';
import type { Latest } from './useHappenings';

export function useGuidance({
  world,
  arrival,
  pinned,
  setPinned,
  satchel,
  bench,
  nodes,
  homeTick,
  journeyFlags,
  discovered,
  fieldPlaced,
  latest,
  fieldMapId,
  hints,
  coach,
  peopleOfMap,
  progress,
  road,
  surface
}: {
  world: World | null;
  arrival: { at: { x: number; y: number }; day: number } | null;
  pinned: string | null;
  setPinned: Dispatch<SetStateAction<string | null>>;
  satchel: Satchel;
  bench: Bench;
  nodes: Nodes;
  /** Bumped whenever the homestead's flags move. */
  homeTick: number;
  journeyFlags: MutableRefObject<string[]>;
  /** The tiles the scene has revealed, as "x,y". */
  discovered: MutableRefObject<string[]>;
  fieldPlaced: MutableRefObject<{ poiId: string; at: { x: number; y: number } }[]>;
  latest: MutableRefObject<Latest>;
  fieldMapId: string;
  hints: boolean;
  /** The first morning's line while it lasts: the guide waits until it is gone. */
  coach: unknown;
  peopleOfMap: readonly string[];
  progress: Progress;
  road: { next: string | null } | null;
  /** Which surface is showing, so the Goals are fresh when the diary opens. */
  surface: string | null;
}) {
  /**
   * Where the nearest of what the pin wants lies, among the ground already seen -- or, if none has
   * been, where to look. Asked each step, because a step is what changes it. `content/finding.ts`.
   */
  const finding = useMemo(() => {
    void homeTick;
    if (!world || !arrival || !pinned) return null;
    const want = wantedNow([pinned], satchel, bench, journeyFlags.current);
    if (want.materials.length + want.kinds.length === 0) return null;
    const pointer = nearestSeen(world, arrival.at, new Set(discovered.current), want, nodes, arrival.day);
    if (pointer) return { at: pointer.at, where: pointerLine(pointer) };
    const first = want.materials[0];
    const lookIn = first ? whereFrom(first) : `any ${want.kinds[0]}`;
    return { at: null, where: lookIn ? `${first ? nameOf(first).toLowerCase() : 'it'}: ${lookIn}` : null };
  }, [world, arrival, pinned, satchel, bench, nodes, homeTick]);
  const markAt = finding?.at ? `${finding.at.x},${finding.at.y}` : '';
  useEffect(() => {
    EventBus.emitEvent('source-mark', { at: finding?.at ?? null });
    // Keyed on the tile, not the object, so a step that finds the same tile sends nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markAt]);

  // What the traveller is working towards -- the pin, and this map's next building stage -- for the
  // events that turn something up to lean towards. See `pickFor` in `happenings.ts`.
  useEffect(() => {
    const want = wantedNow([pinned, stagePin(fieldMapId)], satchel, bench, journeyFlags.current);
    latest.current.wanted = { ...want, carried: satchel };
  }, [pinned, fieldMapId, satchel, bench, homeTick]);

  /**
   * The next step once the first morning is over and nothing is pinned: the building, somebody with
   * news, a place not yet seen. Off with the hints, like the coach. See `content/guide.ts`.
   */
  const guide = useMemo(() => {
    void homeTick;
    if (!hints || coach !== null || pinned || !arrival) return null;
    const homestead = homesteadOn(fieldMapId);
    const state = homesteadState(fieldMapId, journeyFlags.current);
    const ground = homestead?.grounds.find((g) => g.id === state.ground);
    const stage = homestead && ground && groundAgreed(ground, state) ? nextStage(homestead, state) : null;
    const newsFrom = peopleOfMap.find((id) => hasSomethingNew(progress, id));
    const seen = new Set(discovered.current);
    const step = nextStep({
      road: road?.next ?? null,
      stage: stage ? { pin: stagePin(fieldMapId), name: stage.name } : null,
      news: newsFrom ? { name: npc(newsFrom)?.name ?? 'Somebody' } : null,
      at: arrival.at,
      unseen: fieldPlaced.current
        .filter((p) => !seen.has(`${p.at.x},${p.at.y}`))
        .map((p) => ({ name: poi(p.poiId)?.name ?? 'a place', at: p.at }))
    });
    if (!step) return null;
    const action = step.action;
    return {
      line: step.line,
      action: action ? { label: action.label, onDo: () => setPinned(action.pin) } : null
    };
  }, [hints, coach, pinned, arrival, fieldMapId, homeTick, peopleOfMap, progress, road]);

  /** Everything that could be worked towards, for the diary's Goals. See `GoalsSection`. */
  const goalRows = useMemo<GoalRow[]>(() => {
    void homeTick;
    const rows: GoalRow[] = [];
    const toggle = (pin: string) => () => setPinned((p) => (p === pin ? null : pin));
    const pinnedGoal = goalOf(pinned);
    const pinnedWants = pinnedGoal ? wanting(pinnedGoal, satchel, bench, journeyFlags.current) : null;
    if (pinned && pinnedWants) {
      rows.push({ id: 'pinned', line: `Working towards ${pinnedWants.name}.`, pin: { on: true, label: pinnedWants.name, toggle: toggle(pinned) } });
    }
    const homestead = homesteadOn(fieldMapId);
    const state = homesteadState(fieldMapId, journeyFlags.current);
    const ground = homestead?.grounds.find((g) => g.id === state.ground);
    const stage = homestead && ground && groundAgreed(ground, state) ? nextStage(homestead, state) : null;
    const pin = stagePin(fieldMapId);
    if (stage && pinned !== pin) rows.push({ id: 'stage', line: `${stage.name}, at ${ground!.name}.`, pin: { on: false, label: stage.name, toggle: toggle(pin) } });
    else if (!stage && road?.next) rows.push({ id: 'road', line: road.next });
    for (const id of peopleOfMap.filter((who) => hasSomethingNew(progress, who))) {
      rows.push({ id: `news:${id}`, line: `${npc(id)?.name ?? 'Somebody'} has something new to tell you.` });
    }
    const seen = new Set(discovered.current);
    const unseen = fieldPlaced.current.filter((p) => !seen.has(`${p.at.x},${p.at.y}`)).map((p) => poi(p.poiId)?.name ?? 'a place');
    if (unseen.length > 0) rows.push({ id: 'unseen', line: `Not yet seen: ${unseen.join(', ')}.` });
    return rows;
  }, [pinned, satchel, bench, fieldMapId, homeTick, road, peopleOfMap, progress, surface]);


  return { finding, guide, goalRows };
}
