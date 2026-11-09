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
