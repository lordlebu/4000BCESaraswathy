// @vitest-environment jsdom
//
// Two records, one door.
//
// The tab strip is small, and the interesting part is where it renders rather than what it
// draws: floating it over the panels was the first attempt and did not work, because both draw a
// full-screen veil at `z-index: 40` and anything positioned against the page sits underneath it.
// The second tab could not even be clicked. It goes into each panel's own `tabs` slot instead.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RecordTabs } from '../src/ui/Records';

afterEach(cleanup);

describe('the record tabs', () => {
  it('marks the one showing, and only that one', () => {
    render(<RecordTabs tab="collection" onTab={() => {}} journeyCount={2} metCount={9} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs.filter((t) => t.getAttribute('aria-selected') === 'true')).toHaveLength(1);
    expect(screen.getByRole('tab', { name: /Met/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('asks for the other one when pressed', () => {
    const onTab = vi.fn();
    render(<RecordTabs tab="journey" onTab={onTab} journeyCount={0} metCount={4} />);
    fireEvent.click(screen.getByRole('tab', { name: /Met/ }));
    expect(onTab).toHaveBeenCalledWith('collection');
  });

  it('still reports the tab you are already on, so a tab is not a toggle', () => {
    // `App` turns this into a `show` rather than a `toggle`, which is what keeps pressing the
    // current tab from closing the sheet underneath it.
    const onTab = vi.fn();
    render(<RecordTabs tab="journey" onTab={onTab} journeyCount={0} metCount={4} />);
    fireEvent.click(screen.getByRole('tab', { name: /Journey/ }));
    expect(onTab).toHaveBeenCalledWith('journey');
  });

  it('shows a count only when there is one', () => {
    // A badge reading "0" looks broken. An empty diary is a reason not to press it.
    const { container } = render(
      <RecordTabs tab="journey" onTab={() => {}} journeyCount={0} metCount={7} />
    );
    const counts = [...container.querySelectorAll('.records-count')].map((n) => n.textContent);
    expect(counts).toEqual(['7']);
  });
});
