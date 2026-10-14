# Procedural Terrain Lab: simulation and streaming

## Purpose

This milestone develops the terrain generator into a small world-systems prototype. The same deterministic height-field interface now supports erosion, analytical surface views, and a continuously streamed landscape while preserving the compact controls and reproducible seeds established in the first milestone.

## Experience goals

- Demonstrate terrain as data that can be transformed, analyzed, and rendered in multiple ways.
- Make the effect of thermal erosion immediately visible and measurable.
- Render elevation, slope, and contour information directly in the terrain material.
- Extend the world beyond one mesh without visible height discontinuities.
- Keep exploration responsive with a bounded set of resident chunks.
- Provide fast keyboard inspection without hiding equivalent controls in the interface.

## Updated data flow

```text
Seed + world-space coordinate
              ↓
      Fractal simplex noise
              ↓
       Shaping operation
              ↓
   Padded simulation height field
              ↓
       Thermal erosion passes
              ↓
      Cropped Float32Array
       ├── 2D survey canvas
       ├── elevation-aware shader
       └── streamed terrain cache
```

The simulation remains a field producer. The preview, shader, and mesh do not need to know how the values were generated.

## Thermal erosion model

Each pass compares a cell with its eight neighbors. When the steepest height difference exceeds the talus threshold, a configurable fraction of the unstable material moves to the lowest neighbor.

| Parameter | Effect |
| --- | --- |
| Iterations | Controls how far the simulation develops |
| Talus threshold | Defines the steepest stable local slope |
| Transport | Controls the fraction moved during each pass |

The operation is deterministic and uses paired deltas, so one pass reads a stable source state before applying material movement. The interface reports average cumulative movement per visible height sample.

## Seam-safe streamed terrain

Streaming mode keeps a `3 × 3` neighborhood around the active camera tile. Each chunk samples simplex noise in shared world coordinates, so adjacent edge vertices start with identical values.

Erosion requires more context than the displayed tile. Streamed chunks therefore generate a hidden halo wider than the simulation radius, run erosion on the padded field, and crop the result. Matching chunks process the same neighborhood around a shared edge, preserving continuity after simulation.

Generated chunks are stored in a small least-recently-used cache. Camera movement changes the resident neighborhood without accumulating unbounded geometry or field data.

## Elevation-aware material

The terrain uses a custom vertex and fragment shader. The vertex stage forwards normalized elevation and world-space normals. The fragment stage can display:

- **Topographic:** water, shore, vegetation, rock, and snow bands derived from elevation.
- **Elevation ramp:** a continuous dark-to-light scalar visualization.
- **Slope analysis:** low-slope terrain in green and steep terrain in stone tones.

Contour lines are calculated from the normalized elevation interval in the shader. The 2D survey uses the same display modes and contour settings for a consistent analytical view.

## Exploration model

- `W`, `A`, `S`, and `D` move the orbit target and camera across streamed tiles.
- Holding `Shift` increases travel speed.
- Mouse or trackpad panning also updates the active tile.
- `F` toggles wireframe topology.
- `C` toggles contour lines.

Keyboard listeners ignore active text, range, and select controls so editing settings never triggers navigation or display shortcuts.

## Module additions

```text
src/features/terrain/
  TerrainWorld.jsx
  WorldNavigator.jsx
  generation/
    simulateThermalErosion.js
    terrainFieldCache.js
scripts/
  verify-terrain.mjs
```

- `simulateThermalErosion.js` owns the deterministic material-transfer simulation.
- `terrainFieldCache.js` bounds reuse of generated world chunks.
- `TerrainWorld.jsx` composes the resident meshes, water surface, and reference grid.
- `WorldNavigator.jsx` translates camera movement into integer chunk coordinates.
- `verify-terrain.mjs` checks determinism, normalized bounds, erosion activity, and shared-edge continuity.

## Performance strategy

- Only nine terrain chunks are mounted in streaming mode.
- Revisited chunks reuse cached typed arrays.
- The simulation halo is created only when erosion is enabled in streaming mode.
- Surface mode, contours, wireframe, elevation scale, and water level do not regenerate noise.
- Geometry and shader materials are released when their meshes are replaced.
- Field verification runs independently of WebGL through Node.js.

## Completion criteria

- Identical seeds and parameters produce identical simulated fields.
- Erosion parameters visibly change landform profiles and movement statistics.
- Every generated height remains normalized between zero and one.
- Adjacent streamed tiles share identical edge heights after erosion.
- Camera travel updates the active tile while keeping a bounded resident neighborhood.
- Topographic, elevation, and slope views work in both the 3D surface and 2D survey.
- Contour and wireframe shortcuts work without interfering with form controls.
- Bounded and streaming modes can be switched without stale camera or chunk state.
- The automated terrain verification and production build both pass.

## Next boundary

Future systems can build on the same field contract: hydraulic erosion, river accumulation, biome moisture, deterministic object placement, and saved world configurations can be introduced without replacing the renderer or streaming coordinator.
