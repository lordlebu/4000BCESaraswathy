# Compact field notebook

Owner direction, 10 November 2026: refresh both the Records diary and live field notes as an
illustrated notebook, with Dwarf Fortress-like information density, small serif prose and clean
sans-serif controls. Bundle open fonts, offer a saved reading-size control, illustrate Records
tabs and provide shortcuts to populated diary sections.

## Status — 10 November 2026

All four implementation phases are complete. [PR #257](https://github.com/lordlebu/4000BCESaraswathy/pull/257)
is open and unmerged. Implementation commit `c65f8e9` passed both
[push CI](https://github.com/lordlebu/4000BCESaraswathy/actions/runs/42807846698) and
[PR CI](https://github.com/lordlebu/4000BCESaraswathy/actions/runs/42807855300), including type
checking, unit tests, builds, bundle/canon checks and all eight browser shards without retries.
These results apply to that implementation commit; subsequent documentation commits have their
own checks.

The remaining milestone is review and release: explicit merge approval is pending. After approval,
merge the reviewed PR, let the existing `pages.yml` workflow deploy, and verify the live diary.
The merge has not occurred and the redesigned diary has not been verified on the live site.
An itch.io release or version tag is a separate action.

## Implementation

- Phase 1 — complete: inspected actual typography and captured the original game in an isolated checkout of
  `e55caaf`. Reviewed desktop 1280×800, phone 390×844, small phone 360×800 and landscape 844×390,
  using `?seed=notebook-review&hour=12&at=poi_eastern_field` and one Look closer.
- Phase 2 — complete: Caladea prose and Carlito controls, bundled WOFF2 with OFL licenses. Defaults: 14px
  prose, 13px controls, 16px entry headings and 18px title at the browser's default root size;
  line height 1.45. Comfortable and Large use 16px and 18px prose, with supporting text scaled
  proportionally. `preferences.ts` stores the optional choice alongside existing screen choices.
- Phase 3 — complete: small decorative SVG ink drawings on the Journey, Met and People tabs. A scrollable
  row links to populated sections and focuses their headings without hiding previous readings.
  The sticky header's measured height provides clearance for wrapping controls and focused text.
- Phase 4 — complete: component, preference and browser regression checks, rendered screenshots, build and
  bundle budgets. `e2e/notebook*.spec.ts` covers normal and dense reading scenarios.

`notebook.css` is intentionally scoped to `.field-diary` and `.notebook-settings .journal`:
`.diary` is also the shared shell for Travel and other panels. Only the Records tab strip gets
its illustrated treatment in all three Records panels. Dock heights, map-space budgets,
progression rules, save versions, accepted paintings and the export renderer stay as they were.

## Measurements

Original prose: inherited Georgia, 16px, with a 27.2px line height in the partly filled diary.
New compact prose: Caladea, 14px, with a 20.3px line height. Unlike the old diary's
sparse/filling/dense styles, reading rhythm no longer changes as knowledge accumulates.

Measured dock heights before and after at reading height:

| Viewport | Original | Compact |
|---|---:|---:|
| 1280×800 | 448px | 448px |
| 390×844 | 472.625px | 472.625px |
| 360×800 | 448px | 448px |
| 844×390 | 270px | 270px |

The fonts add 124,588 bytes in five WOFF2 assets, fetched from the same static host as the game.
No font service or runtime dependency was added. See `src/ui/fonts/README.md` for exact sources.

## Review evidence

Original phone diary: [before](images/notebook/before-phone.png).

The illustrated tab strip loads with Records, and its four marks share one external SVG sprite.
This keeps both the root and GitHub Pages subpath builds within the existing first-frame bundle
budget (219.8 KB gzipped for the Pages app chunk). The sprite is listed in `art-kept.json`.

Validation includes the full unit sweep (3,346 passed, one existing subprocess case blocked by
the sandbox); the entire affected art-renderer file passes with subprocess access (190/190).
Final focused component/preference/art checks pass too. The preference regression was verified
to fail when restoration was removed and pass after restoration.

Existing browser checks for map coverage, dock heights, day/night changes, modal navigation and
discovery links pass. The first new content check bundled four reloads into one test and exhausted
its existing 180-second deadline during the fourth state; it is now four independent cases,
without changing the timeout or application behavior.

Final production verification: all 13 notebook/content/discovery browser tests pass against
`DEPLOY_BASE=/4000BCESaraswathy/`, using Playwright 1.62.1's pinned Chromium 151 headless shell.
The four content states independently retain their authored text, including every rung of all
46 discoveries in the dense fixture. The cases also check 200% text enlargement and font
fallback. Four device cases verify 14/16/18px reading choices, saved preferences, section-heading
focus below the sticky header, focus restoration and unchanged dock geometry.

Review screenshots: [desktop](images/notebook/desktop.png), [phone](images/notebook/phone.png),
[phone discovery](images/notebook/phone-discovery.png), [landscape](images/notebook/landscape.png),
and [dense diary at Large](images/notebook/dense-large-phone.png).
