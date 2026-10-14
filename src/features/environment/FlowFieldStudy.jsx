import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { EnvironmentStage } from './EnvironmentStage.jsx'
import { createFlowSampler, createInitialParticles } from './createFlowField.js'
import { carvePathField, createPathSamples, nearestPathPoint } from './createPaths.js'
import { PathRibbon } from './PathwaysStudy.jsx'
import { ENVIRONMENT_SIZE, getEnvironmentField, sampleTerrain } from './terrainSampler.js'

const DEFAULTS = { seed: 'current-09', mode: 'river', count: 850, speed: 1.15, turbulence: 0.65, trail: 7, vectors: true }

function FlowArrows({ field, sampleFlow }) {
  const geometry = useMemo(() => {
    const positions = []
    for (let row = 0; row < 12; row += 1) {
      for (let column = 0; column < 12; column += 1) {
        const x = (column / 11 - 0.5) * ENVIRONMENT_SIZE * 0.9
        const z = (row / 11 - 0.5) * ENVIRONMENT_SIZE * 0.9
        const vector = sampleFlow(x, z)
        const y = sampleTerrain(field, x, z).height + 0.13
        const tipX = x + vector.x * 0.38
        const tipZ = z + vector.z * 0.38
        positions.push(x, y, z, tipX, y, tipZ)
        positions.push(tipX, y, tipZ, tipX - vector.x * 0.11 - vector.z * 0.08, y, tipZ - vector.z * 0.11 + vector.x * 0.08)
        positions.push(tipX, y, tipZ, tipX - vector.x * 0.11 + vector.z * 0.08, y, tipZ - vector.z * 0.11 - vector.x * 0.08)
      }
    }
    const next = new THREE.BufferGeometry()
    next.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return next
  }, [field, sampleFlow])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <lineSegments geometry={geometry}><lineBasicMaterial color="#a5f8e8" transparent opacity={0.5} depthWrite={false} /></lineSegments>
}

function FlowParticles({ field, config, sampleFlow, pathSamples, running, resetToken }) {
  const state = useMemo(() => {
    const particles = createInitialParticles(config, pathSamples)
    const points = new Float32Array(config.count * 3)
    const trails = new Float32Array(config.count * (config.trail - 1) * 6)
    for (let index = 0; index < particles.length; index += 1) {
      const { x, z } = particles[index]
      const y = sampleTerrain(field, x, z).height + (config.mode === 'wind' ? 0.8 : 0.18)
      points.set([x, y, z], index * 3)
      for (let segment = 0; segment < config.trail - 1; segment += 1) trails.set([x, y, z, x, y, z], (index * (config.trail - 1) + segment) * 6)
    }
    const pointGeometry = new THREE.BufferGeometry()
    pointGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3))
    const trailGeometry = new THREE.BufferGeometry()
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trails, 3))
    return { particles, points, trails, pointGeometry, trailGeometry }
  }, [field, config.count, config.trail, config.mode, config.seed, config.pathWidth, pathSamples, resetToken])

  useEffect(() => () => { state.pointGeometry.dispose(); state.trailGeometry.dispose() }, [state])

  useFrame((_, delta) => {
    if (!running) return
    const elapsed = Math.min(delta, 0.05) * config.speed
    const { particles, points, trails } = state
    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index]
      const vector = sampleFlow(particle.x, particle.z)
      particle.x += vector.x * elapsed
      particle.z += vector.z * elapsed
      if (config.mode === 'river') {
        if (nearestPathPoint(particle.x, particle.z, pathSamples).distance > config.pathWidth * 1.8 || Math.abs(particle.x) > ENVIRONMENT_SIZE / 2 || Math.abs(particle.z) > ENVIRONMENT_SIZE / 2) {
          const start = pathSamples[0]
          particle.x = start.x
          particle.z = start.z
        }
      } else {
        if (particle.x > ENVIRONMENT_SIZE / 2) particle.x = -ENVIRONMENT_SIZE / 2
        if (particle.x < -ENVIRONMENT_SIZE / 2) particle.x = ENVIRONMENT_SIZE / 2
        if (particle.z > ENVIRONMENT_SIZE / 2) particle.z = -ENVIRONMENT_SIZE / 2
        if (particle.z < -ENVIRONMENT_SIZE / 2) particle.z = ENVIRONMENT_SIZE / 2
      }
      const y = sampleTerrain(field, particle.x, particle.z).height + (config.mode === 'wind' ? 0.8 : 0.18)
      const offset = index * 3
      const previous = [points[offset], points[offset + 1], points[offset + 2]]
      points.set([particle.x, y, particle.z], offset)
      const trailStart = index * (config.trail - 1) * 6
      for (let segment = config.trail - 2; segment > 0; segment -= 1) {
        trails.copyWithin(trailStart + segment * 6, trailStart + (segment - 1) * 6, trailStart + segment * 6)
      }
      trails.set([particle.x, y, particle.z, ...previous], trailStart)
    }
    state.pointGeometry.attributes.position.needsUpdate = true
    state.trailGeometry.attributes.position.needsUpdate = true
  })

  return <>
    <lineSegments geometry={state.trailGeometry}><lineBasicMaterial color={config.mode === 'river' ? '#75dfff' : '#a6f8d3'} transparent opacity={0.34} depthWrite={false} /></lineSegments>
    <points geometry={state.pointGeometry}><pointsMaterial color={config.mode === 'river' ? '#b7f9ff' : '#e0ffe4'} size={0.09} sizeAttenuation transparent opacity={0.92} depthWrite={false} /></points>
  </>
}

