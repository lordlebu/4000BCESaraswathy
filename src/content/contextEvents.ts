import { canAdvance, canEnter, entryFor, rungOf, type Progress } from '../journey';
import { discovery } from './knowledge';
import { poi, type SubLocation } from './places';
import { anyConditions, type GameEvent } from './events';

const VERB: Record<string, string> = {
  archaeology: 'Examine', geography: 'Trace', botany: 'Study', zoology: 'Observe',
  evolution: 'Compare', linguistics: 'Read', anomalies: 'Inspect'
};

export function discoveryEvent(progress: Progress, id: string, poiId: string): GameEvent | null {
  const d = discovery(id);
  const place = poi(poiId);
  if (!d || !canAdvance(progress, id)) return null;
  const next = d.rungs[rungOf(progress, id) + 1];
  if (!next) return null;
  return {
    id: `discovery_event:${id}:${rungOf(progress, id) + 1}`,
    origin: 'discovery', subjectId: id, title: d.name, occasion: 'arriving',
    conditions: anyConditions(),
    prose: next.prompt ?? entryFor(progress, id) ?? place?.arrival ?? place?.description ?? `You begin with what ${d.discipline} can show you here.`,
    art: id,
    artCandidates: [
      { collection: 'events', key: id },
      ...(place ? [{ collection: 'places' as const, key: place.id }, { collection: 'places' as const, key: `kind-${place.kind}` }] : [])
    ],
    choices: [{ id: 'examine', label: VERB[d.discipline] ?? 'Examine', needs: [], line: next.entry, grants: [] }],
    once: true
  };
}

export function subLocationEvent(progress: Progress, poiId: string, sub: SubLocation): GameEvent | null {
  const place = poi(poiId);
  if (!canEnter(progress, poiId, sub.id)) return null;
  return {
    id: `sub_location_event:${poiId}:${sub.id}`,
    origin: 'sub-location', subjectId: sub.id, title: sub.name, occasion: 'arriving',
    conditions: anyConditions(), prose: sub.description,
    art: `${poiId}-${sub.id}`, artFallback: poiId,
    artCandidates: [
      { collection: 'events', key: `${poiId}-${sub.id}` },
      { collection: 'places', key: poiId },
      ...(place ? [{ collection: 'places' as const, key: `kind-${place.kind}` }] : [])
    ],
    choices: [{ id: 'enter', label: 'Go in', needs: [], line: sub.arrival ?? `You enter ${sub.name}.`, grants: [] }],
    once: true
  };
}

export function parentDiscoveries(poiId: string): string[] {
  const place = poi(poiId);
  if (!place) return [];
  const nested = new Set(place.subLocations.flatMap((sub) => sub.discoveries));
  return place.discoveries.filter((id) => !nested.has(id));
}
