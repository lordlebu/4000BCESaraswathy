import { describe, expect, it } from 'vitest';
import { projectDiaryEvents, type DiaryEventEntry } from '../src/content/diaryEvents';

function entry(over: Partial<DiaryEventEntry> = {}): DiaryEventEntry {
  return {
    id: '1:event', eventId: 'event', origin: 'happening', title: 'Event', prose: 'Before',
    choiceId: 'go', choiceLabel: 'Go', outcome: 'After', day: 0, fieldMapId: 'map', art: null,
    ...over
  };
}

describe('compact diary event projection', () => {
  it('groups adjacent rungs of the same discovery', () => {
    const rows = projectDiaryEvents([
      entry({ id: '1', eventId: 'discovery:0', origin: 'discovery', subjectId: 'discovery_tower' }),
      entry({ id: '2', eventId: 'discovery:1', origin: 'discovery', subjectId: 'discovery_tower', outcome: 'A later reading' })
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.entries).toHaveLength(2);
    expect(rows[0]!.latest.outcome).toBe('A later reading');
  });

  it('does not merge the same discovery across an intervening event', () => {
    const rows = projectDiaryEvents([
      entry({ id: '1', origin: 'discovery', subjectId: 'discovery_tower' }),
      entry({ id: '2', eventId: 'another', outcome: 'Elsewhere' }),
      entry({ id: '3', origin: 'discovery', subjectId: 'discovery_tower' })
    ]);
    expect(rows).toHaveLength(3);
  });

  it('groups only exact adjacent repeats', () => {
    const rows = projectDiaryEvents([
      entry({ id: '1' }), entry({ id: '2' }), entry({ id: '3', outcome: 'Changed' })
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.entries).toHaveLength(2);
  });
});
