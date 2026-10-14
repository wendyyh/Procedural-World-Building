# Study sequence audit

The site treats these as independent portfolio studies, not as coursework. The following is an internal coverage check against the [scene/setup deck](https://www.figma.com/deck/PFjBPB5uuqJIZd3em9Kk7P) and the adjacent [procedural maps deck](https://www.figma.com/deck/Hc8vcT9xVjjd1p3sT5xKgQ/PWB---Class-03), reviewed 2026-10-13.

| Source topic | Portfolio coverage | Remaining boundary |
| --- | --- | --- |
| Interactive Three.js scene, geometry, orbit camera, lighting, materials, fading grid, background | Existing terrain and voxel viewports, plus Noise Lab's direct grid/scene | No separate scene-only page needed for the current portfolio story |
| Noise equations, 2D map, displaced 3D grid, parametric and resolution controls, shaping dropdown | Noise Lab (now first in sequence) | Layer blending and domain warping were presented as ideas, not part of the core build |
| Simulation section with start/stop control, noise-driven height field, terrain calibration | Terrain Field has a noise-driven height field, resolution controls, and a thermal-erosion toggle/iteration controls | No time-stepped simulation playback with start/stop; the current erosion runs as a deterministic generation step |
| Height-dependent surface and wireframe shortcut | Terrain Field's topographic/analytical modes and `F` shortcut | None for these two capabilities |
| Infinite map navigation | Terrain Field's streaming mode and WASD movement | Prototype tiles are resident around the camera; this is not yet a fully persistent infinite world |
| CRUD/persistence concepts | Firebase-ready create/read configuration library for Terrain Field and Voxel World | Update/delete were not requested as a separate build in the source deck and remain intentionally unimplemented |

The scene/setup deck has one explicit build prompt. The map deck has two, one for noise mapping and one for a simulation-driven height field. The latter is partially covered as noted above. Cellular automata, flood fill, and hydraulic erosion appear as examples of simulation methods, not as separate required studies in these decks. The public UI does not describe any study as an assignment or exercise.
