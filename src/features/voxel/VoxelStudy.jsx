import { useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { createVoxelWorld, VOXEL_BOUNDS } from './generation/createVoxelWorld.js'
import { PresetPanelLoader } from '../presets/PresetPanelLoader.jsx'

export const DEFAULT_VOXEL_CONFIG = {
  seed: 'stone-atlas-04',
  shape: 'ridged',
  frequency: 0.27,
  detail: 0.72,
  resolution: 18,
  modifiers: [
    {
      id: 1,
      enabled: true,
      operation: 'subtract',
      primitive: 'sphere',
      x: 0,
      y: 0.2,
      z: 4.6,
      radius: 2.7,
    },
  ],
}

const SHAPES = [
  ['ground', 'Ground plane'],
  ['fbm', '3D fBm'],
  ['ridged', 'Ridged terrain'],
  ['terraced', 'Terraced terrain'],
  ['floating', 'Floating island'],
  ['planet', 'Planet'],
  ['strata', 'Strata'],
]

function RangeControl({ label, value, min, max, step, onChange, unit = '' }) {
  return (
    <label className="range-control">
      <span><strong>{label}</strong><output>{Number(value).toFixed(step < 1 ? 2 : 0)}{unit}</output></span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function VoxelChunk({ chunk, wireframe }) {
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry()
    next.setAttribute('position', new THREE.BufferAttribute(chunk.positions, 3))
    next.setAttribute('color', new THREE.BufferAttribute(chunk.colors, 3))
    next.computeVertexNormals()
    next.computeBoundingSphere()
    return next
  }, [chunk])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        flatShading
        roughness={0.88}
        metalness={0.04}
        wireframe={wireframe}
      />
    </mesh>
  )
}

function VoxelScene({ world, wireframe, showChunks }) {
  const chunkOutline = useMemo(() => {
    const box = new THREE.BoxGeometry(7, 10, 7)
    const edges = new THREE.EdgesGeometry(box)
    box.dispose()
    return edges
  }, [])

  useEffect(() => () => chunkOutline.dispose(), [chunkOutline])

  return (
    <>
      <color attach="background" args={['#07101a']} />
      <fog attach="fog" args={['#07101a', 22, 48]} />
      <ambientLight intensity={0.58} />
      <hemisphereLight args={['#c9f2e9', '#152127', 1.2]} />
      <directionalLight position={[8, 12, 6]} intensity={2.25} />
      <directionalLight position={[-8, 5, -7]} intensity={0.5} color="#739fcb" />

      {world.chunks.map((chunk) => <VoxelChunk key={chunk.key} chunk={chunk} wireframe={wireframe} />)}

      {showChunks && [-3.5, 3.5].flatMap((x) => [-3.5, 3.5].map((z) => (
        <lineSegments key={`${x}:${z}`} position={[x, 0.5, z]} geometry={chunkOutline} dispose={null}>
          <lineBasicMaterial color="#8df3d8" transparent opacity={0.52} depthTest={false} />
        </lineSegments>
      )))}

      <Grid
        position={[0, VOXEL_BOUNDS.yMin - 0.15, 0]}
        args={[20, 20]}
        cellSize={0.65}
        cellColor="#234558"
        sectionSize={3.5}
        sectionColor="#4c898c"
        fadeDistance={22}
        fadeStrength={1.4}
        infiniteGrid
      />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.07}
        minDistance={10}
        maxDistance={34}
        target={[0, 0.2, 0]}
        maxPolarAngle={Math.PI / 2.03}
      />
    </>
  )
}

function DensitySlice({ sample, level }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const width = canvas.width
    const image = context.createImageData(width, width)

    for (let row = 0; row < width; row += 1) {
      for (let column = 0; column < width; column += 1) {
        const x = (column / (width - 1) * 2 - 1) * VOXEL_BOUNDS.x
        const z = (row / (width - 1) * 2 - 1) * VOXEL_BOUNDS.z
        const density = sample(x, level, z)
        const index = (row * width + column) * 4
        const inside = density < 0
        image.data[index] = inside ? 89 : 13
        image.data[index + 1] = inside ? 180 : 29
        image.data[index + 2] = inside ? 169 : 43
        image.data[index + 3] = 255
      }
    }

    context.putImageData(image, 0, 0)
  }, [level, sample])

  return <canvas ref={canvasRef} width="144" height="144" className="density-slice" aria-label={`Horizontal voxel cross-section at height ${level.toFixed(1)}`} role="img" />
}

