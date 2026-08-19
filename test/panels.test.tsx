// @vitest-environment jsdom
//
// The panels, rendered.
//
// These exist because of three bugs that all reached a browser before anything noticed:
//
//   * the diary decided it was empty by counting discoveries, so a player whose first act was
//     to talk to somebody was told they had written nothing down — with the question they had
//     just been given hidden behind that message;
//   * the place panel opened over the field notes and buried them;
//   * settling a question was unreachable, because nothing called `answer`.
//
// Every one is a rendering question with a rules-shaped cause, which is exactly the seam a
// component test covers and neither a unit test nor a five-minute browser suite covers well.
// Each test below states which bug it would have caught.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Diary } from '../src/ui/Diary';
import { QuestionCard } from '../src/ui/Questions';
import { Ending } from '../src/ui/Ending';
import { FieldKit } from '../src/ui/FieldKit';
import { Here } from '../src/ui/Here';
import { CollectionPanel } from '../src/ui/CollectionPanel';
import { LANGUAGE_INK, PersonPortrait } from '../src/ui/PersonPortrait';
import { npcs } from '../src/content/places';
import { emptyCollection, metOnTile } from '../src/content/collection';
import { metSpecies } from '../src/content/species';
import {
  type Progress,
  advance,
  answer,
  canAdvance,
  emptyProgress,
  hear,
  learn,
  linesFor
} from '../src/journey';
import { discoveries, vocabulary } from '../src/content/knowledge';

const MOMENTS = ['dawn', 'morning', 'afternoon', 'evening', 'night'].flatMap((timeOfDay) =>
  ['clear', 'rain', 'mist', 'storm'].map((weather) => ({ timeOfDay, weather }))
);

function climb(progress: Progress, id: string): Progress {
  let p = progress;
  for (;;) {
    const m = MOMENTS.find((x) => canAdvance(p, id, x));
    if (!m) return p;
    p = advance(p, id, m);
  }
}

/** Heard everybody at least once — the state a player reaches by talking before looking. */
function talkedToBekh(): Progress {
  let p = emptyProgress();
  for (let i = 0; i < linesFor(p, 'npc_bekh').length; i += 1) p = hear(p, 'npc_bekh', i);
  return p;
}

const noop = () => {};

/**
 * Unmount between tests.
 *
 * Testing Library only registers this for you when vitest runs with globals, which this
 * project does not — so without it the DOM accumulates and every query searches the previous
 * test's markup too. It fails in the most misleading way possible: the first three assertions
 * written here all "failed" by finding an empty diary that belonged to an earlier render.
 */
afterEach(cleanup);

