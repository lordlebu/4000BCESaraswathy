// @vitest-environment jsdom
//
// Everything actionable on a tile, in one list.
//
// These tests moved here from `satchelPanel.test.tsx`, which had held the gathering ones because
// taking what was under foot lived inside the satchel. That file's header states the rule they
// exist for and it has not changed: **the two recorded failures in this codebase were controls
// that rendered beautifully and called nothing.** A list of buttons is exactly the shape that
// fails that way, so every action here is asserted to reach its callback.
//
// The second rule is the genre's, and it is why `blocked` is a string rather than a boolean: an
// action you cannot take keeps its row and says why. A vanished button teaches a player nothing
// about the mechanic behind it, which in a clicker is the only way they could ever learn.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TileActions, type TileAction } from '../src/ui/TileActions';

afterEach(cleanup);

const take = (over: Partial<TileAction> = {}): TileAction => ({
  id: 'take',
  label: 'Take what is here',
  mark: '⌘',
  blocked: null,
  onDo: () => {},
  ...over
});

describe('what can be done here', () => {
  it('offers what is under foot, and calls back when it is taken', () => {
    const onDo = vi.fn();
    render(<TileActions actions={[take({ detail: 'Reed fibre, mud crab.', onDo })]} />);

    expect(screen.getByText('Reed fibre, mud crab.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Take what is here/ }));
    expect(onDo).toHaveBeenCalledTimes(1);
  });

  it('keeps a blocked action on screen and says why', () => {
    // The whole convention in one assertion. Hiding this row would remove the only place a
    // player could learn that ground holds anything at all.
    const onDo = vi.fn();
    render(
      <TileActions actions={[take({ blocked: 'Nothing on this ground to take.', onDo })]} />
    );

    const button = screen.getByRole('button', { name: /Take what is here/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText('Nothing on this ground to take.')).toBeTruthy();

    fireEvent.click(button);
    expect(onDo, 'a blocked action must not fire').not.toHaveBeenCalled();
  });

  it('ties the reason to its button for a screen reader', () => {
    // Grey text alone leaves the reason unreachable to anyone not looking at it, which is the
    // usual failing of a disabled control.
    render(<TileActions actions={[take({ blocked: 'Nothing here.' })]} />);
    const button = screen.getByRole('button', { name: /Take what is here/ });
    const described = button.getAttribute('aria-describedby');
    expect(described).toBeTruthy();
    expect(document.getElementById(described!)?.textContent).toBe('Nothing here.');
  });

  it('lists several actions together, which is the point of the surface', () => {
    // Taking, resting and looking closer used to live in three different panels. A player had to
    // learn three homes for one idea; now there is one list.
    const takeIt = vi.fn();
    const rest = vi.fn();
    render(
      <TileActions
        actions={[
          take({ onDo: takeIt }),
          {
            id: 'rest',
            label: 'Unroll the bedding here',
            mark: '☽',
            blocked: null,
            onDo: rest
          }
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Take what is here/ }));
    fireEvent.click(screen.getByRole('button', { name: /bedding/ }));
    expect(takeIt).toHaveBeenCalledTimes(1);
    expect(rest).toHaveBeenCalledTimes(1);
  });

  it('renders nothing at all when there is nothing to do', () => {
    const { container } = render(<TileActions actions={[]} />);
    expect(container.querySelector('.tile-actions')).toBeNull();
  });
});

/**
 * The key hint on a row.
 *
 * **A hotkey nobody can see is a secret**, and this file's own header states the rule it breaks:
 * an action you cannot take keeps its row and says why, because a player learns the mechanic from
 * what is written. A shortcut is the same bargain -- it exists when it is on screen.
 *
 * The key *handler* lives in `App.tsx`, driven off this same action list so a key and a tap cannot
 * diverge. What is asserted here is only that the row shows what it is.
 */
describe('the key that does it', () => {
  it('shows the key when there is one, and nothing when there is not', () => {
    render(<TileActions actions={[take({ key: 'E' })]} />);
    expect(screen.getByText('E').tagName, 'the hint is not a <kbd>').toBe('KBD');

    cleanup();
    render(<TileActions actions={[take()]} />);
    expect(screen.queryByText('E'), 'a key appeared on an action with none').toBeNull();
  });

  it('keeps the hint out of the accessible name, so the label still reads cleanly', () => {
    render(<TileActions actions={[take({ key: 'E', label: 'Cut and gather' })]} />);
    // `aria-hidden` on the hint: a screen reader announcing "Cut and gather E" is worse than one
    // announcing the action, and the key is no use to somebody who is not looking at it.
    const button = screen.getByRole('button', { name: 'Cut and gather' });
    expect(button, 'the key leaked into the accessible name').toBeTruthy();
  });
});

/**
 * A blocked row is teaching, so it has to be readable.
 *
 * **The stylesheet and this file's own header used to disagree.** The header argues that a blocked
 * row is content -- *"needs a settlement" is content, "disabled" is not* -- and the row was drawn
 * at `opacity: 0.55`, which put its label at **3.36:1** against the parchment and, compounding with
 * the detail line's own 0.82, put what the ground holds at **2.61:1**. WCAG exempts an inactive
 * control from the contrast rule, so nothing was failing; the design was simply not being kept.
 *
 * The dimming is a colour token now (`--ink-faint`, 4.87:1) and cannot multiply with another one.
 * These assertions are about the *mechanism* rather than the pixels, because jsdom has no
 * rendering: an alpha on an element that carries words is the thing that went wrong, and it is the
 * thing worth refusing.
 */
describe('a blocked row can be read', () => {
  /** Every element from `el` up to the row, so a dimming ancestor cannot hide from the check. */
  const upToRow = (el: Element): Element[] => {
    const chain: Element[] = [];
    for (let at: Element | null = el; at && !at.classList.contains('tile-action'); at = at.parentElement) {
      chain.push(at);
    }
    return chain;
  };

  const dimmed = (el: Element) =>
    upToRow(el).some((step) => {
      const inline = (step as HTMLElement).style.opacity;
      return inline !== '' && Number(inline) < 1;
    });

  it('states the reason outside the dimmed control, where nothing can fade it', () => {
    const { container } = render(
      <TileActions actions={[take({ blocked: 'Needs a settlement.', detail: 'Two bundles of reed fibre.' })]} />
    );
    const why = container.querySelector('.tile-action-why')!;
    expect(why.textContent).toBe('Needs a settlement.');
    // A sibling of the button rather than a child of it -- which is what has always kept the reason
    // clear of whatever the button does to itself.
    expect(why.closest('button'), 'the reason is inside the control it explains').toBeNull();
    expect(dimmed(why), 'the reason is inside something faded').toBe(false);
  });

  it('keeps the label and the detail out of an alpha', () => {
    const { container } = render(
      <TileActions actions={[take({ blocked: 'Needs a settlement.', detail: 'Two bundles of reed fibre.' })]} />
    );
    const label = container.querySelector('.tile-action-label')!;
    const detail = container.querySelector('.tile-action-detail')!;
    expect(dimmed(label), 'the label is inside something faded').toBe(false);
    expect(dimmed(detail), 'the detail is inside something faded').toBe(false);
  });

  it('still says it is blocked by something that is not a colour', () => {
    // The whole argument for making the words legible: nothing is lost, because disabled was never
    // being carried by the fade in the first place.
    render(<TileActions actions={[take({ blocked: 'Needs a settlement.' })]} />);
    const button = screen.getByRole('button');
    expect(button.hasAttribute('disabled'), 'the row no longer reads as unavailable').toBe(true);
    expect(button.getAttribute('aria-describedby'), 'the reason is not tied to the control').toBeTruthy();
  });
});
