import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { getTerrainField } from './features/terrain/generation/terrainFieldCache.js'
import { NoisePreview } from './features/terrain/NoisePreview.jsx'
import { TerrainControls } from './features/terrain/TerrainControls.jsx'
import { TerrainWorld } from './features/terrain/TerrainWorld.jsx'
import { WorldNavigator } from './features/terrain/WorldNavigator.jsx'
import { DEFAULT_VOXEL_CONFIG, VoxelStudy } from './features/voxel/VoxelStudy.jsx'
import { ShaderLab } from './features/shaders/ShaderLab.jsx'
import { NoiseLab } from './features/noise/NoiseLab.jsx'
import { PresetPanelLoader } from './features/presets/PresetPanelLoader.jsx'
import { ExperimentIndex, Overview } from './PortfolioPages.jsx'
import { AfterUsWorld } from './features/after-us/AfterUsWorld.jsx'
import { EXPERIMENTS, experimentHref } from './experiments.js'
import { ScatteringStudy } from './features/environment/ScatteringStudy.jsx'
import { PathwaysStudy } from './features/environment/PathwaysStudy.jsx'
import { FlowFieldStudy } from './features/environment/FlowFieldStudy.jsx'
import { DEFAULT_PATH_CONFIG } from './features/environment/createPaths.js'
import { BranchingForms } from './features/branching/BranchingForms.jsx'
import { WorldlinesStudy } from './features/worldlines/WorldlinesStudy.jsx'

const DEFAULT_CONFIG = {
  seed: 'archipelago-01',
  resolution: 64,
  size: 18,
  frequency: 0.52,
  octaves: 5,
  persistence: 0.5,
  lacunarity: 2,
  shaping: 'island',
  shapeAmount: 1.35,
  heightScale: 5.2,
  waterLevel: 0.34,
  worldMode: 'bounded',
  erosionEnabled: true,
  erosionIterations: 8,
  erosionTalus: 0.025,
  erosionStrength: 0.24,
  surfaceMode: 'topographic',
  contourInterval: 0.08,
}

const SHAPING_LABELS = {
  linear: 'Natural',
  power: 'Power curve',
  ridged: 'Ridged',
  terrace: 'Terraced',
  island: 'Island falloff',
}

function CameraHome({ controlsRef, worldMode }) {
  const { camera } = useThree()

  useEffect(() => {
    const controls = controlsRef.current
    camera.position.set(12.5, 9.5, 14.5)
    if (controls) {
      controls.target.set(0, 0.4, 0)
      controls.update()
    }
  }, [camera, controlsRef, worldMode])

  return null
}

function TerrainScene({
  chunks,
  activeChunk,
  config,
  wireframe,
  contours,
  onChunkChange,
}) {
  const controlsRef = useRef(null)
  const streaming = config.worldMode === 'streaming'

  return (
    <>
      <color attach="background" args={['#07101a']} />
      <fog attach="fog" args={['#07101a', 18, streaming ? 62 : 38]} />
      <ambientLight intensity={0.34} />
      <hemisphereLight args={['#d8f0ff', '#162018', 1.25]} />
      <directionalLight position={[8, 12, 7]} intensity={2.7} />

      <TerrainWorld
        chunks={chunks}
        activeChunk={activeChunk}
        config={config}
        wireframe={wireframe}
        contours={contours}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 0.4, 0]}
        enableDamping
        enablePan={streaming}
        dampingFactor={0.07}
        minDistance={7}
        maxDistance={30}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.05}
      />
      <CameraHome controlsRef={controlsRef} worldMode={config.worldMode} />
      <WorldNavigator
        enabled={streaming}
        size={config.size}
        controlsRef={controlsRef}
        onChunkChange={onChunkChange}
      />
    </>
  )
}

function LoadingFallback() {
  return <div className="loading">Simulating terrain…</div>
}

function createSeed() {
  return `terrain-${Math.random().toString(36).slice(2, 8)}`
}

function isTypingTarget(target) {
  return target instanceof HTMLInputElement
    || target instanceof HTMLSelectElement
    || target instanceof HTMLTextAreaElement
}

