import { expect, it } from 'vitest';
import { nextStep } from '../src/content/guide';
import type { Suggestion } from '../src/content/actionable';
const coach: Suggestion = { id: 'coach', reason: 'coach', line: 'Gather reeds.' };
const pinned: Suggestion = { id: 'pin', reason: 'pin', line: 'Make rope.' };
const automatic: Suggestion = { id: 'news', reason: 'news', line: 'Talk to Uma.' };
it('keeps the first morning, explicit pin and automatic guidance in priority order', () => {
  expect(nextStep({ coach, pinned, automatic })).toBe(coach);
  expect(nextStep({ coach: null, pinned, automatic })).toBe(pinned);
  expect(nextStep({ coach: null, pinned: null, automatic })).toBe(automatic);
  expect(nextStep({ coach: null, pinned: null, automatic: null })).toBeNull();
});
