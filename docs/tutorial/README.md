# Procedural World Building tutorials

This series turns the Class 02 material into a working technical path for a browser-based procedural world. The examples use React, Three.js through React Three Fiber, Drei helpers, Leva controls, and optional Firebase persistence.

## Learning path

| Order | Tutorial | Result |
| --- | --- | --- |
| 1 | [Project setup](./00-project-setup.md) | A Vite development environment with the project libraries installed |
| 2 | [Web and React foundations](./01-web-and-react-foundations.md) | A clear model of React state, refs, and the browser render loop |
| 3 | [Three.js scene fundamentals](./02-threejs-scene-fundamentals.md) | A scene with geometry, light, a camera, controls, and a ground grid |
| 4 | [React Three Fiber](./03-react-three-fiber.md) | The scene expressed as reusable React components |
| 5 | [Materials and shaders](./04-materials-and-shaders.md) | Materials plus an animated custom shader |
| 6 | [Procedural world generation](./05-procedural-world-generation.md) | Seeded terrain generated from coherent noise |
| 7 | [UI controls and state](./06-ui-controls-and-state.md) | Live controls for seed, terrain, material, and debug settings |
| 8 | [Firebase CRUD and persistence](./07-firebase-crud-and-persistence.md) | Saved world configurations with access rules |

## Prerequisites

- Basic JavaScript: variables, arrays, objects, functions, modules, and `async`/`await`
- A terminal and code editor
- A current Node.js installation compatible with Vite
- A WebGL-capable browser

## Suggested project structure

```text
src/
  app/
    App.jsx
  features/
    world/
      WorldCanvas.jsx
      Terrain.jsx
      WorldControls.jsx
      generation/
        createHeightField.js
      materials/
        TerrainShaderMaterial.jsx
  lib/
    firebase.js
  main.jsx
```

The separation is intentional: generation functions should remain usable without React or rendering, scene components should describe the 3D world, and persistence should live behind a small data API.

## Final integration exercise

Build a page that:

1. Generates terrain deterministically from a seed.
2. Lets the user orbit the camera and toggle a wireframe view.
3. Exposes terrain scale, noise frequency, and material colors in a control panel.
4. Saves a compact configuration object to Firestore.
5. Reconstructs the same terrain after loading that configuration.

Save parameters rather than mesh vertices. A parameter set is smaller, easier to validate, and reproduces the world as long as the generation algorithm remains versioned.

## Source policy

These tutorials use code and Mermaid diagrams instead of decorative screenshots. Links at the end of each tutorial point to official documentation or the project maintained by the library authors.
