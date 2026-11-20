import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { GoalsSection, type GoalRow } from './GoalsSection';
import { SettlingSection } from './SettlingSection';
import type { SettlingRoad } from '../content/settlingRoad';

export function GoalsPanel({ open, rows, road, canEnd, tabs, onEnding, onClose }: {
  open: boolean;
  rows: readonly GoalRow[];
  road: SettlingRoad | null;
  canEnd: boolean;
  tabs?: ReactNode;
  onEnding: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return <Modal open label="Goals" onClose={onClose}>
    <section className="diary diary-filling goals-panel">
      {tabs}
      <header className="diary-head"><div><h2>Goals</h2><p className="diary-sub">What the journey can become next.</p></div>
        <button type="button" className="diary-close" onClick={onClose}>Close</button></header>
      <GoalsSection rows={rows} />
      <SettlingSection road={road} />
      {canEnd && <section className="diary-section"><h3>If you stopped here</h3>
        <button type="button" className="ending-open" onClick={onEnding}>See who would come</button>
      </section>}
    </section>
  </Modal>;
}
