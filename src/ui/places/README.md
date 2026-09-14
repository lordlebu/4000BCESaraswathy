# Place views

A painted view of a point of interest, shown across the top of `PlacePanel`.

**Empty, and the game does not wait for it.** The panel reads perfectly well without a picture and
always has. Drop a file in here and it appears — `src/ui/places.ts` globs this folder through
`src/ui/art.ts`. No list to update, no code to change.

## Naming

**Canon's poi id, kept whole**: `poi_glass_scar.png`, `poi_lothal_camp.png`.

Species ids are rewritten on the way in — `fauna_desert_fox` becomes `desert-fox` — and points of
interest are **not**: `content/places.ts` carries `poi_glass_scar` exactly as canon writes it. A
file called `glass-scar.png` looks right and matches nothing, which is the mistake `plates.ts`
records making the first time it was wired up and `portraits.ts` records making again.

## Start with the six kinds, not the twenty-six places

`kind-settlement.png`, `kind-quarry.png`, `kind-travel_node.png` and so on are the fallback, so
**six files cover every place in the game.** A specific place replaces its kind whenever somebody
has an afternoon for it.

## Shape

16:7, cropped to fill (`object-fit: cover`), so the panel's proportions are decided by the
stylesheet and not by whatever dimensions the first painting happens to have. Around 800px wide is
plenty — it is never shown larger than the dock.

See `docs/art-placement.md` for the whole queue and `docs/art-direction.md` for the five rules.
