import type { Point } from '../world/types';

export interface EncounterState {
  map: string;
  arrival: Point;
  leftArrival: boolean;
  roadDay?: number;
  pending: PendingSighting[];
}

export type PendingSighting =
  | { kind: 'wagon'; id: string; vehicle: string; at: Point }
  | { kind: 'caravan'; id: string; moment: 'arrival' | 'departure' }
  | { kind: 'beedu' | 'approach'; id: string }
  | { kind: 'camp'; id: string; at: Point; day: number }
  | { kind: 'place'; id: string; at: Point; returning: boolean };

export function readEncounters(value: unknown): EncounterState | undefined {
  if (!value || typeof value !== 'object') return;
  const state = value as Partial<EncounterState>;
  const point = (p: Point | undefined) => p && Number.isInteger(p.x) && Number.isInteger(p.y);
  if (typeof state.map !== 'string' || !point(state.arrival) || typeof state.leftArrival !== 'boolean' ||
      !Array.isArray(state.pending)) return;
  const pending = state.pending.filter((item) => item && typeof item.id === 'string' &&
    (item.kind === 'beedu' || item.kind === 'approach' ||
     (item.kind === 'caravan' && (item.moment === 'arrival' || item.moment === 'departure')) ||
     (item.kind === 'wagon' && typeof item.vehicle === 'string' && point(item.at)) ||
     (item.kind === 'camp' && point(item.at) && Number.isInteger(item.day)) ||
     (item.kind === 'place' && point(item.at) && typeof item.returning === 'boolean')));
  return { map: state.map, arrival: state.arrival!, leftArrival: state.leftArrival, roadDay: Number.isInteger(state.roadDay) ? state.roadDay : undefined, pending };
}

export function hasLeftArrival(arrival: Point, at: Point): boolean {
  return Math.max(Math.abs(at.x - arrival.x), Math.abs(at.y - arrival.y)) >= 3;
}
