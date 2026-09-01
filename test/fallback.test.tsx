// @vitest-environment jsdom
//
// What the player sees when something throws.
//
// Until the boundary existed an uncaught error blanked the page -- React unmounts the whole tree
// when a render fails and nothing was catching it. These check the two things that matter: that
// it catches, and that it offers a way back rather than a stack trace.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Fallback } from '../src/ui/Fallback';

afterEach(cleanup);

function Boom(): never {
  throw new Error('the river ate it');
}

describe('the error boundary', () => {
  it('renders its children when nothing is wrong', () => {
    render(
      <Fallback seed="poi-1621">
        <p>the map</p>
      </Fallback>
    );
    expect(screen.getByText('the map')).toBeTruthy();
  });

  it('catches a throw instead of blanking the page', () => {
    // React logs the caught error itself, which is noise here rather than a failure.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <Fallback seed="poi-1621">
        <Boom />
      </Fallback>
    );
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Pick it up again/ })).toBeTruthy();
    quiet.mockRestore();
  });

  it('shows the seed, which is the way back to the same world', () => {
    // The save survives whatever just happened -- it is written on every step. The danger is a
    // player who cannot find their way back to it.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <Fallback seed="poi-1621">
        <Boom />
      </Fallback>
    );
    expect(screen.getByText('poi-1621')).toBeTruthy();
    quiet.mockRestore();
  });

  it('says nothing about stacks, and does not apologise', () => {
    // The register is the rest of the game's. Somebody who came to walk a river wants neither.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <Fallback seed="poi-1621">
        <Boom />
      </Fallback>
    );
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/sorry|apolog/i);
    expect(text).not.toMatch(/stack|Error:|undefined/i);
    // And it says the thing that is actually true and reassuring.
    expect(text).toMatch(/still be there/i);
    quiet.mockRestore();
  });
});
