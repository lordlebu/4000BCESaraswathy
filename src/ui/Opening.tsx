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
// **Art never blocks.** Each plate draws `src/ui/prologue/<art>.png` when it has arrived and a
// drawn stand-in until it does, so the opening plays from the day the words exist.

import { useEffect, useRef, useState } from 'react';
import type { Prologue } from '../content/places';
import { saying } from '../content/sayings';
import { art } from './art';
import { Modal } from './Modal';

export interface OpeningProps {
  prologue: Prologue;
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

export function Opening({ prologue, onDone }: OpeningProps) {
  // -1 is the saying alone; 0.. are the plates.
  const [at, setAt] = useState(-1);
  const next = useRef<HTMLButtonElement>(null);
  const last = prologue.plates.length - 1;

  useEffect(() => {
    next.current?.focus();
  }, [at]);

  const onward = () => (at >= last ? onDone() : setAt(at + 1));
  const plate = at >= 0 ? prologue.plates[at]! : null;
  const picture = plate ? art('prologue', plate.art) : null;

  return (
    <Modal open label="Opening" onClose={onDone} initialFocus={next}>
      <section
        className="opening"
        data-card={plate ? 'plate' : 'saying'}
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
        ) : (
          <Verse id={prologue.opening} />
        )}
        <footer className="opening-foot">
          <button type="button" className="opening-skip" onClick={onDone}>
            Skip
          </button>
          <span className="opening-count" aria-hidden="true">
            {prologue.plates.map((_, i) => (
              <i key={i} data-on={i <= at} />
            ))}
          </span>
          <button type="button" ref={next} className="opening-next" onClick={onward}>
            {at >= last ? 'Begin' : 'Continue'}
          </button>
        </footer>
      </section>
    </Modal>
  );
}
