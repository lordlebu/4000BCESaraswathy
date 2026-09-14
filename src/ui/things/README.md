# Thing plates

A painted plate for a made object or a raw material, shown in the satchel and the workshop.

**Empty, and nothing waits for it.** `ThingIcon` already draws a mark for every category and has
since the making layer landed, so a plate here is a **replacement** for something on screen, never
a gap being filled. Drop a file in and it appears — `src/ui/things.ts` globs this folder through
`src/ui/art.ts`.

## Naming

**Canon's id, kept whole**: `item_bronze_knife.png`, `material_reed_fibre.png`.

Not `bronze-knife.png`. `content/making.ts` states the rule at the top of its own file — canon ids
are kept, not converted, because the making layer cross-references far harder than the species
layer does and a second naming would be a second thing to get wrong.

Items and materials share this folder. Canon ids are unique across both and `nameOf` already
answers to either, so one convention rather than two.

## Three tiers, so ten files cover seventy-five items

1. `item_bronze_knife.png` — this exact thing
2. `kind-tool.png` — its category, in **this** folder
3. `src/ui/marks/kind-tool.svg` — its category, as a line mark
4. the emoji in `ThingIcon`

**Start at tier 2.** Ten paintings named after the ten `ItemKind` values — `tool`, `weapon`,
`container`, `textile`, `food`, `physic`, `light`, `record`, `ornament`, `shelter` — cover every
item in canon at once.

## Then the eight things a player carries and uses

`item_hide_tent`, `item_flint_knife`, `item_bronze_knife`, `item_cooking_pot`, `item_neem_salve`,
`item_flood_bread`, `item_reed_spear`, `item_bone_harpoon`. Those are the objects that now have a
verb on them — see `docs/cozy-systems-plan.md`, Phase 2.

## Shape

Square, around 256px, transparent background. It is drawn at ~20–44px beside a name, so it has to
read at a glance: one object, centred, no scene.

See `docs/art-placement.md` for the whole queue.
