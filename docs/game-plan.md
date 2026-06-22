# South of Tethys: Jambhudweepa Adventure Plan

## Vision
Create a gentle 2D indie adventure game for unwinding after a long day. The player travels across Jambhudweepa, a warm, hand-drawn world south of the ancient Tethys Sea, discovering geography, creatures, shrines, forests, rivers, coasts, mountain passes, and small stories rather than chasing combat-heavy goals.

## Player Experience Goals
- **Relaxing exploration:** short sessions should feel satisfying even if the player only wanders, names places, and meets one creature.
- **Geography-first worldbuilding:** terrain, rivers, climate bands, coasts, and landmarks should drive what the player finds.
- **Cute indie 2D tone:** future art direction should favor hand-drawn tiles, soft palettes, readable silhouettes, and cozy creature designs.
- **Light narrative:** stories should emerge from travel logs, encounters, ruins, oral histories, and environmental clues.
- **Replayable maps:** a seed-based world generator should create new journeys while preserving the same cultural-geographic mood.

## Core Gameplay Loop
1. Start at a small caravan camp, ferry landing, or riverside village.
2. Choose a direction on the overworld map.
3. Enter a tile or point of interest.
4. Observe terrain, weather, flora, creatures, and local lore.
5. Collect notes, sketches, place names, simple supplies, and route knowledge.
6. Unlock safer paths, map annotations, creature journal entries, and new travel options.
7. Return to camp or continue toward a distant landmark.

## MVP Scope
The first playable milestone should be deliberately small:
- A seed-based 2D tile world map.
- Basic terrain types: sea, coast, plains, forest, wetland, hills, mountains, desert, river, and settlement.
- A controllable player marker moving on the generated map.
- A travel journal panel showing current tile description, nearby geography, and possible creature sightings.
- At least six creatures distributed by biome.
- One restful objective: reach a landmark and record it in the travel journal.

## Initial Technical Direction
Use a lightweight browser-based stack first so the game is easy to run locally:
- Static HTML/CSS/JavaScript for the prototype.
- Canvas or DOM grid rendering for the map.
- Plain JSON data files for creatures, biomes, and encounter tables.
- Seeded pseudo-random generation so maps are shareable and reproducible.

A later production version can move to Godot, Phaser, or another engine if animation, tooling, or packaging needs grow.

## World Pillars
- **South of Tethys:** the world should evoke ancient coastlines, river basins, monsoon-fed forests, dry plateaus, deltas, and mountain horizons.
- **Jambhudweepa as travel fantasy:** the setting is inspired by mythic geography and ancient journeys, but should remain original and respectful rather than claiming historical accuracy.
- **Creatures as neighbors:** animals and mythical beings are primarily observed, befriended, sketched, or avoided; combat is optional or absent in early versions.
- **Place memory:** discovered names, routes, and sketches should make the map feel personally authored by the player.

## Milestones

### Milestone 0: Planning and Repo Skeleton
- Capture the product vision, MVP, architecture, and content direction.
- Add initial data schemas for biomes and creatures.
- Add a minimal prototype entry point plan.

### Milestone 1: Map Generator Prototype
- Implement a deterministic seed function.
- Generate terrain using layered noise or simple value fields.
- Carve rivers from high elevations to sea.
- Render a colored tile map in the browser.

### Milestone 2: Exploration Prototype
- Add player movement.
- Add tile inspection text.
- Add a discovery journal.
- Add basic creature encounter probabilities by biome.

### Milestone 3: Cozy Adventure Slice
- Add one generated landmark quest.
- Add small settlement names and route hints.
- Add sound/music placeholders.
- Add first pass of cute hand-drawn-style placeholder tiles.

## Design Questions To Resolve
- Should the map represent a single region, an island, or a broader subcontinent-scale journey?
- Should time of day and monsoon seasons affect routes and creature sightings?
- Should the player have resources such as food and rest, or should exploration remain frictionless?
- Should later lore use fictionalized languages and names, or a broader invented naming system inspired by ancient geography?
