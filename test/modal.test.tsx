// @vitest-environment jsdom
//
// The six things a modal has to do, tested on the one component that now does them.
//
// **This suite exists because the browser found what the unit tests could not.** Eleven panels
// declared `aria-modal="true"`; tabbing through Records in a real Chromium put eight of the next
// ten stops outside the dialog, and every test in this repository passed throughout. Nothing was
// asking the question -- the panels were checked for what they rendered, never for where the
// keyboard could go once they had rendered it.
//
// jsdom implements neither `inert` nor real focus order, so two of these assertions check the
// mechanism rather than the outcome: that `#root` carries the attribute, and that the explicit
// Tab wrap moves focus where it should. `e2e/keyboard.spec.ts` is the half that proves a real
// browser agrees.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { Modal } from '../src/ui/Modal';

afterEach(cleanup);

/** The `#root` the portal steps outside of, and the trigger a modal is opened from. */
function withRoot(): HTMLElement {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
  return root;
}

afterEach(() => {
  document.getElementById('root')?.remove();
});

function Panel({ onClose }: { onClose?: () => void }) {
  return (
    <Modal open label="A panel" onClose={onClose}>
      <section>
        <button type="button">First</button>
        <button type="button">Middle</button>
        <button type="button">Last</button>
      </section>
    </Modal>
  );
}

describe('the modal primitive', () => {
  it('renders outside the container it was rendered into', () => {
    // The whole reason the portal exists: everything the application draws stays in `#root`, so
    // one attribute on `#root` can take all of it out of the keyboard's reach.
    const { container } = render(<Panel />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('names itself, so a screen reader says more than "dialog"', () => {
    render(<Panel />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('A panel');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('starts focus on the first thing inside', () => {
    render(<Panel />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First' }));
  });

  it('starts focus where the panel asks instead, when it asks', () => {
    function Asking() {
      const wanted = useRef<HTMLButtonElement>(null);
      return (
        <Modal open label="Asking" initialFocus={wanted}>
          <section>
            <button type="button">First</button>
            <button type="button" ref={wanted}>
              Close
            </button>
          </section>
        </Modal>
      );
    }
    render(<Asking />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<Panel onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not close on Escape when it cannot be dismissed', () => {
    // The front door. There is no way out of it but through, so Escape must do nothing rather
    // than drop the player into a game that has not started.
    render(<Panel />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  describe('the trap', () => {
    it('wraps forward from the last control to the first', () => {
      render(<Panel />);
      const last = screen.getByRole('button', { name: 'Last' });
      last.focus();
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First' }));
    });

    it('wraps backward from the first control to the last', () => {
      render(<Panel />);
      const first = screen.getByRole('button', { name: 'First' });
      first.focus();
      fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Last' }));
    });

    it('pulls focus back in if it is somehow outside', () => {
      const root = withRoot();
      const stray = document.createElement('button');
      root.appendChild(stray);
      render(<Panel />);
      stray.focus();
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First' }));
    });

    it('leaves the middle of the panel alone', () => {
      // A trap that intercepts every Tab is a trap you cannot move inside. Only the two ends are
      // the primitive's business; the browser walks the rest.
      render(<Panel />);
      const middle = screen.getByRole('button', { name: 'Middle' });
      middle.focus();
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(document.activeElement).toBe(middle);
    });
  });

  describe('the rest of the application', () => {
    it('is inert while a modal is open, and is not afterwards', () => {
      const root = withRoot();
      const { unmount } = render(<Panel />);
      expect(root.hasAttribute('inert')).toBe(true);
      unmount();
      expect(root.hasAttribute('inert')).toBe(false);
    });

    it('stays inert until the last of two modals closes', () => {
      // The workshop opening over the records. A per-component flag would have the first one to
      // close hand the keyboard back to a page still covered by the second.
      const root = withRoot();
      const first = render(<Panel />);
      const second = render(
        <Modal open label="Second">
          <section>
            <button type="button">Only</button>
          </section>
        </Modal>
      );
      expect(root.hasAttribute('inert')).toBe(true);
      first.unmount();
      expect(root.hasAttribute('inert')).toBe(true);
      second.unmount();
      expect(root.hasAttribute('inert')).toBe(false);
    });
  });

  describe('two at once', () => {
    /**
     * An album with a plate open over it — the real case, as a controlled pair.
     *
     * Controlled, and the word is load-bearing. An earlier version of this test rendered the album
     * with `onClose={noop}`, so the outer panel could not close and the assertion passed whatever
     * the primitive did. A test that cannot fail is worse than no test.
     */
    function Stacked() {
      const [outer, setOuter] = useState(true);
      const [inner, setInner] = useState(true);
      return (
        <Modal open={outer} label="Album" onClose={() => setOuter(false)}>
          <section>
            <button type="button">Browse</button>
            <Modal open={inner} label="Plate" onClose={() => setInner(false)}>
              <section>
                <button type="button">Look</button>
              </section>
            </Modal>
          </section>
        </Modal>
      );
    }

    it('Escape closes the top one and leaves the one underneath', () => {
      // Both listen on the window in the capture phase, where listeners on one target fire in
      // registration order — so the outer modal, registered first, would answer a key meant for the
      // inner one. A player pressing Escape to put a picture down would lose the album behind it.
      withRoot();
      render(<Stacked />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: 'Plate' }), 'the plate should have closed').toBeNull();
      expect(
        screen.queryByRole('dialog', { name: 'Album' }),
        'the album closed too — the wrong modal answered Escape'
      ).not.toBeNull();
    });

    it('hands the keyboard back when the top one goes', () => {
      withRoot();
      render(<Stacked />);

      fireEvent.keyDown(window, { key: 'Escape' });
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: 'Album' })).toBeNull();
    });

    it('keeps the application inert until both have gone', () => {
      const root = withRoot();
      render(<Stacked />);
      expect(root.hasAttribute('inert')).toBe(true);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(root.hasAttribute('inert')).toBe(true);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(root.hasAttribute('inert')).toBe(false);
    });
  });

  it('puts focus back on whatever opened it', () => {
    // Without this the keyboard lands at the top of the document, which on this game means the
    // control bar — several presses away from the button somebody just closed.
    const root = withRoot();
    const trigger = document.createElement('button');
    root.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = render(<Panel />);
    expect(document.activeElement).not.toBe(trigger);

    unmount();
    expect(document.activeElement).toBe(trigger);
  });

  it('does not chase a trigger that has since gone', () => {
    // The Workshop button disappears once there is nothing left to make there. Restoring focus to
    // a removed element throws the keyboard to the top of the document instead of leaving it be.
    const root = withRoot();
    const trigger = document.createElement('button');
    root.appendChild(trigger);
    trigger.focus();

    const { unmount } = render(<Panel />);
    trigger.remove();
    expect(() => unmount()).not.toThrow();
  });

  it('renders nothing at all when closed', () => {
    render(
      <Modal open={false} label="Shut">
        <section>
          <button type="button">Unreachable</button>
        </section>
      </Modal>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Unreachable' })).toBeNull();
  });
});
