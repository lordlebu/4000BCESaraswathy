// @vitest-environment jsdom
//
// The activity modal: the thing a player actually sees between deciding to take something and
// having it.
//
// Written to the rule `tileActions.test.tsx` states, because this is exactly the shape that broke
// twice before: **the two recorded failures in this codebase were controls that rendered
// beautifully and called nothing.** A modal with a timer, three buttons and a settle step has
// more places to do that than anything else in the UI.
//
// What these guard, in order of how expensive the fault would be:
//
//   * a run that ends hands the caller its haul exactly once -- a modal that settles twice pays
//     twice, and the satchel and the ground would disagree about what left the tile;
//   * the modal opens and plays with **no art at all**, which is the state the repository is in
//     today and the state every new gesture starts in;
//   * closing without finishing takes nothing, so "Leave it" leaves it.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ActivityModal } from '../src/ui/ActivityModal';
import { BEATS } from '../src/content/activity';
import type { Taking } from '../src/content/nodes';
import type { Material } from '../src/content/making';

afterEach(cleanup);

const material = (over: Partial<Material> = {}): Material =>
  ({
    id: 'material_reed_fibre',
    name: 'Reed fibre',
    classes: ['fibre'],
    foundIn: ['wetlands'],
    rarity: 'common',
    renews: 'fast',
    wonFrom: ['river-reed'],
    description: 'A test material.',
    ...over
  }) as Material;

const promised: Taking[] = [{ material: material(), count: 1 }];
const roll = (salt: string) => salt.length * 137;

const open = (over: Partial<Parameters<typeof ActivityModal>[0]> = {}) => {
  const onFinish = vi.fn();
  const onClose = vi.fn();
  render(
    <ActivityModal
      open
      gesture="stoop"
      promised={promised}
      difficulty={0}
      roll={roll}
      creatureId={null}
      creatureName={null}
      onClose={onClose}
      onFinish={onFinish}
      {...over}
    />
  );
  return { onFinish, onClose };
};

describe('the activity modal', () => {
  it('opens as a dialog and says which gesture it is', () => {
    open();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Strike/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Leave it/ })).toBeTruthy();
  });

  it('calls a stalk something different from a stoop', () => {
    open({ gesture: 'stalk', creatureName: 'Beedu manta' });
    // The verb has to differ or the whole point of separating the gestures is invisible.
    expect(screen.getByRole('button', { name: /Move now/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Strike$/ })).toBeNull();
  });

  /**
   * **A gesture with no painting still opens and plays.**
   *
   * This was written when `src/ui/scenes/` was empty and asserted that *no* image rendered, which
   * was a fact about the repository rather than about the component -- so it failed the moment the
   * art arrived, which is the wrong way round. What actually matters is the fallback: art is
   * optional, a gesture added later starts with none, and the card must keep its shape either way
   * so it does not jump when a painting lands.
   *
   * So it now asks for a gesture nobody has painted, which is the condition rather than the
   * calendar.
   */
  it('opens and plays with no painting at all', () => {
    // @ts-expect-error -- deliberately a gesture that does not exist, which is the whole point:
    // the component must not require art it was never given.
    open({ gesture: 'dance' });
    expect(screen.getByRole('dialog')).toBeTruthy();
    // The picture box is still there, so the card does not change shape when art lands.
    expect(document.querySelector('.activity-scene')).toBeTruthy();
    expect(document.querySelector('img.activity-scene'), 'an image appeared with no art').toBeNull();
  });

  it('shows the painting when there is one', () => {
    open({ gesture: 'stoop' });
    const img = document.querySelector('img.activity-scene');
    expect(img, 'the stoop painting is in the folder and did not render').toBeTruthy();
    // Decorative: the prose beside it says what is happening, and a screen reader announcing a
    // painting of hands cutting reeds adds nothing to that.
    expect(img?.getAttribute('aria-hidden')).toBe('true');
  });

  it('hands over the haul once, and only once, when the run ends', () => {
    const { onFinish } = open();
    for (let i = 0; i < BEATS; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /Strike/ }));
    }
    expect(onFinish).toHaveBeenCalledTimes(1);

    const [taken, line] = onFinish.mock.calls[0]!;
    expect(taken).toHaveLength(1);
    expect(line.length, 'the journal got an empty line').toBeGreaterThan(10);
  });

  /**
   * The floor, asserted through the component rather than through `settle` alone.
   *
   * `activity.test.ts` proves the function cannot pay less than promised. This proves the modal
   * actually calls it with what it was given -- a wiring fault would produce the same empty hand
   * the ruling forbids, and the pure test would still pass.
   */
  it('never hands back less than the tile promised', () => {
    const { onFinish } = open({ difficulty: 1 });
    for (let i = 0; i < BEATS; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /Strike/ }));
    }
    const [taken] = onFinish.mock.calls[0]!;
    expect(taken[0].count).toBeGreaterThanOrEqual(promised[0]!.count);
  });

  it('takes nothing when the player leaves it', () => {
    const { onFinish, onClose } = open();
    fireEvent.click(screen.getByRole('button', { name: /Leave it/ }));
    expect(onClose).toHaveBeenCalled();
    expect(onFinish, 'leaving it still took the material').not.toHaveBeenCalled();
  });

  /**
   * **The fault the browser found while 900 unit tests passed.**
   *
   * The attempt is dealt in an effect keyed on `roll`, so a caller passing an inline arrow --
   * a new identity every render -- re-deals the bands on every tick of the modal's own timer.
   * Beats never accumulate, the run never settles, and every test that clicks Strike three times
   * in a row still passes because it never re-renders in between.
   *
   * So this re-renders with a *fresh* `roll` mid-run, the way an unmemoised parent does, and
   * asserts the beats survive it.
   */
  it('does not lose the run when the parent re-renders', () => {
    const onFinish = vi.fn();
    const onClose = vi.fn();
    const props = {
      open: true as const,
      gesture: 'stoop' as const,
      promised,
      difficulty: 0,
      creatureId: null,
      creatureName: null,
      onClose,
      onFinish
    };
    const { rerender } = render(<ActivityModal {...props} roll={(s: string) => s.length} />);

    fireEvent.click(screen.getByRole('button', { name: /Strike/ }));
    // A new function identity, exactly as an inline arrow in the parent would give.
    rerender(<ActivityModal {...props} roll={(s: string) => s.length} />);
    fireEvent.click(screen.getByRole('button', { name: /Strike/ }));
    rerender(<ActivityModal {...props} roll={(s: string) => s.length} />);
    fireEvent.click(screen.getByRole('button', { name: /Strike/ }));

    expect(onFinish, 'the run restarted when the parent re-rendered').toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', () => {
    const { onClose } = open();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('stops accepting strikes once the run is over', () => {
    const { onFinish } = open();
    for (let i = 0; i < BEATS + 3; i += 1) {
      const button = screen.queryByRole('button', { name: /Strike/ });
      if (button) fireEvent.click(button);
    }
    expect(onFinish, 'a settled run paid out again').toHaveBeenCalledTimes(1);
  });
});
