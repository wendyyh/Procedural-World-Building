import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { createNoiseStudyField } from './createNoiseStudyField.js'

const DEFAULTS = {
  seed: 'field-notes-01',
  source: 'simplex',
  resolution: 64,
  scale: 4.8,
  octaves: 4,
  falloff: 0.5,
  lacunarity: 2,
  shaping: 'linear',
  shapeAmount: 2.5,
  height: 4.2,
}

const SHAPING = {
  linear: 'Natural',
  ridged: 'Ridged',
  billow: 'Billow',
  terrace: 'Terraced',
  power: 'Power curve',
}

function NoiseMap({ field }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = field.side
    canvas.height = field.side
    const context = canvas.getContext('2d')
    const image = context.createImageData(field.side, field.side)
    for (let index = 0; index < field.values.length; index += 1) {
      const value = Math.round(field.values[index] * 255)
      const offset = index * 4
      image.data[offset] = value
      image.data[offset + 1] = value
      image.data[offset + 2] = value
      image.data[offset + 3] = 255
    }
    context.putImageData(image, 0, 0)
  }, [field])

  return <canvas ref={canvasRef} className="noise-lab-map" role="img" aria-label="Live grayscale noise map" />
}

function HeightGrid({ field, height, wireframe }) {
  const geometry = useMemo(() => {
    const next = new THREE.PlaneGeometry(16, 16, field.resolution, field.resolution)
    const positions = next.attributes.position
    const colors = new Float32Array(positions.count * 3)
    const low = new THREE.Color('#145968')
    const high = new THREE.Color('#c9f9dc')
    const color = new THREE.Color()
    for (let index = 0; index < positions.count; index += 1) {
      const value = field.values[index]
      positions.setZ(index, (value - 0.5) * height)
      color.copy(low).lerp(high, value)
      colors[index * 3] = color.r
      colors[index * 3 + 1] = color.g
      colors[index * 3 + 2] = color.b
    }
    next.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    next.computeVertexNormals()
    return next
  }, [field, height])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} rotation-x={-Math.PI / 2}>
      <meshStandardMaterial vertexColors roughness={0.82} metalness={0.08} wireframe={wireframe} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Slider({ label, value, min, max, step, onChange, format = (next) => next, disabled = false }) {
  return (
    <label className="range-control">
      <span><strong>{label}</strong><output>{format(value)}</output></span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

export function NoiseLab() {
  const [config, setConfig] = useState(DEFAULTS)
  const [wireframe, setWireframe] = useState(false)
  const field = useMemo(() => createNoiseStudyField(config), [config])
  const update = (key, value) => setConfig((current) => ({ ...current, [key]: value }))
  const shapingIsTerrace = config.shaping === 'terrace'

  return (
    <main className="app-shell noise-lab-shell">
      <header className="masthead">
        <p className="eyebrow">EXPERIMENT 01 / GENERATIVE FIELDS</p>
        <h1>Noise Lab</h1>
        <p className="intro">A seed becomes a map. Tune the signal, shape its values, and see the same field rise into a three-dimensional grid.</p>
      </header>

      <section className="canvas-panel" aria-label="Interactive noise height grid">
        <Canvas dpr={[1, 2]} camera={{ position: [14, 11, 14], fov: 42, near: 0.1, far: 100 }} gl={{ antialias: true, alpha: false }}>
          <color attach="background" args={['#07101a']} />
          <fog attach="fog" args={['#07101a', 24, 46]} />
          <ambientLight intensity={0.65} />
          <hemisphereLight args={['#d9ffef', '#0b2632', 1.3]} />
          <directionalLight position={[8, 13, 6]} intensity={2.2} />
          <HeightGrid field={field} height={config.height} wireframe={wireframe} />
          <gridHelper args={[22, 22, '#407b82', '#1a3840']} position={[0, -config.height / 2 - 0.08, 0]} />
          <OrbitControls makeDefault enableDamping dampingFactor={0.07} minDistance={8} maxDistance={34} maxPolarAngle={Math.PI / 2.05} />
        </Canvas>
        <div className="terrain-readout">
          <span className="readout-label">Seeded signal / {config.source}</span>
          <strong>{SHAPING[config.shaping]} field</strong>
          <span>{field.values.length.toLocaleString()} samples · {config.resolution} × {config.resolution} cells</span>
        </div>
        <div className="canvas-help" aria-hidden="true"><span>Drag to orbit</span><span>Scroll to zoom</span></div>
      </section>

      <aside className="control-panel noise-lab-controls" aria-label="Noise generator controls">
        <section className="map-panel">
          <div className="section-heading"><div><p className="panel-kicker">Source signal</p><h2>2D field view</h2></div><span className="live-indicator">Live</span></div>
          <NoiseMap field={field} />
          <div className="map-stats"><span><small>Min</small>{field.minimum.toFixed(2)}</span><span><small>Mean</small>{field.mean.toFixed(2)}</span><span><small>Max</small>{field.maximum.toFixed(2)}</span></div>
        </section>

        <section className="control-section">
          <h2>Signal</h2>
          <label className="field-control"><span>Seed</span><input value={config.seed} onChange={(event) => update('seed', event.target.value)} maxLength={40} /></label>
          <label className="field-control"><span>Noise source</span><select value={config.source} onChange={(event) => update('source', event.target.value)}><option value="simplex">Coherent / simplex</option><option value="cellular">Cellular distance</option><option value="white">White noise</option></select></label>
          <Slider label="Scale" value={config.scale} min={1.5} max={12} step={0.1} disabled={config.source === 'white'} onChange={(value) => update('scale', value)} format={(value) => value.toFixed(1)} />
          <Slider label="Octaves" value={config.octaves} min={1} max={6} step={1} disabled={config.source === 'white'} onChange={(value) => update('octaves', value)} />
          <Slider label="Falloff" value={config.falloff} min={0.2} max={0.8} step={0.05} disabled={config.source === 'white'} onChange={(value) => update('falloff', value)} format={(value) => value.toFixed(2)} />
          <Slider label="Lacunarity" value={config.lacunarity} min={1.5} max={3} step={0.1} disabled={config.source === 'white'} onChange={(value) => update('lacunarity', value)} format={(value) => value.toFixed(1)} />
          <p className="control-note">The seed and coordinates reproduce the same map. White noise samples are independent, so frequency controls do not apply.</p>
        </section>

        <section className="control-section">
          <h2>Shape & grid</h2>
          <label className="field-control"><span>Shaping operation</span><select value={config.shaping} onChange={(event) => setConfig((current) => ({ ...current, shaping: event.target.value, shapeAmount: event.target.value === 'terrace' ? 5 : 2.5 }))}><option value="linear">Natural</option><option value="ridged">Ridged</option><option value="billow">Billow</option><option value="terrace">Terraced</option><option value="power">Power curve</option></select></label>
          <Slider label={shapingIsTerrace ? 'Terrace steps' : 'Shape amount'} value={config.shapeAmount} min={shapingIsTerrace ? 2 : 0.5} max={shapingIsTerrace ? 10 : 4} step={shapingIsTerrace ? 1 : 0.1} disabled={config.shaping === 'linear'} onChange={(value) => update('shapeAmount', value)} format={(value) => shapingIsTerrace ? Math.round(value) : value.toFixed(1)} />
          <Slider label="Grid resolution" value={config.resolution} min={16} max={128} step={8} onChange={(value) => update('resolution', value)} format={(value) => `${value} × ${value}`} />
          <Slider label="Vertical relief" value={config.height} min={0.5} max={8} step={0.1} onChange={(value) => update('height', value)} format={(value) => value.toFixed(1)} />
          <label className="toggle-row"><span><strong>Wireframe</strong><small>Reveal the displaced grid</small></span><input type="checkbox" checked={wireframe} onChange={(event) => setWireframe(event.target.checked)} /></label>
        </section>
        <button className="reset-button" type="button" onClick={() => { setConfig(DEFAULTS); setWireframe(false) }}>Reset field</button>
      </aside>
    </main>
  )
}
