// A night beside somebody else's camp, and how a camp gets talked about.
//
// Roads and Hands phase 5: canon's fireside stories belong to a kind of camp, the fire's own story
// comes before any other on that night, the woven fireside draws the owner's paintings, and a
// standing camp is the rumour a stranger passes on first.

import { describe, expect, it } from 'vitest';
import { canHappen, eventNow, events, type Circumstance } from '../src/content/events';
import { rumourFor, type Rumour } from '../src/content/rumours';

const night = (over: Partial<Circumstance> = {}): Circumstance => ({
  occasion: 'night',
  shelter: 'camp',
  fieldMapId: 'field_map_lothal',
  day: 4,
  holds: [],
  seen: [],
  ...over
});

describe("canon's fireside stories", () => {
  const goats = events.find((e) => e.id === 'happening_counting_the_goats')!;

  it('belong to a kind of camp, and happen only beside one of that kind', () => {
    expect(goats.conditions.camps).toEqual(['drovers']);
    expect(canHappen(goats, night({ campKind: 'drovers' }))).toBe(true);
    expect(canHappen(goats, night({ campKind: 'dacoits' }))).toBe(false);
    expect(canHappen(goats, night())).toBe(false);
  });

  it("are two for every kind the owner kept", () => {
    for (const kind of ['adventurers', 'dacoits', 'pilgrims', 'drovers']) {
      expect(events.filter((e) => e.conditions.camps.includes(kind)).length, kind).toBe(2);
    }
  });

  it("come before any other night's story, beside their camp", () => {
    for (let n = 0; n < 20; n++) {
      const told = eventNow(night({ campKind: 'pilgrims', fieldMapId: 'field_map_lothal' }), () => n);
      expect(told?.conditions.camps, told?.id).toEqual(['pilgrims']);
    }
  });
});

describe('a camp is talked about', () => {
  it('is the rumour a stranger passes on first', () => {
    const place = { id: 'rumour:place:poi_x', kind: 'place', poiId: 'poi_x', place: 'X', person: null } as unknown as Rumour;
    const camp = { id: 'rumour:camp:m:1', kind: 'camp', poiId: 'poi_y', place: 'Y', person: null, campKind: 'drovers' } as unknown as Rumour;
    for (let n = 0; n < 10; n++) expect(rumourFor([place, camp], () => n)?.kind).toBe('camp');
    expect(rumourFor([place], () => 0)?.kind).toBe('place');
  });
});
