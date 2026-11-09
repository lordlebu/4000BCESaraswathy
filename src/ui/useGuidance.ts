// Gather live facts once; all gameplay decisions live in content/actionable.ts.
import { useEffect, useMemo, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { EventBus } from '../game/EventBus';
import { canStepOnto, routeCost, shallowsOf } from '../game/afloat';
import { routeDistances, pointKey } from '../world/pathfind';
import { hasSomethingNew, type Progress } from '../journey';
import type { Bench, Knows } from '../content/crafting';
import type { CoachStep } from '../content/coach';
import { goalOf, stagePin, wantedNow } from '../content/goals';
import type { Nodes } from '../content/nodes';
import type { Satchel } from '../content/satchel';
import type { SettlingRoad } from '../content/settlingRoad';
import type { NearbyTraveller, Reported } from '../content/presence';
import { nextStep } from '../content/guide';
import { markerFor } from '../content/directions';
import { recipeSuggestion, coachSuggestion, newsSuggestion, settlementSuggestion, explorationSuggestions, type Suggestion, type GuidanceFacts } from '../content/actionable';
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
  navigation,
  seenRevision,
  reported,
  nearby,
  knows,
  onWorkshop,
  onPlace,
  onReveal
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
  coach: CoachStep | null;
  peopleOfMap: readonly string[];
  progress: Progress;
  road: SettlingRoad | null;
  navigation: { boat: boolean; afloat: boolean };
  seenRevision: number;
  reported: readonly Reported[];
  nearby: readonly NearbyTraveller[];
  knows: Knows;
  onWorkshop: (recipeId: string) => void;
  onPlace: (poiId: string) => void;
  onReveal: () => void;
}) {
  const [selection, setSelection] = useState<{ world: World; pin: string | null; id: string | null } | null>(null);
  const seen = useMemo(() => new Set(discovered.current), [world, seenRevision]);
  const shallow = useMemo(() => world ? shallowsOf(world) : new Set(), [world]);
  const x = arrival?.at.x, y = arrival?.at.y;
  const routes = useMemo(() => world && x !== undefined && y !== undefined
    ? routeDistances(world.tiles, world.width, world.height, { x, y },
      (tile) => seen.has(pointKey(tile)) && canStepOnto(tile, navigation.boat, shallow.has(tile)),
      (tile) => routeCost(tile, navigation.boat, navigation.afloat, shallow.has(tile))) : new Map(),
    [world, x, y, seen, shallow, navigation.boat, navigation.afloat]);
  const facts: GuidanceFacts | null = world && arrival ? {
    world, mapId: fieldMapId, from: arrival.at, day: arrival.day, seen, routes,
    places: fieldPlaced.current, satchel, bench, nodes, flags: journeyFlags.current,
    progress, knows, reported, nearby, people: peopleOfMap, road
  } : null;
  // The expensive grid search above is shared; these only inspect candidate indexes and rules.
  const pinnedSuggestion = facts && pinned ? recipeSuggestion(pinned, facts) : null;
  const coaching = facts && coach ? coachSuggestion(coach, facts) : null;
  const settling = facts ? settlementSuggestion(facts) : null;
  const news = facts ? peopleOfMap.filter((id) => hasSomethingNew(progress, id)).map((id) => newsSuggestion(id, facts)) : [];
  const exploration = facts ? explorationSuggestions(facts) : [];
  const automatic = settling ?? news[0] ?? exploration[0] ?? null;
  const visibleCoach = hints ? coaching : null;
  const active = nextStep({ coach: visibleCoach, pinned: pinnedSuggestion, automatic: hints ? automatic : null });
  const suggestions = [coaching, pinnedSuggestion, settling, ...news, ...exploration].filter((s): s is Suggestion => s !== null);
  const selected = selection?.world === world && selection.pin === pinned ? selection.id : null;
  const automaticMarker = !visibleCoach && pinnedSuggestion?.target?.id.startsWith('source:') ? pinnedSuggestion.target : null;
  const marker = markerFor(selected, suggestions, automaticMarker);
  const markKey = marker ? `${marker.id}:${pointKey(marker.at)}` : '';
  useEffect(() => {
    EventBus.emitEvent('source-mark', { at: marker?.at ?? null, id: marker?.id, label: marker?.label });
  }, [world, markKey]);
  // Once invalidated, a deliberate choice cannot spring back on a later day as a phantom marker.
  useEffect(() => {
    if (selected && selected !== 'hidden' && !marker) setSelection(world ? { world, pin: pinned, id: 'hidden' } : null);
  }, [world, pinned, selected, markKey]);

  useEffect(() => {
    const want = wantedNow([pinned, stagePin(fieldMapId)], satchel, bench, journeyFlags.current);
    latest.current.wanted = { ...want, carried: satchel };
  }, [pinned, fieldMapId, satchel, bench, homeTick]);

  const markerAction = (s: Suggestion) => {
    if (!world || !s.target || s.target.knowledge !== 'known' || s.target.route !== 'reachable') return null;
    const marked = marker?.id === s.target.id;
    return { label: marked ? 'Hide marker' : 'Show me', onDo: () => {
      setSelection({ world, pin: pinned, id: marked ? 'hidden' : s.id });
      if (!marked) onReveal();
    } };
  };
  const directAction = (s: Suggestion) => !s.action ? null : {
    label: s.actionLabel ?? 'Open',
    onDo: () => {
      const a = s.action!;
      if (a.kind === 'pin') setPinned(a.pin);
      else if (a.kind === 'workshop') onWorkshop(a.recipeId);
      else onPlace(a.poiId);
    }
  };
  const present = (s: Suggestion | null) => s ? { line: s.line, action: markerAction(s) ?? directAction(s) } : null;
  const guide = !visibleCoach && !pinnedSuggestion && hints ? present(automatic) : null;
  const goalRows: GoalRow[] = suggestions.map((s) => ({
    id: s.id, line: s.line, action: markerAction(s) ?? directAction(s),
    ...(s.reason === 'pin' && pinned ? { pin: { on: true, label: goalOf(pinned)?.kind === 'stage' ? 'building stage' : 'recipe', toggle: () => setPinned(null) } } : {})
  }));
  return {
    finding: pinnedSuggestion ? { at: pinnedSuggestion.target?.at ?? null, where: pinnedSuggestion.where ?? pinnedSuggestion.line } : null,
    guide, goalRows, coachGuide: present(visibleCoach), pinAction: pinnedSuggestion ? markerAction(pinnedSuggestion) : null,
    nextLine: active?.line ?? null
  };
}