describe('the diary decides whether it is empty', () => {
  it('says so when nothing at all has happened', () => {
    render(<Diary progress={emptyProgress()} moment={null} open onClose={noop} onAnswer={noop} onOpenEnding={noop} onOpenKit={noop} />);
    expect(screen.getByText(/have not written anything down/i)).toBeDefined();
  });

  it('does not call itself empty when a question has been written in it', () => {
    // The bug: emptiness was counted in discoveries, so this state showed "nothing written
    // down" *and* hid the question behind that message. It took a browser run to find.
    const p = talkedToBekh();
    expect(p.questions.length).toBeGreaterThan(0);

    render(<Diary progress={p} moment={null} open onClose={noop} onAnswer={noop} onOpenEnding={noop} onOpenKit={noop} />);
    expect(screen.queryByText(/have not written anything down/i)).toBeNull();
    expect(screen.getByRole('heading', { name: /open questions/i })).toBeDefined();
  });

  it('does not call itself empty when only a word has been learned', () => {
    const p = learn(emptyProgress(), 'word_kia_thal');
    render(<Diary progress={p} moment={null} open onClose={noop} onAnswer={noop} onOpenEnding={noop} onOpenKit={noop} />);
    expect(screen.queryByText(/have not written anything down/i)).toBeNull();
  });

  it('renders nothing at all when closed', () => {
    const { container } = render(
      <Diary progress={emptyProgress()} moment={null} open={false} onClose={noop} onAnswer={noop} onOpenEnding={noop} onOpenKit={noop} />
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('the diary keeps the crossings-out', () => {
  it('shows every reading written so far, the superseded ones struck', () => {
    let p = advance(emptyProgress(), 'discovery_saltreed_thatch');
    p = advance(p, 'discovery_saltreed_thatch');

    const { container } = render(
      <Diary progress={p} moment={null} open onClose={noop} onAnswer={noop} onOpenEnding={noop} onOpenKit={noop} />
    );
    const readings = container.querySelectorAll('.revisions .reading');
    expect(readings.length).toBe(2);
    // The earlier one is crossed out, not replaced. This is the panel's whole idea.
    expect(readings[0]!.className).toContain('struck');
    expect(readings[1]!.className).not.toContain('struck');
  });

  it('shows no row at all for a discovery never noticed', () => {
    const { container } = render(
      <Diary progress={emptyProgress()} moment={null} open onClose={noop} onAnswer={noop} onOpenEnding={noop} onOpenKit={noop} />
    );
    expect(container.querySelectorAll('.entry').length).toBe(0);
  });

  it('explains a rung held back by the weather as a reason, not a lock', () => {
    const p = advance(emptyProgress(), 'discovery_silver_water');
    render(
      <Diary
        progress={p}
        moment={{ timeOfDay: 'afternoon', weather: 'clear' }}
        open
        onClose={noop}
        onAnswer={noop}
        onOpenEnding={noop}
        onOpenKit={noop}
      />
    );
    expect(screen.getByText(/come back at night/i)).toBeDefined();
  });
});

describe('settling a question', () => {
  it('shows both accounts and marks neither as right', () => {
    render(<QuestionCard questionId="question_eastern_field" progress={emptyProgress()} onAnswer={noop} />);
    expect(screen.getByText(/^Locally$/)).toBeDefined();
    expect(screen.getByText(/^The University$/)).toBeDefined();
    expect(screen.queryByText(/correct|incorrect|right answer|wrong answer/i)).toBeNull();
  });

  it('lists readings it cannot support, and says what is missing', () => {
    const { container } = render(
      <QuestionCard questionId="question_silver_water" progress={emptyProgress()} onAnswer={noop} />
    );
    // Unlike the diary, a question hides nothing: the shape of the disagreement is the content.
    expect(container.querySelectorAll('.readings li').length).toBeGreaterThan(1);
    expect(screen.getAllByText(/You would need/i).length).toBeGreaterThan(0);
  });

  it('offers a button once the evidence supports a reading, and answers with its index', () => {
    // The bug this covers: `answer` had no caller anywhere, so the game's signature mechanic
    // could not be performed at all.
    const p = climb(emptyProgress(), 'discovery_silver_water');
    const onAnswer = vi.fn();
    render(<QuestionCard questionId="question_silver_water" progress={p} onAnswer={onAnswer} />);

    fireEvent.click(screen.getAllByRole('button', { name: /write this down/i })[0]!);
    expect(onAnswer).toHaveBeenCalledWith('question_silver_water', expect.any(Number));
  });

  it('records the choice without passing judgement on it', () => {
    let p = climb(emptyProgress(), 'discovery_silver_water');
    p = answer(p, 'question_silver_water', 0);
    const { container } = render(
      <QuestionCard questionId="question_silver_water" progress={p} onAnswer={noop} />
    );
    expect(container.querySelectorAll('.reading-chosen').length).toBe(1);
    expect(screen.getByText(/written down/i)).toBeDefined();
    expect(screen.queryByText(/since troubled/i)).toBeNull();
  });

  it('raises the doubt only once the player has found what raises it', () => {
    let p = climb(emptyProgress(), 'discovery_silver_water');
    p = answer(p, 'question_silver_water', 0);
    p = climb(p, 'discovery_dockyard_reef');

    const { container } = render(
      <QuestionCard questionId="question_silver_water" progress={p} onAnswer={noop} />
    );
    expect(within(container).getByText(/Since then/i)).toBeDefined();
    expect(screen.getByText(/since troubled/i)).toBeDefined();
  });
});

describe('the knowledge tree', () => {
  it('never claims a discipline the player has not touched', () => {
    const p = climb(emptyProgress(), 'discovery_saltreed_thatch');
    const { container } = render(
      <Diary progress={p} moment={null} open onClose={noop} onAnswer={noop} onOpenEnding={noop} onOpenKit={noop} />
    );
    const shown = [...container.querySelectorAll('.disc-name')].map((e) => e.textContent);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThan(7);
  });

  it('counts rungs rather than discoveries, so half-understanding shows', () => {
    const one = advance(emptyProgress(), 'discovery_saltreed_thatch');
    const { container } = render(
      <Diary progress={one} moment={null} open onClose={noop} onAnswer={noop} onOpenEnding={noop} onOpenKit={noop} />
    );
    const bar = container.querySelector('.disc-bar i') as HTMLElement | null;
    expect(bar).not.toBeNull();
    const width = parseFloat(bar!.style.width);
    expect(width).toBeGreaterThan(0);
    expect(width).toBeLessThan(100);
  });
});

describe('the panels stay in step with canon', () => {
  it('renders a diary containing every discipline canon actually uses', () => {
    // If canon gains a discipline the panel does not name, this is where it shows.
    let p = emptyProgress();
    for (const d of discoveries) p = advance(p, d.id);
    const { container } = render(
      <Diary progress={p} moment={null} open onClose={noop} onAnswer={noop} onOpenEnding={noop} onOpenKit={noop} />
    );
    const shown = new Set([...container.querySelectorAll('.diary-section > h3')].map((e) => e.textContent));
    const used = new Set(discoveries.map((d) => d.discipline));
    expect(shown.size).toBeGreaterThanOrEqual(used.size);
  });
});

describe('the last page', () => {
  /** Everything knowable, known. */
  function everything(): Progress {
    let p = emptyProgress();
    for (const w of vocabulary) p = learn(p, w.id);
    for (let pass = 0; pass < discoveries.length; pass += 1) {
      for (const d of discoveries) p = climb(p, d.id);
    }
    return p;
  }

  it('is honest when nothing has been finished', () => {
    render(<Ending progress={emptyProgress()} open onClose={noop} />);
    expect(screen.getByText(/have not finished anything yet/i)).toBeDefined();
    expect(screen.queryByRole('heading', { name: /coming with you/i })).toBeNull();
  });

  it('gives the refusals their own words, and as much room as the acceptances', () => {
    // The bug this exists against is the one that had no UI at all: `gatherable` was written,
    // tested and never called, so the game had no ending.
    const { container } = render(<Ending progress={everything()} open onClose={noop} />);
    expect(screen.getByRole('heading', { name: /coming with you/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /^staying$/i })).toBeDefined();

    // Everyone who refuses says why, in their own voice — the quotes live in separate
    // aria-hidden spans, so assert on the line itself rather than hunting glyphs.
    const staying = container.querySelectorAll('.diary-section')[1] as HTMLElement;
    const refusals = staying.querySelectorAll('.leaving .said');
    expect(refusals.length).toBeGreaterThan(0);
    for (const said of refusals) expect(said.textContent!.length).toBeGreaterThan(30);
  });

  it('nobody is both coming and staying', () => {
    const { container } = render(<Ending progress={everything()} open onClose={noop} />);
    const names = [...container.querySelectorAll('.leaving h4')].map((e) => e.textContent);
    expect(new Set(names).size).toBe(names.length);
  });

  it('lists what was put back', () => {
    render(<Ending progress={everything()} open onClose={noop} />);
    expect(screen.getByRole('heading', { name: /put back/i })).toBeDefined();
  });

  it('says plainly that reading it costs nothing', () => {
    render(<Ending progress={everything()} open onClose={noop} />);
    expect(screen.getByText(/none of this is spent/i)).toBeDefined();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<Ending progress={everything()} open={false} onClose={noop} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('the diary offers the last page', () => {
  it('only once something has been finished', () => {
    const nothing = render(
      <Diary progress={emptyProgress()} moment={null} open onClose={noop} onAnswer={noop} onOpenEnding={noop} onOpenKit={noop} />
    );
    expect(nothing.queryByRole('button', { name: /see who would come/i })).toBeNull();
    cleanup();

    const p = climb(emptyProgress(), 'discovery_saltreed_thatch');
    const onOpenEnding = vi.fn();
    render(
      <Diary progress={p} moment={null} open onClose={noop} onAnswer={noop} onOpenEnding={onOpenEnding} onOpenKit={noop} />
    );
    fireEvent.click(screen.getByRole('button', { name: /see who would come/i }));
    expect(onOpenEnding).toHaveBeenCalled();
  });
});

describe('the field kit', () => {
  it('has nothing to work on until something has been noticed', () => {
    render(<FieldKit progress={emptyProgress()} open onClose={noop} canResearch={false} />);
    expect(screen.getByText(/go and notice something first/i)).toBeDefined();
  });

  it('offers only the specimens the player has actually met', () => {
    // A tool that answered about the rest of canon would be a spoiler engine in a lab coat.
    const p = advance(emptyProgress(), 'discovery_saltreed_thatch');
    const { container } = render(<FieldKit progress={p} open onClose={noop} canResearch={false} />);
    const chips = [...container.querySelectorAll('.specimen')].map((e) => e.textContent);
    expect(chips).toEqual(['Saltreed']);
  });

  it('classifies one, and says how much enquiry is still open', () => {
    const p = advance(emptyProgress(), 'discovery_marsh_lurker_habits');
    render(<FieldKit progress={p} open onClose={noop} canResearch={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lothal Marsh-Lurker' }));
    expect(screen.getByRole('heading', { name: /what it is/i })).toBeDefined();
    expect(screen.getByText(/lines of enquiry begun/i)).toBeDefined();
  });

  it('sets two side by side, and marks the row that differs', () => {
    let p = advance(emptyProgress(), 'discovery_saltreed_thatch');
    p = advance(p, 'discovery_red_rice_survival');
    const { container } = render(<FieldKit progress={p} open onClose={noop} canResearch={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Saltreed' }));
    fireEvent.click(screen.getByRole('button', { name: /red delta rice/i }));

    expect(screen.getByRole('heading', { name: /side by side/i })).toBeDefined();
    // Two plants that differ by name and binomial and agree on region: the point of the tool
    // is that only some rows differ, so both classes must be present.
    expect(container.querySelectorAll('table.compare tr.differs').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('table.compare tr.same').length).toBeGreaterThan(0);
  });

  it('never holds more than two at once', () => {
    let p = advance(emptyProgress(), 'discovery_saltreed_thatch');
    p = advance(p, 'discovery_red_rice_survival');
    p = advance(p, 'discovery_ghost_mangrove_channel');
    const { container } = render(<FieldKit progress={p} open onClose={noop} canResearch={false} />);
    for (const chip of container.querySelectorAll('.specimen')) fireEvent.click(chip);
    expect(container.querySelectorAll('.specimen.picked').length).toBe(2);
  });

  it('says so plainly when two things cannot be compared', () => {
    let p = advance(emptyProgress(), 'discovery_saltreed_thatch');
    p = advance(p, 'discovery_tower_collapse');
    render(<FieldKit progress={p} open onClose={noop} canResearch={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Saltreed' }));
    fireEvent.click(screen.getByRole('button', { name: /lothal/i }));
    expect(screen.getByText(/cannot be set side by side/i)).toBeDefined();
  });
});

describe('research is the one tool that can be absent', () => {
  it('is not rendered at all when no canon service is listening', () => {
    // An input that always fails teaches a player to distrust the panel it sits in.
    const p = advance(emptyProgress(), 'discovery_saltreed_thatch');
    render(<FieldKit progress={p} open onClose={noop} canResearch={false} />);
    expect(screen.queryByRole('heading', { name: /^research$/i })).toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('appears when there is one, and says it searches beyond the diary', () => {
    const p = advance(emptyProgress(), 'discovery_saltreed_thatch');
    render(<FieldKit progress={p} open onClose={noop} canResearch />);
    expect(screen.getByRole('heading', { name: /^research$/i })).toBeDefined();
    // The other three tools only ever discuss what the player has met; this one does not, and
    // says so rather than quietly breaking that rule.
    expect(screen.getByText(/asks the whole corpus, not your diary/i)).toBeDefined();
  });

  it('will not send an empty question', () => {
    const p = advance(emptyProgress(), 'discovery_saltreed_thatch');
    render(<FieldKit progress={p} open onClose={noop} canResearch />);
    expect(screen.getByRole('button', { name: /look it up/i })).toHaveProperty('disabled', true);
  });
});

/**
 * The `Here` surface: two layers, not two rival panels.
 *
 * Phase one collapsed the place and the field notes into a single flag twice, and both times
 * the result was the bug the place panel's close button exists to fix — "Leave" clearing the
 * screen instead of revealing what was underneath. The reducer holds the rule; these check the
 * rendering actually obeys it, which the reducer test cannot see.
 */
describe('here', () => {
  const notes = {
    entry: {
      title: 'Salt flats',
      description: 'Cracked white ground.',
      doing: '',
      creature: { name: 'Reed heron', note: 'Standing very still.' },
      flora: { name: 'Saltreed', note: 'Low and grey.' }
    },
    surroundings: 'The wind comes off the water.',
    hint: 'Keep going east.',
    whereNext: '',
    fatigue: null as string | null,
    canCamp: false,
    onCamp: noop,
    discovered: 3,
    atLandmark: false,
    memory: '',
    canObserve: false,
    alreadySketched: false,
    onObserve: noop
  } as const;

  const place = {
    poiId: null as string | null,
    progress: emptyProgress(),
    moment: null,
    firstVisit: false,
    onLook: noop,
    onListen: noop,
    onClose: noop
  };

  it('offers a camp only where one can be made', () => {
    const { unmount } = render(
      <Here open notes={{ ...notes, canCamp: true }} place={{ ...place }} />
    );
    expect(screen.getByRole('button', { name: /Make camp/ })).toBeTruthy();
    unmount();

    const { container } = render(
      <Here open notes={{ ...notes, canCamp: false }} place={{ ...place }} />
    );
    expect(container.querySelector('.camp-button')).toBeNull();
  });

  it('shows a tiredness line only when there is one', () => {
    // Null covers both "the flag is off" and "nothing worth saying", which is most of a session.
    const { unmount } = render(
      <Here open notes={{ ...notes, fatigue: 'You have been walking a while.' }}
            place={{ ...place }} />
    );
    expect(screen.getByText('You have been walking a while.')).toBeTruthy();
    unmount();

    const { container } = render(
      <Here open notes={{ ...notes, fatigue: null }} place={{ ...place }} />
    );
    expect(container.querySelector('.status-tired')).toBeNull();
  });

  it('shows where to go next, and nothing when there is nowhere', () => {
    // The empty case is the one worth pinning: an always-rendered paragraph still takes vertical
    // space in a panel that is deliberately tight on a phone.
    const { unmount } = render(
      <Here open notes={{ ...notes, whereNext: 'The Camp would do for the night.' }}
            place={{ ...place }} />
    );
    expect(screen.getByText('The Camp would do for the night.')).toBeTruthy();
    unmount();

    const { container } = render(
      <Here open notes={{ ...notes, whereNext: '' }} place={{ ...place }} />
    );
    expect(container.querySelector('.status-next')).toBeNull();
  });

  it('shows the field notes with no place to stand in', () => {
    render(<Here open notes={{ ...notes }} place={{ ...place }} />);
    expect(screen.getByText('Salt flats')).toBeTruthy();
  });

  /** The layering. A place on top must not take the notes away with it. */
  it('keeps the notes underneath while a place is open', () => {
    render(<Here open notes={{ ...notes }} place={{ ...place, poiId: 'poi_caravan_camp' }} />);
    expect(screen.getByText('Salt flats')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Leave' })).toBeTruthy();
  });

  it('renders nothing at all when the surface is closed', () => {
    const { container } = render(
      <Here open={false} notes={{ ...notes }} place={{ ...place, poiId: 'poi_caravan_camp' }} />
    );
    expect(container.textContent).toBe('');
  });

  /**
   * Canon moved out of the travel log, which is about the whole trip, and into the notes, which
   * are about this tile — the question it actually answers.
   */
  it('carries canon inside the notes when a service is listening', () => {
    render(
      <Here open notes={{ ...notes }} place={{ ...place }} canon={<p>Canon says something.</p>} />
    );
    expect(screen.getByText('Canon says something.')).toBeTruthy();
  });
});

/**
 * The collection.
 *
 * A read surface with nothing gated on it, so these check what a reader sees rather than what a
 * rule permits. The one property worth defending is that it fills rather than unlocks: species
 * never met are absent, not shown as blanks to be completed.
 */
describe('collection', () => {
  const met = metOnTile(emptyCollection(), {
    creature: { id: 'river-otter' },
    flora: { id: 'sweet-indigo' }
  });

  it('says plainly when nothing has been met', () => {
    render(
      <CollectionPanel collection={emptyCollection()} open onClose={noop} canAsk={false} />
    );
    expect(screen.getByText(/Walk a while/)).toBeTruthy();
  });

  it('shows an entry with the prose canon authored for it', () => {
    render(<CollectionPanel collection={met} open onClose={noop} canAsk={false} />);
    const otter = metSpecies('river-otter')!;
    expect(screen.getByText(otter.name)).toBeTruthy();
    expect(screen.getByText(otter.journalPrompt)).toBeTruthy();
  });

  it('keeps creatures and growing things apart', () => {
    render(<CollectionPanel collection={met} open onClose={noop} canAsk={false} />);
    expect(screen.getByText('Creatures')).toBeTruthy();
    expect(screen.getByText('Growing things')).toBeTruthy();
  });

  /**
   * It fills; it does not unlock. Showing every unmet species as a blank would turn a record of
   * one walk into a completion target, which is the opposite of what this is for.
   */
  it('holds only what was met, not the whole field guide', () => {
    render(<CollectionPanel collection={met} open onClose={noop} canAsk={false} />);
    expect(screen.getAllByRole('listitem').length).toBe(2);
  });

  it('lists a species once however often it is met', () => {
    const twice = metOnTile(met, { creature: { id: 'river-otter' } });
    render(<CollectionPanel collection={twice} open onClose={noop} canAsk={false} />);
    expect(screen.getAllByRole('listitem').length).toBe(2);
  });

  /**
   * The network is optional everywhere else in this game, and it is optional here. With no
   * service listening, nothing about asking is rendered — an affordance that always fails
   * teaches a player to distrust the panel it sits in.
   */
  it('offers canon only when a service is listening', () => {
    const { unmount } = render(
      <CollectionPanel collection={met} open onClose={noop} canAsk={false} />
    );
    expect(screen.queryByRole('button', { name: /Ask canon/ })).toBeNull();
    unmount();

    render(<CollectionPanel collection={met} open onClose={noop} canAsk />);
    expect(screen.getAllByRole('button', { name: /Ask canon/ }).length).toBe(2);
  });

  it('renders nothing at all when closed', () => {
    const { container } = render(
      <CollectionPanel collection={met} open={false} onClose={noop} canAsk={false} />
    );
    expect(container.textContent).toBe('');
  });

  /**
   * Every other modal closes on Escape and puts focus on the way out. This one did not, which
   * is the sort of gap a keyboard finds at once and a mouse never does.
   */
  it('closes on Escape, like the rest of them', () => {
    const onClose = vi.fn();
    render(<CollectionPanel collection={met} open onClose={onClose} canAsk={false} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('starts focus somewhere a keyboard can leave from', () => {
    render(<CollectionPanel collection={met} open onClose={noop} canAsk={false} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
  });
});

describe('the people in a place', () => {
  // Getting a portrait on screen by walking to it cost several attempts and never succeeded: the
  // camp is forty tiles from the start, across water, and a scripted walk lands beside it rather
  // than on it. Rendering the component directly answers the same question in milliseconds, which
  // is the trade the whole `scenePlan` split was about.

  it('draws a portrait beside every person, coloured by their language', () => {
    const people = npcs.filter((n) => ['npc_thrali', 'npc_uma', 'npc_marn'].includes(n.id));
    expect(people).toHaveLength(3);

    render(
      <ul>
        {people.map((person) => (
          <li key={person.id}>
            <PersonPortrait person={person} />
            <span>{person.name}</span>
          </li>
        ))}
      </ul>
    );

    // One portrait each, and hidden from the reading order: the name beside it already says who
    // this is, so announcing "portrait, Thrali" would be worse than announcing "Thrali".
    const portraits = document.querySelectorAll('svg.person-portrait');
    expect(portraits).toHaveLength(3);
    for (const svg of portraits) expect(svg.getAttribute('aria-hidden')).toBe('true');

    // Thrali speaks Kia and Marn speaks Maru, so they must not be drawn in the same ink. Uma has
    // no language in canon and takes the neutral one rather than being assigned a tongue.
    const inkOf = (i: number) => portraits[i]!.querySelector('path')!.getAttribute('fill');
    const thrali = inkOf(people.findIndex((p) => p.id === 'npc_thrali'));
    const marn = inkOf(people.findIndex((p) => p.id === 'npc_marn'));
    const uma = inkOf(people.findIndex((p) => p.id === 'npc_uma'));
    expect(thrali).toBe(LANGUAGE_INK.kia);
    expect(marn).toBe(LANGUAGE_INK.maru);
    expect(uma).not.toBe(thrali);
    expect(Object.values(LANGUAGE_INK)).not.toContain(uma);
  });

  it('gives a fisher and a herder different things to hold', () => {
    // The portrait says what someone does, which is the only thing canon records about how they
    // look. Two trades sharing a drawing would make it say nothing.
    const thrali = npcs.find((n) => n.id === 'npc_thrali')!;
    const marn = npcs.find((n) => n.id === 'npc_marn')!;
    render(
      <div>
        <PersonPortrait person={thrali} />
        <PersonPortrait person={marn} />
      </div>
    );
    const [first, second] = [...document.querySelectorAll('svg.person-portrait')];
    const toolOf = (svg: Element) => [...svg.querySelectorAll('path')].at(-1)!.getAttribute('d');
    expect(toolOf(first!)).not.toBe(toolOf(second!));
  });
});
