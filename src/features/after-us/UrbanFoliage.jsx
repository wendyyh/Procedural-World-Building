import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, DoubleSide, Object3D, Quaternion, Vector3 } from 'three'
import { clamp, plantGrowth } from './worldModel.js'
import { structureSupport } from './buildingModel.js'
import { foliageAsset, foliageColor } from './foliageGeometry.js'

function useSnapshotAnimation(snapshot, animation, apply) {
  const previous = useRef(-1)
  useLayoutEffect(() => { apply(snapshot); previous.current = -1 }, [snapshot, apply])
  useFrame(() => {
    if (!animation || previous.current === animation.current.tick) return
    apply(animation.current.snapshot); previous.current = animation.current.tick
  })
}

function PlantBatch({ plants, species, snapshot, config, detailed, animation }) {
  const ref = useRef(), dummy = useMemo(() => new Object3D(), [])
  const geometry = useMemo(() => foliageAsset(species, detailed), [species, detailed])
  const colors = useMemo(() => plants.map((plant) => foliageColor(species, plant.variation, config.humidity)), [plants, species, config.humidity])
  const apply = useCallback((current) => {
    let visible = 0
    plants.forEach((plant, i) => {
      const growth = plantGrowth(plant, plant.type, current, config)
      if (growth <= 0.025) return
      const reveal = clamp((growth - 0.025) / 0.16)
      let size = (0.5 + growth * 0.76) * (0.8 + plant.variation * 0.35) * reveal
      if (plant.type === 'shrubs') size *= 1.22
      if (plant.type === 'roof') size *= 0.72
      if (species === 'ivy') size *= 1.2
      dummy.position.set(plant.x, plant.y + 0.025, plant.z)
      // Local ivy faces +Z; keep its leaves outside the facade, aligned with
      // the host surface. Ground forms rotate only around their roots.
      dummy.rotation.set(0, species === 'ivy' ? (plant.facing ?? 0) : plant.rotation, 0)
      dummy.scale.setScalar(Math.max(0.0001, size)); dummy.updateMatrix()
      ref.current.setMatrixAt(visible, dummy.matrix); ref.current.setColorAt(visible, colors[i]); visible += 1
    })
    ref.current.count = visible
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [plants, species, config, dummy, colors])
  useSnapshotAnimation(snapshot, animation, apply)
  return <instancedMesh ref={ref} args={[geometry, null, plants.length]} frustumCulled={false} castShadow={detailed && species !== 'clover'} receiveShadow>
    <meshStandardMaterial vertexColors roughness={0.92} side={DoubleSide} />
  </instancedMesh>
}

function VineStems({ model, snapshot, animation }) {
  const ref = useRef(), dummy = useMemo(() => new Object3D(), [])
  const segments = useMemo(() => model.stems.flatMap((stem) => stem.path.slice(1).map((point, i) => {
    const from = new Vector3(...stem.path[i]), delta = new Vector3(...point).sub(from)
    return { from, delta, x: point[0], y: point[1], z: point[2], length: delta.length(), rotation: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), delta.clone().normalize()), progress: stem.hanging ? 0.28 + (i + 1) / 18 * 0.72 : (i + 1) / 18, building: stem.building, wallIndex: stem.wallIndices?.[i + 1], frameRib: stem.frameRib, frameProgress: (i + 1) / 18 * 0.9, roofIndex: stem.roofIndex, growthBias: stem.growthBias ?? 1 }
  })), [model])
  const apply = useCallback((current) => {
    segments.forEach((segment, i) => {
      const growth = (current.climbers.find((b) => b.id === segment.building)?.value || 0) * segment.growthBias
      const amount = structureSupport(segment, current) * (animation ? clamp((growth * 1.25 - segment.progress) * 18) : segment.progress < growth * 1.25 ? 1 : 0)
      dummy.position.copy(segment.from).addScaledVector(segment.delta, amount * 0.5); dummy.quaternion.copy(segment.rotation)
      dummy.scale.set(0.017, Math.max(0.0001, segment.length * amount), 0.017); dummy.updateMatrix(); ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [segments, dummy, animation])
  useSnapshotAnimation(snapshot, animation, apply)
  return <instancedMesh ref={ref} args={[null, null, segments.length]} frustumCulled={false}><cylinderGeometry args={[0.7, 1, 1, 5]} /><meshStandardMaterial color="#637345" roughness={1} /></instancedMesh>
}

function TreeBatch({ plants, species, snapshot, config, detailed, animation }) {
  const trunks = useRef(), crowns = useRef(), dummy = useMemo(() => new Object3D(), [])
  const geometry = useMemo(() => foliageAsset(species, detailed), [species, detailed])
  const colors = useMemo(() => plants.map((plant) => foliageColor(species, plant.variation, config.humidity)), [plants, species, config.humidity])
  const apply = useCallback((current) => {
    let visible = 0
    plants.forEach((plant, i) => {
      const growth = plantGrowth(plant, 'trees', current, config)
      if (growth <= 0.1) return
      const size = (0.7 + growth * 2.25) * (0.85 + plant.variation * 0.28) * clamp((growth - 0.1) / 0.2)
      dummy.position.set(plant.x, plant.y, plant.z); dummy.rotation.set(0, plant.rotation, 0)
      dummy.scale.setScalar(Math.max(0.0001, size)); dummy.updateMatrix()
      trunks.current.setMatrixAt(visible, dummy.matrix); crowns.current.setMatrixAt(visible, dummy.matrix)
      crowns.current.setColorAt(visible, colors[i]); visible += 1
    })
    trunks.current.count = visible; crowns.current.count = visible
    trunks.current.instanceMatrix.needsUpdate = true; crowns.current.instanceMatrix.needsUpdate = true
    if (crowns.current.instanceColor) crowns.current.instanceColor.needsUpdate = true
  }, [plants, config, dummy, colors])
  useSnapshotAnimation(snapshot, animation, apply)
  return <group>
    <instancedMesh ref={trunks} args={[geometry.wood, null, plants.length]} frustumCulled={false} castShadow={detailed}><meshStandardMaterial color={species === 'birch' ? '#b5b3a0' : '#84755e'} vertexColors roughness={1} /></instancedMesh>
    <instancedMesh ref={crowns} args={[geometry.leaves, null, plants.length]} frustumCulled={false} castShadow={detailed} receiveShadow><meshStandardMaterial vertexColors side={DoubleSide} roughness={0.94} /></instancedMesh>
  </group>
}

function Flowers({ plants, snapshot, config, animation }) {
  const flowers = useRef(), stems = useRef(), dummy = useMemo(() => new Object3D(), [])
  const apply = useCallback((current) => {
    plants.forEach((plant, i) => {
      const growth = plantGrowth(plant, 'flowers', current, config), reveal = clamp((growth - 0.12) / 0.2)
      for (let bloom = 0; bloom < 3; bloom += 1) {
        const angle = bloom * 2.399 + plant.rotation, x = plant.x + Math.cos(angle) * 0.1, z = plant.z + Math.sin(angle) * 0.1
        const height = (0.25 + growth * 0.32 + bloom * 0.06) * reveal, radius = Math.max(0.0001, (0.045 + plant.variation * 0.025) * reveal)
        dummy.position.set(x, plant.y + height, z); dummy.rotation.set(0, angle, 0)
        dummy.scale.set(radius, radius * 0.65, radius); dummy.updateMatrix(); flowers.current.setMatrixAt(i * 3 + bloom, dummy.matrix)
        dummy.position.set(x, plant.y + height / 2, z); dummy.scale.set(0.008 * reveal + 0.0001, Math.max(0.0001, height), 0.008 * reveal + 0.0001)
        dummy.updateMatrix(); stems.current.setMatrixAt(i * 3 + bloom, dummy.matrix)
      }
    })
    flowers.current.instanceMatrix.needsUpdate = true; stems.current.instanceMatrix.needsUpdate = true
  }, [plants, config, dummy])
  useSnapshotAnimation(snapshot, animation, apply)
  useLayoutEffect(() => {
    plants.forEach((plant, i) => {
      const color = new Color(plant.flowerColor || '#d3c9aa')
      for (let bloom = 0; bloom < 3; bloom += 1) flowers.current.setColorAt(i * 3 + bloom, color)
    })
    if (flowers.current.instanceColor) flowers.current.instanceColor.needsUpdate = true
  }, [plants])
  return <group>
    <instancedMesh ref={flowers} args={[null, null, plants.length * 3]} frustumCulled={false}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial roughness={0.9} /></instancedMesh>
    <instancedMesh ref={stems} args={[null, null, plants.length * 3]} frustumCulled={false}><cylinderGeometry args={[0.65, 1, 1, 4]} /><meshStandardMaterial color="#7c8b63" roughness={1} /></instancedMesh>
  </group>
}

export function UrbanFoliage({ model, snapshot, config, detailed, animation }) {
  const groups = useMemo(() => {
    const result = {}
    for (const type of ['pioneers', 'shrubs', 'vines', 'roof', 'trees']) model.candidates[type].forEach((plant, i) => {
      if (!detailed && type !== 'trees' && i % 3 !== 0) return
      const species = plant.species || (type === 'vines' ? 'ivy' : type === 'trees' ? 'broadleaf' : 'clover')
      ;(result[species] ||= []).push({ ...plant, type })
    })
    return result
  }, [model, detailed])
  return <group>
    {Object.entries(groups).map(([species, plants]) => ['broadleaf', 'birch', 'willow'].includes(species)
      ? <TreeBatch key={species} plants={plants} species={species} snapshot={snapshot} config={config} detailed={detailed} animation={animation} />
      : <PlantBatch key={species} plants={plants} species={species} snapshot={snapshot} config={config} detailed={detailed} animation={animation} />)}
    {detailed && <><VineStems model={model} snapshot={snapshot} animation={animation} /><Flowers plants={model.candidates.flowers} snapshot={snapshot} config={config} animation={animation} /></>}
  </group>
}
