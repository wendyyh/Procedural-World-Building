import { Suspense, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Grid, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const PALETTES = {
  aurora: {
    label: 'Aurora',
    background: '#08111f',
    fog: '#08111f',
    grid: '#27586a',
    section: '#8debd5',
    colors: ['#7ee8b6', '#ffbe70', '#a895ff', '#75d5ff'],
  },
  ember: {
    label: 'Ember',
    background: '#180c0b',
    fog: '#180c0b',
    grid: '#663328',
    section: '#ffb067',
    colors: ['#e9c46a', '#f4a261', '#e76f51', '#efb6a5'],
  },
  lunar: {
    label: 'Lunar',
    background: '#0c0d11',
    fog: '#0c0d11',
    grid: '#343945',
    section: '#b8c1d1',
    colors: ['#d8dee9', '#aab4c4', '#7f8b9d', '#eef1f5'],
  },
}

const OBJECTS = [
  { id: 'icosahedron', name: 'Icosahedron', material: 'Standard', position: [-3.3, 1.1, 0] },
  { id: 'box', name: 'Faceted box', material: 'Phong', position: [-1.1, 1, 0] },
  { id: 'torus', name: 'Torus knot', material: 'Standard', position: [1.25, 1.2, 0] },
  { id: 'sphere', name: 'Sphere', material: 'Lambert', position: [3.55, 1.05, 0] },
]

function Geometry({ type }) {
  if (type === 'icosahedron') return <icosahedronGeometry args={[1, 1]} />
  if (type === 'box') return <boxGeometry args={[1.55, 1.55, 1.55, 3, 3, 3]} />
  if (type === 'torus') return <torusKnotGeometry args={[0.72, 0.25, 160, 24]} />
  return <sphereGeometry args={[1, 48, 32]} />
}

function Material({ type, color, wireframe }) {
  if (type === 'box') {
    return (
      <meshPhongMaterial
        color={color}
        shininess={90}
        specular="#fff4db"
        flatShading
        wireframe={wireframe}
      />
    )
  }

  if (type === 'sphere') {
    return <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.04} wireframe={wireframe} />
  }

  return (
    <meshStandardMaterial
      color={color}
      roughness={type === 'torus' ? 0.22 : 0.62}
      metalness={type === 'torus' ? 0.55 : 0.08}
      wireframe={wireframe}
    />
  )
}

function InteractiveObject({ object, color, index, selectedId, onSelect, wireframe }) {
  const mesh = useRef()
  const [hovered, setHovered] = useState(false)
  const selected = selectedId === object.id

  useFrame((state, delta) => {
    if (!mesh.current) return
    mesh.current.rotation.y += delta * (selected ? 0.45 : 0.08)
    const lift = selected ? 0.18 : hovered ? 0.08 : 0
    const targetY = object.position[1] + lift
    mesh.current.position.y = THREE.MathUtils.damp(mesh.current.position.y, targetY, 8, delta)
    const targetScale = selected ? 1.08 : hovered ? 1.035 : 1
    const scale = THREE.MathUtils.damp(mesh.current.scale.x, targetScale, 9, delta)
    mesh.current.scale.setScalar(scale)
  })

  return (
    <mesh
      ref={mesh}
      position={object.position}
      rotation={[index * 0.12, index * 0.35, index * -0.05]}
      castShadow
      receiveShadow
      onClick={(event) => {
        event.stopPropagation()
        onSelect(object.id)
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'default'
      }}
    >
      <Geometry type={object.id} />
      <Material type={object.id} color={color} wireframe={wireframe} />
    </mesh>
  )
}

