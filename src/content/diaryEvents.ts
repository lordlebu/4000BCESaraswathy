/** A narrative event as remembered, rather than the transient definition that produced it. */
export type EventOrigin = 'happening' | 'discovery' | 'sub-location' | 'woven';

export interface DiaryEventArt {
  collection: 'events' | 'places' | 'scenes';
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

export interface DiaryEventRow {
  id: string;
  entries: readonly DiaryEventEntry[];
  latest: DiaryEventEntry;
}

function sameArt(a: DiaryEventArt | null, b: DiaryEventArt | null): boolean {
  return a === b || Boolean(a && b && a.collection === b.collection && a.key === b.key && a.take === b.take);
}

function exactRepeat(a: DiaryEventEntry, b: DiaryEventEntry): boolean {
  return a.eventId === b.eventId && a.choiceId === b.choiceId && a.outcome === b.outcome &&
    a.fieldMapId === b.fieldMapId && a.poiId === b.poiId && sameArt(a.art, b.art);
}

/** Compact only adjacent, semantically continuous memories; never hide a later return to a place. */
export function projectDiaryEvents(entries: readonly DiaryEventEntry[]): DiaryEventRow[] {
  const rows: DiaryEventRow[] = [];
  for (const entry of entries) {
    const previous = rows[rows.length - 1];
    const prior = previous?.latest;
    const sameDiscovery = Boolean(prior && entry.origin === 'discovery' && prior.origin === 'discovery' &&
      entry.subjectId && entry.subjectId === prior.subjectId);
    if (previous && prior && (sameDiscovery || exactRepeat(prior, entry))) {
      previous.entries = [...previous.entries, entry];
      previous.latest = entry;
    } else {
      rows.push({ id: entry.id, entries: [entry], latest: entry });
    }
  }
  return rows;
}
