# Discovery sprint completion record

Branch: `feat/noticeable-discoveries`; PR: https://github.com/lordlebu/4000BCESaraswathy/pull/256.
Baseline: #255 merged as `1cd13b9c9e3f507f94d21cc185387a7ef043fdba`.
Checkpoints: transition layer `58b0342`, player-facing integration `30957d2`.

## Delivered

Shared discovery transitions distinguish noticed, deepened and understood readings using authored current entries. Session feedback coalesces newer readings and defers during interruptions. Mount, reload and journey replacement establish baselines without replaying historical achievements. A journey-instance epoch also handles same-seed replacement.

The dock notice offers Read diary and Dismiss in the existing guidance slot. Place entries are highlighted while pending. Read targets and focuses the matching diary heading; Records provides the lasting modal return target. Normal Records opening clears targeting. Progress/Diary loads on demand behind an accessible loading modal; the count helper is pure and remains re-exported for compatibility. Save formats, progression rules, canon and art are unchanged.

## Verification

- CI run 42675569904 on implementation head `30957d2535c090cf4f53851649886fa87442abb0`: full check job, all four browser shards and overall browser gate passed. This includes existing layout/browser suites.
- Local typecheck, production build, canon lock and size checks passed. App 219.4 KB gzip against 220 KB; separate Progress panel 2.3 KB. No budget changes.
- 96 targeted rule/hook/rendering/modal tests passed. Production Look-to-diary tests passed at desktop, touch portrait and touch landscape; conversation grant/deferral/dismissal and existing text/image exports passed. Screenshots at all three sizes inspected.
- Disabling transition observation made all three hook tests fail; restoration passed.
- Disabling notice publication in actual App made the browser test fail at the missing Discovery noticed assertion. Source restored exactly. A restored dev run caught the lazy panel still showing Opening diary after the default five-second assertion window; added an explicit diary-readiness wait, consistent with existing loading waits. The exact entry/focus checks remain unchanged, and the restored browser case passes.

## Delivery gate

The final follow-up changes the readiness wait and completion documentation only. Check CI on the latest PR head, not only the implementation head above, before merge. Maintain one branch/PR. Mark ready only after the final CI run passes; do not merge automatically. PR description records the verified final CI URL and state. A full local unit rerun was also started during final review; its result must be reported honestly when available.

See [the sprint plan](discovery-sprint.md) for acceptance criteria. All three work packages have been implemented; remaining delivery work is verifying final-head CI and updating PR readiness.

## CI follow-up — 10 November 2026

The prior all-green review was incomplete: push run 42691597540 failed while parallel PR run 42691606797 passed on the same head. See [the detailed cause/evidence record](testing.md#discovery-sprint-ci-follow-up-10-november-2026). AGENTS.md now explicitly requires checking both event types.

Addressed lazy-diary readiness at the missed Records paths, the landmark test's DOM-stillness inference and swallowed waits, and the pin control's detached-element geometry read. Exposed pending keyboard input alongside existing movement debug state so the browser waiter cannot declare idle before a tap is consumed. Landmark taps now use the whole dock boundary. The exact failed CI navigation trace was inaccessible, so no gameplay root-cause claim is made beyond the verified observation flaws.

Verification: typecheck and two movement predicate regression cases pass; production build and unchanged app budget pass at 219.4 KB. Both diary cases pass locally. Landmark passes with final pending-input handling (3.3 minutes); three consecutive pinning boots pass with browser-side geometry readiness. Failed intermediate pinning experiments and the CI-container/storage limitation are recorded in testing.md. Confirm both new push and PR runs on the final follow-up head before reporting CI green.

Follow-up verification found push run 42750110123 failed while PR run 42750116103 passed on be60d46. Earlier diary/pin/landmark paths passed; the remaining overlap fixture opened its event modal while the key was still pending, and the export test omitted diary readiness. Fixed the overlap setup to detect moving and open the card atomically, and audited remaining Records tests for readiness. Both new failing paths pass locally; typecheck and movement regression cases pass. Both event runs must again be checked on the next head. Details are in testing.md.


Trace recovery supersedes the earlier navigation uncertainty: the connector downloaded the old
artifact despite direct-storage denial. The failed retry repeatedly entered the Silted Granary,
which replaces the journal; empty bearings sent the driver back north. The survey now leaves an
open place through its real control before reading the journal. A targeted Granary regression
passes and is checked with Leave handling disabled. Full cause and recovery details: testing.md.
The prior final head 414449a passed BOTH push run 42752040830 and PR run 42752046666; this small
trace-confirmed follow-up needs the same final-head check before completion is reported.

Final local trace-based verification: the full landmark walk passed in 2.5 minutes and the
restored Granary regression passed. Disabling its Leave handling failed with an empty position,
matching the old CI trace. Typecheck and movement regression cases passed before publication.
