import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { EnvironmentStage } from './EnvironmentStage.jsx'
import { carvePathField, createPathSamples, DEFAULT_PATH_CONFIG } from './createPaths.js'
import { ENVIRONMENT_SIZE, getEnvironmentField, sampleTerrain } from './terrainSampler.js'

const clamp01 = (value) => Math.max(0, Math.min(1, value))

export function PathRibbon({ field, samples, width, kind }) {
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry()
    const positions = []
    const indices = []
    for (let index = 0; index < samples.length; index += 1) {
      const previous = samples[Math.max(0, index - 1)]
      const following = samples[Math.min(samples.length - 1, index + 1)]
      const directionX = following.x - previous.x
      const directionZ = following.z - previous.z
      const length = Math.hypot(directionX, directionZ) || 1
      const acrossX = -directionZ / length
      const acrossZ = directionX / length
      for (const side of [-1, 1]) {
        const x = samples[index].x + acrossX * width * 0.48 * side
        const z = samples[index].z + acrossZ * width * 0.48 * side
        const y = sampleTerrain(field, x, z).height + 0.09
        positions.push(x, y, z)
      }
      if (index < samples.length - 1) {
        const cursor = index * 2
        indices.push(cursor, cursor + 1, cursor + 2, cursor + 1, cursor + 3, cursor + 2)
      }
    }
    next.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    next.setIndex(indices)
    next.computeVertexNormals()
    return next
  }, [field, samples, width])

  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry}><meshStandardMaterial color={kind === 'river' ? '#3987aa' : '#6a685e'} roughness={kind === 'river' ? 0.28 : 0.95} metalness={0.04} side={THREE.DoubleSide} /></mesh>
}

function PathMap({ field, points, samples, selected, onSelect, onMove }) {
  const canvasRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = field.side
    canvas.height = field.side
    const context = canvas.getContext('2d')
    const image = context.createImageData(field.side, field.side)
    field.values.forEach((value, index) => {
      const shade = Math.round(30 + value * 170)
      image.data[index * 4] = Math.round(shade * 0.55)
      image.data[index * 4 + 1] = shade
      image.data[index * 4 + 2] = Math.round(shade * 0.85)
      image.data[index * 4 + 3] = 255
    })
    context.putImageData(image, 0, 0)
  }, [field])

  const move = (event) => {
    if (!dragging) return
    const rect = event.currentTarget.getBoundingClientRect()
    onMove(selected, { x: clamp01((event.clientX - rect.left) / rect.width), z: clamp01((event.clientY - rect.top) / rect.height) })
  }

  return (
    <div className="path-map">
      <canvas ref={canvasRef} role="img" aria-label="Top-down terrain map" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" onPointerMove={move} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)} aria-label="Editable path control points">
        <polyline fill="none" stroke="#061018" strokeWidth="1.8" points={samples.map(({ x, z }) => `${(x / ENVIRONMENT_SIZE + 0.5) * 100},${(z / ENVIRONMENT_SIZE + 0.5) * 100}`).join(' ')} />
        <polyline fill="none" stroke="#86e9df" strokeWidth="0.9" points={samples.map(({ x, z }) => `${(x / ENVIRONMENT_SIZE + 0.5) * 100},${(z / ENVIRONMENT_SIZE + 0.5) * 100}`).join(' ')} />
        {points.map((point, index) => <circle key={index} cx={point.x * 100} cy={point.z * 100} r={index === selected ? 2.5 : 1.9} fill={index === selected ? '#ffffff' : '#86e9df'} stroke="#07101a" strokeWidth="0.8" onPointerDown={(event) => { onSelect(index); setDragging(true); event.currentTarget.setPointerCapture(event.pointerId) }} />)}
      </svg>
    </div>
  )
}

function Slider({ label, value, min, max, step, onChange, format = (next) => next }) {
  return <label className="range-control"><span><strong>{label}</strong><output>{format(value)}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>
}

