import { useLayoutEffect, useRef, useState } from 'react';
import type { EventCardProps } from './EventCard';
import { EventCardBody } from './EventCard';
import { Modal } from './Modal';

type ExamineProps = EventCardProps & {
  next: boolean;
  alternatives: readonly { id: string; title: string }[];
  blocked: readonly string[];
  onSelect: (id: string) => void;
  onContinue: () => void;
  onBackOut?: () => void;
};

function ExaminationCard({ alternatives, blocked, onSelect, onContinue, next, onBackOut, ...card }: ExamineProps) {
  const [choosing, setChoosing] = useState(false);
  const heading = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { heading.current?.focus(); }, []);

  return (
    <div className="examine-frame" ref={heading} tabIndex={-1} aria-label={card.event.title}>
      <EventCardBody
        {...card}
        onClose={onContinue}
        continuation={next ? 'Next card' : 'Finish examining'}
        alternatives={(alternatives.length > 0 || blocked.length > 0) && (
          <div className="examine-options">
            <button type="button" className="ghost" aria-expanded={choosing} onClick={() => setChoosing(!choosing)}>
              {alternatives.length ? 'Choose another' : 'What is blocked?'}
            </button>
            {choosing && (
              <ul>
                {alternatives.map((item) => <li key={item.id}>
                  <button type="button" className="activity-choice" onClick={() => onSelect(item.id)}>{item.title}</button>
                </li>)}
                {blocked.map((reason) => <li key={reason} className="muted">{reason}</li>)}
              </ul>
            )}
          </div>
        )}
      >
        <div className="activity-choices">
          {onBackOut && <button type="button" className="ghost" onClick={onBackOut}>Back out</button>}
          <button type="button" className="ghost" onClick={card.onClose}>Leave examination</button>
        </div>
      </EventCardBody>
    </div>
  );
}

export default function ExamineWindow(props: ExamineProps) {
  return (
    <Modal open label="Examine location" onClose={props.onClose} veilClassName="diary-veil activity-veil">
      <ExaminationCard key={props.event.id} {...props} />
    </Modal>
  );
}
