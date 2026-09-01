// @vitest-environment jsdom
//
// The typewriter, rendered.
//
// `test/dialogue.test.ts` covers the arithmetic. This covers the thing that actually broke in
// every other phase of this programme: what appears on screen. Nine faults in the interface work
// were found by rendering a component and none of them by the arithmetic underneath it.
//
// The timer is faked, so a test never waits for typing. Real time would make these slow and
// flaky, and neither would be testing the component.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Dialogue } from '../src/ui/Dialogue';

/** Let the typewriter run to the end of whatever it is currently typing. */
function typeItOut() {
  act(() => {
    vi.advanceTimersByTime(4000);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  // Default to a player who has not asked for less motion, so typing actually happens.
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Dialogue', () => {
  it('does not show the whole line at once', () => {
    render(<Dialogue beats={['A reasonably long first sentence that takes a moment to arrive.']} />);
    // Before any time passes, the text is not all there. This is the entire point of the phase.
    expect(screen.queryByText(/takes a moment to arrive/)).toBeNull();
  });

  it('finishes the line it is typing', () => {
    render(<Dialogue beats={['Mask Family, yes.']} />);
    typeItOut();
    expect(screen.getByText(/Mask Family, yes\./)).toBeTruthy();
  });

  it('holds the next beat back until asked', () => {
    render(<Dialogue beats={['Mask Family, yes.', 'There is no family and there are no masks.']} />);
    typeItOut();
    expect(screen.queryByText(/no masks/)).toBeNull();

    fireEvent.click(screen.getByRole('button'));
    typeItOut();
    expect(screen.getByText(/no masks/)).toBeTruthy();
  });

  it('keeps what has already been said on screen', () => {
    render(<Dialogue beats={['First thing said.', 'Second thing said.']} />);
    typeItOut();
    fireEvent.click(screen.getByRole('button'));
    typeItOut();
    // Both, because half these lines are the only place a word is ever explained.
    expect(screen.getByText(/First thing said/)).toBeTruthy();
    expect(screen.getByText(/Second thing said/)).toBeTruthy();
  });

  it('completes the sentence on an impatient click rather than skipping it', () => {
    render(<Dialogue beats={['A long sentence that is still being typed out right now.', 'Next.']} />);
    act(() => {
      vi.advanceTimersByTime(60);
    });
    fireEvent.click(screen.getByRole('button'));
    // The first beat is now whole, and the second has not started.
    expect(screen.getByText(/still being typed out right now/)).toBeTruthy();
    expect(screen.queryByText(/^Next\./)).toBeNull();

    // **And it stays whole on the very next tick.** This assertion is the whole test. Without it
    // the version above passed against a component whose reveal was still running and overwrote
    // the completed text a frame later, so the click did nothing a player could see.
    //
    // The window has to be short. That sentence types itself out in about 880ms unaided, so
    // advancing past that finds it complete either way and proves nothing -- the overwrite is
    // transient, and a generous wait hides it exactly as the missing wait did.
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText(/still being typed out right now/)).toBeTruthy();
    expect(screen.queryByText(/^Next\./)).toBeNull();
  });

  it('records a beat only once it has finished', () => {
    const heard = vi.fn();
    render(<Dialogue beats={['A sentence of some length to type.']} onBeatDone={heard} />);
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(heard).not.toHaveBeenCalled();
    typeItOut();
    expect(heard).toHaveBeenCalledWith(0);
  });

  it('reports each beat exactly once', () => {
    const heard = vi.fn();
    render(<Dialogue beats={['One.', 'Two.']} onBeatDone={heard} />);
    typeItOut();
    fireEvent.click(screen.getByRole('button'));
    typeItOut();
    expect(heard).toHaveBeenCalledTimes(2);
    expect(heard).toHaveBeenNthCalledWith(1, 0);
    expect(heard).toHaveBeenNthCalledWith(2, 1);
  });

  it('says it is done when the last beat is dismissed', () => {
    const done = vi.fn();
    render(<Dialogue beats={['Only this.']} onDone={done} />);
    typeItOut();
    fireEvent.click(screen.getByRole('button'));
    expect(done).toHaveBeenCalled();
  });

  it('hides its own control when the caller is drawing one', () => {
    render(<Dialogue beats={['Only this.']} doneLabel={null} />);
    typeItOut();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders nothing for an empty exchange', () => {
    const { container } = render(<Dialogue beats={[]} />);
    expect(container.textContent).toBe('');
  });

  // Walking out must not cost the player what they were told. Recording on mount was wrong; never
  // recording is worse, because it takes progress away rather than granting it early.
  describe('leaving mid-conversation', () => {
    it('still counts the beats that were never reached', () => {
      const heard = vi.fn();
      const { unmount } = render(<Dialogue beats={['One.', 'Two.', 'Three.']} onBeatDone={heard} />);
      typeItOut();
      expect(heard).toHaveBeenCalledTimes(1);

      unmount();
      // All three, so a question somebody was halfway through giving is still given.
      expect(heard).toHaveBeenCalledTimes(3);
      expect(heard).toHaveBeenNthCalledWith(2, 1);
      expect(heard).toHaveBeenNthCalledWith(3, 2);
    });

    it('does not report a beat twice', () => {
      const heard = vi.fn();
      const { unmount } = render(<Dialogue beats={['Only this.']} onBeatDone={heard} />);
      typeItOut();
      unmount();
      expect(heard).toHaveBeenCalledTimes(1);
    });

    it('lets a caller opt out', () => {
      const heard = vi.fn();
      const { unmount } = render(
        <Dialogue beats={['One.', 'Two.']} onBeatDone={heard} keepOnLeave={false} />
      );
      typeItOut();
      unmount();
      expect(heard).toHaveBeenCalledTimes(1);
    });
  });

  it('gives everything at once to a player who asked for less motion', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    );
    render(<Dialogue beats={['The whole thing, immediately, with no typing at all.']} />);
    // No timers advanced: it is already there.
    expect(screen.getByText(/no typing at all/)).toBeTruthy();
  });

  it('offers no cursor to a player who asked for less motion', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    );
    const { container } = render(<Dialogue beats={['Said at once.']} />);
    expect(container.querySelector('.dialogue-cursor')).toBeNull();
  });

  it('announces the current beat politely rather than the whole exchange', () => {
    const { container } = render(<Dialogue beats={['One.', 'Two.']} />);
    const live = container.querySelectorAll('[aria-live]');
    // Exactly one live region: a reader should hear what was just said, not re-read everything
    // every time a letter lands.
    expect(live).toHaveLength(1);
    expect(live[0]?.getAttribute('aria-atomic')).toBe('true');
  });
});

// React runs every effect's cleanup once on mount under StrictMode, to prove it is safe to run
// twice. The leave path is an unmount cleanup, so that simulated unmount fired it -- and merely
// walking up to somebody reported all of their lines as heard before a character was drawn. It is
// the bug this component exists to remove, reintroduced through its own leave path, and it lived
// in development only, which is exactly where the browser suite runs.
describe('under StrictMode', () => {
  it('does not report a single beat merely by mounting', () => {
    const heard = vi.fn();
    render(
      <StrictMode>
        <Dialogue beats={['One.', 'Two.', 'Three.']} onBeatDone={heard} />
      </StrictMode>
    );
    expect(heard).not.toHaveBeenCalled();
  });

  it('still reports on a real unmount', () => {
    const heard = vi.fn();
    const { unmount } = render(
      <StrictMode>
        <Dialogue beats={['One.', 'Two.', 'Three.']} onBeatDone={heard} />
      </StrictMode>
    );
    typeItOut();
    unmount();
    expect(heard).toHaveBeenCalledTimes(3);
  });
});
