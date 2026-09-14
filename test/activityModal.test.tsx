// @vitest-environment jsdom
//
// The activity card: the thing a player actually sees between deciding to take something and
// having it.
//
// Written to the rule `tileActions.test.tsx` states, because this is exactly the shape that broke
// twice before: **the two recorded failures in this codebase were controls that rendered
// beautifully and called nothing.**
//
// What these guard, in order of how expensive the fault would be:
//
//   * an act that happens hands the caller its haul exactly once -- a card that settles twice pays
//     twice, and the satchel and the ground would disagree about what left the tile;
//   * **one press does it**, which is the whole of this layer's rewrite: no beat to miss, no
//     window, and nothing that can settle on its own between a player deciding and pressing;
//   * the card says what you brought *before* you commit, because that clause is the teaching that
//     replaced the timing bar and is the only thing telling anybody to go and make a knife;
//   * the card opens and works with **no art at all**, which is the state every new gesture and
//     every new painted variant starts in -- art is never a blocker;
//   * closing without committing takes nothing, so "Leave it" leaves it;
//   * the card opens on a gesture that **promises nothing** -- a night -- which every fixture here
//     used to have a material in, and which was consequently broken in three ways at once. See
//     `docs/testing.md`, "A flag that doubles as content only latches when the content is there".

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ActivityModal } from '../src/ui/ActivityModal';
import type { Preparation } from '../src/content/activity';
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

const prep = (over: Partial<Preparation> = {}): Preparation => ({
  wants: 'cut',
  equipped: false,
  favourable: false,
  ...over
});

const open = (over: Partial<Parameters<typeof ActivityModal>[0]> = {}) => {
  const onFinish = vi.fn();
  const onClose = vi.fn();
  render(
    <ActivityModal
      open
      gesture="stoop"
      promised={promised}
      preparation={prep()}
      toolName={null}
      creatureId={null}
      creatureName={null}
      onClose={onClose}
      onFinish={onFinish}
      {...over}
    />
  );
  return { onFinish, onClose };
};

