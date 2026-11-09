# Sprint 2: Make discoveries feel more noticeable

Status: work packages 1 and 2 complete; final verification pending.
Baseline: PR #255 merged as 1cd13b9c9e3f507f94d21cc185387a7ef043fdba. Verify remote state again before implementation.

## Outcome and boundaries
A player can tell what they discovered, what changed in their understanding, and where to read it again. Cover discovery rung changes from looking closely, conversations and event rewards. Species collection, vocabulary, recipes, questions and place arrival are not discovery notices in this sprint. Preserve progression rules, canon, accepted art and save formats. No rewards, forced modals or new sound assets.

## Player behavior
- Show distinct labels: “Discovery noticed”, “Understanding deepened”, and “Discovery understood”. Include the discovery name and its current authored diary entry; never invent a new conclusion or expose later rungs.
- Use a compact, dismissible notice in the existing dock feedback area. Show the full entry in the diary, not a growing paragraph in the collapsed dock. A Read diary action opens Records at that discovery and visibly identifies its updated entry.
- Looking closely also highlights the updated entry in the current place. Feedback must remain readable without moving keyboard focus.
- Notices remain until read or dismissed; do not depend on a short timer. No automatic diary opening, movement, camera changes or time changes.
- Coalesce repeated changes to one discovery into its latest state. Queue different discoveries in stable authored order; show one notice at a time with an explicit remaining count. Reading or dismissing advances the queue.
- Detect changes across the shared Progress state, including conversation/event grants. Mount, reload and journey replacement establish a baseline and produce no notices. Repeated renders, no-op updates and blocked Look actions produce none.
- Hold presentation behind existing conversations, event cards, opening/ending screens and other blocking overlays. Resume afterward. Clear pending notices when replacing the journey. Pending/read state is session-only for this sprint.
- Use a polite live region, 44px controls, keyboard-accessible Read/Dismiss actions and reduced-motion-safe emphasis. Respect existing portrait/landscape map-space budgets; do not change thresholds to accommodate the feature.

## Work packages and stopping points
1. **Rules and transition detection.** Add a pure before/after discovery-change builder with typed noticed/deepened/understood results and authored current entries. Add a UI observer that establishes baselines and owns coalescing/queue state. Test initial receipt, successive rungs, final completion, simultaneous grants, no-ops, blocked advancement and journey replacement. Checkpoint: tested transition layer and updated sprint log; no UI claims yet.
2. **Player-facing feedback.** Connect the observer to the actual App progress updates. Render the dock notice, updated place-entry emphasis and diary navigation. Extend the diary interface with an optional target discovery ID; opening scrolls to that entry and focuses its heading only after the explicit Read action. Respect overlay arbitration. Checkpoint: working browser path and screenshots at desktop, phone portrait and phone landscape.
3. **Verification and delivery.** Prove real Look and conversation/event grant paths, queue behavior, Read/Dismiss, focus, reduced motion and reload without replay. Verify a relevant regression test fails when transition publication is removed, then restore it. Run typecheck, unit tests, production build, data lock and size checks, affected browser/layout suites, and required CI. Open one feature PR and monitor CI to completion. Record actual results and remaining limitations.

## Acceptance
- A first discovery and a completed discovery look meaningfully different and name the correct authored discovery.
- Read diary reaches the matching current entry; dismissing preserves progress and returns to normal play.
- Grant paths provide the same feedback as Look without duplicate notices.
- Old saves load normally and reload does not replay historical achievements.
- Input/focus, overlays and existing dock/map-space budgets remain valid across the affected devices.
- Required CI is green on the final PR head; report actual merge state.

## Context and handoff protocol
Before implementation, put this plan and a compact progress log in the repository on a fresh branch from refreshed main. Use one branch/PR for the sprint. Keep each work package as a resumable checkpoint rather than attempting the entire sprint in one conversation. At every checkpoint record current branch/head, PR and merge status, completed behavior, changed interfaces, checks with outcomes, open issues and the exact next command/task. Update the log before context becomes tight, not after it is exhausted. A checkpoint is resumable work, not a claim that the sprint is finished. Never promise that a model cannot run out of context.
