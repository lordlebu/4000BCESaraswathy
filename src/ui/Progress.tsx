// Progress: what the traveller has come to understand.
//
// Discoveries and their rungs, open questions, words, and the way to the last page. The diary
// is the whole of it -- this wraps it with the two things the travel log used to hold on its
// own, so there is one surface about the walk rather than two that disagreed.
//
// The disagreement was real and is the reason this phase exists. `travelLog.ts` and `Diary.tsx`
// rendered the same four things -- understood, questions settled, words, put back -- from the
// same `Progress`, in two compositions, and nothing kept them in step. `diarySections()` was
// written for the export and then rendered on the glass as well, which is exactly how they
// drifted. It is now the one builder, and what a player reads is what they keep.
//
// The route stays export-only. It is trip history rather than something the player made, and
// on screen it competed with the understanding this surface is for.

import type { ReactNode } from 'react';
import { Diary } from './Diary';
import type { Progress as Knowledge, WorldMoment } from '../journey';

export interface ProgressProps {
  progress: Knowledge;
  moment: WorldMoment | null;
  open: boolean;
  onClose: () => void;
  onAnswer: (questionId: string, index: number) => void;
  onOpenEnding: () => void;
  onOpenKit: () => void;
  /** Where the walk can be picked up again. The seed is the whole save file. */
  replayUrl: string | null;
  onExportImage: () => void;
  onExportText: () => void;
  /** Tabs, when this panel is one of two records behind one door. See `Records.tsx`. */
  tabs?: ReactNode;
}

export function Progress({
  progress,
  moment,
  open,
  onClose,
  onAnswer,
  onOpenEnding,
  onOpenKit,
  replayUrl,
  onExportImage,
  onExportText,
  tabs
}: ProgressProps) {
  if (!open) return null;

  return (
    <Diary
      tabs={tabs}
      progress={progress}
      moment={moment}
      open
      onClose={onClose}
      onAnswer={onAnswer}
      onOpenEnding={onOpenEnding}
      onOpenKit={onOpenKit}
      footer={
        // Taking a copy is something you do to a record you have read, so it lives at the end
        // of the record rather than in a panel of its own.
        <section className="diary-section">
          <h3>Take it with you</h3>
          <div className="log-actions">
            <button type="button" onClick={onExportImage}>
              Save as image
            </button>
            <button type="button" className="ghost" onClick={onExportText}>
              Save as text
            </button>
          </div>
          {replayUrl && (
            <p className="log-replay">
              Walk it yourself — <span>{replayUrl}</span>
            </p>
          )}
        </section>
      }
    />
  );
}