function Slider({ label, value, min, max, step = 1, onChange, format = (next) => next }) {
  return <label className="range-control"><span><strong>{label}</strong><output>{format(value)}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>
}

export function FlowFieldStudy({ pathConfig }) {
  const [config, setConfig] = useState(DEFAULTS)
  const [running, setRunning] = useState(true)
  const [resetToken, setResetToken] = useState(0)
  const terrainSeed = config.mode === 'river' ? pathConfig.seed : config.seed
  const baseField = useMemo(() => getEnvironmentField(terrainSeed), [terrainSeed])
  const pathSamples = useMemo(() => createPathSamples(pathConfig.points), [pathConfig.points])
  const flowConfig = useMemo(() => ({ ...config, pathWidth: pathConfig.width }), [config, pathConfig.width])
  const field = useMemo(() => config.mode === 'river' ? carvePathField(baseField, pathSamples, { width: pathConfig.width, depth: pathConfig.depth, kind: 'river' }) : baseField, [baseField, pathSamples, config.mode, pathConfig.width, pathConfig.depth])
  const sampleFlow = useMemo(() => createFlowSampler(config, pathSamples), [config.seed, config.mode, config.turbulence, pathSamples])
  const update = (key, value) => setConfig((current) => ({ ...current, [key]: value }))

  return (
    <main className="app-shell">
      <header className="masthead"><p className="eyebrow">EXPERIMENT 05 / VECTOR FIELDS</p><h1>Flow Field</h1><p className="intro">Watch particles follow invisible forces. Compare a river current guided by a path with a free atmospheric field.</p></header>
      <div className="environment-viewport">
        <EnvironmentStage field={field} label="Interactive terrain with animated flow particles">
          {config.mode === 'river' && <PathRibbon field={field} samples={pathSamples} width={pathConfig.width} kind="river" />}
          {config.vectors && <FlowArrows field={field} sampleFlow={sampleFlow} />}
          <FlowParticles field={field} config={flowConfig} sampleFlow={sampleFlow} pathSamples={pathSamples} running={running} resetToken={resetToken} />
        </EnvironmentStage>
        <div className="terrain-readout"><span className="readout-label">Particle motion / {config.mode}</span><strong>{running ? 'Flowing' : 'Paused'}</strong><span>{config.count.toLocaleString()} particles · {config.mode === 'river' ? `${pathConfig.points.length} path points` : `${config.trail - 1} trail segments each`}</span></div>
      </div>
      <aside className="control-panel" aria-label="Flow field controls">
        <section className="control-section"><h2>Field</h2>
          <label className="field-control"><span>Motion seed</span><input value={config.seed} onChange={(event) => update('seed', event.target.value)} maxLength={40} /></label>
          <label className="field-control"><span>Flow mode</span><select value={config.mode} onChange={(event) => update('mode', event.target.value)}><option value="river">River current</option><option value="wind">Atmospheric wind</option></select></label>
          {config.mode === 'river' && <p className="control-note">The river uses the current spline and terrain seed from Pathways. <a href="#experiments/paths">Edit that path ↗</a></p>}
          <Slider label="Turbulence" value={config.turbulence} min={0} max={2} step={0.05} onChange={(value) => update('turbulence', value)} format={(value) => value.toFixed(2)} />
          <Slider label="Speed" value={config.speed} min={0.2} max={3} step={0.05} onChange={(value) => update('speed', value)} format={(value) => value.toFixed(2)} />
          <label className="toggle-row"><span><strong>Direction arrows</strong><small>Reveal the underlying vector field</small></span><input type="checkbox" checked={config.vectors} onChange={(event) => update('vectors', event.target.checked)} /></label>
        </section>
        <section className="control-section"><h2>Particles</h2>
          <Slider label="Population" value={config.count} min={150} max={1200} step={50} onChange={(value) => update('count', value)} />
          <Slider label="Trail length" value={config.trail} min={2} max={12} step={1} onChange={(value) => update('trail', value)} format={(value) => `${value - 1} segments`} />
          <div className="environment-actions"><button type="button" onClick={() => setRunning((current) => !current)}>{running ? 'Pause' : 'Play'}</button><button type="button" onClick={() => setResetToken((value) => value + 1)}>Reset particles</button></div>
          <p className="control-note">This is a particle study driven by a sampled vector field, not a full fluid solver.</p>
        </section>
        <button type="button" className="reset-button" onClick={() => { setConfig(DEFAULTS); setRunning(true); setResetToken((value) => value + 1) }}>Reset field</button>
      </aside>
    </main>
  )
}
