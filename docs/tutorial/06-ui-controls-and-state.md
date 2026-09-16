# UI controls and scene state

The deck shows a 3D form controlled by sliders. In this project, controls have two roles:

- development controls help tune parameters quickly;
- application controls become part of the final interface and must be accessible, persistent, and intentional.

Leva works well for development panels. Build normal React UI for the final user experience.

## Add a Leva panel

```jsx
import { useControls } from 'leva'

export function useWorldControls() {
  return useControls('World', {
    seed: 'archipelago-01',
    frequency: { value: 0.08, min: 0.01, max: 0.25, step: 0.005 },
    amplitude: { value: 4, min: 0, max: 10, step: 0.1 },
    octaves: { value: 5, min: 1, max: 8, step: 1 },
    waterLevel: { value: 0, min: -2, max: 3, step: 0.05 },
    wireframe: false,
    lowColor: '#243b2e',
    highColor: '#b8d47a',
  })
}
```

Use the values in the application:

```jsx
import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'

export default function App() {
  const controls = useWorldControls()
  const terrainConfig = useMemo(() => ({
    seed: controls.seed,
    frequency: controls.frequency,
    amplitude: controls.amplitude,
    octaves: controls.octaves,
    resolution: 128,
    size: 24,
  }), [controls.seed, controls.frequency, controls.amplitude, controls.octaves])

  return (
    <Canvas>
      <Terrain config={terrainConfig} wireframe={controls.wireframe} />
      <Water level={controls.waterLevel} />
    </Canvas>
  )
}
```

The memoized object prevents regeneration when an unrelated control changes.

## Separate durable and transient state

| State | Example | Storage |
| --- | --- | --- |
| Durable world configuration | seed, noise parameters, biome colors | React state and Firestore |
| Session UI state | selected tool, open panel | React state |
| Per-frame mutable state | camera damping, object rotation | refs and Three.js objects |
| Derived generated data | height field, object placements | memo/cache, reconstructed from config |

Do not save camera damping or every animated position to Firestore. Save only what must survive a reload or be shared.

## Avoid expensive work on every slider event

Leva supports transient `onChange` callbacks. For an imperative shader uniform, update the material directly:

```jsx
function TerrainMaterialControls({ materialRef }) {
  useControls('Material', {
    waterLevel: {
      value: 0,
      min: -2,
      max: 3,
      step: 0.05,
      onChange: value => {
        if (materialRef.current) materialRef.current.uWaterLevel = value
      },
    },
  })

  return null
}
```

This avoids a React render for every intermediate slider position. If the value must also appear in returned control data, set `transient: false`.

For CPU terrain generation, debounce the expensive final result or regenerate a low-resolution preview during the drag.

## A reducer for world edits

Once changes come from controls, presets, loaded documents, and undo/redo, a reducer makes transitions explicit:

```jsx
import { useReducer } from 'react'

function worldReducer(state, action) {
  switch (action.type) {
    case 'terrain/patch':
      return {
        ...state,
        terrain: { ...state.terrain, ...action.patch },
        dirty: true,
      }
    case 'world/load':
      return { ...action.world, dirty: false }
    case 'world/saved':
      return { ...state, dirty: false }
    default:
      return state
  }
}
```

The reducer does not generate geometry. It produces the next configuration; the terrain component reacts to that configuration.

## URL-shareable parameters

For small public configurations, encode a few values in the query string:

```js
const params = new URLSearchParams({
  seed: world.seed,
  frequency: String(world.terrain.frequency),
  amplitude: String(world.terrain.amplitude),
})

history.replaceState(null, '', `?${params.toString()}`)
```

Validate parsed values and clamp ranges before using them. Treat URL data as untrusted input.

## Accessible overlay controls

Canvas content does not automatically provide normal document semantics. Keep essential controls in HTML:

```jsx
<aside className="world-toolbar" aria-label="World controls">
  <label>
    Seed
    <input value={seed} onChange={event => setSeed(event.target.value)} />
  </label>
  <button type="button" onClick={regenerate}>Regenerate world</button>
</aside>
```

If the overlay should not block orbit controls except over its controls, avoid placing a full-screen element with pointer events above the canvas.

## Useful debug controls

- wireframe mode;
- axes and grid visibility;
- terrain resolution;
- biome threshold colors;
- light intensity and position;
- fog near and far distance;
- renderer statistics;
- fixed seed versus random seed.

Hide or remove development controls in the production experience if they expose unstable or expensive settings.

## Exercise

Build a control panel with:

1. seed and regenerate controls;
2. terrain frequency, amplitude, and octave controls;
3. wireframe and grid toggles;
4. low and high color inputs;
5. a reset-to-defaults button.

Ensure that moving only a color control does not rebuild the terrain geometry.

## References

- [Leva project and quick start](https://github.com/pmndrs/leva)
- [Leva inputs](https://github.com/pmndrs/leva/blob/main/docs/getting-started/inputs.md)
- [Leva controlled inputs](https://github.com/pmndrs/leva/blob/main/docs/advanced/controlled-inputs.md)
- [React `useReducer`](https://react.dev/reference/react/useReducer)
