// One structured answer for the dock, Goals and tomorrow's page. No UI state or scene imports.
import { hasSomethingNew, isComplete, type Progress } from '../journey';
import { type Bench, type Knows, shortfalls } from './crafting';
import { type CoachStep } from './coach';
import { nearestSeen, pointerLine } from './finding';
import { goalOf, wanting, wantedNow, stagePin } from './goals';
import { homesteadOn, stateOf, nextStage, agreed } from './homestead';
import { offeredAt } from './knowledge';
import { nameOf } from './making';
import type { Nodes } from './nodes';
import { fieldMap, poi } from './places';
import type { NearbyTraveller, Reported } from './presence';
import type { Satchel } from './satchel';
import type { SettlingRoad } from './settlingRoad';
import { whereFrom } from './sources';
import { benchAt } from './stations';
import { toolStep, toolLine } from './toolStep';
import { destination, nearestDestination, personDirection, placeDestination, type Destination, type LocationFacts } from './directions';
import type { World } from '../world/types';

export type GuidanceAction = { kind: 'workshop'; recipeId: string } | { kind: 'pin'; pin: string } | { kind: 'place'; poiId: string };
export interface Suggestion {
  id: string;
  reason: 'coach' | 'pin' | 'settlement' | 'news' | 'explore';
  line: string;
  target?: Destination | null;
  action?: GuidanceAction;
  actionLabel?: string;
  where?: string | null;
}
export interface GuidanceFacts extends LocationFacts {
  world: World;
  mapId: string;
  day: number;
  satchel: Satchel;
  bench: Bench;
  nodes: Nodes;
  flags: readonly string[];
  progress: Progress;
  knows: Knows;
  reported: readonly Reported[];
  nearby: readonly NearbyTraveller[];
  people: readonly string[];
  road: SettlingRoad | null;
}

export function recipeSuggestion(pin: string, f: GuidanceFacts): Suggestion | null {
  const goal = goalOf(pin);
  const w = goal ? wanting(goal, f.satchel, f.bench, f.flags) : null;
  if (!goal || !w) return null;
  const base: Suggestion = { id: `pin:${pin}`, reason: 'pin', line: w.name, action: { kind: 'workshop', recipeId: pin }, actionLabel: 'Open workshop' };
  if (goal.kind === 'stage' && goal.fieldMapId !== f.mapId) {
    return { ...base, line: `Continue ${w.name} on ${fieldMap(goal.fieldMapId)?.name ?? 'its map'}.`, where: 'Use Travel at the cart point.' };
  }
  const wants = wantedNow([pin], f.satchel, f.bench, f.flags);
  const source = nearestSeen(f.world, f.from, f.seen, wants, f.nodes, f.day, undefined, f.routes);
  if (source) {
    const target = destination(`source:${source.id}:${source.at.x},${source.at.y}`, source.name, source.at, f);
    return { ...base, line: `${w.name}: ${w.wants.map((x) => x.label).join(', ')}. ${source.steps === 0 ? 'Gather here.' : pointerLine(source) + '.'}`, target, where: pointerLine(source) };
  }
  if (w.wants.length > 0) {
    // A tool/prerequisite is explained by the workshop's existing rules, not a new recipe planner.
    const shorts = goal.kind === 'recipe' ? shortfalls(f.satchel, goal.id, f.bench) : [];
    const tool = shorts.find((s) => s.kind === 'tool');
    const step = tool?.kind === 'tool' ? toolStep(tool.affordance, f.satchel, f.bench, f.knows) : null;
    const raw = wants.materials[0];
    const clue = raw ? `${nameOf(raw).toLowerCase()}: ${whereFrom(raw) ?? 'explore this map'}`
      : wants.kinds.length ? `Look for ${wants.kinds[0]} on this map.`
      : step ? toolLine(step) : 'Open the workshop for the next ingredient or tool.';
    return { ...base, line: `${w.name}: ${w.wants.map((x) => x.label).join(', ')}. ${clue}`, where: clue };
  }
  if (goal.kind === 'recipe') {
    const shorts = shortfalls(f.satchel, goal.id, f.bench);
    const place = shorts.find((s) => s.kind === 'place');
    if (place) {
      const sites = f.places.filter((p) => !shortfalls(f.satchel, goal.id, benchAt(poi(p.poiId), f.mapId)).some((s) => s.kind === 'place'));
      const target = nearestDestination(sites.map((p) => placeDestination(p.poiId, f)!).filter(Boolean));
      const line = target ? `Make ${w.name} at ${target.label}. ${target.line}` : `${w.name} ${place.why}.`;
      return { ...base, line, target, where: line };
    }
    return { ...base, line: `Make ${w.name}: open the workshop.`, where: 'Ready to make here.' };
  }
  const home = homesteadOn(goal.fieldMapId);
  const state = stateOf(goal.fieldMapId, f.flags);
  const stage = home && nextStage(home, state);
  if (!stage) return { ...base, line: `${w.name} is built. You can unpin it.`, where: 'Built — open the workshop to unpin.' };
  const ground = home?.grounds.find((g) => g.id === state.ground);
  if (!ground || !agreed(ground, state)) return { ...base, line: 'Agree ground with its holder before building.', where: f.road?.next ?? null };
  if (f.road?.target?.kind === 'help') return { ...base, ...helpSuggestion(f.road.target.people, f), id: base.id, reason: 'pin' };
  const target = placeDestination(ground.at, f);
  return { ...base, line: `Raise ${w.name} at ${target?.label ?? ground.name}. ${target?.line ?? ''}`, target,
    where: target?.route === 'here' ? 'Open this place to build.' : target?.line,
    action: target?.route === 'here' ? { kind: 'place', poiId: ground.at } : base.action,
    actionLabel: target?.route === 'here' ? 'Open this place' : base.actionLabel };
}

