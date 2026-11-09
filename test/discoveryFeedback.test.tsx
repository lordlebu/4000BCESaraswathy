// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DiscoveryNotice } from '../src/ui/DiscoveryNotice';
import { Diary } from '../src/ui/Diary';
import { discoveries } from '../src/content/knowledge';
import { emptyProgress } from '../src/journey';
afterEach(cleanup);
it('announces the current milestone and offers separate Read and Dismiss actions', () => {
  const read = vi.fn(), dismiss = vi.fn();
  const { rerender } = render(<DiscoveryNotice change={{ id: 'one', name: 'The water', kind: 'noticed', rung: 0, entry: 'Current reading' }} remaining={2} onRead={read} onDismiss={dismiss} />);
  expect(screen.getByRole('status').textContent).toBe('Discovery noticed: The water · 2 more');
  fireEvent.click(screen.getByRole('button', { name: 'Read diary: The water' }));
  expect(read).toHaveBeenCalledOnce();
  expect(dismiss).not.toHaveBeenCalled();
  rerender(<DiscoveryNotice change={{ id: 'one', name: 'The water', kind: 'understood', rung: 2, entry: 'Final reading' }} remaining={0} onRead={read} onDismiss={dismiss} />);
  expect(screen.getByRole('status').textContent).toBe('Discovery understood: The water');
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss discovery notice: The water' }));
  expect(dismiss).toHaveBeenCalledOnce();
});
it('focuses and identifies the explicitly requested diary entry, preserving authored readings', () => {
  const d = discoveries.find(d => d.rungs.length > 1)!;
  const progress = { ...emptyProgress(), rungs: { [d.id]: 1 } };
  render(<Diary open progress={progress} targetDiscoveryId={d.id} onClose={() => {}} onAnswer={() => {}} onOpenEnding={() => {}} onOpenKit={() => {}} />);
  const heading = screen.getByRole('heading', { name: d.name });
  expect(document.activeElement).toBe(heading);
  expect(heading.closest('article')?.className).toContain('discovery-updated');
  expect(screen.getByText(d.rungs[0]!.entry).className).toContain('struck');
  expect(screen.getByText(d.rungs[1]!.entry).className).not.toContain('struck');
});
it('keeps the usual diary close focus for an ordinary open or missing target', () => {
  render(<Diary open progress={emptyProgress()} targetDiscoveryId="missing" onClose={() => {}} onAnswer={() => {}} onOpenEnding={() => {}} onOpenKit={() => {}} />);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
});
