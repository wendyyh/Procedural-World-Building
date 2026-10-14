import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { getTerrainField } from '../terrain/generation/terrainFieldCache.js'
import { TerrainMesh } from '../terrain/TerrainMesh.jsx'

const FIELD_CONFIG = {
  seed: 'surface-atlas-01',
  resolution: 112,
  frequency: 0.52,
  octaves: 5,
  persistence: 0.5,
  lacunarity: 2,
  shaping: 'island',
  shapeAmount: 1.35,
  worldMode: 'bounded',
  erosionEnabled: true,
  erosionIterations: 8,
  erosionTalus: 0.025,
  erosionStrength: 0.24,
}

const STRATEGIES = [
  {
    id: 'topographic',
    title: 'Topographic',
    stage: 'FRAGMENT',
    signal: 'Elevation',
    purpose: 'Turn a height field into water, shore, vegetation, rock, and snow bands.',
    mechanism: 'A normalized elevation attribute is interpolated across the terrain. Smooth transitions select a material color at each pixel.',
  },
  {
    id: 'elevation',
    title: 'Elevation ramp',
    stage: 'FRAGMENT',
    signal: 'Elevation',
    purpose: 'Read the underlying height data without the distraction of biome colors.',
    mechanism: 'The same elevation attribute becomes a continuous dark-to-light diagnostic ramp.',
  },
  {
    id: 'slope',
    title: 'Slope analysis',
    stage: 'FRAGMENT',
    signal: 'Surface normal',
    purpose: 'Reveal steep regions that could influence rock placement or traversal.',
    mechanism: 'The world-space normal is compared with the up direction; near-vertical faces receive the lighter color.',
  },
  {
    id: 'position',
    title: 'Position bands',
    stage: 'FRAGMENT',
    signal: 'World position',
    purpose: 'Make a spatial pattern continue across a surface rather than follow its vertex colors.',
    mechanism: 'World X and Z coordinates drive a smooth repeating color blend. The pattern stays anchored in scene space.',
  },
  {
    id: 'fresnel',
    title: 'View-angle edges',
    stage: 'FRAGMENT',
    signal: 'Normal + camera',
    purpose: 'Give silhouettes a responsive edge treatment as the viewer orbits.',
    mechanism: 'The shader compares the surface normal with the camera direction. Grazing angles receive a brighter rim.',
  },
  {
    id: 'shoreline',
    title: 'Shoreline band',
    stage: 'FRAGMENT',
    signal: 'Elevation + time',
    purpose: 'Connect a material effect to a world rule: where terrain meets the water level.',
    mechanism: 'Distance from the water threshold creates a pale contact band. A small animated wave varies its boundary.',
  },
  {
    id: 'ripple',
    title: 'Surface ripple',
    stage: 'VERTEX + FRAGMENT',
    signal: 'Position + time',
    purpose: 'Show how moving vertices changes the silhouette, not just the surface color.',
    mechanism: 'The vertex stage offsets a subdivided plane; the fragment stage colors the resulting wave. Terrain generation stays unchanged.',
  },
]

