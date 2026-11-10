// Journey-scale guidance belongs in the diary; the dock describes the current tile.
import { mapCoverageLine } from '../content/travelLog';

export interface RoadNotesProps {
  hint: string;
  whereNext: string;
  atLandmark: boolean;
  /** Fog-revealed ground, including road sight; never a count of visited places. */
  revealed: number;
  total: number;
}

export function RoadNotes({ hint, whereNext, atLandmark, revealed, total }: RoadNotesProps) {
  return (
    <section className="diary-section road-notes" aria-labelledby="notebook-road">
      <h3 id="notebook-road" tabIndex={-1}>Road notes</h3>
      {hint && <p className={atLandmark ? 'status status-arrived' : 'status'}>{hint}</p>}
      {whereNext && <p className="status-next">{whereNext}</p>}
      <p className="muted map-coverage">{mapCoverageLine(revealed, total)}</p>
    </section>
  );
}
