# Play Test Guide

Run `npm run dev` from the repo root and open http://localhost:4173.

## Controls
- Type a journey seed and select **Generate map** (or press Enter) to start a new route.
- Move with **WASD** or the **arrow keys**, or **tap/click** a tile to walk there — the route goes
  around the sea rather than into it.
- Zoom with the on-screen **+** / **−**, the mouse wheel, the `+` and `-` keys, or a pinch; `0`
  returns to the automatic fit. Four steps, from one tile per 32px — the whole country on a desktop
  — to four times that. Whole steps only: pixel art at a fractional scale crawls as you walk.
- Sea tiles are blocked. Everything else is walkable; wetland, hills and mountains just take longer
  to cross.
- The seed lives in the URL, so a journey can be shared as a link: `?seed=river-road`.
- `?hour=21` overrides the time of day, which otherwise follows your own clock. Use it to check
  dusk without waiting for dusk.

## Showcase seeds

Worth re-walking after any change to `world/`:

| Seed | The country | The journey |
| --- | --- | --- |
| `play-test` | Broad western coast, a mountain spine down the east, three rivers, wetlands through the middle | Thenavati → **Lamtala, the Standing Stones**, 20 steps |
| `river-road` | Hill country wrapping a central range, desert in the hot south | Raalipura → **Khokotala, the Great Banyan**, 25 steps |
| `monsoon-evening` | Heavy forest and wetland, a compact highland block, very little open plain | Rainghat → **Yamvan, the Shell Beach**, 23 steps |
| `highland-path` | Wide plains with forest belts, hills to the east | Maanekoli → **Raatshila, the Great Banyan**, 22 steps |
| `delta-camp` | Long coast, plains and forest, one river | Sarkoli → **Paabhasa, the Great Banyan**, 25 steps |

Names and landmarks are deterministic, so if any of those change, something in `world/` or
`content/` changed with them.

## Goal
Reach the landmark and record it. The journal updates after every move with the current biome, what
lies in each direction, creature signs, a plant growing there, a nudge toward the landmark, and the
discovery count. Arriving writes a page you can keep.

## What to observe

**The country**
- Does the geography read at a glance?
- Do the highlands form a range rather than scattered peaks, and do rivers run off them sensibly?
- Does the settlement start feel safe and welcoming?

**Moving**
- Does walking feel like walking — is the step tween too fast, too slow, or right?
- Do wetland and hills feel appropriately slower without feeling sticky?
- Does the traveller face the way you expect, in all four directions?
- Does the fog lifting ahead and settling behind make the map feel like a memory?

**Reading**
- Do the creature and plant suit the terrain, or read as misplaced?
- Does revisiting a tile show the same creature and plant?
- Do the invented place names sound like they belong together?
- Does the landmark suit the ground it stands on? *(A salt pan on a monsoon shore was a real bug —
  see `docs/playtest-notes.md`.)*

**The ending**
- Does the landmark give the session a calm, finishable objective?
- Does 5–10 minutes feel right for reaching it?
- Does the arrival page land, or does it read as just another journal entry?
- Is the exported journal something you would actually show someone?

**The light**
- At `?hour=6`, `12`, `19` and `22` — does each read as that time of day?
- At night, can you still tell river from forest from hill in the lit ring?

**Persistence**
- Reload mid-journey: is the fog you lifted still lifted, and are your sketches still recorded?