const RIPPLE_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uFrequency;
  varying float vWave;

  void main() {
    vec3 displaced = position;
    float wave = sin(position.x * uFrequency + uTime * 1.6)
      * cos(position.y * uFrequency * 0.72 - uTime * 1.1);
    displaced.z += wave * uAmplitude;
    vWave = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`

const RIPPLE_FRAGMENT_SHADER = `
  precision highp float;
  varying float vWave;

  void main() {
    float crest = smoothstep(-0.2, 0.85, vWave);
    vec3 deep = vec3(0.023, 0.149, 0.220);
    vec3 light = vec3(0.427, 0.894, 0.805);
    gl_FragColor = vec4(mix(deep, light, crest), 1.0);
  }
`

function RippleSurface({ options }) {
  const materialRef = useRef(null)
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uAmplitude: { value: options.rippleAmplitude },
    uFrequency: { value: options.rippleFrequency },
  }), [])

  useEffect(() => {
    const liveUniforms = materialRef.current?.uniforms ?? uniforms
    liveUniforms.uAmplitude.value = options.rippleAmplitude
    liveUniforms.uFrequency.value = options.rippleFrequency
    if (materialRef.current) materialRef.current.uniformsNeedUpdate = true
  }, [options.rippleAmplitude, options.rippleFrequency, uniforms])

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = options.animate ? clock.elapsedTime : 0
    }
  })

  return (
    <mesh rotation-x={-Math.PI / 2}>
      <planeGeometry args={[14, 14, 100, 100]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={RIPPLE_VERTEX_SHADER}
        fragmentShader={RIPPLE_FRAGMENT_SHADER}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function ShaderScene({ strategy, options, field }) {
  const isRipple = strategy === 'ripple'

  return (
    <>
      <color attach="background" args={['#07101a']} />
      <fog attach="fog" args={['#07101a', 22, 44]} />
      <ambientLight intensity={0.42} />
      <hemisphereLight args={['#d8f0ff', '#162018', 1.1]} />
      <directionalLight position={[8, 12, 7]} intensity={2.4} />

      {isRipple ? (
        <RippleSurface options={options} />
      ) : (
        <>
          <TerrainMesh
            field={field}
            size={18}
            heightScale={5.2}
            waterLevel={0.34}
            wireframe={false}
            surfaceMode={strategy}
            contours={false}
            contourInterval={0.08}
            studyOptions={options}
          />
          {strategy === 'shoreline' && (
            <mesh position={[0, 0.015, 0]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[18.4, 18.4]} />
              <meshPhysicalMaterial color="#235c75" transparent opacity={0.22} depthWrite={false} />
            </mesh>
          )}
        </>
      )}

      <Grid
        position={[0, isRipple ? -0.9 : -2.15, 0]}
        args={[35, 35]}
        cellSize={0.75}
        cellColor="#244759"
        sectionSize={3}
        sectionColor="#4c8f94"
        fadeDistance={30}
        fadeStrength={1.5}
        infiniteGrid
      />
      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        enableDamping
        minDistance={8}
        maxDistance={35}
        minPolarAngle={0.16}
        maxPolarAngle={Math.PI / 2.06}
      />
    </>
  )
}

function StudySlider({ label, value, min, max, step, onChange }) {
  const decimals = step < 0.01 ? 3 : 2
  return (
    <label className="shader-slider">
      <span>{label}<output>{Number(value).toFixed(decimals)}</output></span>
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

export function ShaderLab() {
  const [strategy, setStrategy] = useState('topographic')
  const [options, setOptions] = useState(() => ({
    bandScale: 0.75,
    edgeStrength: 1.3,
    shoreWidth: 0.045,
    rippleAmplitude: 0.65,
    rippleFrequency: 1.35,
    animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }))
  const field = useMemo(() => getTerrainField(FIELD_CONFIG), [])
  const active = STRATEGIES.find((item) => item.id === strategy)
  const setOption = (key, value) => setOptions((current) => ({ ...current, [key]: value }))

  return (
    <main className="app-shell shader-lab-shell">
      <header className="masthead">
        <p className="eyebrow">EXPERIMENT 07 / VISUAL SYSTEMS</p>
        <h1>Shader Lab</h1>
        <p className="intro">One generated field, six ways to read it, and a separate vertex-ripple test. Switch strategies to see how data, viewpoint, and time shape the world’s visual language.</p>
      </header>

      <section className="canvas-panel shader-canvas" aria-label="Interactive shader study viewport">
        <Suspense fallback={<div className="loading">Preparing surface…</div>}>
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [12.5, 9.5, 14.5], fov: 42, near: 0.1, far: 100 }}
            gl={{ antialias: true, alpha: false }}
          >
            <ShaderScene strategy={strategy} options={options} field={field} />
          </Canvas>
        </Suspense>
        <div className="terrain-readout shader-readout" aria-live="polite">
          <span className="readout-label">{active.stage} / {active.signal}</span>
          <strong>{active.title}</strong>
          <span>Drag to orbit · Scroll to zoom</span>
        </div>
        <div className="canvas-help" aria-hidden="true"><span>Same field, different visual rule</span></div>
      </section>

      <aside className="control-panel shader-panel" aria-label="Shader strategy controls">
        <section className="shader-strategy-section">
          <p className="panel-kicker">Choose a strategy</p>
          <h2>Surface studies</h2>
          <div className="shader-strategy-list">
            {STRATEGIES.map((item, index) => (
              <button
                type="button"
                className="shader-strategy"
                aria-pressed={strategy === item.id}
                onClick={() => setStrategy(item.id)}
                key={item.id}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{item.title}</strong>
                <small>{item.stage}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="shader-explanation" aria-live="polite">
          <p className="panel-kicker">Why this matters</p>
          <h2>{active.title}</h2>
          <p>{active.purpose}</p>
          <p className="shader-mechanism">{active.mechanism}</p>
        </section>

        {(strategy === 'position' || strategy === 'fresnel' || strategy === 'shoreline' || strategy === 'ripple') && (
          <section className="shader-tuning">
            <h2>Live parameters</h2>
            {strategy === 'position' && <StudySlider label="Band density" value={options.bandScale} min={0.2} max={2} step={0.05} onChange={(value) => setOption('bandScale', value)} />}
            {strategy === 'fresnel' && <StudySlider label="Edge strength" value={options.edgeStrength} min={0} max={2.5} step={0.05} onChange={(value) => setOption('edgeStrength', value)} />}
            {strategy === 'shoreline' && <StudySlider label="Contact width" value={options.shoreWidth} min={0.015} max={0.12} step={0.005} onChange={(value) => setOption('shoreWidth', value)} />}
            {strategy === 'ripple' && (
              <>
                <StudySlider label="Wave height" value={options.rippleAmplitude} min={0} max={1.3} step={0.05} onChange={(value) => setOption('rippleAmplitude', value)} />
                <StudySlider label="Wave frequency" value={options.rippleFrequency} min={0.4} max={2.5} step={0.05} onChange={(value) => setOption('rippleFrequency', value)} />
              </>
            )}
            {(strategy === 'shoreline' || strategy === 'ripple') && (
              <label className="shader-motion-toggle">
                <span>Animate surface</span>
                <input type="checkbox" checked={options.animate} onChange={(event) => setOption('animate', event.target.checked)} />
              </label>
            )}
          </section>
        )}

        <p className="shader-footnote">These studies are material experiments. The unified customizable world is still being developed.</p>
      </aside>
    </main>
  )
}
