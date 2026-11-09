# Discovery sprint checkpoint

## Checkpoint 1 — transition rules and session queue

- Branch: `feat/noticeable-discoveries`.
- Start head and refreshed main: `1cd13b9c9e3f507f94d21cc185387a7ef043fdba`.
- Previous PR #255 verified merged on 2026-11-09 at 14:03:04 UTC, head `acd838391eec6975ebadd0a6bc77a535315f0552`. Its head is an ancestor of main; no unmerged work carried forward.
- Checkpoint commit is titled `feat: detect discovery changes and queue session notices`; resolve its SHA with `git log -1` on this branch. A draft PR will preserve this checkpoint remotely; verify its latest head and merge state before continuing.
- Plan: [discovery-sprint.md](discovery-sprint.md).

### Implemented

Pure `discoveryChanges(before, after)` returns typed noticed/deepened/understood changes, current authored entries and rung IDs, in authored order. `queueDiscoveryChanges` coalesces obsolete pending readings. Neither advances knowledge.

`useDiscoveryNotices(progress, journeyKey, blocked)` observes Progress changes and owns session-only pending state. It suppresses baseline saves, defers presentation behind overlays, clears on journey replacement and protects newer rungs from stale acknowledgement callbacks. `journeyKey` must identify the journey instance, including replacing a journey with the same seed; it must not change merely on field-map travel.

### Evidence and limits

- `npm run typecheck`: passed.
- `npm test -- test/discoveryChanges.test.ts test/useDiscoveryNotices.test.tsx`: 6 passed.
- Tests cover actual receiveAll/advance rules, blocked/completed/no-op actions, saved baselines, authored ordering, coalescing, StrictMode, overlay deferral, acknowledgement and replacement.
- Disabling the observer's before/after comparison made all three hook regression tests fail. Restored implementation and reran both files successfully. An overlapping pre-restoration test run also saw that intentional mutation; the final clean run above is authoritative.
- `git diff --check`: passed.
- Observer is intentionally not wired to App yet. No visible-gameplay, browser, screenshot, build-size or complete-sprint claims at this checkpoint. Full required checks and CI completion belong to package 3.

### Exact next work

1. Verify this branch's PR and fetch remote main/head; preserve any later work.
2. Read this log and the sprint plan, then inspect `App.tsx` journey replacement (`setProgress(loaded.progress)`), `Here.tsx` feedback/overlay arbitration, `PlacePanel.tsx` discovery entries and `Diary.tsx` entry headings.
3. Start package 2: wire the observer to App with an explicit journey-instance epoch, render the dock notice, and add targeted diary navigation and place-entry emphasis. Use existing surface reducers and modal focus behavior. Verify real Look and grant paths, not only this hook in isolation.
4. Update this log at the next checkpoint; continue on the same sprint branch and PR if still open.

## Checkpoint 2 — player-facing integration complete

Branch remains `feat/noticeable-discoveries`; PR #256 verified open and draft at head `58b034258c75b5d618481a0a7d6332bc6faa91bc` before this work. Changes currently in the working tree; verify remote and merge state again before commit/push.

Implemented App observation with a journey-instance epoch, compact dock feedback replacing the guidance slot, place-entry emphasis and explicit diary entry targeting. Read acknowledges the current notice and focuses the matching heading; Records supplies a lasting modal return target. Dismiss acknowledges without changing knowledge. Existing interruption state defers notices. Diary target is cleared on normal Records opening and journey replacement.

The initial bundle exceeded the 220 KB app budget at 220.3 KB. Loading only exports did not free sufficient space; that experiment was reverted. Progress/Diary now loads when opened, behind Suspense with an accessible loading modal. diaryCount moved to the pure discoveryChanges module and remains re-exported from Diary. The production build passes at 219.4 KB, with a separate 2.3 KB Progress chunk; thresholds unchanged.

Evidence so far: typecheck passed; 96 targeted rule/hook/panel/modal tests passed; canon lock and diff whitespace passed. Development Look-to-diary tests passed at desktop, phone portrait and landscape. Production equivalents passed at all three sizes, including heading focus, return focus and reload without replay. Screenshots at all three sizes inspected. The real conversation grant test initially used Leave instead of the conversation's Back button; fixed. The preview process expired between turns, causing connection-refused failures on a rerun; restarting it together with the tests resolves that environment prerequisite.

Current next task: finish the production conversation-grant and existing text/image export tests (the two-case run started after restarting preview). If the process is lost, run preview on port 4180 alongside `PLAYWRIGHT_BASE_URL=http://localhost:4180 npm run test:e2e -- e2e/discovery-feedback.spec.ts e2e/game.spec.ts --grep 'conversation grant|journal can be taken' --workers=1`. Then update this log with actual results, perform mandatory branch/merge checks, commit and push this checkpoint to PR #256. Final work package remains: complete full unit and affected layout/browser checks, regression mutation of actual App wiring, production build at final head, full CI and final readiness review. Do not mark the draft ready or claim the sprint complete yet.

Production conversation-grant and existing text/image export checks completed: 2 passed. The grant is suppressed during conversation, appears after Back, can be dismissed and remains in the diary. All five production cases passed across the two runs. Package 3 remains pending.

Resume with package 3 on this branch/PR: reverify PR #256 and remote head, inspect this checkpoint commit (`feat: surface discovery milestones and target diary entries`), then perform full validation and final readiness checks described above. The earlier in-progress next-task paragraph records the interrupted run and is superseded by the successful results at the end of this log.