function ModifierEditor({ modifier, index, count, onChange, onMove, onRemove }) {
  const update = (key, value) => onChange({ ...modifier, [key]: value })

  return (
    <div className="modifier-card">
      <div className="modifier-heading">
        <label className="toggle-row modifier-toggle">
          <span><strong>Operation {index + 1}</strong><small>Evaluated in this order</small></span>
          <input type="checkbox" checked={modifier.enabled} onChange={(event) => update('enabled', event.target.checked)} />
        </label>
        <div className="modifier-actions">
          <button type="button" aria-label={`Move operation ${index + 1} up`} disabled={index === 0} onClick={() => onMove(-1)}>↑</button>
          <button type="button" aria-label={`Move operation ${index + 1} down`} disabled={index === count - 1} onClick={() => onMove(1)}>↓</button>
          <button type="button" aria-label={`Remove operation ${index + 1}`} onClick={onRemove}>×</button>
        </div>
      </div>
      <div className="modifier-fields">
        <label className="field-control">
          <span>Combine</span>
          <select value={modifier.operation} onChange={(event) => update('operation', event.target.value)}>
            <option value="subtract">Subtract</option>
            <option value="union">Union</option>
            <option value="smooth">Smooth union</option>
            <option value="intersect">Intersect</option>
          </select>
        </label>
        <label className="field-control">
          <span>Shape</span>
          <select value={modifier.primitive} onChange={(event) => update('primitive', event.target.value)}>
            <option value="sphere">Sphere</option>
            <option value="box">Box</option>
            <option value="tunnel">Tunnel</option>
          </select>
        </label>
      </div>
      <RangeControl label="Size" value={modifier.radius} min={0.8} max={5} step={0.1} onChange={(value) => update('radius', value)} />
      <div className="modifier-position">
        {['x', 'y', 'z'].map((axis) => (
          <RangeControl key={axis} label={axis.toUpperCase()} value={modifier[axis]} min={-5} max={5} step={0.1} onChange={(value) => update(axis, value)} />
        ))}
      </div>
    </div>
  )
}

