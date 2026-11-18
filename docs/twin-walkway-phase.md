# Rail bridge, mixed verges, walkway lights and otter wake - 18 November 2026

## Owner selections and art policy

The target is the **upper RAIL bridge at y=25**. The lower ROAD bridge at y=27 is accepted and
retained, along with all older-map bridges. The first causeway interpretation was corrected by
the owner's screenshot. Flat code-drawn shadow samples were rejected. The owner approved the
subsequent generated **nes jrpg sprite** rail bridge with shaded stone supports/timber and a
shaped cast shadow. Only that crossing uses the new art. [Exact generation prompt and approvals](twin-walkway-art-prompts.json).

Approved vegetation C: simple object-style cliff shrubs plus actual old-map grass at desert/
grass borders. Approved lighting: the new covered clay lamp. Samples were shown before applying
all three choices. Mixed art forms are intentional: inspect the actual element and its approved
references, follow the known style or ask when uncertain, and show representative new/replacement
samples for owner selection before applying them. This includes code-native art. Preserve
accepted exceptions; a request for options is not blanket approval. AGENTS.md and CLAUDE.md now
carry that instruction as well as the art guide.

## Implementation

- The generated whole rail span replaces the repeated blue-column object on the three rail-water
  cells (31..33,25). The accepted road bridge planner/assets are untouched. The original route
  strips connect the rails over the new abutments. The source iron rows 16/20 are positioned to
  match the existing 24px gauge. The art frame extends 32px onto each bank to close transparent
  gutters: the three-tile water span draws at 448px width, with visible abutments overlapping land.
  A regression guard measures the actual source alpha edges against both banks. Rail routing/
  fare/turnaround/world/save data remain unchanged.
- Compact rail source is 96x40 RGBA in `assets/source/twins/rail-bridge-jrpg.png`; runtime is
  384x160, crop/resize only with no colour/alpha reduction. The full generated original and review
  sheets stay ignored under `assets/source/events/walkway-options/` and
  `dump/twin-city-art-review/walkway-options/`. Rebuild: `python tools/build-twin-rail-bridge.py`.
- Object shrubs use broad native leaf masses in four muted palettes; borders reuse original
  overdraw grass frames at half size. Original generated shrub assets are retained. The same
  seeded clearance and total 160-verge budget apply. New shrub/lamp art is reproducible native
  code: `node tools/build-twin-verges.js`.
- The twin map had bypassed the older maps' lamp layer. It now uses the same spacing/bridge-end/
  junction rules on dry approaches, with covered clay posts and the accepted warm, fog-aware
  glow. Road/bridge cells and travel rules are unchanged; no lamp floats on water.
- Swimming otters reuse the existing wading/boat ripple. Eight pooled marks fade over 1.2s,
  emitted only after real movement on open water, within camera and known ground. No marks on
  land, bridge/rail decks, at rest, or across journey-time jumps. Reduced motion suppresses the
  wake. A short cosmetic interpolation between adjacent water waypoints makes the trail readable;
  logical wildlife routes and meeting positions remain authoritative. No new full-screen pass,
  growing particle list, per-frame texture redraw or saved state.

## Phase boundary

All requested samples were selected before their art was applied. Final validation: **3,863 unit
tests across 177 files**, typecheck, production build, canon lock and bundle-size gates pass.
App code remains **219.6/220 KiB gzip**, with no budget increase. Ten focused browser cases are
verified: seven cave/rest/landscape regressions and three new walkway/wake cases. The final new
cases pass for actual rail dimensions, mixed grass/shrub texture loading, visible/lit covered
lamps, the live bounded water trail and reduced motion. Day/night rail captures were inspected;
the lower road bridge retains its artwork and the upper rail abutments meet both banks.

The first wake fixture confused clock hours with the game's 06:00 phase origin and sampled a
point that had already moved before the next clock step. It now starts just before an actually
measured seeded water move using public inputs (17:57, near (32,31)). No gameplay timing or
assertion thresholds were relaxed. Ripple origins sit behind the tail so the body does not hide
the trail; the live check waits for several marks, with a fixed eight-mark pool.

Sources, screenshot/review HTML and local harnesses remain ignored in their documented review
paths, except the compact approved runtime/rebuild inputs. The broader final integrated visual/
gameplay/save/hardware review and owner merge remain separate.
