import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Object3D } from 'three'
import { sampleDebrisFall } from './decayMotion.js'

function surfaceColor(part, overlay, sunlight) {
  if (overlay === 'impact') return { roof: '#c8b78a', floor: '#abae94', rubbleMound: '#b49b7c', spall: '#b5a88e' }[part.kind] || '#a9a99a'
  if (overlay === 'light') return new Color('#a4a6a0').lerp(new Color('#ead6a2'), part.kind === 'roof' ? sunlight : sunlight * 0.15)
  return new Color(part.color)
}

export function ArchitectureSurfaces({ parts, overlay, config, shadows = true, transparent = false }) {
  const geometry = useMemo(() => {
    const vertices = [], colors = []
    for (const part of parts) {
      const color = new Color(surfaceColor(part, overlay, config.sunlight))
      vertices.push(...part.vertices)
      for (let i = 0; i < part.vertices.length / 3; i += 1) {
        const fleck = 0.97 + ((i * 7 + (part.building || 0) * 3) % 9) * 0.007
        colors.push(color.r * fleck, color.g * fleck, color.b * fleck)
      }
    }
    const result = new BufferGeometry()
    result.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3))
    result.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3)); result.computeVertexNormals()
    return result
  }, [parts, overlay, config.sunlight])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} castShadow={shadows && !transparent} receiveShadow={!transparent}><meshStandardMaterial vertexColors side={DoubleSide} roughness={transparent ? 0.5 : 1} transparent={transparent} opacity={transparent ? 0.24 : 1} depthWrite={!transparent} /></mesh>
}

function fragmentGeometry() {
  const vertices = [], n = 6
  const bottom = Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [Math.cos(a) * (i % 2 ? 0.43 : 0.5), -0.5, Math.sin(a) * 0.5] })
  const top = bottom.map(([x, , z], i) => [x * (i % 2 ? 0.7 : 0.85) + 0.045, i % 3 ? 0.5 : 0.23, z * 0.72 - 0.035])
  const triangle = (a, b, c) => vertices.push(...a, ...b, ...c)
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n
    triangle([0, -0.5, 0], bottom[i], bottom[j]); triangle([0, 0.43, 0], top[j], top[i])
    triangle(bottom[i], top[i], bottom[j]); triangle(bottom[j], top[i], top[j])
  }
  const result = new BufferGeometry(); result.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3)); result.computeVertexNormals()
  return result
}

export function DebrisInstances({ parts, year, overlay, config, detailed }) {
  const mesh = useRef(), previous = useRef(null), falling = useRef(new Map()), started = useRef(0)
  const geometry = useMemo(fragmentGeometry, []), dummy = useMemo(() => new Object3D(), [])
  const reducedMotion = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  const apply = (progress) => {
    if (!mesh.current) return
    parts.forEach((part, i) => {
      const falls = falling.current.has(part.id), motion = sampleDebrisFall(part, falls ? progress : 1.1, (i % 7) * 0.022)
      dummy.position.set(...motion.position)
      dummy.rotation.set(motion.remaining * Math.sin(i) * 1.4, part.rotation[1] + motion.remaining * 2.2, motion.remaining * Math.cos(i) * 1.2)
      dummy.scale.set(...part.size); dummy.updateMatrix(); mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  }
  useLayoutEffect(() => {
    const old = previous.current
    falling.current = detailed && !reducedMotion && old && year > old.year ? new Map(parts.filter((part) => !old.ids.has(part.id)).map((part) => [part.id, true])) : new Map()
    started.current = performance.now(); previous.current = { ids: new Set(parts.map((part) => part.id)), year }
    apply(falling.current.size ? 0 : 1)
  }, [parts, year, detailed, reducedMotion])
  useLayoutEffect(() => {
    parts.forEach((part, i) => mesh.current.setColorAt(i, new Color(surfaceColor({ ...part, kind: 'rubbleMound' }, overlay, config.sunlight))))
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  }, [parts, overlay, config.sunlight])
  useFrame(() => {
    if (!falling.current.size) return
    const progress = (performance.now() - started.current) / 900
    apply(progress)
    if (progress >= 1.1) { apply(1.1); falling.current.clear() }
  })
  return <instancedMesh ref={mesh} args={[geometry, null, parts.length]} frustumCulled={false} castShadow={detailed} receiveShadow><meshStandardMaterial roughness={1} side={DoubleSide} /></instancedMesh>
}
