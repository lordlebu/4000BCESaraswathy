// Session feedback shared by all Progress producers. App supplies shared progress and interruption state.
import { useEffect, useRef, useState } from 'react';
import type { Progress } from '../journey';
import { discoveryChanges, queueDiscoveryChanges, type DiscoveryChange } from '../content/discoveryChanges';

/** journeyKey identifies a journey instance (including same-seed replacement), not a field map. */
export function useDiscoveryNotices(progress: Progress, journeyKey: string, blocked: boolean) {
  const previous = useRef({ progress, journeyKey });
  const [state, setState] = useState<{ journeyKey: string; pending: DiscoveryChange[] }>(() => ({ journeyKey, pending: [] }));
  useEffect(() => {
    const before = previous.current;
    previous.current = { progress, journeyKey };
    if (before.journeyKey !== journeyKey) {
      setState({ journeyKey, pending: [] });
      return;
    }
    const changes = discoveryChanges(before.progress, progress);
    if (changes.length) setState((current) => ({ journeyKey, pending: queueDiscoveryChanges(current.pending, changes) }));
  }, [progress, journeyKey]);

  const pending = state.journeyKey === journeyKey ? state.pending : [];
  const notice = blocked ? null : pending[0] ?? null;
  // Capturing the reading makes an old click harmless if a newer rung replaced it meanwhile.
  const acknowledge = (reading: DiscoveryChange) => setState((current) => current.journeyKey !== journeyKey ? current : {
    ...current, pending: current.pending.filter((p) => p.id !== reading.id || p.rung !== reading.rung)
  });
  return { notice, pending, remaining: Math.max(0, pending.length - 1), acknowledge };
}
