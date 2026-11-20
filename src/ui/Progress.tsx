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
import type { ReadingSize } from './preferences';
import { Diary } from './Diary';
import { RoadNotes, type RoadNotesProps } from './RoadNotes';
import type { Progress as Knowledge } from '../journey';
import type { DiaryEventEntry } from '../content/diaryEvents';

export interface ProgressProps {
  readingSize?: ReadingSize;
  onReadingSize?: (size: ReadingSize) => void;
  roadNotes?: RoadNotesProps | null;
  targetDiscoveryId?: string | null;
  progress: Knowledge;
  diaryEvents?: readonly DiaryEventEntry[];
  open: boolean;
  onClose: () => void;
  onAnswer: (questionId: string, index: number) => void;
  onOpenKit: () => void;
  /** Tabs, when this panel is one of two records behind one door. See `Records.tsx`. */
  tabs?: ReactNode;
}

export function Progress({
  readingSize,
  onReadingSize,
  roadNotes,
  targetDiscoveryId = null,
  progress,
  diaryEvents,
  open,
  onClose,
  onAnswer,
  onOpenKit,
  tabs
}: ProgressProps) {
  if (!open) return null;

  return (
    <Diary
      readingSize={readingSize}
      onReadingSize={onReadingSize}
      leadSections={[
        ...(roadNotes ? [{ id: 'notebook-road', label: 'Road notes' }] : [])
      ]}
      targetDiscoveryId={targetDiscoveryId}
      tabs={tabs}
      lead={roadNotes && <RoadNotes {...roadNotes} />}
      progress={progress}
      diaryEvents={diaryEvents}
      open
      onClose={onClose}
      onAnswer={onAnswer}
      onOpenKit={onOpenKit}
    />
  );
}
