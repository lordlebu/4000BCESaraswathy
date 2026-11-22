// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { advance, emptyProgress } from '../src/journey';
import { discovery } from '../src/content/knowledge';
import { whoIsHere } from '../src/content/presence';
import { PlacePanel } from '../src/ui/PlacePanel';

afterEach(cleanup);

it('follows the recommended card in one dialog and returns to a direct continuation', async () => {
  const resolve = vi.fn();
  function Tower() {
    const [progress, setProgress] = useState(() => {
      const start = emptyProgress();
      for (const rung of discovery('discovery_tower_collapse')!.rungs) {
        for (const need of rung.requires) {
          const required = discovery(need);
          if (required) start.rungs[need] = required.rungs.length - 1;
        }
      }
      return start;
    });
    return (
      <PlacePanel poiId="poi_kavik_tower" presence={whoIsHere('poi_kavik_tower', 'field_map_lothal', 0, [])}
        progress={progress} firstVisit={false}
        onTalkTo={() => {}} onOpenStation={null} onClose={() => {}}
        onLook={id => setProgress(value => advance(value, id))} onResolveEvent={resolve} />
    );
  }
  render(<Tower />);
  expect(screen.getAllByRole('button', { name: /^Examine$/ })).toHaveLength(1);
  const trigger = screen.getByRole('button', { name: /^Examine$/ });
  expect(trigger.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  expect(trigger.closest('section')?.previousElementSibling?.classList.contains('place-people')).toBe(true);
  fireEvent.click(trigger);
  const dialog = await screen.findByRole('dialog', { name: 'Examine location' });
  const card = within(dialog);
  if (!card.queryByRole('heading', { name: 'The Lower Courses' })) {
    const other = card.getByRole('button', { name: 'Choose another' });
    expect(other.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(other);
    fireEvent.click(card.getByRole('button', { name: 'The Lower Courses' }));
  }
  fireEvent.click(card.getByRole('button', { name: 'Go in' }));
  fireEvent.click(card.getByRole('button', { name: 'Next card' }));
  expect(screen.getByRole('dialog')).toBe(dialog);
  expect(card.getByRole('heading', { name: 'How the Tower Sat Down' })).toBeTruthy();

  for (let index = 0; index < discovery('discovery_tower_collapse')!.rungs.length; index++) {
    fireEvent.click(card.getByRole('button', { name: /^Examine$/ }));
    if (index < discovery('discovery_tower_collapse')!.rungs.length - 1) {
      fireEvent.click(card.getByRole('button', { name: 'Next card' }));
    }
  }
  expect(card.getByRole('button', { name: 'Finish examining' })).toBeTruthy();
  fireEvent.click(card.getByRole('button', { name: 'Back out' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.queryByRole('button', { name: /^Examine$/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Explore the Stair Shaft' }));
  const shaft = await screen.findByRole('dialog', { name: 'Examine location' });
  expect(within(shaft).getByRole('heading', { name: 'The Stair Shaft' })).toBeTruthy();
  fireEvent.click(within(shaft).getByRole('button', { name: 'Leave examination' }));
  expect(resolve.mock.calls.map(([event]) => event.id)).toEqual([
    'sub_location_event:poi_kavik_tower:lower_courses',
    ...discovery('discovery_tower_collapse')!.rungs.map((_, index) => `discovery_event:discovery_tower_collapse:${index}`)
  ]);
});