export function VoxelStudy({
  config, setConfig, wireframe, setWireframe, showChunks, setShowChunks, sliceLevel, setSliceLevel,
}) {
  const world = useMemo(() => createVoxelWorld(config), [config])
  const update = (key, value) => setConfig((current) => ({ ...current, [key]: value }))

  function changeModifier(id, next) {
    setConfig((current) => ({
      ...current,
      modifiers: current.modifiers.map((item) => item.id === id ? next : item),
    }))
  }

  function moveModifier(index, direction) {
    setConfig((current) => {
      const modifiers = [...current.modifiers]
      ;[modifiers[index], modifiers[index + direction]] = [modifiers[index + direction], modifiers[index]]
      return { ...current, modifiers }
    })
  }

  return (
    <main className="app-shell voxel-shell">
      <header className="masthead">
        <p className="eyebrow">EXPERIMENT 06 / VOLUME FIELDS</p>
        <h1>Voxel World</h1>
        <p className="intro">Sculpt a three-dimensional density field. Shape operations alter the volume before four chunks become a single continuous surface.</p>
      </header>

      <section className="canvas-panel" aria-label="Interactive voxel world viewport">
        <Canvas dpr={[1, 2]} camera={{ position: [15, 10, 17], fov: 42, near: 0.1, far: 100 }} gl={{ antialias: true, alpha: false }}>
          <VoxelScene world={world} wireframe={wireframe} showChunks={showChunks} />
        </Canvas>
        <div className="terrain-readout voxel-readout" aria-live="polite">
          <span className="readout-label">Density field → mesh</span>
          <strong>{SHAPES.find(([key]) => key === config.shape)?.[1]}</strong>
          <span>{world.stats.triangles.toLocaleString()} triangles · {world.stats.chunks} chunks</span>
        </div>
        <div className="canvas-help" aria-hidden="true">
          <span>Drag to orbit</span><span>Scroll to zoom</span><span>Shift + drag to pan</span>
        </div>
      </section>

      <aside className="control-panel voxel-panel" aria-label="Voxel world controls">
        <PresetPanelLoader
          kind="voxel"
          config={config}
          view={{ wireframe, showChunks, sliceLevel }}
          onLoad={(preset) => {
            setConfig(preset.config)
            setWireframe(preset.view.wireframe)
            setShowChunks(preset.view.showChunks)
            setSliceLevel(preset.view.sliceLevel)
          }}
        />
        <section className="map-panel">
          <div className="section-heading">
            <div><p className="panel-kicker">Inside / outside</p><h2>Density cross-section</h2></div>
            <span className="live-indicator">Live</span>
          </div>
          <DensitySlice sample={world.sample} level={sliceLevel} />
          <RangeControl label="Slice height" value={sliceLevel} min={-3.5} max={4.5} step={0.1} onChange={setSliceLevel} />
          <p className="control-note">Mint is solid; dark is empty. The slice samples the same field used by the mesh.</p>
          <div className="map-stats four-up voxel-stats">
            <span><small>Cells</small>{world.stats.cells.toLocaleString()}</span>
            <span><small>Surface</small>{world.stats.activeCells.toLocaleString()}</span>
            <span><small>Faces</small>{world.stats.triangles.toLocaleString()}</span>
            <span><small>Build</small>{world.stats.milliseconds.toFixed(0)} ms</span>
          </div>
        </section>

        <section className="control-section">
          <h2>Base field</h2>
          <label className="field-control"><span>Density shape</span>
            <select value={config.shape} onChange={(event) => update('shape', event.target.value)}>
              {SHAPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="field-control"><span>Seed</span>
            <input type="text" value={config.seed} spellCheck="false" onChange={(event) => update('seed', event.target.value)} />
          </label>
          <RangeControl label="Noise scale" value={config.frequency} min={0.1} max={0.6} step={0.01} onChange={(value) => update('frequency', value)} />
          <RangeControl label="3D detail" value={config.detail} min={0} max={1.5} step={0.01} onChange={(value) => update('detail', value)} />
        </section>

        <section className="control-section">
          <div className="section-heading">
            <h2>Shape operations</h2>
            <button
              type="button"
              className="text-button"
              disabled={config.modifiers.length >= 3}
              onClick={() => setConfig((current) => ({
                ...current,
                modifiers: [...current.modifiers, {
                  id: Math.max(0, ...current.modifiers.map((item) => item.id)) + 1,
                  enabled: true, operation: 'union', primitive: 'sphere',
                  x: 0, y: 0.2, z: 4.6, radius: 1.7,
                }],
              }))}
            >Add shape</button>
          </div>
          <p className="control-note">Operations run top to bottom. Reorder them to see how the result changes.</p>
          {config.modifiers.map((modifier, index) => (
            <ModifierEditor
              key={modifier.id}
              modifier={modifier}
              index={index}
              count={config.modifiers.length}
              onChange={(next) => changeModifier(modifier.id, next)}
              onMove={(direction) => moveModifier(index, direction)}
              onRemove={() => setConfig((current) => ({
                ...current,
                modifiers: current.modifiers.filter((item) => item.id !== modifier.id),
              }))}
            />
          ))}
        </section>

        <section className="control-section">
          <h2>Mesh inspection</h2>
          <label className="field-control"><span>Cells per chunk edge</span>
            <select value={config.resolution} onChange={(event) => update('resolution', Number(event.target.value))}>
              <option value="12">12 · fast preview</option>
              <option value="18">18 · balanced</option>
              <option value="24">24 · fine detail</option>
            </select>
          </label>
          <label className="toggle-row compact-toggle"><span><strong>Wireframe</strong><small>Inspect generated triangles</small></span>
            <input type="checkbox" checked={wireframe} onChange={(event) => setWireframe(event.target.checked)} />
          </label>
          <label className="toggle-row compact-toggle"><span><strong>Chunk bounds</strong><small>Four independently meshed regions</small></span>
            <input type="checkbox" checked={showChunks} onChange={(event) => setShowChunks(event.target.checked)} />
          </label>
          <p className="control-note">Marching tetrahedra meshes only surface-crossing cells. The retained mesh uses {(world.stats.meshBytes / 1048576).toFixed(1)} MB; display toggles do not rebuild it.</p>
        </section>

        <button type="button" className="reset-button" onClick={() => {
          setConfig(DEFAULT_VOXEL_CONFIG)
          setWireframe(false)
          setShowChunks(false)
          setSliceLevel(0)
        }}>Reset voxel world</button>
      </aside>
    </main>
  )
}
