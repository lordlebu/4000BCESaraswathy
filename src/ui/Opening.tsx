// How a journey opens: a Vedda saying alone, then painted plates, then the kilns.
//
// **Why.** A new game used to go from the front door straight onto the map, on a tile the generator
// picked, with nothing said -- and the first play-through felt it. Games of this kind open in about a
// minute of stills and short text and then hand over control (Firewatch, The Banner Saga, Spiritfarer's
// prologue), and this is that. The words are canon's: the map's `prologue` names the saying, the
// plates and their lines (Roads and Hands, phase 3).
//
// **The owner's rulings, which this keeps:** it says *you* and names nobody, so every plate shows the
// traveller from behind and fits whichever of the five was picked; it is painted stills, never film;
// and it never says why the world is as it is. Skip is on every card, and so is Continue, which has
// focus -- Enter, Space or a click moves on, and Escape ends it.
//
// **The title comes first** (the owner, 4 October 2026): every visit opens on *South of Tethys*,
// with the name in Brahmi under it, bold. A new player goes on from it into the saying and the
// plates; a returning one sees the title alone and then the door. `title` says which.
//
// **Art never blocks.** Each plate draws `src/ui/prologue/<art>.png` when it has arrived and a
// drawn stand-in until it does, so the opening plays from the day the words exist.

import { useEffect, useRef, useState } from 'react';
import type { Prologue } from '../content/places';
import { saying } from '../content/sayings';
import { art } from './art';
import { Modal } from './Modal';

/** The game's name in Brahmi script, as the owner gave it. */
export const TITLE_BRAHMI = '𑀲𑁄𑀅𑀣𑁆 𑀑𑀨𑁆 𑀢𑁂𑀣𑀺𑀲𑁆';

export interface OpeningProps {
  prologue: Prologue;
  /**
   * The title card: `first` before the saying and plates, `only` for the title alone (a returning
   * player, on the way to the door). Absent, the opening starts at the saying -- a new walk begun
   * from the door, when the title has already been seen this visit.
   */
  title?: 'first' | 'only';
  /** Called once, when the last card is passed or the opening is skipped. */
  onDone: () => void;
}

function Verse({ id }: { id: string | null }) {
  const s = id ? saying(id) : null;
  if (!s) return null;
  return (
    <figure className="opening-saying">
      <blockquote>
        {s.text.split('\n').map((line, i) => (line ? <span key={i}>{line}</span> : <span key={i} className="verse-gap" />))}
      </blockquote>
      <figcaption>{s.attribution}</figcaption>
    </figure>
  );
}

function Title() {
  return (
    <header className="opening-title">
      <h1 className="opening-title-name">South of Tethys</h1>
      <p className="opening-title-brahmi" lang="und-Brah">
        <b>{TITLE_BRAHMI}</b>
      </p>
    </header>
  );
}

export function Opening({ prologue, onDone, title }: OpeningProps) {
  // -2 is the title, -1 the saying alone, 0.. the plates.
  const [at, setAt] = useState(title ? -2 : -1);
  const next = useRef<HTMLButtonElement>(null);
  const last = prologue.plates.length - 1;

  useEffect(() => {
    next.current?.focus();
  }, [at]);

  const onward = () => (at >= last || (title === 'only' && at === -2) ? onDone() : setAt(at + 1));
  const ending = at >= last || (title === 'only' && at === -2);
  const plate = at >= 0 ? prologue.plates[at]! : null;
  const picture = plate ? art('prologue', plate.art) : null;

  return (
    <Modal open label="Opening" onClose={onDone} initialFocus={next}>
      <section
        className="opening"
        data-card={plate ? 'plate' : at === -2 ? 'title' : 'saying'}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onward();
        }}
      >
        {plate ? (
          <>
            {picture ? (
              <img className="opening-plate" src={picture} alt="" />
            ) : (
              // A stand-in the shape and tone of the painting, so the card is whole without it.
              <div className="opening-plate opening-standin" data-art={plate.art} aria-hidden="true" />
            )}
            <div className="opening-lines">
              {plate.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <Verse id={plate.saying} />
          </>
        ) : at === -2 ? (
          <Title />
        ) : (
          <Verse id={prologue.opening} />
        )}
        <footer className="opening-foot">
          <button type="button" className="opening-skip" onClick={onDone}>
            Skip
          </button>
          <span className="opening-count" aria-hidden="true">
            {title !== 'only' && prologue.plates.map((_, i) => <i key={i} data-on={i <= at} />)}
          </span>
          <button type="button" ref={next} className="opening-next" onClick={onward}>
            {ending && title !== 'only' ? 'Begin' : 'Continue'}
          </button>
        </footer>
      </section>
    </Modal>
  );
}
