# Procedural World Building

An interactive WebGL terrain generator and a growing technical reference for browser-based procedural worlds.

## Run locally

```bash
npm install
npm run dev
```

The project generates a deterministic elevation field from seeded simplex noise, displays it as both a topographic map and a 3D terrain mesh, and provides controls for noise composition, shaping, water level, resolution, and wireframe topology.

Create a production build with:

```bash
npm run build
```

Technical walkthroughs are available in [`docs/tutorial`](./docs/tutorial/README.md).

Implementation planning is documented in [`docs/planning`](./docs/planning/procedural-terrain-milestone-1.md).
