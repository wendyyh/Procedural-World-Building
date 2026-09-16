# Procedural Terrain Lab: function-based terrain

## Purpose

This milestone turns the existing WebGL study into a deterministic terrain generator suitable for a portfolio case study. It focuses on the relationship between a two-dimensional scalar field and the three-dimensional terrain derived from it.

## Experience goals

- Show the same generated field as a topographic map and a terrain mesh.
- Make every output reproducible from a seed and a compact parameter set.
- Expose the parameters that have a meaningful visual effect.
- Make mesh resolution and topology inspectable.
- Keep camera interaction responsive while the generator updates.
- Preserve a clear boundary between generation and rendering so simulations can be added later.

## Data flow

```text
Seed + noise parameters
        ↓
Seeded simplex noise
        ↓
Fractal noise stack
        ↓
Shaping operation
        ↓
Shared Float32Array
        ├── 2D color preview
        └── Three.js vertex heights and colors
```

The preview and terrain consume the same array. Neither view generates its own noise.

## Module boundaries

```text
src/features/terrain/
  NoisePreview.jsx
  TerrainControls.jsx
  TerrainMesh.jsx
  generation/
    createNoiseField.js
    terrainColors.js
```

- `createNoiseField.js` owns seeded randomness, octave accumulation, normalization, and shaping.
- `terrainColors.js` maps normalized elevation to a shared color ramp.
- `NoisePreview.jsx` writes the field to an HTML canvas with `ImageData`.
- `TerrainMesh.jsx` displaces `PlaneGeometry` vertices and assigns vertex colors.
- `TerrainControls.jsx` exposes the generator and display parameters.
- `App.jsx` owns configuration state and passes the shared field to both views.

## Generator parameters

| Parameter | Role |
| --- | --- |
| Seed | Reproduces the noise permutation |
| Resolution | Controls array size and terrain topology |
| Noise scale | Controls the size of broad landforms |
| Octaves | Adds progressively smaller detail |
| Persistence | Controls amplitude loss per octave |
| Lacunarity | Controls frequency growth per octave |
| Shaping operation | Transforms the normalized field |
| Shaping amount | Controls the selected transform |
| Elevation | Converts normalized values into world height |
| Water level | Defines the coastline and vertical zero point |

## Shaping operations

- **Natural:** preserves the normalized noise stack.
- **Power curve:** changes the balance between lowlands and peaks.
- **Ridged:** folds the signed field into mountain-like crests.
- **Terraced:** quantizes elevations into visible steps.
- **Island falloff:** multiplies the field by a radial falloff mask.

## Rendering approach

The terrain uses a subdivided `PlaneGeometry`. Each field value updates one vertex and one RGB color. Normals and bounds are recomputed after displacement. A transparent water plane sits at world height zero, and an infinite grid appears beneath the lowest terrain for scale and topology context.

The map preview uses a single HTML canvas. `ImageData` writes one pixel per field value, avoiding a large React element tree.

## Performance limits

- Supported grid presets range from `48 × 48` to `128 × 128`.
- Generator inputs use memoized configuration so display-only changes do not rebuild noise.
- Geometry is disposed whenever a replacement mesh is created.
- Terrain generation remains on the main thread for this milestone because the maximum field is small.
- A Web Worker becomes appropriate when simulations or larger fields are introduced.

## Completion criteria

- The map and terrain respond to the same field.
- The same seed and settings reproduce the same terrain.
- Resolution changes affect both array dimensions and mesh topology.
- Noise scale, octaves, persistence, and lacunarity visibly affect the output.
- Each shaping operation works and exposes a relevant parameter.
- Water level changes both coastline color and terrain elevation relative to the water plane.
- Wireframe mode exposes the mesh structure.
- Orbit and zoom controls remain responsive.
- The interface works at desktop and narrow-screen layouts.
- The production build completes without errors.

## Future boundary

The next milestone can supply a simulation-generated `Float32Array` through the same rendering interface. Cellular automata, erosion, or flood-fill processes should not require changes to `NoisePreview` or `TerrainMesh`; they only replace the field producer.
