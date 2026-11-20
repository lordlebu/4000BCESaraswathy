/** A narrative event as remembered, rather than the transient definition that produced it. */
export type EventOrigin = 'happening' | 'discovery' | 'sub-location' | 'woven';

export interface DiaryEventArt {
  collection: 'events' | 'scenes';
  key: string;
  take: number;
}

export interface DiaryEventEntry {
  id: string;
  eventId: string;
  origin: EventOrigin;
  subjectId?: string;
  title: string;
  prose: string;
  choiceId: string;
  choiceLabel: string;
  outcome: string;
  day: number;
  fieldMapId: string;
  poiId?: string;
  art: DiaryEventArt | null;
}

export function occurrenceId(eventId: string, entries: readonly DiaryEventEntry[]): string {
  return `${entries.length + 1}:${eventId}`;
}