describe('the activity card', () => {
  it('opens as a dialog and says which gesture it is', () => {
    open();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Cut and gather/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Leave it/ })).toBeTruthy();
  });

  it('calls a stalk something different from a stoop', () => {
    open({ gesture: 'stalk', creatureName: 'Beedu manta' });
    // The verb has to differ or the whole point of separating the gestures is invisible.
    expect(screen.getByRole('button', { name: /Follow it/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Cut and gather/ })).toBeNull();
  });

  it('calls a cast something different again', () => {
    open({ gesture: 'fish', creatureName: 'Estuary sawfish' });
    expect(screen.getByRole('button', { name: /Fish the shallows/ })).toBeTruthy();
  });

  /**
   * **There is no clock in this card, and this is the guard that keeps it out.**
   *
   * The timing track it replaced produced three separate faults that were all only reachable
   * because a modal had a `setInterval` in it: a run re-dealt on every render, a settle effect that
   * paid twice, and a button replaced mid-reach that read as CI flakiness for four runs.
   *
   * So: wait, do nothing, and assert nothing happened. A card that can settle on its own has
   * grown a clock back.
   */
  it('never settles on its own, however long it is left', async () => {
    vi.useFakeTimers();
    try {
      const { onFinish } = open();
      vi.advanceTimersByTime(60_000);
      expect(onFinish, 'the card settled without anybody pressing anything').not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /Cut and gather/ })).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  /**
   * **The clause that replaced the timing bar.**
   *
   * A player who is told "nothing in the satchel cuts" has been handed the next thing to make; one
   * who is told "the deer is feeding" has been handed a reason to watch the hour. Neither sentence
   * could exist while the grade came from reflexes -- and if this row ever stops rendering, the
   * game silently goes back to grading people on something it never told them about.
   */
  it('says what you brought, before you commit', () => {
    open({ preparation: prep({ equipped: true, favourable: true }), toolName: 'Flint knife' });
    const ready = document.querySelector('.activity-ready');
    expect(ready, 'the card did not say how ready the traveller is').toBeTruthy();
    expect(ready?.textContent).toMatch(/Flint knife/);
    expect(ready?.getAttribute('data-grade')).toBe('clean');
  });

  it('names what is missing when nothing to hand will do', () => {
    open({ preparation: prep({ equipped: false, favourable: false }) });
    const ready = document.querySelector('.activity-ready');
    expect(ready?.textContent).toMatch(/nothing in the satchel/i);
    expect(ready?.getAttribute('data-grade')).toBe('clumsy');
  });

  it('stops saying it once the act is done', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: /Cut and gather/ }));
    expect(document.querySelector('.activity-ready')).toBeNull();
  });

  /**
   * **A gesture with no painting still opens and works.**
   *
   * Art is optional everywhere in this card: a gesture added later starts with none, and so does
   * every painted variant -- `make-firing.png`, `rest-roof.png`, a plate for a new fish. The card
   * must keep its shape either way so it does not jump when a painting lands.
   */
  it('opens and works with no painting at all', () => {
    // @ts-expect-error -- deliberately a gesture that does not exist, which is the whole point:
    // the component must not require art it was never given.
    open({ gesture: 'dance' });
    expect(screen.getByRole('dialog')).toBeTruthy();
    // The picture box is still there, so the card does not change shape when art lands.
    expect(document.querySelector('.activity-scene')).toBeTruthy();
    expect(document.querySelector('img.activity-scene'), 'an image appeared with no art').toBeNull();
  });

  /** A variant nobody has painted falls back to the gesture's own scene rather than to nothing. */
  it('falls back to the gesture when a variant has no painting', () => {
    open({ gesture: 'stoop', variant: 'firing' });
    expect(document.querySelector('img.activity-scene'), 'an unpainted variant lost the picture')
      .toBeTruthy();
  });

  it('shows the painting when there is one', () => {
    open({ gesture: 'stoop' });
    const img = document.querySelector('img.activity-scene');
    expect(img, 'the stoop painting is in the folder and did not render').toBeTruthy();
    // Decorative: the prose beside it says what is happening, and a screen reader announcing a
    // painting of hands cutting reeds adds nothing to that.
    expect(img?.getAttribute('aria-hidden')).toBe('true');
  });

  it('hands over the haul once, and only once, on one press', () => {
    const { onFinish } = open();
    fireEvent.click(screen.getByRole('button', { name: /Cut and gather/ }));
    expect(onFinish).toHaveBeenCalledTimes(1);

    const [taken, line] = onFinish.mock.calls[0]!;
    expect(taken).toHaveLength(1);
    expect(line.length, 'the journal got an empty line').toBeGreaterThan(10);
  });

  /** What came back, in the card, because a sentence is easy to miss and the satchel is a screen away. */
  it('shows what was taken', () => {
    open({ preparation: prep({ equipped: true, favourable: true }) });
    fireEvent.click(screen.getByRole('button', { name: /Cut and gather/ }));
    const haul = document.querySelector('.activity-haul');
    expect(haul?.textContent).toMatch(/Reed fibre/);
    // A clean act pays two, and the count is on screen rather than only in the prose.
    expect(haul?.textContent).toMatch(/2/);
  });

  /**
   * The floor, asserted through the component rather than through `settle` alone.
   *
   * `activity.test.ts` proves the function cannot pay less than promised. This proves the card
   * actually calls it with what it was given -- a wiring fault would produce the same empty hand
   * the ruling forbids, and the pure test would still pass.
   */
  it('never hands back less than the tile promised', () => {
    const { onFinish } = open({ preparation: prep({ equipped: false, favourable: false }) });
    fireEvent.click(screen.getByRole('button', { name: /Cut and gather/ }));
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
   * **The fault the browser found while 900 unit tests passed, kept as a guard.**
   *
   * The run used to be dealt in an effect keyed on a `roll` prop, so a caller passing an inline
   * arrow -- a new identity every render -- re-dealt it on every tick of the card's own timer. The
   * run then never settled. There is no deal and no timer now, but a parent that re-renders is
   * still the ordinary case and must not disturb a settled card.
   */
  it('does not lose the result when the parent re-renders', () => {
    const onFinish = vi.fn();
    const onClose = vi.fn();
    const props = {
      open: true as const,
      gesture: 'stoop' as const,
      promised,
      preparation: prep(),
      toolName: null,
      creatureId: null,
      creatureName: null,
      onClose,
      onFinish
    };
    const { rerender } = render(<ActivityModal {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /Cut and gather/ }));
    rerender(<ActivityModal {...props} />);
    rerender(<ActivityModal {...props} />);

    expect(onFinish, 'the card re-ran when the parent re-rendered').toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Put it in the satchel/ })).toBeTruthy();
  });

  /**
   * **Resting, which is the gesture with nothing in it -- and the one that was broken.**
   *
   * Every other gesture comes off a tile that promised a material, so `promised` is never empty
   * and the settled line is never blank. A night promises nothing. That single difference walked
   * straight through the component: the line came back `''`, the flag that said "this is over"
   * *was* that line, and so it never registered as over. The card went blank, kept its controls,
   * and paid `onFinish` twice.
   *
   * Grouped in one case on purpose -- they are one fault seen from four sides, and splitting them
   * would suggest a component can have three of them and not the fourth.
   */
  it('settles a rest, which promises nothing', () => {
    const { onFinish } = open({
      gesture: 'rest',
      promised: [],
      preparation: prep({ wants: null, favourable: true }),
      variant: 'camp',
      subject: 'Make camp for the night'
    });
    fireEvent.click(screen.getByRole('button', { name: /Stop for the night/ }));
    // A second press must not pay again.
    const again = screen.queryByRole('button', { name: /Stop for the night/ });
    if (again) fireEvent.click(again);

    expect(onFinish, 'a night with nothing in it settled more than once').toHaveBeenCalledTimes(1);
    // The card says how the night went. `attemptLine` has three sentences for a rest and nothing
    // could reach any of them.
    const prose = document.querySelector('.activity-prose')?.textContent ?? '';
    expect(prose.length, 'the card went blank when the night finished').toBeGreaterThan(10);
    // And it looks finished: no way left to do it again.
    expect(
      screen.queryByRole('button', { name: /Stop for the night/ }),
      'a settled night could still be slept again'
    ).toBeNull();
    // The way out says what pressing it does. "Put it in the satchel" puts no night anywhere.
    expect(screen.getByRole('button', { name: /Start the day/ })).toBeTruthy();
  });

  /**
   * A night is spent on the way out of the card whatever was pressed, so the escape hatch must not
   * offer to back out of one. Every other gesture keeps "Leave it", which does leave it.
   */
  it('does not offer to leave a night it is going to spend anyway', () => {
    open({ gesture: 'rest', promised: [], subject: 'Make camp for the night' });
    expect(screen.queryByRole('button', { name: /Leave it/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Sleep now/ })).toBeTruthy();
  });

  it('closes on Escape', () => {
    const { onClose } = open();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  /** Enter does it, then Enter closes it: one key for a card that only ever has one action. */
  it('commits and then closes on Enter', () => {
    const { onFinish, onClose } = open();
    fireEvent.keyDown(window, { code: 'Enter' });
    expect(onFinish).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { code: 'Enter' });
    expect(onClose).toHaveBeenCalled();
    expect(onFinish, 'a second Enter paid out again').toHaveBeenCalledTimes(1);
  });
});
