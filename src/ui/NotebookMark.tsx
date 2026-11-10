// Decorative ink drawings stay outside the first-frame JavaScript budget.
import marks from './notebook-marks.svg?url&no-inline';

export function NotebookMark({ kind = 'book' }: { kind?: 'book' | 'leaf' | 'people' | 'section' }) {
  return (
    <svg className="notebook-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <use href={`${marks}#${kind}`} />
    </svg>
  );
}
