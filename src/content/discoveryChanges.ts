// Feedback reads completed knowledge transitions; it never advances progression itself.
import { entryFor, isComplete, rungOf, type Progress } from '../journey';
import { discoveries } from './knowledge';

export interface DiscoveryChange {
  id: string;
  name: string;
  rung: number;
  kind: 'noticed' | 'deepened' | 'understood';
  entry: string;
}

/** Authored order, current entries only. Existing saves are baselines supplied by the caller. */
export function discoveryChanges(before: Progress, after: Progress): DiscoveryChange[] {
  return discoveries.flatMap((d) => {
    const rung = Math.min(rungOf(after, d.id), d.rungs.length - 1);
    const previous = Math.min(rungOf(before, d.id), d.rungs.length - 1);
    const entry = entryFor(after, d.id);
    if (rung < 0 || rung <= previous || entry === null) return [];
    return [{ id: d.id, name: d.name, rung, entry,
      kind: isComplete(after, d.id) ? 'understood' : previous < 0 ? 'noticed' : 'deepened' }];
  });
}

/** Repeated changes replace the pending entry, rather than queuing obsolete readings. */
export function queueDiscoveryChanges(
  pending: readonly DiscoveryChange[], incoming: readonly DiscoveryChange[]
): DiscoveryChange[] {
  const byId = new Map(pending.map((change) => [change.id, change]));
  for (const change of incoming) byId.set(change.id, change);
  return discoveries.flatMap((d) => {
    const change = byId.get(d.id);
    return change ? [change] : [];
  });
}
