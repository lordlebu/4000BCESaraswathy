// The diary. This is the progression system, not a readout of it.
//
// There are no experience points in this game, so a discovery climbing its ladder is what
// advancement means — and the diary is where that happens visibly. The one idea the whole
// panel is built around: **it keeps the crossings-out.** A new rung does not replace the
// reading below it, it is written underneath, and the superseded one stays on the page struck
// through. A player can see they thought the silver water was the moon, and that they were
// wrong, without anyone explaining how the game works.
//
// Presentation only. Every rule — whether a rung can advance, why it cannot, which readings
// of a question are open — is asked of `journey.ts`. Nothing here recomputes a ladder.

import { useEffect, useRef } from 'react';
import {
  type Progress,
  type WorldMoment,
  blockedBy,
  disciplineProgress,
  entriesSoFar,
  isComplete,
  languagesKnown,
  openQuestions,
  rungOf
} from '../journey';
import { discoveries, discovery, vocabulary, word } from '../content/knowledge';
import { QuestionCard } from './Questions';

/** Canon's discipline ids, in the order a naturalist would keep them. */
const DISCIPLINE_ORDER = [
  'geography',
  'zoology',
  'botany',
  'archaeology',
  'evolution',
  'linguistics',
  'anomalies'
];

const DISCIPLINE_NAME: Record<string, string> = {
  geography: 'Geography',
  zoology: 'Fauna',
  botany: 'Flora',
  archaeology: 'Archaeology',
  evolution: 'Deep time',
  linguistics: 'Languages',
  anomalies: 'Anomalies'
};

const LANGUAGE_NAME: Record<string, string> = { kia: 'Kia', maru: 'Maru' };

/**
 * Why the next rung is out of reach, in words rather than ids.
 *
 * `blockedBy` returns what is missing; turning that into a sentence is presentation, so it
 * lives here. The tone matters: a rung waiting on weather is the world being itself, not an
 * error, and it should read as a reason to come back rather than as a lock.
 */
function whyBlocked(progress: Progress, id: string, moment: WorldMoment | null): string | null {
  const missing = blockedBy(progress, id, moment);
  if (missing.length === 0) return null;

  const said: string[] = [];
  for (const req of missing) {
    if (req === 'conditions') {
      const d = discovery(id);
      const next = d?.rungs[rungOf(progress, id) + 1];
      const when = [
        next?.conditions?.timeOfDay.length ? next.conditions.timeOfDay.join(' or ') : null,
        next?.conditions?.weather.length ? next.conditions.weather.join(' or ') : null
      ]
        .filter(Boolean)
        .join(', in ');
      said.push(when ? `come back at ${when}` : 'the weather is not right yet');
    } else if (req.startsWith('word_')) {
      said.push(`a word you do not have`);
    } else {
      said.push(`you must first understand ${discovery(req)?.name ?? 'something else'}`);
    }
  }
  // Sentence case, one line, no bullet list — this is a margin note, not a requirements table.
  return said.join('; ') + '.';
}

function Entry({
  id,
  progress,
  moment
}: {
  id: string;
  progress: Progress;
  moment: WorldMoment | null;
}) {
  const d = discovery(id);
  const written = entriesSoFar(progress, id);
  if (!d || written.length === 0) return null;

  const done = isComplete(progress, id);
  const blocked = done ? null : whyBlocked(progress, id, moment);

  return (
    <article className={done ? 'entry entry-done' : 'entry'}>
      <header className="entry-head">
        <h4>{d.name}</h4>
        <span className="entry-rungs" aria-label={`${written.length} of ${d.rungs.length} understood`}>
          {written.length}/{d.rungs.length}
        </span>
      </header>

      {/* The crossings-out. Everything but the last line is a reading the player has since
          replaced, and it stays visible because being wrong earlier is the point. */}
      <ol className="revisions">
        {written.map((text, i) => (
          <li key={i} className={i === written.length - 1 ? 'reading' : 'reading struck'}>
            {text}
          </li>
        ))}
      </ol>

      {blocked && <p className="entry-blocked">{blocked}</p>}
    </article>
  );
}

export interface DiaryProps {
  progress: Progress;
  moment: WorldMoment | null;
  open: boolean;
  onClose: () => void;
  onAnswer: (questionId: string, index: number) => void;
  onOpenEnding: () => void;
}

