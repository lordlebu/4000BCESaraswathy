// The road between two maps, told in cards.
//
// **Why.** Crossing used to be a button and a scene restart: no ride, no time, nothing said, and the
// cart never even named. Games that move a traveller between places tell it as a few cards with a
// moment on the way (The Oregon Trail, The Banner Saga, 80 Days), and a ride doubles as the loading
// screen (Spiritfarer's boat) -- the next map builds behind these cards, so there is never a blank
// frame. Roads and Hands, phase 4.
//
// **The words are canon's**: the map's `roads` give the keeper's send-off, the vehicle, the painting
// and the way; the map's `arrival` is the arriving; the Vedda's sayings sit under each. The game owns
// the pacing: the first time on a road is three cards -- seen off, the road, arriving -- and every
// time after is one, because a road you know is a road you just take. Skip is always there.
//
// **Art never blocks.** The road's painting is `src/ui/events/journey-<a>-<b>.png`, one per road
// whichever way it is travelled, and a drawn stand-in until it lands.

import { useEffect, useRef, useState } from 'react';
import { type FieldMap, type Road, npc, poi } from '../content/places';
import { vehicles } from '../content/making';
import { type Occasion, sayingFor } from '../content/sayings';
import { art } from './art';
import { Modal } from './Modal';

export interface JourneyProps {
  from: FieldMap;
  to: FieldMap;
  road: Road;
  /** The first time this road has been taken: three cards rather than one. */
  first: boolean;
  /** Seeded, so the same crossing says the same saying. */
  roll: (salt: string) => number;
  onDone: () => void;
}

type Card = 'depart' | 'road' | 'arrive';

function Saying({ occasion, map, roll }: { occasion: Occasion; map: string; roll: (salt: string) => number }) {
  const s = sayingFor(occasion, map, roll);
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

export function Journey({ from, to, road, first, roll, onDone }: JourneyProps) {
  const cards: Card[] = first ? ['depart', 'road', 'arrive'] : ['road'];
  const [at, setAt] = useState(0);
  const next = useRef<HTMLButtonElement>(null);
  useEffect(() => next.current?.focus(), [at]);

  const card = cards[at]!;
  const last = at === cards.length - 1;
  const onward = () => (last ? onDone() : setAt(at + 1));

  const keeper = npc(road.keeper.npc);
  const yard = from.departsFrom.map((id) => poi(id)?.name).find(Boolean) ?? from.name;
  const by = vehicles.find((v) => v.id === road.by)?.name.toLowerCase() ?? 'cart';
  const bySea = road.by.includes('dhow') || road.by.includes('boat');
  const picture = art('events', road.art);

  return (
    <Modal open label="The road" onClose={onDone} initialFocus={next}>
      <section className="opening journey" data-card={card}>
        {card === 'depart' && (
          <>
            <p className="journey-where">
              Leaving {from.name} for {to.name}, by {by}.
            </p>
            <blockquote className="journey-keeper">
              <p>“{road.keeper.line}”</p>
              <footer>
                {keeper?.name ?? 'The keeper'}, at {yard.replace(/^The /, 'the ')}
              </footer>
            </blockquote>
            <Saying occasion="departure" map={from.id} roll={roll} />
          </>
        )}

        {card === 'road' && (
          <>
            {picture ? (
              <img className="opening-plate" src={picture} alt="" />
            ) : (
              <div className="opening-plate opening-standin" data-art={road.art} aria-hidden="true" />
            )}
            {!first && (
              <p className="journey-where">
                {keeper?.name ?? 'The keeper'} sees you off: “{road.keeper.line}”
              </p>
            )}
            <div className="opening-lines">
              {road.prose.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <Saying occasion={bySea ? 'crossing' : 'road'} map={to.id} roll={roll} />
          </>
        )}

        {card === 'arrive' && (
          <>
            <h2 className="journey-arrive">{to.name}</h2>
            {to.arrival && <p className="journey-arrival">{to.arrival}</p>}
            <Saying occasion="arrival" map={to.id} roll={roll} />
          </>
        )}

        <footer className="opening-foot">
          <button type="button" className="opening-skip" onClick={onDone}>
            Skip
          </button>
          <span className="opening-count" aria-hidden="true">
            {cards.length > 1 && cards.map((c, i) => <i key={c} data-on={i <= at} />)}
          </span>
          <button type="button" ref={next} className="opening-next" onClick={onward}>
            {last ? 'Step down' : 'Continue'}
          </button>
        </footer>
      </section>
    </Modal>
  );
}
