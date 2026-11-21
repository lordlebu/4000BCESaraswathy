# Diary event overhaul

**Status:** compact diary and contextual fallback delivered; dedicated artwork rollout remains (2026-11-21)

**Branch:** `codex/diary-event-overhaul`

**Scope:** `4000BCESaraswathy` owns runtime behaviour and presentation. `SouthOfTethys` owns the
small `sub_locations[].discoveries` relationship addition and its authored assignments. Prose is
never duplicated between them.

## Implementation progress

| Stage | Status | Delivered / remaining |
|---|---|---|
| 0 — characterization | Complete | Existing local changes were isolated; focused component, save, event, and browser coverage was updated before the release-boundary run. |
| 0.5 — canon seam | Complete | `sub_locations[].discoveries` is schema-validated, documented, exported, and assigned to Kavik's Tower's Lower Courses on `codex/diary-event-overhaul-canon`. |
| 1 — occurrence ledger | Complete for events that resolve | Resolved events persist immutable prose, choice, outcome, context, and exact semantic `events`/`places`/`scenes` art when one exists. |
| 2 — discovery adapter | Delivered; content rollout remains | Discoveries use the event card and folder-aware place fallback. The Tower path has authored prompt prose; other discoveries use honest place/composed fallback until expanded. |
| 3 — sub-location adapter | Delivered; content rollout remains | Entry records once, backing out stays navigation, and description/outcome no longer repeat. Lower Courses has authored arrival prose; dedicated paintings remain optional. |
| 4 — arbitration and polish | Partial | Existing happening priority is preserved, cancelled contextual events stay unresolved, and modal focus no longer overlaps. The proposed centralized candidate arbitration and contextual text/art quality gate were not delivered. |
| 5 — Records separation | Complete | Goals and ending projection have their own surface; Goals and `Take it with you` are outside `.field-diary`; Records tabs have 44px targets. |
| 6 — compact diary projection | Implemented in PR #270 | Five compact recent rows, paging, one accessible disclosure, and adjacent-only conservative repeat grouping preserve the immutable ledger. |
| 7 — contextual artwork and prose | Core delivered; rollout partial | Folder-aware fallback, text-only cards, `places` persistence, and canon-owned prompt/arrival fields are implemented. Generated coverage reporting and dedicated paintings remain. |

### Delivered feature truth

| User-visible capability | Status | Current truth |
|---|---|---|
| Every resolved narrative event is remembered | Delivered | Each resolution appends a `DiaryEventEntry`; existing authored and woven events are covered. |
| Same event may recur | Delivered by event policy | Every permitted occurrence remains stored; only adjacent exact repeats or adjacent rungs of one discovery are grouped in the read projection. |
| Reopen an event image from the diary | Delivered when an honest asset exists | Exact `events`, `places`, or `scenes` art reopens. Artless rows still reopen their saved prose without a fake image. |
| Discovery interaction as an event | Delivered | Choice advances one rung, records history, and changes prompt prose to the rung outcome. |
| Sub-location interaction as an event | Delivered | First entry records once, navigation does not duplicate it, and outcome uses authored arrival or a short transition. |
| Compact event history | Delivered | Five recent rows render initially; earlier rows page in five at a time and full history stays in the disclosure. |
| Goals/export outside the diary | Delivered | Goals, ending projection, and export controls are separate from `.field-diary`. |
| Exact historical prose and art survive later canon edits | Delivered when present | Text and exact selected collection/key/take are snapshotted, including `places` fallbacks. |

### Contextual presentation audit

The current adapters create structurally valid cards but do not yet have a complete content or art
contract. The repository audit on 2026-11-21 found:

- **55 discoveries, 0 matching `events/discovery_*` assets.** `discoveryEvent` asks only the
  `events` registry for the discovery id.
- **61 sub-locations, 0 direct event-art matches and 0 event-folder POI fallbacks.** The adapter's
  fallback key is a POI id, but POI paintings live under `places` while `EventCard` searches only
  `events`.
- **15 of the 61 sub-location instances have a parent POI painting already available** in the
  `places` registry. The resolver cannot currently select or persist those honest fallbacks.
- A first discovery observation uses the generic prompt `There is more here than a first glance
  held.` because canon supplies the discovered reading/outcome but no pre-choice prompt.
- A sub-location card uses `sub.description` both before and after the choice, so resolving it
  repeats rather than advances the prose.
- `EventCard` renders a full-height `.activity-scene-blank` when selection fails. That blank region
  is the visible placeholder card the user reported.

These figures are the pre-implementation baseline. The contextual presentation baseline now
passes; dedicated art and broader authored-prose coverage remain Stage 7 content work.

### Verification record

PR #270 implementation verification (2026-11-21): TypeScript typecheck passed; focused diary
projection (3), EventCard (9), panel (69), and save (22) tests passed. Canon schema/reference lint
passed across 939 entities. The expected export-boundary failure identified changed
`canon.lock.json`, `knowledge.json`, and `places.json`; `check_export_boundary.py --update` then
re-pinned those intentional canon changes. Full browser E2E is delegated to GitHub Actions.

