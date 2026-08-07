# Play Test Guide

Run `npm run dev` from the repo root and open http://localhost:4173.

## Controls
- Type a journey seed and select **Generate map** (or press Enter) to start a new route.
- Move with **WASD** or the **arrow keys**, or **tap/click** a tile to walk there — the route
  goes around the sea rather than into it.
- Sea tiles are blocked. Everything else is walkable; wetland, hills and mountains just take
  longer to cross.
- The seed lives in the URL, so a journey can be shared as a link: `?seed=river-road`.

## Showcase seeds

These three were chosen after the generator fix, and are worth checking after any change to
`world/`:

| Seed | What it shows |
| --- | --- |
| `play-test` | A broad western coast, a mountain spine down the east, three rivers, wetlands in the middle. |
| `river-road` | Hill country wrapping a central range, with desert in the hot south. |
| `monsoon-evening` | Heavy forest and wetland, a compact highland block, very little open plain. |

## Goal
Reach the `✦` landmark and record it in the travel journal. The journal updates after every move
with the current biome, a description of what lies in each direction, creature signs, a plant
growing there, a nudge toward the landmark, and the discovery count.

## What To Observe
- Does the generated geography feel readable at a glance?
- Do the highlands read as a range rather than scattered peaks, and do rivers run off them
  sensibly?
- Does the settlement start feel safe and welcoming?
- Does the fog lifting ahead and settling behind you make the map feel like a memory?
- Does walking feel like walking — is the step tween too fast, too slow, or right?
- Do wetland and hills feel appropriately slower without feeling sticky?
- Does the landmark give the session a calm, finishable objective, and does 5–10 minutes feel
  right for reaching it?
- Do the creature and plant suit the terrain they appear on, or do they read as misplaced?
- Does revisiting a tile show the same creature and plant as before?
- Reload the page mid-journey: is the fog you lifted still lifted?
