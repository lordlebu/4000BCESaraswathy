// Actionable destinations. All locations and routes are supplied facts, never a second clock.
import { bearingTo } from './journal';
import { fieldMap, npc, poi } from './places';
import { whoIsHere, type Reported } from './presence';
import { travellersOn } from './travellers';
import { pointKey, type DistanceMap } from '../world/pathfind';
import type { Point } from '../world/types';

export interface Destination {
  id: string;
  label: string;
  at: Point;
  knowledge: 'known' | 'unexplored';
  route: 'here' | 'reachable' | 'unknown';
  steps: number | null;
  cost: number | null;
  line: string;
}
export interface LocationFacts {
  from: Point;
  seen: ReadonlySet<string>;
  routes: DistanceMap;
  places: readonly { poiId: string; at: Point }[];
}

export function destination(id: string, label: string, at: Point, f: LocationFacts): Destination {
  const known = f.seen.has(pointKey(at));
  const route = known ? f.routes.get(pointKey(at)) : undefined;
  const here = known && pointKey(at) === pointKey(f.from);
  return {
    id, label, at, knowledge: known ? 'known' : 'unexplored',
    route: here ? 'here' : route ? 'reachable' : 'unknown',
    steps: route?.steps ?? null, cost: route?.cost ?? null,
    line: here ? 'You are here.' : !known ? `It lies ${bearingTo(f.from, at)}.`
      : route ? `${route.steps} step${route.steps === 1 ? '' : 's'} away, ${bearingTo(f.from, at)}.`
      : 'No known route yet.'
  };
}
export function placeDestination(id: string, f: LocationFacts): Destination | null {
  const placed = f.places.find((p) => p.poiId === id);
  return placed ? destination(`place:${id}`, poi(id)?.name ?? 'this place', placed.at, f) : null;
}

/** Lower cost first, reachable before unknown; unknown places use stable IDs, never secret distances. */
export function nearestDestination(destinations: readonly Destination[]): Destination | null {
  return [...destinations].sort((a, b) =>
    (a.cost ?? Infinity) - (b.cost ?? Infinity) || (a.steps ?? Infinity) - (b.steps ?? Infinity) ||
    a.id.localeCompare(b.id))[0] ?? null;
}

export interface PersonDirection {
  line: string;
  destination: Destination | null;
  nearby: boolean;
}
export function personDirection(
  id: string, mapId: string, day: number, reported: readonly Reported[],
  nearby: readonly { npcId: string | null }[], f: LocationFacts
): PersonDirection {
  const name = npc(id)?.name ?? 'This person';
  if (nearby.some((p) => p.npcId === id)) {
    return { line: `${name} is nearby. Use the talk control to call them over.`, destination: null, nearby: true };
  }
  const walking = travellersOn(mapId).some((t) => t.npcId === id);
  const report = reported.find((p) => p.npcId === id);
  if (walking && !report) return { line: `${name} has something to tell you. Their whereabouts are not known yet.`, destination: null, nearby: false };
  if (report && !report.state.resting) {
    const to = report.state.boundFor;
    const target = to ? placeDestination(to, f) : null;
    return {
      line: target ? `${name} is travelling towards ${target.label}. Meet them there. ${target.line}` : `${name} is on the road.`,
      destination: target, nearby: false
    };
  }
  const place = (fieldMap(mapId)?.pointsOfInterest ?? []).find((p) => whoIsHere(p, mapId, day, reported).here.some((n) => n.id === id));
  const target = place ? placeDestination(place, f) : null;
  return { line: target ? `Talk to ${name} at ${target.label}. ${target.line}` : `Look for ${name} on this map.`, destination: target, nearby: false };
}

/** One marker, chosen by a stable suggestion id rather than a stale coordinate. */
export function markerFor(
  selected: string | null, suggestions: readonly { id: string; target?: Destination | null }[],
  automatic: Destination | null
): Destination | null {
  const target = selected === null ? automatic : suggestions.find((s) => s.id === selected)?.target;
  return target?.knowledge === 'known' && target.route === 'reachable' ? target : null;
}
