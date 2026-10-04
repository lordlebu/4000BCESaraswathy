// @vitest-environment jsdom
//
// The opening: a saying alone, then the plates, then the walk. Canon's words, the game's pacing.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Opening, TITLE_BRAHMI } from '../src/ui/Opening';
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


describe('the title comes first', () => {
  // The owner, 4 October 2026: every visit opens on *South of Tethys*, and the name in Brahmi, bold.
  it('is the name, and the name in Brahmi, bold', () => {
    const { baseElement } = render(<Opening prologue={prologue} title="first" onDone={() => {}} />);
    expect(screen.getByRole('heading', { name: 'South of Tethys' })).toBeTruthy();
    // Spelled out by code point, so an editor that cannot draw Brahmi cannot quietly change it.
    expect(TITLE_BRAHMI).toBe(
      '\u{11032}\u{11044}\u{11005}\u{11023}\u{11046} \u{11011}\u{11028}\u{11046} \u{11022}\u{11042}\u{11023}\u{1103A}\u{11032}\u{11046}'
    );
    const brahmi = baseElement.querySelector('.opening-title-brahmi b');
    expect(brahmi?.textContent).toBe(TITLE_BRAHMI);
    expect(baseElement.querySelector('[data-card="title"]')).toBeTruthy();
  });

  it('goes on into the saying and the plates for somebody who has never walked', () => {
    const onDone = vi.fn();
    const { baseElement } = render(<Opening prologue={prologue} title="first" onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(baseElement.textContent).toContain('Do not ask where the road ends.');
    for (let i = 0; i < prologue.plates.length; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Begin' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('stands alone for somebody coming back, and then hands over to the door', () => {
    const onDone = vi.fn();
    const { baseElement } = render(<Opening prologue={prologue} title="only" onDone={onDone} />);
    expect(baseElement.textContent).not.toContain('Do not ask where the road ends.');
    expect(screen.queryByRole('button', { name: 'Begin' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
