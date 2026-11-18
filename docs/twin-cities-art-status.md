# Harappan phased plan ? completion audit


## Terrain height and palette follow-up - 18 November 2026

The new map now bakes stepped height shading, river-bank bands and soft sand/turf/rock/snow
transitions directly into a shared ground atlas. Ground stays one quad per tile, with no new
per-frame animation or biome/elevation/save changes. The northeast meadow uses a muted sage
palette and sparse broad turf/stone clusters instead of the bright flat green. Cool lichen and
dry olive are available as development review samples; the owner selected sage.
See [terrain samples and implementation notes](twin-terrain-softening.md). Buildings, sprites,
portraits, event cards and the accepted Beedu remain unchanged. The owner approved muted sage. Eight combined browser checks pass; final
integrated review remains pending.


## Landscape and motion follow-up - 18 November 2026

The required illustration backlog remains **zero**. The owner added one focused landscape/
motion pass: simple NES JRPG cliff shrubs and half-size grass/desert border bushes, richer
older-map ground decor, very slow cave residents, cave smoke, subtle river ripples and localized
desert haze. These are implemented with capped static placements and small cached pixel effects;
phase-end browser, build and size checks pass. Desert haze remains after its measured on/off
comparison; the cave software-renderer samples are noisy, as recorded in the phase ledger.
The cave turn is now 120 seconds with a single slow out-and-back, independent of journey-time
jumps. Existing buildings, Beedu and saved geography remain accepted. See the
[landscape/motion ledger](twin-landscape-motion-phase.md) for scope, exact prompt and budgets.

After this pass, the required work is still the final integrated visual/gameplay/save/performance
review, resolving findings, and owner review/merge. Further character and seasonal art is optional.

Updated 18 November 2026. Companion to the [original plan](twin-cities-art-plan.md).

## Illustration production complete

**No required illustrations remain.** All sixteen authored places now have preferred painted
views: fifteen new full-colour 512?224 panoramas and the accepted Harappa courtyard. They use
cozy watercolor/fine ink, varied warm/cool palettes and each place's authored features. See
[the exact delivery inventory, prompts and rebuild ledger](twin-place-views-phase.md).

Other completed art/gameplay work:

- All twenty valley happenings have preferred paintings; both travel banners and the actual
  map-arrival card have paintings. Accepted earlier originals remain fallbacks.
- Thirteen main portraits, generated wildlife/tram, fifteen named map identities and culture/
  language data; global unknown/known stranger faces remain stable through introductions.
- Northeast Windward Cave at (51,12): distinct green meadow, stream, foothills, mountains and
  border snowcaps, with bounded migration of earlier saved maps and the stable historical POI id.
- Mirlepa/Yamantaka alternate local walks and seated turns; helpers and props rotate by journey day.
- Beedu flight/sighting/witness dialogue and Kang's optional five-beat bust quest, three map
  stages, corrected stone/clay texture and final lapis-eye/paint event cards.
- Shared sparse cliffs/decor and generated NES JRPG props, directional road bridges and separate
  road/rail gates. Ostrich tram uses 240ms/tile with its existing route/fare/day cost and turnaround.

Existing building styles, art, lots and proportions are explicitly retained. New map art stays
simple NES JRPG; accepted Beedu alone keeps small SNES art. Off-map place/event views stay painted.
Raw generations and screenshots remain in existing ignored desktop paths.

## Next required phase

| Work | Completion condition |
| --- | --- |
| Integrated visual review | Check place/event/portrait crops, material/likeness continuity, desktop/mobile and keyboard/touch readability, fog and dusk |
| Gameplay review | Check both cities/crossing, new highlands, cave turn-taking/helpers/props, Beedu event/dialogue, tram terminal turns and optional bust |
| Save/performance review | Confirm reload continuity and measure frame/load costs on representative views; resolve actual findings |
| Publication | Final exact-head CI, owner review and merge |

Run checks after complete phases. This production delivery does not claim the final integrated
visual/performance review is finished or replace owner review.

## Optional work, outside the required illustration count

Generated replacements for eleven other already-present NES NPC sheets, bespoke helper portraits,
separate Kang commission/site/preparation takes and extra seasonal animation variants. None is
required to fill a missing portrait/place/event slot. Do not repaint accepted buildings or Beedu.
