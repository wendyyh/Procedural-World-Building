import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color, PCFShadowMap } from 'three'
import { BoxInstances, TubeInstances } from './AfterUsScene.jsx'
import { ArchitectureSurfaces, DebrisInstances } from './ArchitectureSurfaces.jsx'
import { UrbanFoliage } from './UrbanFoliage.jsx'
import { canalX, cellAt, PALETTE, terrainAt, waterHeight } from './worldModel.js'
import { createExcavation, excavationShader, EXCAVATION_DEPTH } from './cutoutGeology.js'
import { createPreviewData, createPreviewSnapshot, interpolatePreview, previewFrame, SLICE_RADIUS, sliceBoundary } from './previewModel.js'

const SHADOWS = { type: PCFShadowMap }
const CAMERA = { position: [27, 24, 30], zoom: 14, near: 0.1, far: 140 }
let cachedData
const getData = () => cachedData || (cachedData = createPreviewData())

function geometryFrom(positions, indices, colors) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  if (indices) geometry.setIndex(indices)
  if (colors) geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
  geometry.computeVertexNormals()
  return geometry
}

function makeSlice(model, config) {
  const groundAt = (x, z) => terrainAt(model.ox + x, model.oz + z, model.seed)
  const sectors = 96, rings = 18, positions = [0, groundAt(0, 0), 0], indices = [], cells = [cellAt(0, 0)]
  for (let ring = 1; ring <= rings; ring += 1) for (let i = 0; i < sectors; i += 1) {
    const [x, z] = sliceBoundary(i / sectors * Math.PI * 2, ring / rings)
    positions.push(x, groundAt(x, z), z); cells.push(cellAt(x, z))
    if (ring === 1) indices.push(0, 1 + (i + 1) % sectors, 1 + i)
    else {
      const a = 1 + (ring - 2) * sectors + i, b = 1 + (ring - 2) * sectors + (i + 1) % sectors, c = a + sectors, d = b + sectors
      indices.push(a, b, c, b, d, c)
    }
  }
  const ground = geometryFrom(positions, indices, new Float32Array(positions.length))
  const excavation = createExcavation(model)
  const waterPositions = [], waterIndices = [], width = 0.68 + config.waterLevel * 0.65
  for (let row = 0; row <= 128; row += 1) {
    const z = (row / 128 * 2 - 1) * SLICE_RADIUS[1]
    const edge = SLICE_RADIUS[0] * Math.max(0, 1 - (z / SLICE_RADIUS[1]) ** 4) ** 0.25
    const x = canalX(model.ox, model.oz + z, model.seed) - model.ox, left = Math.max(-edge, x - width), right = Math.min(edge, x + width)
    if (left >= right) continue
    const offset = waterPositions.length / 3
    waterPositions.push(left, 0, z, right, 0, z)
    if (offset > 0) waterIndices.push(offset - 2, offset, offset - 1, offset - 1, offset, offset + 1)
  }
  return { ground, cells, side: geometryFrom(excavation.positions, null, excavation.colors), roots: excavation.roots, water: geometryFrom(waterPositions, waterIndices) }
}

function SliceTerrain({ data, animation }) {
  const slice = useMemo(() => makeSlice(data.model, data.config), [data])
  const colors = useMemo(() => slice.cells.map((cell) => new Color(data.model.barrier[cell] > 0.5 ? '#a9aa9b' : '#bab6a0')), [slice, data])
  const green = useMemo(() => new Color('#7f9655'), []), lastTick = useRef(-1)
  useEffect(() => () => { slice.ground.dispose(); slice.side.dispose(); slice.water.dispose() }, [slice])
  useFrame(() => {
    if (lastTick.current === animation.current.tick) return
    lastTick.current = animation.current.tick
    const attribute = slice.ground.getAttribute('color'), cover = animation.current.snapshot.cover
    slice.cells.forEach((cell, i) => {
      const t = Math.min(1, cover[cell] * 1.1), color = colors[i]
      attribute.setXYZ(i, color.r + (green.r - color.r) * t, color.g + (green.g - color.g) * t, color.b + (green.b - color.b) * t)
    })
    attribute.needsUpdate = true
  })
  return <>
    <mesh geometry={slice.ground} receiveShadow><meshStandardMaterial vertexColors roughness={1} /></mesh>
    <mesh geometry={slice.side} receiveShadow><meshStandardMaterial vertexColors roughness={1} transparent depthWrite={false} onBeforeCompile={excavationShader} /></mesh>
    <TubeInstances parts={slice.roots} config={data.config} overlay="natural" shadows={false} />
    <mesh geometry={slice.water} position={[0, waterHeight(data.config) + 0.015, 0]} receiveShadow><meshStandardMaterial color={PALETTE.water} roughness={0.48} metalness={0.06} /></mesh>
  </>
}

