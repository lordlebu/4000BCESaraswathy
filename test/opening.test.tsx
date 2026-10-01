// @vitest-environment jsdom
//
// The opening: a saying alone, then the plates, then the walk. Canon's words, the game's pacing.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Opening } from '../src/ui/Opening';
import { fieldMap } from '../src/content/places';

afterEach(cleanup);
const prologue = fieldMap('field_map_lothal')!.prologue!;

describe('the opening', () => {
  it('is canon\u2019s: Lothal has one, and the other maps do not', () => {
    expect(prologue.opening).toBe('saying_the_walking_song');
    expect(prologue.plates.length).toBe(4);
    expect(fieldMap('field_map_dwarka')!.prologue).toBeNull();
  });

  it('opens on the Walking Song alone, then each plate, then begins', () => {
    const onDone = vi.fn();
    const { baseElement } = render(<Opening prologue={prologue} onDone={onDone} />);
    expect(baseElement.textContent).toContain('Do not ask where the road ends.');
    expect(baseElement.textContent).toContain('The Walking Song');
    for (const plate of prologue.plates) {
      fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
      expect(baseElement.textContent).toContain(plate.lines[0]);
    }
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Begin' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('can be skipped from the first card', () => {
    const onDone = vi.fn();
    render(<Opening prologue={prologue} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('draws a stand-in where a painting has not arrived yet', () => {
    const { baseElement } = render(<Opening prologue={prologue} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    const plate = baseElement.querySelector('.opening-plate')!;
    expect(plate).toBeTruthy();
  });

  it('names nobody, and never says why the world is as it is', () => {
    const words = prologue.plates.flatMap((p) => p.lines).join(' ');
    expect(words).not.toMatch(/Varuna|Mitra|Shattering|cataclysm/i);
  });
});
