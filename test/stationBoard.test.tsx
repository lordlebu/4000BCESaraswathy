// @vitest-environment jsdom
//
// The board that says what a place can work.
//
// Written to the rule `tileActions.test.tsx` states, because this is the shape that has broken
// twice here: **the two recorded failures in this codebase were controls that rendered beautifully
// and called nothing.**
//
// What these guard:
//
//   * pressing a bench calls back with *that* bench — a board that opened the workshop unfiltered
//     would look identical and undo the whole feature;
//   * a readout is not a control, which is the `peek`/`read` distinction the dock is built on;
//   * what a place *lacks* is said, because that is the half this board does in prose rather than
//     in greyed marks, and prose that silently stops rendering leaves no gap to notice.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StationBoard } from '../src/ui/StationBoard';
import { STATIONS, station } from '../src/content/stations';

afterEach(cleanup);

const kiln = station('kiln')!;
const hearth = station('hearth')!;

describe('the station board', () => {
  it('draws a mark per bench the place has', () => {
    render(<StationBoard here={[hearth, kiln]} missing={[]} onOpen={() => {}} />);
    expect(screen.getByRole('button', { name: /Hearth/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Kiln/ })).toBeTruthy();
  });

  /**
   * **The assertion the feature is for.** A board that called back without saying which bench
   * would render identically and open the unfiltered workshop — which is exactly what this
   * replaced.
   */
  it('hands back the bench that was pressed', () => {
    const onOpen = vi.fn();
    render(<StationBoard here={[hearth, kiln]} missing={[]} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: /Kiln/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0]![0].id).toBe('kiln');
  });

  /**
   * At `peek` the board is a readout. A pressable mark owes the 44px touch floor where a readout
   * owes 26, and the dock has measured that difference in chips falling off a landscape phone.
   */
  it('is a readout, not a control, when there is nothing to open it with', () => {
    render(<StationBoard here={[hearth, kiln]} missing={[]} onOpen={null} />);
    expect(screen.queryByRole('button')).toBeNull();
    // It still says what is here — that is what makes it a readout rather than nothing.
    expect(screen.getByText('Kiln')).toBeTruthy();
  });

  /**
   * **What the place lacks, in prose.** This is the one place the interface departs from "list
   * every action, greyed, with its reason": drawing all eight everywhere would make every board
   * say the same thing, which is the flatness it exists to fix.
   */
  it('names what is missing rather than drawing it greyed', () => {
    const { container } = render(
      <StationBoard here={[hearth]} missing={[kiln]} onOpen={() => {}} />
    );
    const absent = container.querySelector('.station-absent');
    expect(absent?.textContent).toMatch(/kiln/i);
    // And it is not a control — a thing you cannot do must not look pressable.
    expect(screen.queryByRole('button', { name: /Kiln/ })).toBeNull();
  });

  it('counts the rest rather than listing all of them', () => {
    const { container } = render(
      <StationBoard here={[hearth]} missing={[...STATIONS.slice(0, 6)]} onOpen={() => {}} />
    );
    expect(container.querySelector('.station-absent')?.textContent).toMatch(/other/);
  });

  it('says nothing at all about a place that works nothing', () => {
    const { container } = render(<StationBoard here={[]} missing={[kiln]} onOpen={() => {}} />);
    expect(container.querySelector('.station-board')).toBeNull();
  });

  it('draws a mark for every bench canon has, so none renders as a bare dot', () => {
    const { container } = render(
      <StationBoard here={[...STATIONS]} missing={[]} onOpen={() => {}} />
    );
    const marks = [...container.querySelectorAll('.thing-mark')].map((m) => m.textContent);
    expect(marks).toHaveLength(STATIONS.length);
    expect(marks.filter((m) => m === '•'), 'a bench has no mark of its own').toHaveLength(0);
  });
});