function TerrainExperience({ config, setConfig, wireframe, setWireframe, contours, setContours, activeChunk, setActiveChunk }) {
  const handleChunkChange = useCallback((chunk) => setActiveChunk(chunk), [])

  const generatorConfig = useMemo(() => ({
    seed: config.seed,
    resolution: config.resolution,
    frequency: config.frequency,
    octaves: config.octaves,
    persistence: config.persistence,
    lacunarity: config.lacunarity,
    shaping: config.shaping,
    shapeAmount: config.shapeAmount,
    worldMode: config.worldMode,
    erosionEnabled: config.erosionEnabled,
    erosionIterations: config.erosionIterations,
    erosionTalus: config.erosionTalus,
    erosionStrength: config.erosionStrength,
  }), [
    config.seed,
    config.resolution,
    config.frequency,
    config.octaves,
    config.persistence,
    config.lacunarity,
    config.shaping,
    config.shapeAmount,
    config.worldMode,
    config.erosionEnabled,
    config.erosionIterations,
    config.erosionTalus,
    config.erosionStrength,
  ])

  const chunks = useMemo(() => {
    if (config.worldMode === 'bounded') {
      return [{
        x: 0,
        z: 0,
        field: getTerrainField({ ...generatorConfig, originX: 0, originY: 0 }),
      }]
    }

    const nextChunks = []
    for (let z = activeChunk.z - 1; z <= activeChunk.z + 1; z += 1) {
      for (let x = activeChunk.x - 1; x <= activeChunk.x + 1; x += 1) {
        nextChunks.push({
          x,
          z,
          field: getTerrainField({ ...generatorConfig, originX: x, originY: z }),
        })
      }
    }
    return nextChunks
  }, [activeChunk.x, activeChunk.z, config.worldMode, generatorConfig])

  const activeField = config.worldMode === 'bounded'
    ? chunks[0].field
    : chunks.find((chunk) => chunk.x === activeChunk.x && chunk.z === activeChunk.z).field
  const residentVertices = chunks
    .reduce((total, chunk) => total + chunk.field.values.length, 0)
    .toLocaleString()
  const erosionMoved = activeField.erosion.meanMoved

  useEffect(() => {
    setActiveChunk({ x: 0, z: 0 })
  }, [config.worldMode])

  useEffect(() => {
    const handleShortcut = (event) => {
      if (isTypingTarget(event.target) || event.repeat) return
      if (event.code === 'KeyF') setWireframe((current) => !current)
      if (event.code === 'KeyC') setContours((current) => !current)
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  return (
    <main className="app-shell">
      <header className="masthead">
        <p className="eyebrow">EXPERIMENT 02 / HEIGHT FIELDS</p>
        <h1>Terrain Field</h1>
        <p className="intro">
          Explore a deterministic height field through erosion, analytical shaders,
          and a continuously tiled terrain prototype.
        </p>
      </header>

      <section className="canvas-panel" aria-label="Interactive procedural terrain viewport">
        <Suspense fallback={<LoadingFallback />}>
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [12.5, 9.5, 14.5], fov: 42, near: 0.1, far: 140 }}
            gl={{ antialias: true, alpha: false }}
          >
            <TerrainScene
              chunks={chunks}
              activeChunk={activeChunk}
              config={config}
              wireframe={wireframe}
              contours={contours}
              onChunkChange={handleChunkChange}
            />
          </Canvas>
        </Suspense>

        <div className="canvas-help" aria-hidden="true">
          <span>Drag to orbit</span>
          {config.worldMode === 'streaming' && <span>WASD to explore</span>}
          <span>F wireframe</span>
          <span>C contours</span>
        </div>

        <div className="terrain-readout" aria-live="polite">
          <span className="readout-label">
            {config.worldMode === 'streaming' ? 'Streaming field' : 'Bounded field'}
          </span>
          <strong>{config.erosionEnabled ? 'Eroded ' : ''}{SHAPING_LABELS[config.shaping]}</strong>
          <span>
            {residentVertices} resident vertices
            {config.worldMode === 'streaming' && ` · tile ${activeChunk.x}, ${activeChunk.z}`}
          </span>
        </div>
      </section>

      <aside className="control-panel" aria-label="Terrain generator controls">
        <PresetPanelLoader
          kind="terrain"
          config={config}
          view={{ wireframe, contours }}
          onLoad={(preset) => {
            setConfig(preset.config)
            setWireframe(preset.view.wireframe)
            setContours(preset.view.contours)
            setActiveChunk({ x: 0, z: 0 })
          }}
        />
        <section className="map-panel">
          <div className="section-heading">
            <div>
              <p className="panel-kicker">Active height field</p>
              <h2>Topographic survey</h2>
            </div>
            <span className="live-indicator">Live</span>
          </div>
          <NoisePreview
            field={activeField}
            waterLevel={config.waterLevel}
            surfaceMode={config.surfaceMode}
            contours={contours}
            contourInterval={config.contourInterval}
          />
          <div className="map-stats four-up">
            <span><small>Min</small>{activeField.minimum.toFixed(2)}</span>
            <span><small>Mean</small>{activeField.mean.toFixed(2)}</span>
            <span><small>Max</small>{activeField.maximum.toFixed(2)}</span>
            <span><small>Moved</small>{erosionMoved.toFixed(2)}</span>
          </div>
        </section>

        <TerrainControls
          config={config}
          onConfigChange={setConfig}
          wireframe={wireframe}
          onWireframeChange={setWireframe}
          contours={contours}
          onContoursChange={setContours}
          onRandomize={() => setConfig((current) => ({ ...current, seed: createSeed() }))}
          onReset={() => {
            setConfig(DEFAULT_CONFIG)
            setWireframe(false)
            setContours(true)
            setActiveChunk({ x: 0, z: 0 })
          }}
        />
      </aside>
    </main>
  )
}

function getViewFromHash() {
  const hash = window.location.hash
  const experiment = EXPERIMENTS.find(({ slug }) => hash === experimentHref(slug))
  if (experiment) return experiment.slug
  if (hash === '#experiments') return 'experiments'
  if (hash === '#world') return 'world'
  return 'overview'
}

export default function App() {
  const [view, setView] = useState(getViewFromHash)
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [wireframe, setWireframe] = useState(false)
  const [contours, setContours] = useState(true)
  const [activeChunk, setActiveChunk] = useState({ x: 0, z: 0 })
  const [voxelConfig, setVoxelConfig] = useState(DEFAULT_VOXEL_CONFIG)
  const [voxelWireframe, setVoxelWireframe] = useState(false)
  const [showChunks, setShowChunks] = useState(false)
  const [sliceLevel, setSliceLevel] = useState(0)
  const [pathConfig, setPathConfig] = useState(DEFAULT_PATH_CONFIG)

  useEffect(() => {
    const onHashChange = () => {
      setView(getViewFromHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (window.matchMedia('(max-width: 580px)').matches) {
      document.querySelector('.experiment-nav a[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
    }
  }, [view])

  return (
    <>
      <nav className="site-nav" aria-label="Portfolio navigation">
        <a className="site-brand" href="#overview" aria-label="Procedural World overview">
          <span className="brand-mark" aria-hidden="true">◈</span>
          <span>WORLD / BUILDER</span>
        </a>
        <div className="nav-links">
          <a href="#overview" aria-current={view === 'overview' ? 'page' : undefined}>Overview</a>
          <a href="#world" aria-current={view === 'world' ? 'page' : undefined}>World</a>
          <a href="#experiments" aria-current={view === 'experiments' || EXPERIMENTS.some(({ slug }) => slug === view) ? 'page' : undefined}>Experiments</a>
        </div>
      </nav>
      {EXPERIMENTS.some(({ slug }) => slug === view) && (
        <nav className="experiment-nav" aria-label="Experiment navigation">
          <a href="#experiments" className="experiment-back">← All experiments</a>
          <div>
            {EXPERIMENTS.map((experiment) => <a key={experiment.slug} href={experimentHref(experiment.slug)} aria-current={view === experiment.slug ? 'page' : undefined}>{experiment.number} {experiment.title}</a>)}
          </div>
        </nav>
      )}
      {view === 'overview' ? <Overview /> : view === 'world' ? <AfterUsWorld /> : view === 'experiments' ? <ExperimentIndex /> : view === 'noise' ? <NoiseLab /> : view === 'scatter' ? <ScatteringStudy /> : view === 'paths' ? <PathwaysStudy config={pathConfig} setConfig={setPathConfig} /> : view === 'flow' ? <FlowFieldStudy pathConfig={pathConfig} /> : view === 'shaders' ? <ShaderLab /> : view === 'branching' ? <BranchingForms /> : view === 'worldlines' ? <WorldlinesStudy /> : view === 'voxel' ? (
        <VoxelStudy
          config={voxelConfig}
          setConfig={setVoxelConfig}
          wireframe={voxelWireframe}
          setWireframe={setVoxelWireframe}
          showChunks={showChunks}
          setShowChunks={setShowChunks}
          sliceLevel={sliceLevel}
          setSliceLevel={setSliceLevel}
        />
      ) : (
        <TerrainExperience
          config={config}
          setConfig={setConfig}
          wireframe={wireframe}
          setWireframe={setWireframe}
          contours={contours}
          setContours={setContours}
          activeChunk={activeChunk}
          setActiveChunk={setActiveChunk}
        />
      )}
    </>
  )
}
