# React Three Fiber: Three.js as React components

React Three Fiber is a React renderer. Elements such as `<mesh>` and `<directionalLight>` create Three.js objects rather than HTML elements.

```jsx
<mesh position={[0, 1, 0]}>
  <boxGeometry args={[1, 1, 1]} />
  <meshStandardMaterial color="tomato" />
</mesh>
```

This corresponds conceptually to:

```js
const mesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 'tomato' }),
)
mesh.position.set(0, 1, 0)
scene.add(mesh)
```

## The Canvas boundary

`<Canvas>` creates the renderer, scene, default camera, render loop, and event system. Hooks such as `useFrame` and `useThree` work only inside its component tree.

```jsx
import { Canvas } from '@react-three/fiber'

export default function App() {
  return (
    <Canvas camera={{ position: [5, 4, 6] }}>
      <World />
    </Canvas>
  )
}
```

Do not call `useThree()` in `App` above because `App` renders outside the canvas context. Call it in `World` or one of its descendants.

## Animate with `useFrame`

```jsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

function FloatingIsland() {
  const island = useRef()

  useFrame(({ clock }, delta) => {
    island.current.rotation.y += delta * 0.08
    island.current.position.y = Math.sin(clock.elapsedTime * 0.6) * 0.1
  })

  return (
    <mesh ref={island}>
      <cylinderGeometry args={[2, 0.7, 1.4, 8]} />
      <meshStandardMaterial color="#668c52" />
    </mesh>
  )
}
```

Use `delta` for speed so motion remains consistent across frame rates. Avoid calling React state setters every frame.

## Read renderer state with `useThree`

```jsx
import { useThree } from '@react-three/fiber'

function CameraReporter() {
  const camera = useThree(state => state.camera)
  const viewport = useThree(state => state.viewport)

  // Use these values in scene logic. Returning null is valid.
  return null
}
```

Select only the state you need. A narrow selector prevents unrelated renderer-state updates from re-rendering the component.

## Reuse Three.js resources

```jsx
import { useMemo } from 'react'
import * as THREE from 'three'

function Tree({ position }) {
  const trunkMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#6a4932', roughness: 1 }),
    [],
  )

  return (
    <group position={position}>
      <mesh material={trunkMaterial} position-y={0.75}>
        <cylinderGeometry args={[0.15, 0.22, 1.5, 7]} />
      </mesh>
      <mesh position-y={1.8}>
        <coneGeometry args={[0.8, 1.8, 8]} />
        <meshStandardMaterial color="#315f3c" roughness={0.9} />
      </mesh>
    </group>
  )
}
```

For many trees, lift shared geometry and materials to module scope or use instancing. A separate material per tree creates unnecessary GPU state changes.

## Instances for repeated objects

Drei's `Instances` reduces many identical meshes to one draw call:

```jsx
import { Instance, Instances } from '@react-three/drei'

function RockInstances({ points }) {
  return (
    <Instances limit={points.length} castShadow receiveShadow>
      <dodecahedronGeometry args={[0.45, 0]} />
      <meshStandardMaterial color="#778071" roughness={0.95} />
      {points.map(point => (
        <Instance
          key={point.id}
          position={point.position}
          rotation={point.rotation}
          scale={point.scale}
        />
      ))}
    </Instances>
  )
}
```

Use stable IDs. Generating a new random key during every render destroys React's ability to preserve instances.

## Events happen on 3D objects

```jsx
function SelectableTile({ selected, onSelect }) {
  return (
    <mesh
      onClick={event => {
        event.stopPropagation()
        onSelect()
      }}
    >
      <boxGeometry args={[1, 0.15, 1]} />
      <meshStandardMaterial color={selected ? '#ffd166' : '#4f7f58'} />
    </mesh>
  )
}
```

Pointer events use raycasting. Complex meshes and many interactive objects increase raycasting cost, so attach handlers only where interaction is needed.

## A maintainable world component tree

```jsx
function World({ config }) {
  return (
    <>
      <WorldLighting sun={config.sun} />
      <Terrain config={config.terrain} />
      <BiomeObjects seed={config.seed} biomes={config.biomes} />
      <WorldGrid visible={config.debug.grid} />
      <WorldCamera />
    </>
  )
}
```

Pass small configuration slices instead of one mutable global object. Keep deterministic generation in plain JavaScript functions and let components focus on scene composition.

## When to use raw Three.js

Raw Three.js remains useful for:

- constructing or modifying `BufferGeometry`;
- custom shaders and render targets;
- algorithms that operate on vectors, matrices, rays, or bounding volumes;
- imperative optimizations that would be awkward as JSX.

React Three Fiber does not replace Three.js. It manages Three.js objects within React's lifecycle.

## Try it

Refactor the scene from the previous tutorial into:

- `WorldCanvas`
- `WorldLighting`
- `Terrain`
- `WorldGrid`
- `WorldCamera`

Then render 500 rocks using one instanced geometry and material. Compare the renderer's draw-call count before and after instancing.

## Official references

- [React Three Fiber: Introduction](https://r3f.docs.pmnd.rs/getting-started/introduction)
- [React Three Fiber hooks](https://r3f.docs.pmnd.rs/api/hooks)
- [React Three Fiber performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)
- [Drei instances](https://drei.docs.pmnd.rs/performances/instances)
