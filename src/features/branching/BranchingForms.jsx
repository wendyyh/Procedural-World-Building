import { useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { BRANCHING_PRESETS, DEFAULT_BRANCH_CONFIG, createBranchModel, selectBranchLOD } from './createBranching.js'

const UP = new THREE.Vector3(0, 1, 0)
const temp = new THREE.Object3D()
const start = new THREE.Vector3()
const end = new THREE.Vector3()
const direction = new THREE.Vector3()
const tint = new THREE.Color()

function BranchInstances({ segments, form }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    segments.forEach((segment, index) => {
      start.fromArray(segment.start)
      end.fromArray(segment.end)
      direction.subVectors(end, start)
      temp.position.copy(start).addScaledVector(direction, 0.5)
      temp.quaternion.setFromUnitVectors(UP, direction.clone().normalize())
      temp.scale.set(segment.radius, direction.length(), segment.radius)
      temp.updateMatrix()
      mesh.setMatrixAt(index, temp.matrix)
      tint.set(form === 'ivy' ? '#4d866c' : '#8f7458').lerp(new THREE.Color(form === 'ivy' ? '#8eae7f' : '#d4c39b'), Math.min(0.42, segment.depth * 0.09))
      mesh.setColorAt(index, tint)
    })
    mesh.count = segments.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [segments, form])
  return <instancedMesh ref={ref} args={[null, null, Math.max(1, segments.length)]} frustumCulled={false}>
    <cylinderGeometry args={[1, 1, 1, 5]} />
    <meshStandardMaterial color="white" roughness={0.93} flatShading />
  </instancedMesh>
}

function LeafInstances({ leaves, form, level }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    leaves.forEach((leaf, index) => {
      temp.position.set(...leaf.position)
      temp.quaternion.setFromAxisAngle(UP, leaf.tint * Math.PI * 2)
      const scale = leaf.scale * (level === 'far' ? form === 'ivy' ? 0.3 : 0.48 : level === 'middle' ? 0.17 : 0.105)
      temp.scale.set(form === 'ivy' ? scale * 0.6 : scale, scale * 1.35, form === 'ivy' ? scale * 0.28 : scale)
      temp.updateMatrix()
      mesh.setMatrixAt(index, temp.matrix)
      tint.set(form === 'ivy' ? '#3e9575' : '#548d72').lerp(new THREE.Color('#b4ca7e'), leaf.tint * 0.48)
      mesh.setColorAt(index, tint)
    })
    mesh.count = leaves.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [leaves, form, level])
  return <instancedMesh ref={ref} args={[null, null, Math.max(1, leaves.length)]} frustumCulled={false}>
    <icosahedronGeometry args={[1, level === 'near' ? 1 : 0]} />
    <meshStandardMaterial color="white" roughness={0.95} flatShading side={THREE.DoubleSide} />
  </instancedMesh>
}

function Skeleton({ segments }) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(segments.length * 6)
    segments.forEach((segment, index) => {
      positions.set(segment.start, index * 6)
      positions.set(segment.end, index * 6 + 3)
    })
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return result
  }, [segments])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <lineSegments geometry={geometry}><lineBasicMaterial color="#a8f0d7" transparent opacity={0.9} /></lineSegments>
}

function CameraMonitor({ form, onDistance }) {
  const { camera } = useThree()
  const controlsRef = useRef(null)
  const frames = useRef(0)
  useEffect(() => {
    camera.position.set(...(form === 'ivy' ? [0, 3.4, 8.8] : [5.5, 4.7, 8.7]))
    controlsRef.current?.target.set(0, 3, 0)
    controlsRef.current?.update()
  }, [camera, form])
  useFrame(() => {
    frames.current += 1
    if (frames.current % 18 === 0) {
      onDistance(Math.round(camera.position.distanceTo(controlsRef.current?.target || new THREE.Vector3(0, 3, 0)) * 10) / 10)
    }
  })
  return <OrbitControls ref={controlsRef} makeDefault target={[0, 3, 0]} enableDamping minDistance={4} maxDistance={30} maxPolarAngle={Math.PI / 2.02} />
}

function BranchingStage({ form, detail, skeleton, visible, onDistance }) {
  return <section className="canvas-panel" aria-label="Interactive procedural branching viewport">
    <Canvas dpr={[1, 2]} camera={{ position: [6.4, 5.4, 9.2], fov: 42, near: 0.1, far: 80 }} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={['#081118']} />
      <fog attach="fog" args={['#081118', 20, 43]} />
      <ambientLight intensity={0.38} />
      <hemisphereLight args={['#dbfff3', '#22372b', 1.3]} />
      <directionalLight position={[5, 9, 8]} intensity={2.8} />
      <directionalLight position={[-5, 5, -5]} intensity={0.8} color="#86b9b0" />
      {form === 'ivy' && <group>
        <mesh position={[0, 3, -0.24]}><boxGeometry args={[8, 6, 0.3]} /><meshStandardMaterial color="#273a42" roughness={1} /></mesh>
        <gridHelper args={[8, 16, '#456069', '#263941']} position={[0, 3, -0.075]} rotation={[Math.PI / 2, 0, 0]} />
      </group>}
      {skeleton ? <Skeleton segments={visible.segments} /> : <><BranchInstances segments={visible.segments} form={form} /><LeafInstances leaves={visible.leaves} form={form} level={detail} /></>}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#0c1b1c" roughness={1} /></mesh>
      <Grid position={[0, 0, 0]} args={[24, 24]} cellSize={0.75} cellColor="#315352" sectionSize={3} sectionColor="#508d80" fadeDistance={23} fadeStrength={1.5} infiniteGrid />
      <CameraMonitor form={form} onDistance={onDistance} />
    </Canvas>
    <div className="canvas-help" aria-hidden="true"><span>Drag to orbit</span><span>Scroll to cross detail bands</span></div>
  </section>
}

