// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
vi.mock('../src/game/EventBus', () => ({ EventBus: { emitEvent: vi.fn() } }));
import { EventBus } from '../src/game/EventBus';
import { useGuidance } from '../src/ui/useGuidance';
import { buildFieldMap } from '../src/world/fieldMap';
import { fieldMaps } from '../src/content/places';
import { emptyProgress } from '../src/journey';
import { noNodes } from '../src/content/nodes';
import { COACH } from '../src/content/coach';
import { pointKey } from '../src/world/pathfind';
type Props = Parameters<typeof useGuidance>[0];
const built = buildFieldMap(fieldMaps.find(m => m.id === 'field_map_lothal')!, {});
function props(): Props {
  return {
    world: built.world, arrival: { at: built.world.start, day: 0 }, pinned: null, setPinned: vi.fn(),
    satchel: {}, bench: { kind: null, fieldMapId: 'field_map_lothal' }, nodes: noNodes(), homeTick: 0,
    journeyFlags: { current: [] }, discovered: { current: built.world.tiles.flat().map(pointKey) },
    fieldPlaced: { current: built.placed.map(p => ({ poiId: p.poi.id, at: p.at })) },
    latest: { current: {} } as Props['latest'], fieldMapId: 'field_map_lothal', hints: true,
    coach: COACH.find(s => s.id === 'knife')!, peopleOfMap: [], progress: emptyProgress(), road: null,
    navigation: { boat: false, afloat: false }, seenRevision: 0, reported: [], nearby: [], knows: () => true,
    onWorkshop: vi.fn(), onPlace: vi.fn(), onReveal: vi.fn()
  };
}
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const lastMark = () => vi.mocked(EventBus.emitEvent).mock.calls.filter(c => c[0] === 'source-mark').at(-1)?.[1];
it('keeps an explicit first-morning marker when Hints is turned off, then clears it when the need is met', () => {
  const initial = props();
  const { result, rerender } = renderHook(useGuidance, { initialProps: initial });
  expect(result.current.coachGuide?.action?.label).toBe('Show me');
  act(() => result.current.coachGuide!.action!.onDo());
  const marked = lastMark();
  expect(marked).toHaveProperty('at', expect.objectContaining({ x: expect.any(Number) }));
  rerender({ ...initial, hints: false });
  expect(result.current.coachGuide).toBeNull();
  expect(lastMark()).toEqual(marked);
  rerender({ ...initial, hints: false, satchel: { material_flint: 2 } });
  expect(lastMark()).toMatchObject({ at: null });
  rerender({ ...initial, hints: false });
  expect(lastMark()).toMatchObject({ at: null });
});
it('switches a selected marker off on map replacement and does not reveal unknown ground', () => {
  const initial = props();
  const { result, rerender } = renderHook(useGuidance, { initialProps: initial });
  act(() => result.current.coachGuide!.action!.onDo());
  rerender({ ...initial, world: { ...built.world }, discovered: { current: [] }, seenRevision: 1 });
  expect(lastMark()).toMatchObject({ at: null });
  expect(result.current.coachGuide?.action?.label).toBe('Open workshop');
});
