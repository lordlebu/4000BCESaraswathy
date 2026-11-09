// Shared priority for the dock and nightly recap. Goals retain all suggestions.
import type { Suggestion } from './actionable';
export interface Guide { line: string; action: { kind: 'pin'; pin: string; label: string } | null }
export function nextStep(f: { coach: Suggestion | null; pinned: Suggestion | null; automatic: Suggestion | null }): Suggestion | null {
  return f.coach ?? f.pinned ?? f.automatic;
}
