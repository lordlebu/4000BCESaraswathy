// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Progress } from '../src/ui/Progress';
import { emptyProgress } from '../src/journey';

afterEach(cleanup);
const noop = () => {};
const props = {
  progress: emptyProgress(), open: true, onClose: noop, onAnswer: noop,
  onOpenEnding: noop, onOpenKit: noop, replayUrl: null,
  onExportImage: noop, onExportText: noop
};

it('keeps road guidance and accurately named coverage in the diary before any discovery', () => {
  render(<Progress {...props} roadNotes={{
    hint: 'The elders spoke of Thamkund, far to the south.',
    whereNext: 'The Camp would do for the night.', atLandmark: false, revealed: 1136, total: 5000
  }} />);
  expect(screen.getByRole('region', { name: 'Road notes' }).textContent).toContain('The elders spoke of Thamkund');
  expect(screen.getByText('The Camp would do for the night.')).toBeDefined();
  expect(screen.getByText('About 23% of this map revealed.')).toBeDefined();
  expect(screen.getByText('No field observations yet.')).toBeDefined();
  expect(screen.queryByText(/places discovered/)).toBeNull();
  expect(screen.getByRole('link', { name: 'Road notes' }).getAttribute('href')).toBe('#notebook-road');
});

it('omits absent guidance and empty paragraphs while retaining an arrival note', () => {
  const view = render(<Progress {...props} roadNotes={{
    hint: 'This is Thamkund. Sit a while.', whereNext: '', atLandmark: true, revealed: 100, total: 100
  }} />);
  expect(view.baseElement.querySelector('.status-arrived')?.textContent).toContain('This is Thamkund');
  expect(view.baseElement.querySelector('.status-next')).toBeNull();
  view.rerender(<Progress {...props} />);
  expect(screen.queryByRole('region', { name: 'Road notes' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Road notes' })).toBeNull();
});
