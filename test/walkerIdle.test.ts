import { afterEach, expect, it, vi } from 'vitest';
import { walkerIdle } from '../e2e/walkerIdle';
afterEach(() => vi.unstubAllGlobals());
it('does not mistake a stable heading for a finished route', () => {
  const walker = { moving: true, queued: 4, pending: false };
  vi.stubGlobal('window', { __walker: () => walker, document: { querySelector: () => ({ textContent: 'Plains at 10, 4' }) } });
  expect(walkerIdle()).toBe(false);
  walker.moving = false;
  expect(walkerIdle()).toBe(false);
  walker.queued = 0;
  expect(walkerIdle()).toBe(true);
  walker.moving = true;
  expect(walkerIdle()).toBe(false);
  walker.moving = false;
  walker.pending = true;
  expect(walkerIdle()).toBe(false);
});
it('waits for the scene to expose its state', () => {
  vi.stubGlobal('window', {});
  expect(walkerIdle()).toBe(false);
});
