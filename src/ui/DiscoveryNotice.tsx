import type { DiscoveryChange } from '../content/discoveryChanges';
export interface DiscoveryNoticeProps {
  change: DiscoveryChange;
  remaining: number;
  onRead: () => void;
  onDismiss: () => void;
}
const LABEL = { noticed: 'Discovery noticed', deepened: 'Understanding deepened', understood: 'Discovery understood' };
export function DiscoveryNotice({ change, remaining, onRead, onDismiss }: DiscoveryNoticeProps) {
  return <div className="discovery-notice">
    <span className="discovery-notice-copy" role="status" aria-live="polite" aria-atomic="true">
      <strong>{LABEL[change.kind]}</strong>: {change.name}{remaining > 0 && <span> · {remaining} more</span>}
    </span>
    <button type="button" onClick={onRead} aria-label={`Read diary: ${change.name}`}>Read diary</button>
    <button type="button" onClick={onDismiss} aria-label={`Dismiss discovery notice: ${change.name}`}>×</button>
  </div>;
}
