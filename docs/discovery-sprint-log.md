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
