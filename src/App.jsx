import { Suspense, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { createNoiseField } from './features/terrain/generation/createNoiseField.js'
import { NoisePreview } from './features/terrain/NoisePreview.jsx'
import { TerrainControls } from './features/terrain/TerrainControls.jsx'
import { TerrainMesh } from './features/terrain/TerrainMesh.jsx'

const DEFAULT_CONFIG = {
  seed: 'archipelago-01',
  resolution: 96,
  size: 18,
  frequency: 0.52,
  octaves: 5,
  persistence: 0.5,
  lacunarity: 2,
  shaping: 'island',
  shapeAmount: 1.35,
  heightScale: 5.2,
  waterLevel: 0.34,
}

function TerrainScene({ field, config, wireframe }) {
  return (
    <>
      <color attach="background" args={['#07101a']} />
      <fog attach="fog" args={['#07101a', 16, 38]} />
      <ambientLight intensity={0.34} />
      <hemisphereLight args={['#d8f0ff', '#162018', 1.25]} />
      <directionalLight
        position={[8, 12, 7]}
        intensity={2.7}
      />

      <TerrainMesh
        field={field}
        size={config.size}
        heightScale={config.heightScale}
        waterLevel={config.waterLevel}
        wireframe={wireframe}
      />

      <OrbitControls
        makeDefault
        target={[0, 0.4, 0]}
        enableDamping
        dampingFactor={0.07}
        minDistance={7}
        maxDistance={28}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  )
}

function LoadingFallback() {
  return <div className="loading">Generating terrain…</div>
}

function createSeed() {
  return `terrain-${Math.random().toString(36).slice(2, 8)}`
}

export default function App() {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [wireframe, setWireframe] = useState(false)

  const generatorConfig = useMemo(() => ({
    seed: config.seed,
    resolution: config.resolution,
    frequency: config.frequency,
    octaves: config.octaves,
    persistence: config.persistence,
    lacunarity: config.lacunarity,
    shaping: config.shaping,
    shapeAmount: config.shapeAmount,
  }), [
    config.seed,
    config.resolution,
    config.frequency,
    config.octaves,
    config.persistence,
    config.lacunarity,
    config.shaping,
    config.shapeAmount,
  ])

  const field = useMemo(() => createNoiseField(generatorConfig), [generatorConfig])
  const vertexCount = field.values.length.toLocaleString()

  return (
    <main className="app-shell">
      <header className="masthead">
        <p className="eyebrow">GENERATIVE TERRAIN · WEBGL</p>
        <h1>Procedural Terrain Lab</h1>
        <p className="intro">
          A deterministic noise field rendered simultaneously as map data and navigable topography.
        </p>
      </header>

      <section className="canvas-panel" aria-label="Interactive procedural terrain viewport">
        <Suspense fallback={<LoadingFallback />}>
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [12.5, 9.5, 14.5], fov: 42, near: 0.1, far: 100 }}
            gl={{ antialias: true, alpha: false }}
          >
            <TerrainScene field={field} config={config} wireframe={wireframe} />
          </Canvas>
        </Suspense>

        <div className="canvas-help" aria-hidden="true">
          <span>Drag to orbit</span>
          <span>Scroll to zoom</span>
          <span>{config.resolution} × {config.resolution} grid</span>
        </div>

        <div className="terrain-readout" aria-live="polite">
          <span className="readout-label">Current field</span>
          <strong>{config.shaping === 'linear' ? 'Natural' : config.shaping}</strong>
          <span>{vertexCount} vertices · seed {config.seed}</span>
        </div>
      </section>

      <aside className="control-panel" aria-label="Terrain generator controls">
        <section className="map-panel">
          <div className="section-heading">
            <div>
              <p className="panel-kicker">Synchronized map</p>
              <h2>Elevation field</h2>
            </div>
            <span className="live-indicator">Live</span>
          </div>
          <NoisePreview field={field} waterLevel={config.waterLevel} />
          <div className="map-stats">
            <span><small>Min</small>{field.minimum.toFixed(2)}</span>
            <span><small>Mean</small>{field.mean.toFixed(2)}</span>
            <span><small>Max</small>{field.maximum.toFixed(2)}</span>
          </div>
        </section>

        <TerrainControls
          config={config}
          onConfigChange={setConfig}
          wireframe={wireframe}
          onWireframeChange={setWireframe}
          onRandomize={() => setConfig((current) => ({ ...current, seed: createSeed() }))}
          onReset={() => {
            setConfig(DEFAULT_CONFIG)
            setWireframe(false)
          }}
        />
      </aside>
    </main>
  )
}
