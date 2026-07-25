# Prototype Source

This folder contains the first dependency-free browser prototype of **South of Tethys: Jambhudweepa Adventure**.

## Files
- `index.html`: canvas, controls, journal panel, and map legend.
- `styles.css`: cozy readable prototype styling.
- `main.js`: startup, keyboard input, rendering, and journal updates.
- `generator.js`: deterministic seed-based world generation.
- `journal.js`: tile descriptions and creature encounter text.
- `smoke-test.js`: Node-based generation and journal sanity checks.

## How To Play Test
Open `src/index.html` in a browser, generate a map from any text seed, move with WASD or arrow keys, and try to reach the `✦` landmark without stepping into sea tiles.
