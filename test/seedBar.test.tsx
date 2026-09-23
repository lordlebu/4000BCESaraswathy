// @vitest-environment jsdom
// The seed bar says what a seed is, and can pick one.
//
// Reported from play: it was hard to understand which seed to choose and what a new one meant. The
// answer is the usual one for seeded games -- a line of explanation and a button that picks a seed
// -- and these hold it to that.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SeedBar } from '../src/ui/SeedBar';
import { randomSeed } from '../src/ui/seed';

describe('a random seed', () => {
  it('is readable: two words and a number', () => {
    for (let i = 0; i < 50; i += 1) expect(randomSeed()).toMatch(/^[a-z]+-[a-z]+-\d{1,2}$/);
  });

  it('is the same seed for the same draw, so it is a seed like any other', () => {
    const fixed = () => 0.5;
    expect(randomSeed(fixed)).toBe(randomSeed(fixed));
  });

  it('never runs off the end of its word lists', () => {
    expect(randomSeed(() => 0.9999999)).toMatch(/^[a-z]+-[a-z]+-99$/);
    expect(randomSeed(() => 0)).toMatch(/^[a-z]+-[a-z]+-0$/);
  });
});

describe('the seed bar', () => {
  afterEach(cleanup);

  it('explains what a seed is', () => {
    render(<SeedBar seed="jambhudweepa-evening" onGenerate={() => {}} />);
    expect(screen.getByText(/same seed always makes the same land/)).toBeTruthy();
  });

  it('goes to a new random map in one press', () => {
    const onGenerate = vi.fn();
    render(<SeedBar seed="jambhudweepa-evening" onGenerate={onGenerate} />);
    fireEvent.click(screen.getByRole('button', { name: 'New random map' }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
    const chosen = onGenerate.mock.calls[0]![0] as string;
    expect(chosen).toMatch(/^[a-z]+-[a-z]+-\d{1,2}$/);
    expect((screen.getByLabelText('Journey seed') as HTMLInputElement).value).toBe(chosen);
  });
});
