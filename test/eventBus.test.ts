import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/game/EventBus';

describe('EventBus', () => {
  it('delivers typed events and stops after the listener is removed', () => {
    const listener = vi.fn();

    EventBus.onEvent('zoom-changed', listener);
    expect(EventBus.emitEvent('zoom-changed', { zoom: 2 })).toBe(true);
    EventBus.offEvent('zoom-changed', listener);
    expect(EventBus.emitEvent('zoom-changed', { zoom: 3 })).toBe(false);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ zoom: 2 });
  });
});
