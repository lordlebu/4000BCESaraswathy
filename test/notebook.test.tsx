// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Diary } from '../src/ui/Diary';
import { word } from '../src/content/knowledge';
import { emptyProgress, learn } from '../src/journey';

const noop = () => {};
afterEach(() => { cleanup(); vi.restoreAllMocks(); Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView'); });

it('offers only sections with content and focuses the chosen section without hiding its words', () => {
  const scroll = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scroll });
  render(<Diary open progress={learn(emptyProgress(), 'word_kia_thal')} onClose={noop} onAnswer={noop} onOpenEnding={noop} onOpenKit={noop} />);
  const nav = screen.getByRole('navigation', { name: 'Diary sections' });
  expect(within(nav).getAllByRole('link')).toHaveLength(1);
  fireEvent.click(within(nav).getByRole('link', { name: /^Words$/ }));
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: /^Words$/ }));
  expect(scroll).toHaveBeenCalledOnce();
  expect(screen.getByText(word('word_kia_thal')!.word)).toBeDefined();
});

it('sends a reading-size choice to the owner rather than changing journey state', () => {
  const change = vi.fn();
  const progress = emptyProgress();
  render(<Diary open progress={progress} readingSize="comfortable" onReadingSize={change} onClose={noop} onAnswer={noop} onOpenEnding={noop} onOpenKit={noop} />);
  const picker = screen.getByRole('combobox', { name: 'Reading size' });
  expect((picker as HTMLSelectElement).value).toBe('comfortable');
  fireEvent.change(picker, { target: { value: 'large' } });
  expect(change).toHaveBeenCalledWith('large');
  expect(progress).toEqual(emptyProgress());
});
