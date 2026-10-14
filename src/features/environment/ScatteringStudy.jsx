import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { EnvironmentStage } from './EnvironmentStage.jsx'
import { createScatter, SCATTER_LAYERS } from './createScatter.js'
import { getEnvironmentField } from './terrainSampler.js'

const DEFAULTS = {
  seed: 'grove-17',
  distribution: 'clustered',
  clusterScale: 0.4,
  clusterThreshold: -0.1,
  maxSlope: 38,
  waterClearance: 0.035,
  alignToSlope: true,
  layers: {
    trees: { enabled: true, count: 260 },
    rocks: { enabled: true, count: 110 },
    shrubs: { enabled: true, count: 180 },
  },
}

const UP = new THREE.Vector3(0, 1, 0)
const temp = new THREE.Object3D()
const tint = new THREE.Color()
const slopeRotation = new THREE.Quaternion()
const yawRotation = new THREE.Quaternion()
const surfaceNormal = new THREE.Vector3()

function InstanceSet({ points, kind, part, alignToSlope }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    points.forEach((point, index) => {
      const offset = kind === 'trees' ? (part === 'trunk' ? 0.29 : 1.02) : kind === 'rocks' ? 0.15 : 0.28
      temp.position.set(point.x, point.y + offset * point.scale, point.z)
      surfaceNormal.set(...point.normal)
      slopeRotation.setFromUnitVectors(UP, surfaceNormal)
      yawRotation.setFromAxisAngle(UP, point.yaw)
      temp.quaternion.copy(kind !== 'trees' && alignToSlope ? slopeRotation : yawRotation)
      if (kind !== 'trees' && alignToSlope) temp.quaternion.multiply(yawRotation)
      temp.scale.setScalar(point.scale)
      temp.updateMatrix()
      mesh.setMatrixAt(index, temp.matrix)
      const base = kind === 'trees' ? (part === 'trunk' ? '#8a6a4c' : '#76b889') : kind === 'rocks' ? '#adafa2' : '#a0c875'
      const terrainInfluence = Math.max(0, Math.min(1, (point.value - 0.34) * 1.8))
      tint.set(base).lerp(new THREE.Color(kind === 'rocks' ? '#d2b990' : '#d4e7a1'), point.colorVariant * 0.3 + terrainInfluence * 0.35)
      mesh.setColorAt(index, tint)
    })
    mesh.count = points.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [points, kind, part, alignToSlope])

  return (
    <instancedMesh ref={ref} args={[null, null, Math.max(1, points.length)]} frustumCulled={false}>
      {kind === 'trees' && part === 'trunk' ? <cylinderGeometry args={[0.075, 0.11, 0.58, 5]} /> : kind === 'trees' ? <coneGeometry args={[0.47, 1.55, 6]} /> : kind === 'rocks' ? <dodecahedronGeometry args={[0.38, 0]} /> : <icosahedronGeometry args={[0.36, 0]} />}
      <meshStandardMaterial color="white" roughness={0.94} flatShading />
    </instancedMesh>
  )
}

function ScatterScene({ instances, alignToSlope }) {
  return (
    <>
      <InstanceSet points={instances.trees} kind="trees" part="trunk" />
      <InstanceSet points={instances.trees} kind="trees" part="canopy" />
      <InstanceSet points={instances.rocks} kind="rocks" alignToSlope={alignToSlope} />
      <InstanceSet points={instances.shrubs} kind="shrubs" alignToSlope={alignToSlope} />
    </>
  )
}

function Slider({ label, value, min, max, step = 1, onChange, format = (next) => next }) {
  return <label className="range-control"><span><strong>{label}</strong><output>{format(value)}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>
}

export function ScatteringStudy() {
  const [config, setConfig] = useState(DEFAULTS)
  const field = useMemo(() => getEnvironmentField(config.seed), [config.seed])
  const scatter = useMemo(() => createScatter(field, config), [field, config])
  const placed = Object.values(scatter.stats).reduce((total, item) => total + item.placed, 0)
  const update = (key, value) => setConfig((current) => ({ ...current, [key]: value }))
  const updateLayer = (kind, key, value) => setConfig((current) => ({ ...current, layers: { ...current.layers, [kind]: { ...current.layers[kind], [key]: value } } }))

  return (
    <main className="app-shell">
      <header className="masthead"><p className="eyebrow">EXPERIMENT 03 / DISTRIBUTIONS</p><h1>Scattering Studio</h1><p className="intro">Grow a population from terrain rules. Each layer responds to elevation, slope, and a seeded distribution mask.</p></header>
      <div className="environment-viewport">
        <EnvironmentStage field={field} label="Interactive terrain with scattered assets"><ScatterScene instances={scatter.instances} alignToSlope={config.alignToSlope} /></EnvironmentStage>
        <div className="terrain-readout"><span className="readout-label">Terrain population</span><strong>{placed} placed assets</strong><span>{config.distribution === 'clustered' ? 'Noise clusters' : 'Uniform random'} · 3 independent layers</span></div>
      </div>
      <aside className="control-panel" aria-label="Scattering controls">
        <section className="control-section"><h2>Distribution</h2>
          <label className="field-control"><span>Seed</span><input value={config.seed} maxLength={40} onChange={(event) => update('seed', event.target.value)} /></label>
          <label className="field-control"><span>Placement pattern</span><select value={config.distribution} onChange={(event) => update('distribution', event.target.value)}><option value="clustered">Noise clusters</option><option value="uniform">Uniform random</option></select></label>
          {config.distribution === 'clustered' && <><Slider label="Cluster scale" value={config.clusterScale} min={0.15} max={1} step={0.05} onChange={(value) => update('clusterScale', value)} format={(value) => value.toFixed(2)} /><Slider label="Cluster coverage" value={config.clusterThreshold} min={-0.5} max={0.45} step={0.05} onChange={(value) => update('clusterThreshold', value)} format={(value) => value.toFixed(2)} /></>}
          <Slider label="Maximum slope" value={config.maxSlope} min={8} max={60} onChange={(value) => update('maxSlope', value)} format={(value) => `${value}°`} />
          <Slider label="Water clearance" value={config.waterClearance} min={0} max={0.18} step={0.005} onChange={(value) => update('waterClearance', value)} format={(value) => value.toFixed(3)} />
          <label className="toggle-row"><span><strong>Align to terrain</strong><small>Orient rocks and shrubs to surface normals</small></span><input type="checkbox" checked={config.alignToSlope} onChange={(event) => update('alignToSlope', event.target.checked)} /></label>
          <p className="control-note">Objects below water or above the slope limit are rejected before placement.</p>
        </section>
        <section className="control-section"><h2>Asset layers</h2>
          {Object.entries(SCATTER_LAYERS).map(([kind, layer]) => <div className="environment-layer" key={kind}>
            <label className="toggle-row"><span><strong>{layer.label}</strong><small>{scatter.stats[kind].placed} placed · {scatter.stats[kind].attempted} tested</small></span><input type="checkbox" checked={config.layers[kind].enabled} onChange={(event) => updateLayer(kind, 'enabled', event.target.checked)} /></label>
            {config.layers[kind].enabled && <Slider label="Target count" value={config.layers[kind].count} min={20} max={kind === 'trees' ? 500 : 300} step={10} onChange={(value) => updateLayer(kind, 'count', value)} />}
          </div>)}
        </section>
        <button type="button" className="reset-button" onClick={() => setConfig(DEFAULTS)}>Reset population</button>
      </aside>
    </main>
  )
}