export function Diary({ progress, moment, open, onClose, onAnswer, onOpenEnding }: DiaryProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes it, and focus starts somewhere sensible. The map keeps running underneath;
  // this is a book you opened, not a modal that stopped the world.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const noticed = discoveries.filter((d) => rungOf(progress, d.id) >= 0);
  const byDiscipline = disciplineProgress(progress);
  const languages = languagesKnown(progress);
  const questions = openQuestions(progress);
  const finished = noticed.filter((d) => isComplete(progress, d.id)).length;

  // Denser as it fills, which is the design's strongest aesthetic idea. An empty diary is
  // mostly paper; a full one is crowded with your own handwriting.
  const density = noticed.length === 0 ? 'sparse' : noticed.length < 6 ? 'filling' : 'dense';

  // A diary is not empty because no discovery has been climbed. A question somebody asked you
  // is written down too, and so is a word. Checking only discoveries hid the whole page --
  // including the questions — from a player whose first act was to talk to someone.
  const written =
    noticed.length > 0 || questions.length > 0 || Object.keys(languages).length > 0;

  return (
    <div className="diary-veil" role="dialog" aria-modal="true" aria-label="Field diary">
      <section className={`diary diary-${density}`}>
        <header className="diary-head">
          <div>
            <h2>Field Diary</h2>
            <p className="diary-sub">
              {noticed.length === 0
                ? 'Nothing written yet.'
                : `${noticed.length} under way · ${finished} understood`}
            </p>
          </div>
          <button type="button" ref={closeRef} className="diary-close" onClick={onClose}>
            Close
          </button>
        </header>

        {!written ? (
          <p className="diary-empty">
            You have not written anything down. Go and look at something.
          </p>
        ) : (
          <>
            {/* The knowledge tree: disciplines, not stats. Counts rungs, because a
                half-understood thing is real progress and should look like it. */}
            <ul className="disciplines" hidden={noticed.length === 0}>
              {DISCIPLINE_ORDER.filter((k) => byDiscipline[k]?.climbed).map((k) => {
                const { climbed, total } = byDiscipline[k]!;
                return (
                  <li key={k}>
                    <span className="disc-name">{DISCIPLINE_NAME[k] ?? k}</span>
                    <span
                      className="disc-bar"
                      role="img"
                      aria-label={`${climbed} of ${total} understood`}
                    >
                      <i style={{ width: `${Math.round((climbed / total) * 100)}%` }} />
                    </span>
                  </li>
                );
              })}
            </ul>

            {DISCIPLINE_ORDER.map((k) => {
              const here = noticed.filter((d) => d.discipline === k);
              if (here.length === 0) return null;
              return (
                <section key={k} className="diary-section">
                  <h3>{DISCIPLINE_NAME[k] ?? k}</h3>
                  {here.map((d) => (
                    <Entry key={d.id} id={d.id} progress={progress} moment={moment} />
                  ))}
                </section>
              );
            })}

            {questions.length > 0 && (
              <section className="diary-section">
                <h3>Open questions</h3>
                {questions.map((q) => (
                  <QuestionCard
                    key={q.id}
                    questionId={q.id}
                    progress={progress}
                    onAnswer={onAnswer}
                  />
                ))}
              </section>
            )}

            {/* The way to the last page. Offered only once something has been finished, since
                before that it would say nothing a player could act on. */}
            {discoveries.some((d) => isComplete(progress, d.id)) && (
              <section className="diary-section">
                <h3>If you stopped here</h3>
                <button type="button" className="ending-open" onClick={onOpenEnding}>
                  See who would come
                </button>
              </section>
            )}

            {Object.keys(languages).length > 0 && (
              <section className="diary-section">
                <h3>Words</h3>
                {Object.entries(languages).map(([lang, count]) => (
                  <div key={lang} className="lexicon">
                    <h4>
                      {LANGUAGE_NAME[lang] ?? lang} <span className="muted">· {count}</span>
                    </h4>
                    <dl>
                      {vocabulary
                        .filter((w) => w.language === lang && progress.words.includes(w.id))
                        .map((w) => (
                          <div key={w.id} className="word">
                            <dt>{word(w.id)?.word}</dt>
                            <dd>
                              {w.gloss}
                              {w.literal && <em> — literally {w.literal}</em>}
                            </dd>
                          </div>
                        ))}
                    </dl>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/** So a caller can show a count without reaching into `Progress` itself. */
export function diaryCount(progress: Progress): number {
  return discoveries.filter((d) => rungOf(progress, d.id) >= 0).length;
}