function Slider({ label, value, min, max, step = 1, onChange, format = (number) => number }) {
  return <label className="range-control"><span><strong>{label}</strong><output>{format(value)}</output></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>
}

export function BranchingForms() {
  const [config, setConfig] = useState(DEFAULT_BRANCH_CONFIG)
  const [distance, setDistance] = useState(11)
  const model = useMemo(() => createBranchModel(config), [config.seed, config.form, config.iterations, config.angle, config.lengthDecay, config.widthDecay, config.jitter, config.leafDensity])
  const detail = config.lod === 'auto' ? distance < 12.5 ? 'near' : distance < 19 ? 'middle' : 'far' : config.lod
  const visible = useMemo(() => selectBranchLOD(model, detail), [model, detail])
  const update = (key, value) => setConfig((current) => ({ ...current, [key]: value }))

  return <main className="app-shell">
    <header className="masthead"><p className="eyebrow">EXPERIMENT 08 / BRANCHING GEOMETRY</p><h1>Branching Forms</h1><p className="intro">A compact grammar grows into a tree or a climbing network. Zoom to see its structure change with distance.</p></header>
    <div className="environment-viewport">
      <BranchingStage form={config.form} detail={detail} skeleton={config.skeleton} visible={visible} onDistance={setDistance} />
      <div className="terrain-readout"><span className="readout-label">Grammar / {config.form}</span><strong>{detail} detail</strong><span>{visible.segments.length.toLocaleString()} branches · {visible.leaves.length.toLocaleString()} leaf clusters · {distance.toFixed(1)} units</span></div>
    </div>
    <aside className="control-panel" aria-label="Branching controls">
      <section className="control-section"><h2>Form and grammar</h2>
        <label className="field-control"><span>Growth seed</span><input value={config.seed} maxLength={40} onChange={(event) => update('seed', event.target.value)} /></label>
        <label className="field-control"><span>Growth form</span><select value={config.form} onChange={(event) => update('form', event.target.value)}><option value="tree">Canopy tree</option><option value="ivy">Climbing ivy</option></select></label>
        <p className="control-note">{BRANCHING_PRESETS[config.form].description}</p>
        <Slider label="Iterations" value={config.iterations} min={1} max={4} onChange={(value) => update('iterations', value)} />
        <Slider label="Branch angle" value={config.angle} min={12} max={45} onChange={(value) => update('angle', value)} format={(value) => `${value}°`} />
        <Slider label="Length decay" value={config.lengthDecay} min={0.5} max={0.9} step={0.02} onChange={(value) => update('lengthDecay', value)} format={(value) => value.toFixed(2)} />
        <Slider label="Width decay" value={config.widthDecay} min={0.48} max={0.86} step={0.02} onChange={(value) => update('widthDecay', value)} format={(value) => value.toFixed(2)} />
        <Slider label="Angle variation" value={config.jitter} min={0} max={0.45} step={0.01} onChange={(value) => update('jitter', value)} format={(value) => `${Math.round(value * 100)}%`} />
        <Slider label="Leaf density" value={config.leafDensity} min={0} max={1} step={0.05} onChange={(value) => update('leafDensity', value)} format={(value) => `${Math.round(value * 100)}%`} />
      </section>
      <section className="control-section"><h2>Detail at distance</h2>
        <label className="field-control"><span>Level of detail</span><select value={config.lod} onChange={(event) => update('lod', event.target.value)}><option value="auto">Automatic by camera</option><option value="near">Near / full form</option><option value="middle">Middle / simplified</option><option value="far">Far / silhouette</option></select></label>
        <label className="toggle-row"><span><strong>Show skeleton</strong><small>Inspect the generated branch graph</small></span><input type="checkbox" checked={config.skeleton} onChange={(event) => update('skeleton', event.target.checked)} /></label>
        <div className="branch-stats"><span>Visible branches<strong>{visible.segments.length.toLocaleString()}</strong></span><span>Visible leaf clusters<strong>{visible.leaves.length.toLocaleString()}</strong></span><span>Grammar symbols<strong>{model.sentence.length.toLocaleString()}</strong></span></div>
        <p className="control-note">Automatic bands switch near 12.5 and 19 camera units. Fewer visible instances reduce geometry work; the study does not claim a measured frame-rate gain.</p>
        <details className="grammar-detail"><summary>Read the grammar</summary><p>Axiom <code>{BRANCHING_PRESETS[config.form].axiom}</code></p><p>Rule <code>F → {BRANCHING_PRESETS[config.form].rule}</code></p><p><code>[ ]</code> save and restore the turtle position. <code>+ − &amp; ^</code> turn its heading.</p></details>
      </section>
      <button type="button" className="reset-button" onClick={() => setConfig(DEFAULT_BRANCH_CONFIG)}>Reset form</button>
    </aside>
  </main>
}
