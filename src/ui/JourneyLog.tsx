// The journey log, floating over the map.
//
// Canon used to hang off this panel as a child. It answers "what is here", which is a question
// about the tile rather than about the whole trip, so it now sits in the field notes where a
// reader would actually look for it.
//
// This is the same `TravelLog` that `content/travelLog.ts` builds for the export, rendered on the
// glass instead of into a file. That is deliberate: the page the player can keep and the page they
// read while walking should not be two different documents that drift apart. Export is a snapshot
// of this, not a separate composition.
//
// Presentation only — every string arrives already written.

import type { TravelLog } from '../content/travelLog';

export interface JourneyLogProps {
  log: TravelLog | null;
  /** Whether the panel is showing. In landscape it is open by default; in portrait it is a sheet. */
  open: boolean;
  onClose: () => void;
  onExportImage: () => void;
  onExportText: () => void;
}

export function JourneyLog({
  log,
  open,
  onClose,
  onExportImage,
  onExportText
}: JourneyLogProps) {
  if (!log || !open) return null;

  return (
    <aside className="log" aria-label="Travel journal">
      <button type="button" className="log-close" onClick={onClose} aria-label="Close the journal">
        ×
      </button>

      <h2>{log.title}</h2>
      <p className="log-subtitle">{log.subtitle}</p>

      {log.sections.map((section) => (
        <section key={section.heading}>
          <h3>{section.heading}</h3>
          {section.lines.map((line, i) =>
            line === '' ? null : (
              // Lines are prose from a fixed set of sections, so the index is a stable key.
              // eslint-disable-next-line react/no-array-index-key
              <p key={`${section.heading}-${i}`}>{line}</p>
            )
          )}
        </section>
      ))}


      <div className="log-actions">
        <button type="button" onClick={onExportImage}>
          Save as image
        </button>
        <button type="button" className="ghost" onClick={onExportText}>
          Save as text
        </button>
      </div>

      <p className="log-replay">
        Walk it yourself — <span>{log.replayUrl}</span>
      </p>
    </aside>
  );
}
