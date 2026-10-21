import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { BufferAttribute, BufferGeometry, Color, DoubleSide, MOUSE, Object3D, PCFShadowMap, Quaternion, TOUCH, UniformsLib, UniformsUtils, Vector3 } from 'three'
import { createArchitecture } from './districtGeometry.js'
import { ArchitectureSurfaces, DebrisInstances } from './ArchitectureSurfaces.jsx'
import { UrbanFoliage } from './UrbanFoliage.jsx'
import { createLightingState, readDayClock, sampleDayNight } from './dayNight.js'
import { canalX, CHUNK_SIZE, clamp, GRID, habitat, PALETTE, waterHeight } from './worldModel.js'

const SHADOW_SETTINGS = { type: PCFShadowMap }

function weatherShader(shader) {
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWeather;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWeather = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;')
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWeather;').replace('#include <color_fragment>', `#include <color_fragment>
    vec3 cell = floor(vWeather * 17.0);
    float fleck = fract(sin(dot(cell, vec3(127.1, 311.7, 74.7))) * 43758.5453);
    float stain = sin(floor(vWeather.x * 1.5) * 8.2 + floor(vWeather.z * 2.0) * 3.3) * 0.03;
    diffuseColor.rgb *= 0.94 + fleck * 0.12 + stain;
  `)
}

function partColor(part, overlay, config) {
  if (overlay === 'impact') return { road: '#b78479', rail: '#c4a167', bridge: '#aab17a', roof: '#c8b78a', window: '#819b99' }[part.kind] || '#a9a99a'
  if (overlay === 'light' && part.kind !== 'window') return part.kind === 'roof' ? new Color('#b3b9a8').lerp(new Color('#ead6a2'), config.sunlight) : '#a4a6a0'
  return part.color
}

export function BoxInstances({ parts, overlay, config, transparent = false, shadows = true }) {
  const ref = useRef(), dummy = useMemo(() => new Object3D(), [])
  useLayoutEffect(() => {
    parts.forEach((part, i) => {
      dummy.position.set(...part.position); dummy.rotation.set(...(part.rotation || [0, 0, 0])); dummy.scale.set(...part.size); dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [parts, dummy])
  useLayoutEffect(() => {
    parts.forEach((part, i) => ref.current.setColorAt(i, new Color(partColor(part, overlay, config))))
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [parts, overlay, config.sunlight])
  return <instancedMesh ref={ref} args={[null, null, parts.length]} frustumCulled={false} castShadow={shadows && !transparent} receiveShadow={!transparent}>
    <boxGeometry /><meshStandardMaterial roughness={0.97} transparent={transparent} opacity={transparent ? 0.23 : 1} depthWrite={!transparent} onBeforeCompile={transparent ? undefined : weatherShader} />
  </instancedMesh>
}

export function TubeInstances({ parts, overlay, config, shadows }) {
  const ref = useRef(), dummy = useMemo(() => new Object3D(), []), up = useMemo(() => new Vector3(0, 1, 0), [])
  useLayoutEffect(() => {
    parts.forEach((part, i) => {
      const a = new Vector3(...part.from), b = new Vector3(...part.to), delta = b.clone().sub(a)
      dummy.position.copy(a.clone().add(b).multiplyScalar(0.5)); dummy.quaternion.copy(new Quaternion().setFromUnitVectors(up, delta.clone().normalize())); dummy.scale.set(part.radius, delta.length(), part.radius); dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [parts, dummy, up])
  useLayoutEffect(() => {
    parts.forEach((part, i) => ref.current.setColorAt(i, new Color(partColor(part, overlay, config))))
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [parts, overlay, config.sunlight])
  return <instancedMesh ref={ref} args={[null, null, parts.length]} frustumCulled={false} castShadow={shadows} receiveShadow><cylinderGeometry args={[1, 1, 1, 8]} /><meshStandardMaterial roughness={0.95} /></instancedMesh>
}

function Ground({ model, snapshot, config, overlay }) {
  const geometry = useMemo(() => {
    const positions = [], colors = [], indices = []
    for (let z = 0; z < GRID; z += 1) for (let x = 0; x < GRID; x += 1) {
      const i = z * GRID + x, h = habitat(model, i, config, snapshot.environment)
      positions.push(x - 12, model.heights[i], z - 12)
      let color
      if (overlay === 'light') color = new Color('#737f8a').lerp(new Color('#e8cd8b'), h.light)
      else if (overlay === 'moisture') color = new Color('#c2a879').lerp(new Color('#4b9c98'), h.wetness)
      else if (overlay === 'soil') color = new Color('#a6a7a2').lerp(new Color('#7f9554'), h.soil)
      else if (overlay === 'impact') color = (snapshot.environment?.barrier || model.barrier)[i] > 0.5 ? new Color('#b78479') : model.moisture[i] > 0.6 ? new Color('#7eaaa0') : new Color('#a6b876')
      else {
        color = new Color(model.barrier[i] > 0.5 ? '#a9aa9b' : '#bab6a0')
        color.lerp(new Color('#89975e'), snapshot.cover[i] * 0.72)
        color.offsetHSL(0, 0, ((x * 7 + z * 11 + model.tileSeed) % 5 - 2) * 0.009)
      }
      colors.push(color.r, color.g, color.b)
      if (x < GRID - 1 && z < GRID - 1) indices.push(i, i + GRID, i + 1, i + 1, i + GRID, i + GRID + 1)
    }
    const result = new BufferGeometry(); result.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3)); result.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3)); result.setIndex(indices); result.computeVertexNormals()
    return result
  }, [model, snapshot, config, overlay])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial vertexColors roughness={1} /></mesh>
}

function Canal({ model, config, lighting }) {
  const ref = useRef()
  const geometry = useMemo(() => {
    const center = canalX(model.ox, model.oz, model.seed) - model.ox
    if (Math.abs(center) > 14) return null
    const positions = [], indices = []
    for (let i = 0; i <= 32; i += 1) {
      const z = -12 + i / 32 * 24, x = canalX(model.ox, model.oz + z, model.seed) - model.ox, width = 0.68 + config.waterLevel * 0.65
      positions.push(x - width, 0, z, x + width, 0, z)
      if (i < 32) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
    }
    const result = new BufferGeometry(); result.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3)); result.setIndex(indices); result.computeVertexNormals(); return result
  }, [model, config.waterLevel])
  useEffect(() => () => geometry?.dispose(), [geometry])
  useFrame(({ clock }) => {
    if (ref.current) { ref.current.uniforms.uTime.value = clock.elapsedTime; ref.current.uniforms.uColor.value.copy(lighting.water) }
  })
  const uniforms = useMemo(() => UniformsUtils.merge([UniformsLib.fog, { uTime: { value: 0 }, uOffset: { value: model.oz }, uColor: { value: new Color(PALETTE.water) } }]), [model.oz])
  if (!geometry) return null
  return <mesh geometry={geometry} position={[0, waterHeight(config), 0]}>
    <shaderMaterial ref={ref} side={DoubleSide} uniforms={uniforms} fog vertexShader={`varying vec2 vPoint;
      #include <fog_pars_vertex>
      void main(){vPoint=position.xz; vec4 mvPosition=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mvPosition;
      #include <fog_vertex>
      }`} fragmentShader={`varying vec2 vPoint; uniform float uTime; uniform float uOffset; uniform vec3 uColor;
      #include <fog_pars_fragment>
      void main(){float ripple=sin((vPoint.y+uOffset)*4.0-uTime*1.1+sin(vPoint.x*2.0)); float glint=smoothstep(0.97,1.0,ripple)*0.04;gl_FragColor=vec4(uColor+glint,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
      }`} />
  </mesh>
}

const architectureCache = new WeakMap()
const District = memo(function District({ entry, detail, config, overlay, lighting }) {
  const { model, snapshot } = entry, detailed = detail === 2
  const parts = useMemo(() => {
    let cached = architectureCache.get(model)
    if (!cached) { cached = new Map(); architectureCache.set(model, cached) }
    const key = `${detailed}/${snapshot.structures.map((b) => b.damage.toFixed(5)).join('/')}`
    if (!cached.has(key)) {
      cached.set(key, createArchitecture(model, detailed, snapshot))
      if (cached.size > 4) cached.delete(cached.keys().next().value)
    }
    return cached.get(key)
  }, [model, detailed, snapshot.structures])
  return <group position={[model.ox, 0, model.oz]}>
    <Ground model={model} snapshot={snapshot} config={config} overlay={overlay} />
    <Canal model={model} config={config} lighting={lighting} />
    <ArchitectureSurfaces parts={parts.surfaces} overlay={overlay} config={config} shadows={detail > 0} />
    {detailed && <ArchitectureSurfaces parts={parts.glazing} overlay={overlay} config={config} transparent />}
    <DebrisInstances parts={parts.debris} year={snapshot.year} overlay={overlay} config={config} detailed={detailed} />
    <BoxInstances parts={parts.boxes} overlay={overlay} config={config} shadows={detail > 0} />
    {detail > 0 && <TubeInstances parts={parts.tubes} overlay={overlay} config={config} shadows={detailed} />}
    {detailed && <BoxInstances parts={parts.glass} overlay={overlay} config={config} transparent />}
    {detail > 0 && <UrbanFoliage model={model} snapshot={snapshot} config={config} detailed={detailed} />}
  </group>
})

function Lighting({ config, dayClock, lighting }) {
  const sun = useRef(), moon = useRef(), ambient = useRef(), hemisphere = useRef()
  const target = useMemo(() => new Object3D(), [])
  useFrame(({ controls, scene }) => {
    const state = sampleDayNight(readDayClock(dayClock.current, performance.now()), config.sunlight, lighting)
    const x = controls?.target.x || 0, z = controls?.target.z || 0
    target.position.set(x, 0, z); target.updateMatrixWorld()
    for (const [ref, offset, intensity] of [[sun, state.sunPosition, state.sunIntensity], [moon, state.moonPosition, state.moonIntensity]]) {
      ref.current.position.set(x + offset[0], offset[1], z + offset[2]); ref.current.intensity = intensity
      // Initialize both shadow samplers once; thereafter only active lights need a pass.
      ref.current.shadow.needsUpdate = !ref.current.shadow.map || intensity > 0.01
    }
    sun.current.color.copy(state.sun)
    ambient.current.color.copy(state.ambient); ambient.current.intensity = state.ambientIntensity
    hemisphere.current.color.copy(state.upper); hemisphere.current.groundColor.copy(state.ground); hemisphere.current.intensity = state.hemisphereIntensity
    scene.background.copy(state.sky); scene.fog.color.copy(state.sky)
  }, -1)
  return <>
    <primitive object={target} />
    <ambientLight ref={ambient} intensity={0.65} color="#dfd9df" />
    <hemisphereLight ref={hemisphere} args={['#eee3d3', '#7e8976', 1]} />
    <directionalLight ref={sun} target={target} position={[-14, 23, 16]} intensity={0} color="#ffe3c6" castShadow shadow-autoUpdate={false} shadow-mapSize={[2048, 2048]} shadow-camera-left={-34} shadow-camera-right={34} shadow-camera-top={34} shadow-camera-bottom={-30} shadow-camera-far={140} shadow-normalBias={0.025} shadow-bias={-0.0001} shadow-radius={3} />
    <directionalLight ref={moon} target={target} position={[14, 23, -16]} intensity={0} color="#b7d0ff" castShadow shadow-autoUpdate={false} shadow-mapSize={[1024, 1024]} shadow-camera-left={-34} shadow-camera-right={34} shadow-camera-top={34} shadow-camera-bottom={-30} shadow-camera-far={140} shadow-normalBias={0.04} shadow-bias={-0.0001} shadow-radius={4} />
  </>
}

function Navigation({ revision, jump, focus, onFocus }) {
  const { camera, size, controls } = useThree()
  const destination = useRef(null), last = useRef({ x: 0, z: 0, t: 0 })
  useLayoutEffect(() => {
    if (!controls) return
    const x = focus.x, z = focus.z
    camera.position.set(x + 25, 21, z + 28); controls.target.set(x, 2.1, z)
    camera.zoom = Math.min(size.width / 29, size.height / 21)
    controls.minZoom = Math.max(10, size.width / 90, size.height / 65)
    controls.maxZoom = Math.max(70, camera.zoom * 2.5)
    camera.updateProjectionMatrix(); controls.update()
  }, [camera, controls, size.width, size.height, revision])
  useEffect(() => { if (jump) destination.current = new Vector3(jump.x, 2.1, jump.z) }, [jump])
  useFrame(({ clock }, delta) => {
    if (!controls) return
    if (destination.current) {
      const movement = destination.current.clone().sub(controls.target).multiplyScalar(1 - Math.exp(-delta * 7))
      controls.target.add(movement); camera.position.add(movement); controls.update()
      if (movement.length() < 0.005) destination.current = null
    }
    const x = controls.target.x, z = controls.target.z
    if (clock.elapsedTime - last.current.t > 0.15 && Math.hypot(x - last.current.x, z - last.current.z) > 2.2) { last.current = { x, z, t: clock.elapsedTime }; onFocus({ x, z }) }
  })
  return null
}

export function AfterUsScene({ tiles, config, overlay, focus, onFocus, cameraRevision, jump, dayClock }) {
  const lighting = useMemo(createLightingState, [])
  return <Canvas orthographic shadows={SHADOW_SETTINGS} dpr={[1, 1.6]} camera={{ position: [25, 21, 28], zoom: 20, near: 0.1, far: 190 }} gl={{ antialias: true, alpha: false }}>
    <color attach="background" args={[PALETTE.sky]} /><fog attach="fog" args={[PALETTE.sky, 53, 101]} />
    <Lighting config={config} dayClock={dayClock} lighting={lighting} />
    {tiles.map((entry) => {
      const distance = Math.hypot(entry.model.ox - focus.x, entry.model.oz - focus.z)
      return <District key={entry.model.key} entry={entry} detail={distance < CHUNK_SIZE * 0.86 ? 2 : distance < CHUNK_SIZE * 1.65 ? 1 : 0} config={config} overlay={overlay} lighting={lighting} />
    })}
    <OrbitControls makeDefault target={[0, 2.1, 0]} enableDamping dampingFactor={0.08} enablePan screenSpacePanning={false} minZoom={10} maxZoom={70} minPolarAngle={0.3} maxPolarAngle={Math.PI / 2.3} mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }} touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE }} />
    <Navigation revision={cameraRevision} jump={jump} focus={focus} onFocus={onFocus} />
  </Canvas>
}
