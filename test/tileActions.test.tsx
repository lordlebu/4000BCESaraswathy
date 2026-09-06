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
