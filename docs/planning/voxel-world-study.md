# Voxel World: volume-field study

## Experience

Voxel World is one of three secondary studies inside the Procedural World portfolio, alongside Terrain Field and Shader Lab; none is the finished customizable world. This view explores a different representation: a signed density value at every point in a bounded three-dimensional volume. Negative values are solid; positive values are empty. A movable cross-section reveals the same field that generates the visible surface.

## Pipeline

```text
Seeded 2D + 3D simplex noise
           ↓
Base density preset (seven shapes)
           ↓
Ordered CSG modifiers
           ↓
Four independently sampled chunks
           ↓
Surface-crossing cells only
           ↓
Marching tetrahedra → triangle buffers
           ↓
Flat-shaded Three.js meshes
```

The field presets are ground, fBm, ridged terrain, terraced terrain, floating island, planet, and strata. Modifiers use sphere, box, or tunnel primitives. Union takes the minimum signed distance, intersection the maximum, subtraction the maximum of the base and negated tool distance, and smooth union blends the two distances. Because each operation consumes the result of the previous one, reordering overlapping shapes changes the outcome.

## Meshing choice

Each cubic cell is divided into six tetrahedra. An edge crossing the density-zero isosurface emits an interpolated vertex; tetrahedra with no sign change emit nothing. Marching tetrahedra was chosen for this interactive study because its small cases are easy to audit and it avoids the ambiguous cube cases of a basic marching-cubes implementation. It does, however, generate more triangles than optimized marching cubes and does not preserve sharp corners as well as dual contouring.

| Method | Useful characteristic | Tradeoff |
| --- | --- | --- |
| Culled cube faces | Exact blocky cells; simple edits | Many faces on irregular surfaces |
| Greedy meshing | Merges coplanar block faces efficiently | Still block-shaped |
| Marching cubes | Efficient smooth isosurface | Case table and ambiguous topology need care |
| Marching tetrahedra | Compact, predictable cases | More triangles; diagonal bias can appear |
| Surface nets | Fewer vertices and smooth topology | Different feature preservation |
| Dual contouring | Sharp edges and corners | More complex Hermite/QEF solve |

## Chunk and performance boundary

The study uses a fixed `2 × 1 × 2` chunk layout. Each chunk has the same cell resolution and samples shared boundaries in world coordinates; matching seam vertices are checked automatically. The user can choose 12, 18, or 24 cells per chunk edge. A higher setting improves detail but grows volume work cubically. The interface exposes total cells, surface-crossing cells, emitted triangles, and generation time.

Only surface-crossing cells emit geometry. Density samples live in temporary typed arrays during meshing and are released afterward; the retained geometry consists of position and color buffers. Wireframe and chunk-bound displays do not regenerate the field. This is a bounded study, not infinite voxel streaming. For a larger world, the next optimization would be camera-driven chunk residency, a worker for generation, indexed vertex reuse, level of detail, and cache eviction.

## Checks

`npm run verify:voxel` checks deterministic geometry, finite coordinates, operation-order sensitivity, non-empty topology, and matching seam vertices across all adjacent chunks. `npm run build` checks the browser bundle. The visual check covers overview and experiment navigation, voxel rendering, cross-section, and modifier controls.

## Known limits

- Meshing runs synchronously on the main thread and is deliberately capped at four chunks and 24 cells per edge.
- Flat-shaded, non-indexed triangles fit the faceted visual direction but use more GPU memory than an indexed mesh.
- The finite volume closes at a fixed enclosure rather than supporting editable, streamed voxel chunks.
- Translucent or physically simulated voxels, terrain destruction, and backend saves are outside this study.
