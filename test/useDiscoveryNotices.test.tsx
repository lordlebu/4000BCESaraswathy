// @vitest-environment jsdom
import { StrictMode, type ReactNode } from 'react';
import { afterEach, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { emptyProgress } from '../src/journey';
import { discoveries } from '../src/content/knowledge';
import { useDiscoveryNotices } from '../src/ui/useDiscoveryNotices';
afterEach(cleanup);
const d = discoveries.find(d => d.rungs.length >= 3)!;
const at = (rung: number) => ({ ...emptyProgress(), rungs: { [d.id]: rung } });
const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
it('does not replay a saved discovery on mount, then queues changes while blocked', () => {
  const initial = { progress: at(0), journey: 'one', blocked: false };
  const { result, rerender } = renderHook(p => useDiscoveryNotices(p.progress, p.journey, p.blocked), { initialProps: initial, wrapper });
  expect(result.current.notice).toBeNull();
  rerender({ ...initial, progress: at(1), blocked: true });
  expect(result.current.notice).toBeNull();
  expect(result.current.pending).toHaveLength(1);
  rerender({ ...initial, progress: at(1) });
  expect(result.current.notice?.rung).toBe(1);
  act(() => result.current.acknowledge(result.current.notice!));
  rerender({ ...initial, progress: at(1) });
  expect(result.current.pending).toEqual([]);
});
it('replaces a pending reading and ignores an acknowledgement for the old rung', () => {
  const initial = { progress: emptyProgress(), journey: 'one' };
  const { result, rerender } = renderHook(p => useDiscoveryNotices(p.progress, p.journey, false), { initialProps: initial, wrapper });
  rerender({ ...initial, progress: at(0) });
  const old = result.current.notice!;
  rerender({ ...initial, progress: at(1) });
  act(() => result.current.acknowledge(old));
  expect(result.current.pending).toHaveLength(1);
  expect(result.current.notice?.rung).toBe(1);
  rerender({ ...initial, journey: 'replacement', progress: at(2) });
  expect(result.current.pending).toEqual([]);
});
it('counts different pending discoveries and advances on acknowledgement', () => {
  const initial = emptyProgress();
  const { result, rerender } = renderHook(p => useDiscoveryNotices(p, 'one', false), { initialProps: initial });
  rerender({ ...initial, rungs: Object.fromEntries(discoveries.slice(0, 2).map(d => [d.id, 0])) });
  expect(result.current.remaining).toBe(1);
  expect(result.current.notice?.id).toBe(discoveries[0]!.id);
  act(() => result.current.acknowledge(result.current.notice!));
  expect(result.current.notice?.id).toBe(discoveries[1]!.id);
  expect(result.current.remaining).toBe(0);
});
