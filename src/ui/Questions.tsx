// Settling a field question — the thing the game is actually about.
//
// A question is an open problem with several readings, at most one of which survives later
// evidence. The rules for that have existed for a while; what did not exist was any way to
// *give* an answer, so the signature mechanic was unreachable. This is that way.
//
// Three rules the design turns on, and each is easy to get wrong:
//
//   1. **Every reading is shown from the start**, including ones the evidence cannot support.
//      The shape of the disagreement is the content. This is the opposite of the diary, which
//      shows nothing you have not found.
//   2. **A wrong answer is never marked wrong.** Nothing here reads `sound` before the player
//      commits, and committing produces no verdict. Doubt arrives later, when the player finds
//      the thing that raises it, and arrives as an observation rather than a correction.
//   3. **Local knowledge and the University stand side by side**, neither presented as
//      authoritative. Inverting that would invert the meaning of the whole game.

import { evidenceFor, readingsFor } from '../content/investigate';
import { fieldQuestion } from '../content/knowledge';
import type { Progress } from '../journey';

export interface QuestionCardProps {
  questionId: string;
  progress: Progress;
  onAnswer: (questionId: string, index: number) => void;
}

export function QuestionCard({ questionId, progress, onAnswer }: QuestionCardProps) {
  const q = fieldQuestion(questionId);
  if (!q) return null;

  const evidence = evidenceFor(progress, questionId);
  const readings = readingsFor(progress, questionId);
  const settled = readings.find((r) => r.chosen);

  return (
    <article className="question">
      <h4>{q.question}</h4>

      {/* Both accounts, in the order a stranger would meet them: the people who live here
          first, the visiting scholar second. Neither is marked correct. */}
      {q.localKnowledge && (
        <p className="account">
          <span>Locally</span>
          {q.localKnowledge}
        </p>
      )}
      {q.academicHypothesis && (
        <p className="account">
          <span>The University</span>
          {q.academicHypothesis}
        </p>
      )}

      <h5>What you have</h5>
      {evidence.length === 0 ? (
        <p className="muted">Nothing yet bears on this.</p>
      ) : (
        <ul className="evidence">
          {evidence.map((e) => (
            <li key={e.id} className={e.held ? 'has' : 'lacks'}>
              <b>{e.name}</b>
              <span>{e.written ?? 'You have not looked at this.'}</span>
            </li>
          ))}
        </ul>
      )}

      <h5>{settled ? 'You concluded' : 'What it might be'}</h5>
      <ul className="readings">
        {readings.map((r) => (
          <li key={r.index} className={r.chosen ? 'reading-chosen' : undefined}>
            <p>{r.conclusion}</p>
            {r.chosen ? (
              <p className="muted">
                Written down{r.troubled ? ' — and since troubled.' : '.'}
              </p>
            ) : r.available ? (
              <button type="button" onClick={() => onAnswer(questionId, r.index)}>
                {settled ? 'Change your mind' : 'Write this down'}
              </button>
            ) : (
              <p className="muted">
                You would need {r.missing.join(', ')} before you could argue this.
              </p>
            )}
          </li>
        ))}
      </ul>

      {/* The doubt, when it comes. Not a verdict — an observation, in the words the diary
          would use, that the reading has to answer for. */}
      {settled?.troubled && settled.doubt && (
        <p className="doubt">
          <span>Since then</span>
          {settled.doubt}
        </p>
      )}
    </article>
  );
}
