// @vitest-environment jsdom
//
// The road between two maps: canon's roads, told as cards; three the first time, one after.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Journey } from '../src/ui/Journey';
import { fieldMap, fieldMaps, roadBetween } from '../src/content/places';
import { canHappen, events, type GameEvent } from '../src/content/events';

afterEach(cleanup);
const roll = () => 0;

describe('the roads', () => {
  it('reach every neighbour, and each road is one painting from both ends', () => {
    for (const map of fieldMaps) {
      for (const to of map.neighbours) {
        const there = roadBetween(map.id, to);
        const back = roadBetween(to, map.id);
        expect(there, `${map.id} has no road to ${to}`).not.toBeNull();
        expect(back?.art).toBe(there!.art);
        expect(back?.by).toBe(there!.by);
      }
    }
  });

  it('goes to the Aravali by sea and everywhere else by elephantbird cart, as the paintings show', () => {
    expect(roadBetween('field_map_lothal', 'field_map_aravali')?.by).toBe('vehicle_coastal_dhow');
    expect(roadBetween('field_map_lothal', 'field_map_dwarka')?.by).toBe('vehicle_elephantbird_cart');
  });
});

describe('a crossing, told', () => {
  const lothal = fieldMap('field_map_lothal')!;
  const dwarka = fieldMap('field_map_dwarka')!;
  const road = roadBetween(lothal.id, dwarka.id)!;

  it('is three cards the first time: seen off, the road, arriving', () => {
    const onDone = vi.fn();
    const { baseElement } = render(<Journey from={lothal} to={dwarka} road={road} first roll={roll} onDone={onDone} />);
    expect(baseElement.textContent).toContain(road.keeper.line);
    expect(baseElement.textContent).toContain('Kunch');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(baseElement.textContent).toContain(road.prose[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(baseElement.textContent).toContain(dwarka.name);
    expect(baseElement.textContent).toContain(dwarka.arrival.slice(0, 40));
    fireEvent.click(screen.getByRole('button', { name: 'Step down' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('is one card on a road already taken, and can always be skipped', () => {
    const onDone = vi.fn();
    const { baseElement } = render(<Journey from={lothal} to={dwarka} road={road} first={false} roll={roll} onDone={onDone} />);
    expect(baseElement.textContent).toContain(road.prose[0]);
    expect(screen.getByRole('button', { name: 'Step down' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('a road happening', () => {
  const ferry = events.find((e) => e.id === 'happening_the_ferry_song') as GameEvent;
  const now = (fieldMapId: string, cameFrom: string | null) => ({
    occasion: 'journey' as const,
    shelter: null,
    fieldMapId,
    day: 3,
    holds: [],
    seen: [],
    cameFrom
  });

  it('comes from canon, on its own road only', () => {
    expect(ferry).toBeTruthy();
    expect(canHappen(ferry, now('field_map_aravali', 'field_map_lothal'))).toBe(true);
    expect(canHappen(ferry, now('field_map_lothal', 'field_map_aravali'))).toBe(true);
    // Down from the plateau also ends at Lothal, and is not the sea road.
    expect(canHappen(ferry, now('field_map_lothal', 'field_map_narmada'))).toBe(false);
  });
});