- TypeScript typecheck and production build passed.
- Focused Vitest suites passed, including 122 event/save/panel tests and the 29-test canon adapter boundary.
- The full Vitest boundary ran 3,866 tests: 3,865 passed initially; the one missing adapter declaration was fixed and its complete file then passed.
- Playwright passed the Kavik's Tower path, discovery feedback, question progression, twin-city discovery, and all four responsive notebook layouts.
- Canon lint, playability, export-boundary, and game lock checks passed; canon export is 107.1 KB gzipped at the source boundary.
- Final production budgets: app startup 164.22 KB / 180 KB gzipped; canon chunk 130.8 KB / 350 KB gzipped.
- `git diff --check` passed in both repositories.

### PR #270 CI failure record

[Run 44865466115](https://github.com/lordlebu/4000BCESaraswathy/actions/runs/44865466115)
reported three unit assertion failures and one browser assertion failure on `238c8cc`.
Adapter coverage still lacked declarations for the consumed `sub_locations[].arrival` and
`levels[].prompt` fields. The rung shape check also needed to admit the prose-only `prompt`.
The browser test expected two separate rows for two consecutive rungs of one discovery.
It now checks for one summary row and verifies that reopening it shows every recorded occurrence.
The browser aggregate failed because shard 1 failed. Shards 2–4 passed.

The follow-up commit `dff824f` passed the PR workflow in
[run 44867945092](https://github.com/lordlebu/4000BCESaraswathy/actions/runs/44867945092).

### PR #269 CI failure record

GitHub Actions runs [44741496396](https://github.com/lordlebu/4000BCESaraswathy/actions/runs/44741496396)
and [44742065129](https://github.com/lordlebu/4000BCESaraswathy/actions/runs/44742065129)
reported the same four browser failures on the original `b45b58b` head. The code/build `check`
job and browser shards 2 and 4 were already green. The final `browser` job was only the aggregate
failure from shards 1 and 3, not a fifth defect.

| Failed browser case | Cause | Correction and retained regression assertion |
|---|---|---|
| `fielddiary`: examination writes the diary | The test counted every generic `.entry` and expected one. The overhaul correctly renders one analytical discovery entry plus one event-history entry per resolved examination. | Count `.entry[data-discovery]` and `.diary-event-entry` separately; require exactly one discovery entry and exactly one history entry per resolved event. |
| `fielddiary`: diary survives reload | The reload assertion had the same stale aggregate count and received the persisted discovery plus its persisted event occurrence. | After reload, independently require one discovery entry and one event-history entry, proving both save paths survive. |
| `game`: journal exports as text and image | Export moved from the diary body into the collapsed Records-level `Take it with you` sheet, but the test searched for `Save as text` immediately after opening Diary. | Expand `Take it with you`, require its named region to be visible, then verify both downloads and the rendered PNG size. |
| `settling-road`: settling guidance is visible | Settling guidance intentionally moved from Diary to the new Goals tab, but the test opened Records and searched the default Diary tab. | Select the accessible Goals tab before asserting the `Settling` region and its authored steps. |

These were expectation/ownership regressions in E2E coverage, not intermittent timeouts or runtime
state failures. The four corrected cases pass together with one worker in 43.1 seconds. Their new
selectors encode the overhaul's boundaries so a future disappearance of history, export, or Goals
content cannot be hidden by a looser aggregate assertion.

#### Follow-up on head `b454ae1`

The pull-request-event run
[44746084701](https://github.com/lordlebu/4000BCESaraswathy/actions/runs/44746084701)
passed all four browser shards. The simultaneous push-event run
[44746077744](https://github.com/lordlebu/4000BCESaraswathy/actions/runs/44746077744)
failed shards 2 and 3, exposing two additional test-design problems:

| Failed browser case | Cause | Correction |
|---|---|---|
| `notebook-content`: empty and dense fixtures | The fixture examined once to create a valid save, then replaced only `progress`. Depending on whether the periodic save had already flushed, the synthetic notebook inherited zero or one unrelated `diaryEvents` occurrence. That made “empty” non-empty and made the dense generic `.entry` count 56 instead of 55. | The fixture now explicitly writes `diaryEvents: []` and counts discovery entries through `.entry[data-discovery]`. |
| `questions`: settle a question | Converting discovery actions to event cards made the old four-round “resolve every available discovery” setup much more expensive. One run passed, while the duplicate run exhausted the 180-second budget and closed the browser mid-loop. The reading under test requires only `discovery_silver_water`. | Talk to the person who raises the question, then resolve exactly the named silver-water discovery event once before committing the available reading. |

Both corrections narrow the fixtures to the state their assertions actually own. Full browser
verification is delegated to GitHub Actions; no broad local E2E rerun is required for this
follow-up.

### Implementation decisions recorded after delivery

- `diaryEvents` remains an optional, validated save field, so older saves naturally read it as an empty list. No knowledge-version bump was needed and existing progress is preserved.
- Event choice application remains coordinated in `useHappenings`; occurrence creation happens in the same choice callback as grants, inventory, flags, and seen-state. The focused tests cover this boundary without introducing a second state container.
- The save stores the exact art collection, key, and take index. Image bytes and generated URLs remain outside the save.

## Outcome

The diary becomes the durable history of what happened during a journey. An event is no longer
only a modal card that briefly appears and leaves an id behind: resolving it writes an immutable,
readable diary entry. Looking at a discovery and entering a deeper part of a place use the same
event flow as authored happenings.

This removes the place-panel sections and controls currently labelled:

- `Here`
- `Something you have not looked at`
- `Look closer`
- `Further in`

Their rules and content are retained. They are presented as contextual events, resolved through the
shared event card, and recorded in the diary.

The overhaul also narrows the Field Diary to observations and event history:

- `Goals` becomes its own Records tab.
- `If you stopped here` moves to the Goals surface as its projected outcome.
- `Take it with you` moves to the shared Records toolbar because export applies to the journey, not
  to one diary section.
- Every image that was actually shown can be reopened from the event's historical diary entry;
  contextual art coverage remains Stage 7 work.

## Existing system and the seam to keep

The repository already has most of the right parts:

- `content/events.ts` defines conditions, deterministic selection, choices, grants, and story flags.
- `EventCard.tsx` is the accessible shared presentation for an event and its outcome.
- `useHappenings.ts` owns event scheduling and applies resolved choices.
- `journey.ts` is the authority for discovery gates and sub-location entry.
- `save.ts` persists discovery progress, seen event ids, event days, and flags.
- `Diary.tsx` renders discovery revisions but has no record of resolved event prose or choices.

The missing seam is a persisted **event occurrence**. `seenEvents` answers whether a definition has
run; it cannot answer what the player saw, chose, or wrote. Do not overload it. Keep event
definitions, event scheduling, and diary occurrences as three separate concepts.

## Industry patterns applied

This is a small, repository-shaped application of established narrative-game patterns, not a new
narrative engine.

1. **Separate authored content, runtime state, and presentation.** Yarn Spinner's Dialogue Runner
   delivers lines, options, and commands to presenters while variable storage owns state. Ink also
   keeps generated choices and story state separate from the host game's UI. Here,
   `GameEvent` remains the authored/runtime definition, the resolver produces a diary occurrence,
   and React presents either the live card or the historical entry.
2. **Use stable ids and explicit conditions.** Ink choices have source/target paths and conditional,
   once-only behaviour. The existing event and discovery ids already provide stable identity, so
   adapters should preserve those ids rather than copy prose into a second registry.
3. **Always provide an exit from a narrative choice.** Yarn Spinner exposes option fallthrough and
   Ink has invisible fallback choices. The existing `choicesFor` soft-lock guard stays binding for
   adapted events too.
4. **Persist outcomes, not UI state.** Save the resolved occurrence and its chosen outcome; never
   save whether a card was open or which panel section was expanded.
5. **Keep modal behaviour complete.** Event cards continue to use the shared `Modal`: focus moves
   into the dialog, remains contained, Escape follows the intentional close policy, and focus is
   restored. This follows the WAI-ARIA modal dialog pattern.
6. **Test visible behaviour and deterministic state transitions.** Playwright recommends isolated
   tests using user-visible locators and web-first assertions. Traces stay `on-first-retry`, not on
   for every run; this repository already has that efficient configuration.

Primary references:

- [Yarn Spinner Dialogue Runner](https://docs.yarnspinner.dev/components/dialogue-runner)
- [Yarn Spinner custom presenters](https://docs.yarnspinner.dev/components/dialogue-view/custom-dialogue-views)
- [Ink writing and conditional choices](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md)
- [Ink runtime integration and state](https://github.com/inkle/ink/blob/master/Documentation/RunningYourInk.md)
- [WAI-ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Playwright best practices](https://playwright.dev/docs/best-practices)
- [Playwright trace guidance](https://playwright.dev/docs/trace-viewer)

## Diary density and recurrence follow-up

### Current behaviour and the reported problem

The occurrence ledger is intentionally append-only. Today the diary also renders that ledger almost
one-for-one, so a small event such as `Adventurers' fire` consumes a heading, day, place, outcome,
and a separate `Reopen event` row. This is readable in isolation and too large as a history.

The same event can appear again, but only where the event definition permits recurrence:

- `once: true` authored, storyline, first, discovery-rung, and first sub-location events are
  suppressed after resolution;
- each discovery rung has its own event id, so several rungs may share a title while remaining
  distinct observations;
- `happening_twin_carrier`, `happening_twin_camp`, and woven events whose `again_after` is not null
  may resolve more than once and currently append a new diary occurrence each time;
- choosing a different option, meeting the event in another place, or seeing different art is a
  meaningful new occurrence even when the title is unchanged;
- reopening an event from the diary is read-only and never appends an occurrence.

The problem is therefore a **read-model problem**, not a reason to discard history. Do not dedupe
the saved ledger merely to make the page shorter.

### Industry solution applied

Use the established event-log split: immutable occurrences remain the source of truth, while the UI
reads a compact projection designed for browsing. Microsoft's Event Sourcing guidance explicitly
separates an append-only event stream from materialized read views and requires idempotent handling
of duplicate delivery. Ink and Yarn Spinner similarly keep narrative state separate from the view
that presents lines and choices. For the compact row, use the WAI-ARIA disclosure pattern: a button
with `aria-expanded` reveals detail on demand. If the journey eventually grows into hundreds of
rows, use a recycled/virtualized list rather than mounting every detail; Unity's `ListView` is the
game-UI analogue of that pattern.

References added for this follow-up:

- [Microsoft Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- [WAI-ARIA Disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
- [Unity UI Toolkit ListView](https://docs.unity3d.com/ScriptReference/UIElements.ListView.html)
- [Ink runtime state and presentation](https://github.com/inkle/ink/blob/master/Documentation/RunningYourInk.md)
- [Yarn Spinner dialogue runner and persistent state](https://docs.yarnspinner.dev/api/csharp/yarn.unity/yarn.unity.dialoguerunner)

### Proposed compact projection

Keep `DiaryEventEntry[]` unchanged as the saved record. Add a pure
`projectDiaryEvents(entries): DiaryEventRow[]` read function; it must never mutate, delete, or
rewrite occurrences.

Default row, one or two lines:

- title;
- compact metadata: `Day 2 · The Aravali Crossing`;
- a short outcome preview, clamped to one line;
- optional small art thumbnail that opens the same read-only memory;
- one disclosure control whose accessible name includes title, day, and place. Remove the separate
  full-width `Reopen event` row.

Expanded detail contains the original prose, chosen action, outcome, and art. Only one row should
be expanded at a time on narrow screens. The `Journey events` section initially shows the five most
recent projected rows and a `Show earlier (N)` control; expanding the history adds the next page
without discarding scroll or focus. Day headings are rendered only when a visible page crosses a
day boundary.

### Repetition and grouping policy

Store every legitimate resolution, but compact presentation conservatively:

1. Adjacent occurrences may roll into one row only when `eventId`, `choiceId`, outcome, place, and
   semantic art selection all match. Show `×N` plus the first/last day; expansion lists each day.
2. Never merge across an intervening different event, because that rewrites chronology.
3. Never merge different choices, outcomes, locations, art, or event ids merely because titles
   match.
4. Discovery rungs may appear under one discovery thread (`origin + subjectId`) but expansion must
   retain each rung outcome and order. The compact row shows `N observations` and the latest one.
5. A repeated event delivered accidentally with the same resolution token is ignored at write
   time. UI double-click protection remains, and a future resolver should accept an idempotency key
   rather than infer duplicates from matching prose.
6. A once-only event found twice in a save is treated as corrupt/legacy data: retain both in the
   ledger for recoverability, project them as a duplicate group, and emit a development diagnostic.

### Use-case matrix

| Use case | Persisted occurrences | Default diary presentation |
|---|---:|---|
| Once-only authored story beat | One | One compact row; full memory on disclosure. |
| Recurring ambient/woven event, identical outcome | One per resolution | Adjacent identical resolutions roll up as `×N`; separated resolutions remain in chronology. |
| Same event, different choice or outcome | One per resolution | Separate rows; never collapse player choice. |
| Same event at another place/day | One per resolution | Separate rows unless identical and adjacent at the same place; metadata makes the difference visible. |
| Discovery with several rungs sharing a title | One per advanced rung | One compact discovery thread with `N observations`; expanded ordered rungs. |
| First sub-location entry and later navigation | One first-entry occurrence | One row; ordinary re-entry adds nothing. |
| Event without art | One per resolution | Same compact row without an empty thumbnail or reopen promise. |
| Same title from different event ids | One per event | Separate rows; identity is never inferred from display text. |
| Canon wording changes after play | Existing snapshots unchanged | Memory shows what the player originally saw. |
| Very long journey | Full ledger retained | Five-row paging first; introduce virtualization only after measured need. |

### Acceptance and testing for the follow-up

- At 390 px width, a collapsed event row is no taller than three normal text lines plus spacing.
- Five collapsed rows and `Show earlier` fit before discipline content without rendering full prose.
- Opening a row shows its exact saved prose, action, outcome, and image and applies no game effects.
- Two adjacent identical recurring occurrences show one row with `×2`; expanding shows both days.
- Different choices, places, outcomes, art, or non-adjacent repeats remain distinct.
- Discovery rungs compact under their subject without losing crossings-out in the analytical entry.
- Keyboard focus remains on the disclosure after collapse; `Enter` and `Space` toggle it and
  `aria-expanded` reflects state.
- Projection tests use ledger fixtures and stay pure/unit-level. Browser coverage needs only one
  compact-row/disclosure case and one narrow-layout case; GitHub runs the full E2E suite.

## Budget ownership — one fact, one payload

The ideal balance is not to minimize either budget in isolation. It is to ensure each thing is paid
for once, by the payload that owns it.

| Concern | Owner | Budget charged | Rule |
|---|---|---|---|
| Place, sub-location, discovery, event prose and authored outcomes | `SouthOfTethys` canon | canon/lore | Author once and export; never repeat in TypeScript. |
| Relationships such as which discoveries belong in a sub-location | `SouthOfTethys` canon | canon/lore | Store ids, not copied descriptions or event objects. |
| Eligibility, arbitration, resolution and save migration | game TypeScript | app code | One generic implementation; no per-place switches. |
| Generic verbs and fallback sentences | game TypeScript | app code | One short template per event origin/discipline, reused everywhere. |
| Resolved title, prose, outcome and art key | player save | neither download budget | Snapshot at resolution so a past journey cannot be rewritten by a later canon release. |
| Paintings | static art assets | art/download budget | Keep out of JavaScript and canon JSON; saves retain only a semantic key. |
| Goals, event-memory and export presentation | lazy UI chunks | deferred app code | Load when Records or a memory opens, not in the initial walk payload. |

The current enforced startup limits are 180 KB gzipped for app code and 350 KB gzipped for the
canon chunk. Neither limit is to be raised for this work.

### Reuse before authoring

An adapter first reuses the words canon already ships:

- a sub-location event uses its existing `name` and `description`;
- a discovery event uses its discovery `name`, current rung, and next authored rung entry;
- an authored happening uses its existing `prose` and choice `line`;
- art uses the existing event/place/scene lookup and records only the resolved key.

Add a new canon text field only when the event genuinely needs to say something not already present.
Do not add parallel `eventProse`, `diaryProse`, or copied sub-location descriptions merely to fit a
UI component. The adapter is responsible for fitting existing content into the shared event shape.

### Small schema addition, large duplication avoided

Add optional discovery ownership to canon's sub-location schema:

```json
{
  "id": "lower_courses",
  "name": "The Lower Courses",
  "description": "Twenty-two storeys of red sandstone, of which four remain standing and the rest lie in roughly the order they fell.",
  "discoveries": ["discovery_tower_collapse"]
}
```

This adds one relationship id to the lore payload and lets the generic adapter work for every
place. It is preferable to a game-side map, a `switch (poiId)`, or a second copy of the prose, all of
which would charge app code and create two sources of truth. This schema change triggers a small
companion branch in `SouthOfTethys`: schema, authoring guidance, validation, export, and the initial
sub-location assignments belong there.

### Save size is a separate concern

Snapshotting resolved prose duplicates it only in that player's local save, after play. It does not
increase the app or canon download. Keep occurrences compact and JSON-safe; do not store base64
images, imported URLs, complete event definitions, or duplicate discovery revision arrays. Add a
save-size unit fixture containing a representative 100-event journey and record its serialized size
so unexpected structural duplication is caught without imposing an arbitrary diary-length cap.

## Target model

### 1. Event definitions stay transient

Keep `GameEvent` as the definition used to decide what can happen now. Add an explicit origin so
diagnostics and the diary can distinguish authored happenings from adapters without relying on id
prefixes:

```ts
type EventOrigin = 'happening' | 'discovery' | 'sub-location' | 'woven';

interface GameEvent {
  // existing fields
  origin: EventOrigin;
  subjectId?: string;
}
```

### 2. Resolved occurrences become diary data

Add a compact, JSON-safe record. Store the text the player actually received so later canon bundle
edits do not rewrite an old journey.

```ts
interface DiaryEventEntry {
  id: string;             // deterministic occurrence id, unique within the journey
  eventId: string;        // definition id
  origin: EventOrigin;
  subjectId?: string;     // discovery or sub-location id
  title: string;
  prose: string;
  choiceId: string;
  outcome: string;
  day: number;
  fieldMapId: string;
  poiId?: string;
  art: {
    collection: 'events' | 'places' | 'scenes';
    key: string;          // the exact preferred/fallback asset that was shown
  } | null;
}
```

Do not store callbacks, generated asset URLs, conditions, or the full `GameEvent`. Store the stable
semantic art collection and key selected by the folder-aware resolver, including a fallback key
when the event's own painting was absent. This makes the historical entry reopen the picture the
player actually saw instead of re-running fallback selection against newer state. Keep
`seenEvents` for selection/cooldown logic and `diaryEvents` for history. Older saves already treat
the optional ledger as `[]`; adding `places` requires tolerant validation rather than discarding
existing progress.

### 3. One resolver applies every event

Create a pure `resolveEvent(before, event, choice, context)` operation that returns:

- updated knowledge progress from `grants`;
- inventory changes from `gives` and `takes`;
- tiredness change from `eases`;
- story flags from `sets`;
- seen/cooldown bookkeeping;
- one `DiaryEventEntry`.

`useHappenings` coordinates this result with React state but does not independently construct diary
text. This gives unit tests one transaction boundary and prevents an event reward from saving
without its diary entry.

### 4. Discovery advances are event adapters

Replace the `PlacePanel -> onLook -> advance` shortcut with a pure adapter:

```ts
discoveryEvent(progress, discoveryId, context): GameEvent | null
```

It asks `journey.ts` whether the next rung is available. The card uses the discovery name, the
current observation as context, and the next rung's authored entry as its outcome. Its single
choice uses a specific verb derived from the discipline (`Examine`, `Compare`, `Trace`, `Read`),
with a safe generic `Examine` fallback. Resolving the choice advances exactly one rung and records
the occurrence. Completed or blocked discoveries do not produce an actionable event; the diary
continues to explain dependencies.

The adapter derives from canon data at runtime. Do not create duplicate happening JSON for every
discovery rung.

### 5. Sub-location entry is an event adapter

Replace `PlacePanel`'s local `openSub` state and the `Further in` list with:

```ts
subLocationEvent(progress, poiId, subLocationId, context): GameEvent | null
```

`canEnter` and `blockedFrom` remain the authority. An available transition opens an event card whose
outcome records entering and whose resolution sets the current sub-location. A blocked transition
does not open a modal; its reason remains available through the contextual action/diary dependency
language. `Back out` is navigation, not a second diary event.

The adapter reads the sub-location's optional `discoveries` ids. Once inside, only those discoveries
are offered as contextual discovery events; discoveries owned by the parent place remain at the
parent. An older canon bundle without the field treats the list as empty rather than guessing.

### 6. The place panel becomes context, not a task list

Keep the place title, people, stations, settlement work, and arrival prose. Remove the two stacked
task sections. Contextual event candidates should enter the existing single-surface arbitration so
only one card can open at a time and authored arrival happenings retain priority.

Candidate priority at a point of interest:

1. authored arrival happening;
2. newly available discovery event;
3. newly available sub-location event;
4. woven ambient event.

After a player resolves or dismisses the current allowed card, the next candidate may be offered.
Do not automatically chain several cards without returning control to the place.

### 7. The diary gets an event chronology and reopenable event art

Add a `Journey events` section before discipline entries. The saved chronology remains complete;
the default projection is the compact, paged summary defined in **Diary density and recurrence
follow-up** above. Discovery event rows link visually to their discipline entry but do not duplicate
its whole revision list. Existing discovery sections remain the analytical index; the chronology is
the lived record.

An occurrence with art exposes its thumbnail/title as the disclosure for a read-only event-memory
view containing the exact resolved image, title, prose, chosen action, and outcome. Do not add a
separate full-width `Reopen event` row. This review surface has no choice buttons and cannot reapply
grants, inventory changes, flags, or discovery advances. Escape and focus restoration remain owned
by `Modal`. An occurrence without art remains fully readable and does not invent a placeholder
painting.

Empty-state wording becomes `Travel, speak, or examine a place to begin.` and must not refer to the
removed `Look closer` control.

### 8. Records owns navigation and journey utilities

Refactor the current embedded `RecordTabs` strip into a small Records shell shared by its panels.
The shell owns tab navigation and record-wide utilities; the Field Diary owns only diary content.

The tabs become:

1. `Diary` — event chronology, discovery revisions, questions, field kit, and words;
2. `Goals` — the existing `GoalsSection` and `SettlingSection` content;
3. `Met` — the species collection;
4. `People` — people encountered.

`Goals` is lazy-loaded like the other Records surfaces and receives its own count/badge only for
currently actionable rows. It must not mount above the diary or appear in the diary shortcut list.

`If you stopped here` moves from `Diary.tsx` to the end of the Goals surface. It remains conditional
on having completed at least one discovery and still opens the existing `Ending` modal. This keeps
the projection beside the work toward it rather than among historical observations.

`Take it with you` becomes a single action in the Records shell toolbar. It opens a compact export
sheet containing the existing image export, text export, and replay link. The action is reachable
from every Records tab and is removed from the diary footer and shortcut list. On narrow screens it
may collapse to an icon-labelled menu button, but it must retain an accessible name and a 44px touch
target.

## Delivery stages

### Stage 0 — characterization

- Add unit tests that freeze current `advance`, `canEnter`, event grant, flag, and save behaviour.
- Add a focused browser test proving the current discovery-to-diary and sub-location flows before
  changing selectors.
- Record the existing `CLAUDE.md` modification as pre-existing and do not include it in this work.
- Record baseline app-startup and canon gzip sizes from a clean production build; budget caps remain
  unchanged.

### Stage 0.5 — canon relationship seam

- In a companion `SouthOfTethys` branch, add optional `discoveries` to sub-locations and validate
  that every id is a discovery offered at the parent point of interest.
- Assign `discovery_tower_collapse` to Kavik's Tower's `lower_courses`; assign other discoveries only
  where canon supports the relationship rather than distributing every parent discovery by guess.
- Export the updated bundle and update the game canon lock before implementing adapters.
- Acceptance: the export adds ids and schema structure without duplicating any existing prose.

### Stage 1 — occurrence ledger

- Add `DiaryEventEntry`, the pure resolver, save parsing, and migration.
- Make existing authored/woven events write occurrences.
- Render the new chronology in the diary.
- Persist the exact resolved art collection/key and add the read-only event-memory modal.
- Acceptance: a chosen happening survives reload with its exact outcome and image, can be reopened
  without replaying its effects, and does not become eligible again when it is once-only.

### Stage 2 — discovery adapter

**Status: mechanics delivered; contextual prompt/art acceptance remains in Stage 7.**

- Add `discoveryEvent` and discovery-specific resolution.
- Route place discovery interaction through `EventCard`.
- Remove `Here`, the anonymous placeholder title, and `Look closer` from `PlacePanel`.
- Update empty states, accessibility labels, and tests.
- Acceptance: one event advances one rung, writes one occurrence, updates the analytical entry, and
  remains correct after reload.

### Stage 3 — sub-location adapter

**Status: mechanics delivered; distinct arrival prose and art acceptance remain in Stage 7.**

- Add `subLocationEvent` and explicit sub-location surface state outside `PlacePanel`.
- Remove the `Further in` section.
- Preserve dependency explanations and back navigation.
- Acceptance: gated locations cannot be entered; open locations produce one recorded entry and can
  be exited without another entry.
- Kavik's Tower mechanical acceptance path is delivered: enter `The Lower Courses`, record its
  existing description once, expose `How the Tower Sat Down` there, back out without another
  occurrence, and re-enter as ordinary navigation. Reopening a resolved image is not yet applicable
  because its contextual art lookup currently misses; Stage 7 must complete that part.

### Stage 4 — arbitration and polish

- Centralize priority among arrival, discovery, sub-location, and woven candidates.
- Verify keyboard focus, reduced motion, phone landscape layout, and repeated-event cooldowns.
- Remove obsolete CSS and selectors only after the new browser tests pass.
- Run the targeted regression set, then the full suite once at the release boundary.

### Stage 5 — Records separation

- Introduce the shared Records shell and a dedicated Goals tab.
- Move `GoalsSection` and `SettlingSection` out of the Diary lead slot.
- Move `If you stopped here` to Goals and `Take it with you` to the Records toolbar/export sheet.
- Remove the obsolete Diary props, footer rendering, shortcuts, and associated layout CSS.
- Keep Goals, export controls, and event-memory review behind the Records lazy boundary or narrower
  dynamic imports so they do not enlarge the initial walk payload merely by existing.
- Acceptance: opening Diary shows no goals, ending projection, or export block; all three remain
  reachable from Records with keyboard, pointer, and phone landscape layouts.

### Stage 6 — compact diary projection

**Status: implemented in PR #270.** The pure projection, conservative adjacent grouping, five-row
paging, and accessible disclosure are in place. The occurrence ledger remains unchanged.

- Replace the large diary event article with a one/two-line summary row.
- Make the title/thumbnail the single disclosure action; remove the separate `Reopen event` row.
- Show full saved prose, choice, outcome, and art only in the expanded memory view.
- Group only repeats allowed by the repetition policy; preserve different choices and chronology.
- Acceptance: the narrow-layout and repeat fixtures in the follow-up section pass, and the existing
  save/reload fixture proves projection changes do not alter stored history.

### Stage 7 — contextual artwork and prose expansion

**Status: core implemented in PR #270; dedicated-art/report rollout remains.** Contextual cards use
folder-aware fallback or honest text-only layout, and authored lore remains in canon.

#### 7.1 Folder-aware artwork contract

Replace string-only event art fields with ordered semantic references:

```ts
interface ArtRef {
  collection: 'events' | 'places' | 'scenes';
  key: string;
}

interface GameEvent {
  // existing fields
  artCandidates?: ArtRef[];
}
```

Contextual fallback order:

1. a dedicated event painting for this discovery rung or sub-location;
2. the parent POI painting from `places`;
3. the POI-kind painting from `places` (`kind-archaeological_site`, `kind-eco_site`, etc.);
4. a text-only card with no reserved scene area.

Do not show `.activity-scene-blank` for a contextual event. A blank rectangle communicates a
missing asset and wastes the exact space this overhaul is meant to recover. Existing authored
happenings may retain their current composition where their art contract already resolves.

Extend `DiaryEventArt.collection` and save validation to admit `places`. Snapshot the exact
collection, key, and take that the player actually saw; diary memory must never rerun fallback
selection. Add an asset-retention fixture for one `events`, one `scenes`, and one `places` memory.

#### 7.2 Canon-owned prose contract

A live event needs two different pieces of writing:

- **prompt/context before the choice** — what the traveller notices or what entering looks like;
- **outcome after the choice** — what the traveller concludes or what changes.

The existing discovery rung `entry` remains the outcome and analytical diary reading. Add an
optional `prompt` beside a rung only when existing place/discovery prose cannot supply an honest
lead-in. For the first rung, fallback order is:

1. authored rung `prompt`;
2. a short composition from the parent POI arrival/description plus the discovery discipline;
3. one discipline-specific generic prompt, never the current universal placeholder.

For sub-locations, keep `description` as pre-entry context and add optional `arrival` as the
post-choice line. Where `arrival` is absent, use the small generic transition
`You enter {sub-location name}.` Do not repeat the full description as both prompt and outcome.

New authored prompts/arrivals belong in `SouthOfTethys` schemas, authoring guidance, validation,
and exports. The game owns only composition/fallback mechanics. This charges new wording to the
lore budget once and prevents per-place TypeScript switches.

#### 7.3 Coverage inventory and rollout

The current canon export has authored first prompts for all 55 discoveries and authored arrivals
for all 13 exported sub-locations. Later discovery rungs can use the preceding reading as their
lead-in. There are 219 later rungs without an individually authored prompt.

Review the generated event plates against South of Tethys canon before adding them to the
runtime registry. Use the scene's field map, local culture records, and established game
portraits for dress and material culture. A few people can appear in lived-in scenes where
their activity tells the story. Use local flora and vary silhouette, age, spacing, and scale
so vegetation does not look repeated. The current drafts are held outside the runtime registry
while this review and correction pass is underway.

Run `node tools/diary-content-coverage.mjs` for the current export's event-art source and
authored prose coverage by place. Discovery rows count each place where a discovery can be
examined, so the same discovery can appear at multiple places.

The Tower follow-up adds dedicated paintings and arrival prose for the Stair Shaft and Flooded
Undercroft, and gives all four Tower-collapse rungs authored prompts. The current inventory
finds dedicated art at 4 of 86 listed combinations, parent-place art at 16, and place-kind art
at 66. The remaining dedicated art and prose are still in production. Artwork integration
can proceed without an owner-selection pause per the current rollout instruction.

**Kavik’s Tower artwork integrated.** Both 512×384 watercolors are in the runtime event registry.
The discovery painting was revised to show irregular, partly buried wall sections and surviving
openings rather than stair-like courses. The Tower browser fixture now checks the saved art keys,
diary thumbnails, and reopened images after reload. GitHub Actions verification is pending.

- **The Lower Courses** — a descent past window ledges at ankle height, with red sandstone courses
  disappearing into delta silt. Delivery key: `events/poi_kavik_tower-lower_courses`.
- **How the Tower Sat Down** — the standing wall and aligned fallen courses from the observation
  point, with the stonework readable enough to support the discovery. Delivery key:
  `events/discovery_tower_collapse`.
- After selection, add the approved assets, check the event-card crop and diary thumbnail, and
  verify that the same image reopens after saving and reloading. Let GitHub Actions run full E2E.
- Use the coverage inventory to select the next high-traffic places where a dedicated painting
  adds information the existing place view cannot convey. Expand prompt and arrival prose in canon
  alongside each selected batch.

Add a generated report, not a hand-maintained map, with these categories:

- dedicated contextual art;
- parent-place fallback;
- kind fallback;
- intentionally text-only;
- authored prompt/arrival;
- composed fallback prose.

Start with the acceptance path (`The Lower Courses` and `How the Tower Sat Down`), then high-traffic
POIs. Do not block mechanics on 100% dedicated paintings: honest parent/kind fallbacks and
text-only cards are valid. What is forbidden is an unlabelled blank scene or generic prose being
reported as complete.

Stage 7 acceptance:

- The Lower Courses entry card shows dedicated or parent-place art, never a blank scene.
- `How the Tower Sat Down` has an authored/contextual prompt distinct from its resolved reading.
- Resolving either card changes prose from prompt to outcome rather than repeating one paragraph.
- The diary reopens the exact displayed `events`, `places`, or `scenes` asset after reload.
- An event with no valid art renders a compact text-only card without an empty image region.
- Coverage reports the baseline and improvement; app/canon budgets remain independently green.

## Test strategy and token-efficient workflow

Use the cheapest layer that can prove each rule and keep command output terse.

1. During model work, run only focused Vitest files:
   `npx vitest run test/events.test.ts test/save.test.ts test/journey.test.ts --reporter=dot`.
2. During component work, run the affected React tests plus `npm run typecheck`.
3. During each UI stage, run one named Playwright spec with one worker and line reporting:
   `npx playwright test e2e/fielddiary.spec.ts --workers=1 --reporter=line`.
4. Use deterministic `?seed` and `?at=poi_*` starts; never search or walk the world when the test is
   about a panel.
5. Prefer role/name locators and state polling. Do not add sleeps, screenshots on success, verbose
   reporters, or always-on traces.
6. Run `npm test -- --reporter=dot`, `npm run build`, and `npm run test:e2e:fast` once after the
   stages compose. Reserve slow E2E for the final pre-merge check or when its owned code changes.
7. On failure, inspect the retained Playwright trace before rerunning a broad suite.
8. Add one focused Records spec for tab ownership and one event-memory spec for reopening art; do
   not multiply the same assertions across every viewport. Keep viewport coverage in the existing
   reachability/layout test.
9. At each stage boundary, run `npm run check:size` against a clean production build and report app
   startup and canon gzip deltas separately. A lore increase must come from canon content or ids; an
   app increase must come from reusable behaviour. Any duplicated prose blocks the stage.

This reduces both machine time and diagnostic output while keeping one end-to-end proof for each
player-visible contract.

## Compatibility and risks

- **Old saves:** migrate by adding an empty occurrence ledger; never synthesize historical prose
  from `seenEvents`, because the chosen outcome is unknowable.
- **Repeated happenings:** occurrences need unique ids even when `eventId` repeats. Derive the id
  from the monotonic ledger position plus event id, not wall-clock time.
- **Canon edits:** snapshot player-visible prose and outcome in the occurrence; keep ids for linking.
- **Art changes:** persist the exact semantic asset key selected at resolution. The build must keep
  referenced event assets available; an asset-retention test should fail if a saved fixture points
  at a missing key. Do not store hashed Vite URLs in saves.
- **Double resolution:** disable choices after the first selection and make the resolver reject an
  occurrence id already present.
- **Card cascades:** return to player control between contextual events.
- **Terminology collision:** `EventBus` transports UI/game messages; `GameEvent` is narrative
  content; `DiaryEventEntry` is persisted history. Keep these names distinct.
- **SouthOfTethys ownership:** use a companion branch for the optional sub-location discovery
  relationship. Update its JSON schema, authoring guide, validation, exporter, and lock file first,
  then consume that exact bundle here. Authored wording remains there; adapter logic remains in the
  game.
- **Budget drift:** no cap increase is part of this plan. Canon prose and relationships charge
  canon, shared mechanics charge app code, history snapshots charge only the player's save, and
  images remain assets. CI reports these independently.

## Definition of done and current status

| Requirement | Status |
|---|---|
| Removed labels no longer appear in runtime UI | Delivered. |
| Authored, woven, discovery, and sub-location choices write durable occurrences | Delivered. |
| Reopening a memory cannot repeat rewards or state changes | Delivered for occurrences with resolved art. |
| Discovery revisions retain crossings-out and gates | Delivered. |
| Sub-location gates remain in `journey.ts` and explain blocking | Delivered. |
| Sub-location discovery ownership comes from validated canon | Delivered. |
| Goals, ending projection, and export are outside Field Diary | Delivered. |
| Old saves preserve discoveries, inventory, flags, and location | Delivered. |
| App-startup and canon chunks stay inside unchanged budgets | Delivered at PR #269 boundary. Recheck after Stages 6–7. |
| Event history is compact, paged, and conservatively groups repeats | Not delivered; Stage 6. |
| Contextual cards use honest artwork or text-only composition, never a blank placeholder | Not delivered; Stage 7. |
| Discovery prompts are authored/composed context rather than the universal placeholder | Not delivered; Stage 7. |
| Sub-location outcome advances beyond its pre-entry description | Not delivered; Stage 7. |
| `places` fallback art reopens exactly after navigation/reload | Not delivered; Stage 7. |
| Centralized arrival/discovery/sub-location/woven arbitration | Not delivered; retain as a later Stage 4 refinement unless a concrete collision appears. |
| Keyboard, reduced-motion, desktop, and phone-landscape coverage remains green | Delivered for PR #269; GitHub must rerun full E2E after Stages 6–7. |

The overhaul is not fully done until the five Stage 6–7 rows above are delivered. Mechanical event
conversion alone must not be described as completed presentation.