function PreviewCamera() {
  const { camera, size, invalidate } = useThree()
  useLayoutEffect(() => {
    camera.lookAt(0, 1.4, 0); camera.zoom = Math.min(size.width / 32, size.height / 30)
    camera.updateProjectionMatrix(); invalidate()
  }, [camera, size.width, size.height, invalidate])
  return null
}

function Evolution({ data, animation, fadeRef, active, reducedMotion }) {
  const elapsed = useRef(0), { invalidate } = useThree()
  useEffect(() => {
    invalidate()
    if (!active) return undefined
    const interval = window.setInterval(invalidate, 1000 / 30)
    return () => window.clearInterval(interval)
  }, [active, reducedMotion, invalidate])
  useFrame((_, delta) => {
    if (active) elapsed.current += Math.min(delta, 0.1)
    const frame = reducedMotion ? { year: 60, opacity: 1 } : previewFrame(elapsed.current)
    interpolatePreview(data.snapshots, frame.year, animation.current.snapshot)
    animation.current.tick += 1
    if (fadeRef.current) {
      fadeRef.current.style.opacity = String(frame.opacity)
      const year = String(Math.round(frame.year))
      if (fadeRef.current.dataset.year !== year) fadeRef.current.dataset.year = year
    }
  }, -2)
  return null
}

const CutoutScene = memo(function CutoutScene({ active, reducedMotion, fadeRef }) {
  const data = useMemo(getData, [])
  const animation = useRef(null)
  if (!animation.current) animation.current = { snapshot: createPreviewSnapshot(data), tick: 0 }
  return <Canvas orthographic frameloop="demand" shadows={SHADOWS} dpr={[1, 1.5]} camera={CAMERA} gl={{ antialias: true, alpha: true }} style={{ pointerEvents: 'none' }} aria-hidden="true" tabIndex={-1}>
    <ambientLight intensity={0.75} color="#e9e0e0" />
    <hemisphereLight args={['#f4e8d8', '#88977a', 1.15]} />
    <directionalLight position={[-12, 30, 20]} intensity={2.2} color="#ffe6c9" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-23} shadow-camera-right={23} shadow-camera-top={23} shadow-camera-bottom={-23} shadow-camera-far={90} shadow-normalBias={0.025} shadow-bias={-0.0001} shadow-radius={4} />
    <SliceTerrain data={data} animation={animation} />
    <ArchitectureSurfaces parts={data.parts.surfaces} config={data.config} overlay="natural" />
    <ArchitectureSurfaces parts={data.parts.glazing} config={data.config} overlay="natural" transparent />
    <DebrisInstances parts={data.parts.debris} year={data.architectureSnapshot.year} config={data.config} overlay="natural" detailed />
    <BoxInstances parts={data.parts.boxes} config={data.config} overlay="natural" />
    <TubeInstances parts={data.parts.tubes} config={data.config} overlay="natural" shadows />
    <BoxInstances parts={data.parts.glass} config={data.config} overlay="natural" transparent />
    <UrbanFoliage model={data.model} config={data.config} snapshot={animation.current.snapshot} detailed animation={animation} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -EXCAVATION_DEPTH - 1.1, 0]}>
      <planeGeometry args={[37, 32]} />
      <shaderMaterial transparent depthWrite={false} vertexShader={`varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `} fragmentShader={`varying vec2 vUv;
        void main() {
          float radius = length((vUv - 0.5) * 2.0);
          float alpha = (1.0 - smoothstep(0.18, 0.95, radius)) * 0.075;
          gl_FragColor = vec4(0.31, 0.36, 0.29, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `} />
    </mesh>
    <PreviewCamera />
    <Evolution data={data} animation={animation} fadeRef={fadeRef} active={active} reducedMotion={reducedMotion} />
  </Canvas>
})

export default function WorldCutout(props) { return <CutoutScene {...props} /> }