function Scene({ palette, selectedId, onSelect, wireframe }) {
  return (
    <>
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.fog, 15, 43]} />

      <ambientLight intensity={0.3} />
      <hemisphereLight args={['#dff7ff', '#101318', 1.25]} />
      <directionalLight
        castShadow
        position={[7, 10, 6]}
        intensity={2.5}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={7}
        shadow-camera-bottom={-5}
      />
      <pointLight position={[-6, 3, -2]} color={palette.section} intensity={18} distance={12} />

      <group>
        {OBJECTS.map((object, index) => (
          <InteractiveObject
            key={object.id}
            object={object}
            index={index}
            color={palette.colors[index]}
            selectedId={selectedId}
            onSelect={onSelect}
            wireframe={wireframe}
          />
        ))}
      </group>

      <Grid
        position={[0, 0, 0]}
        args={[50, 50]}
        cellSize={0.5}
        cellThickness={0.55}
        cellColor={palette.grid}
        sectionSize={2.5}
        sectionThickness={1.2}
        sectionColor={palette.section}
        fadeDistance={26}
        fadeStrength={1.6}
        followCamera={false}
        infiniteGrid
      />

      <ContactShadows
        position={[0, 0.015, 0]}
        opacity={0.58}
        scale={18}
        blur={2.3}
        far={5}
        color="#000000"
      />

      <OrbitControls
        makeDefault
        target={[0, 0.9, 0]}
        enableDamping
        dampingFactor={0.07}
        minDistance={5}
        maxDistance={22}
        minPolarAngle={0.18}
        maxPolarAngle={Math.PI / 2.04}
      />
    </>
  )
}

function LoadingFallback() {
  return <div className="loading">Preparing the scene…</div>
}

export default function App() {
  const [paletteName, setPaletteName] = useState('aurora')
  const [selectedId, setSelectedId] = useState('icosahedron')
  const [wireframe, setWireframe] = useState(false)
  const palette = PALETTES[paletteName]
  const selected = OBJECTS.find((object) => object.id === selectedId)

  return (
    <main className="app-shell">
      <header className="masthead">
        <p className="eyebrow">PROCEDURAL SYSTEMS · WEBGL</p>
        <h1>World material study</h1>
        <p className="intro">Four geometries, three material models, one interactive scene.</p>
      </header>

      <section className="canvas-panel" aria-label="Interactive 3D material study">
        <Suspense fallback={<LoadingFallback />}>
          <Canvas
            shadows="basic"
            dpr={[1, 2]}
            camera={{ position: [8.5, 5.8, 10.5], fov: 42, near: 0.1, far: 100 }}
            gl={{ antialias: true, alpha: false }}
            onPointerMissed={() => setSelectedId(null)}
          >
            <Scene
              palette={palette}
              selectedId={selectedId}
              onSelect={setSelectedId}
              wireframe={wireframe}
            />
          </Canvas>
        </Suspense>

        <div className="canvas-help" aria-hidden="true">
          <span>Drag to orbit</span>
          <span>Scroll to zoom</span>
          <span>Click an object</span>
        </div>

        <div className="selection-readout" aria-live="polite">
          <span className="readout-label">Selected</span>
          <strong>{selected?.name ?? 'None'}</strong>
          <span>{selected ? `${selected.material} material` : 'Click a geometry'}</span>
        </div>
      </section>

      <aside className="control-panel" aria-label="Scene controls">
        <div className="control-group">
          <h2>Scene palette</h2>
          <div className="palette-options">
            {Object.entries(PALETTES).map(([name, option]) => (
              <button
                key={name}
                type="button"
                className={paletteName === name ? 'palette-button is-active' : 'palette-button'}
                aria-pressed={paletteName === name}
                onClick={() => setPaletteName(name)}
              >
                <span className="swatch" style={{ background: option.colors[0] }} />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="toggle-row">
          <span>
            <strong>Wireframe</strong>
            <small>Reveal mesh topology</small>
          </span>
          <input
            type="checkbox"
            checked={wireframe}
            onChange={(event) => setWireframe(event.target.checked)}
          />
        </label>

        <div className="material-key">
          <h2>Material key</h2>
          {OBJECTS.map((object, index) => (
            <button
              type="button"
              className={selectedId === object.id ? 'key-row is-selected' : 'key-row'}
              key={object.id}
              onClick={() => setSelectedId(object.id)}
            >
              <span className="key-dot" style={{ background: palette.colors[index] }} />
              <span>{object.name}</span>
              <small>{object.material}</small>
            </button>
          ))}
        </div>
      </aside>
    </main>
  )
}