export function PathwaysStudy({ config, setConfig }) {
  const [selected, setSelected] = useState(2)
  const baseField = useMemo(() => getEnvironmentField(config.seed), [config.seed])
  const samples = useMemo(() => createPathSamples(config.points), [config.points])
  const field = useMemo(() => carvePathField(baseField, samples, config), [baseField, samples, config])
  const update = (key, value) => setConfig((current) => ({ ...current, [key]: value }))
  const movePoint = (index, point) => setConfig((current) => ({ ...current, points: current.points.map((item, itemIndex) => itemIndex === index ? point : item) }))
  const addPoint = () => {
    const next = config.points[selected + 1] ?? { x: clamp01(config.points[selected].x + 0.1), z: clamp01(config.points[selected].z - 0.1) }
    const current = config.points[selected]
    setConfig((value) => ({ ...value, points: [...value.points.slice(0, selected + 1), { x: (current.x + next.x) / 2, z: (current.z + next.z) / 2 }, ...value.points.slice(selected + 1)] }))
    setSelected(selected + 1)
  }
  const removePoint = () => {
    if (config.points.length <= 2) return
    setConfig((current) => ({ ...current, points: current.points.filter((_, index) => index !== selected) }))
    setSelected(Math.max(0, selected - 1))
  }

  return (
    <main className="app-shell">
      <header className="masthead"><p className="eyebrow">EXPERIMENT 04 / PATH SYSTEMS</p><h1>Pathways</h1><p className="intro">A line projected onto terrain becomes a route or a channel. Move its control points and watch the surface adapt.</p></header>
      <div className="environment-viewport">
        <EnvironmentStage field={field} label="Interactive terrain with a projected path" cameraPosition={[9, 16, 12]}><PathRibbon field={field} samples={samples} width={config.width} kind={config.kind} /></EnvironmentStage>
        <div className="terrain-readout"><span className="readout-label">Terrain / path interaction</span><strong>{config.kind === 'river' ? 'Carved river' : 'Leveled road'}</strong><span>{config.points.length} control points · {field.changed.toLocaleString()} altered vertices</span></div>
      </div>
      <aside className="control-panel" aria-label="Path controls">
        <section className="map-panel"><div className="section-heading"><div><p className="panel-kicker">Plan view</p><h2>Edit the spline</h2></div><span className="live-indicator">Live</span></div><PathMap field={baseField} points={config.points} samples={samples} selected={selected} onSelect={setSelected} onMove={movePoint} /><p className="control-note">Drag a point on the map or adjust its coordinates below.</p></section>
        <section className="control-section"><h2>Route</h2>
          <label className="field-control"><span>Terrain seed</span><input value={config.seed} onChange={(event) => update('seed', event.target.value)} maxLength={40} /></label>
          <label className="field-control"><span>Path type</span><select value={config.kind} onChange={(event) => update('kind', event.target.value)}><option value="river">River channel</option><option value="road">Road corridor</option></select></label>
          <Slider label="Width" value={config.width} min={0.25} max={1.8} step={0.05} onChange={(value) => update('width', value)} format={(value) => value.toFixed(2)} />
          {config.kind === 'river' && <Slider label="Channel depth" value={config.depth} min={0.1} max={1.4} step={0.05} onChange={(value) => update('depth', value)} format={(value) => value.toFixed(2)} />}
        </section>
        <section className="control-section"><h2>Control point {selected + 1} / {config.points.length}</h2>
          <Slider label="East / west" value={config.points[selected].x} min={0.02} max={0.98} step={0.01} onChange={(value) => movePoint(selected, { ...config.points[selected], x: value })} format={(value) => value.toFixed(2)} />
          <Slider label="North / south" value={config.points[selected].z} min={0.02} max={0.98} step={0.01} onChange={(value) => movePoint(selected, { ...config.points[selected], z: value })} format={(value) => value.toFixed(2)} />
          <div className="environment-actions"><button type="button" onClick={addPoint}>Add point</button><button type="button" onClick={removePoint} disabled={config.points.length <= 2}>Remove point</button></div>
        </section>
        <button type="button" className="reset-button" onClick={() => { setConfig(DEFAULT_PATH_CONFIG); setSelected(2) }}>Reset path</button>
      </aside>
    </main>
  )
}