export function newsSuggestion(id: string, f: GuidanceFacts): Suggestion {
  const person = personDirection(id, f.mapId, f.day, f.reported, f.nearby, f);
  const target = person.destination;
  const atPlace = target?.route === 'here' && !person.nearby;
  return { id: `news:${id}`, reason: 'news', line: person.line, target,
    ...(atPlace ? { action: { kind: 'place' as const, poiId: target.id.slice('place:'.length) }, actionLabel: 'Open this place' } : {}) };
}

function helpSuggestion(people: readonly string[], f: GuidanceFacts): Suggestion {
  const news = people.filter((id) => hasSomethingNew(f.progress, id)).map((id) => newsSuggestion(id, f));
  const target = nearestDestination(news.flatMap((n) => n.target ? [n.target] : []));
  const person = news.find((n) => n.target === target) ?? news[0];
  if (person) return { ...person, reason: 'settlement', line: `${f.road?.next ?? 'Help someone here.'} ${person.line}` };
  const places = f.places.filter((p) => offeredAt(p.poiId, poi(p.poiId)?.discoveries ?? []).some((id) => !isComplete(f.progress, id)));
  const place = nearestDestination(places.map((p) => placeDestination(p.poiId, f)!).filter((p) => p.route !== 'unknown'));
  return { id: 'help', reason: 'settlement', line: place ? `Look closely at ${place.label}. There is more to understand. ${place.line}` : f.road?.next ?? 'Help someone here, or look closely at a place.', target: place,
    ...(place?.route === 'here' ? { action: { kind: 'place' as const, poiId: place.id.slice(6) }, actionLabel: 'Open this place' } : {}) };
}

export function settlementSuggestion(f: GuidanceFacts): Suggestion | null {
  const next = f.road?.target;
  if (!next) return null;
  if (next.kind === 'help') return { ...helpSuggestion(next.people, f), id: 'settlement' };
  if (next.kind === 'holder') {
    const person = newsSuggestion(next.npcId, f);
    return { ...person, id: 'settlement', reason: 'settlement', line: `${f.road?.next} ${person.line}` };
  }
  if (next.kind === 'build') {
    const pin = stagePin(f.mapId);
    return { id: 'settlement', reason: 'settlement', line: f.road?.next ?? 'Pin the next building stage.', action: { kind: 'pin', pin }, actionLabel: 'Pin next stage' };
  }
  const target = placeDestination(next.poiId, f);
  return { id: 'settlement', reason: 'settlement', line: `${f.road?.next} ${target?.line ?? ''}`, target,
    ...(target?.route === 'here' ? { action: { kind: 'place' as const, poiId: next.poiId }, actionLabel: 'Open this place' } : {}) };
}

export function coachSuggestion(coach: CoachStep, f: GuidanceFacts): Suggestion {
  if (coach.id === 'uma') return { ...newsSuggestion('npc_uma', f), id: 'coach:uma', reason: 'coach' };
  const recipe = coach.id === 'knife' ? 'recipe_flint_knife' : ['rope', 'reeds'].includes(coach.id) ? 'recipe_reed_rope' : null;
  if (recipe) {
    const suggestion = recipeSuggestion(recipe, f)!;
    return { ...suggestion, id: `coach:${coach.id}`, reason: 'coach', line: coach.id === 'reeds' ? `Gather ${Math.max(0, 4 - (f.satchel.material_reed_fibre ?? 0))} more reed fibres. ${suggestion.where ?? "Look at the water’s edge."}` : suggestion.line };
  }
  return { id: `coach:${coach.id}`, reason: 'coach', line: coach.line };
}

export function explorationSuggestions(f: GuidanceFacts): Suggestion[] {
  return f.places.filter((p) => !f.seen.has(`${p.at.x},${p.at.y}`)).map((p) => {
    const target = placeDestination(p.poiId, f)!;
    return { id: `explore:${p.poiId}`, reason: 'explore', line: `You have not seen ${target.label} yet. ${target.line}`, target };
  });
}
