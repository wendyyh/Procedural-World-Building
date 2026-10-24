import { Line } from '@react-three/drei'
import { terrainAt } from './worldModel.js'
import { SEEDS } from './plantedEcology.js'

function Outline({ x, z, width, depth, y, color, dashed = false }) {
  return <Line points={[[x - width / 2, y, z - depth / 2], [x + width / 2, y, z - depth / 2], [x + width / 2, y, z + depth / 2], [x - width / 2, y, z + depth / 2], [x - width / 2, y, z - depth / 2]]} color={color} lineWidth={1.5} dashed={dashed} dashSize={0.35} gapSize={0.2} raycast={() => null} />
}

export function BuilderInteraction({ model, editor }) {
  if (!model) return null
  const { mode, hover, ghost, invalid, selectedId, onHover, onAction } = editor
  const ground = (x, z) => terrainAt(model.ox + x, model.oz + z, model.seed)
  const interactive = mode !== 'explore'
  const handlers = (building, seed) => interactive ? {
    onPointerMove: (event) => { event.stopPropagation(); onHover({ x: event.point.x - model.ox, z: event.point.z - model.oz, buildingId: building?.authoredId, seedId: seed?.id }) },
    onClick: (event) => { event.stopPropagation(); if (event.delta <= 5 && event.button === 0) onAction({ x: event.point.x - model.ox, z: event.point.z - model.oz, buildingId: building?.authoredId, seedId: seed?.id }) },
  } : {}
  const selected = model.buildings.find((b) => b.authoredId === selectedId)
  const validColor = invalid ? '#b87964' : '#648967'
  return <group position={[model.ox, 0, model.oz]}>
    <Outline x={0} z={0} width={19} depth={19} y={0.65} color="#8b977d" dashed />
    {['build', 'move'].includes(mode) && <gridHelper args={[18, 18, '#a3ab8a', '#bbbba0']} position={[0, 0.6, 0]} material-transparent material-opacity={0.22} raycast={() => null} />}
    {interactive && <mesh position={[0, 0.68, 0]} rotation={[-Math.PI / 2, 0, 0]} {...handlers()}><planeGeometry args={[24, 24]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>}
    {model.buildings.map((b) => <mesh key={b.authoredId} position={[b.x, b.base + b.height / 2, b.z]} {...handlers(b)}>
      <boxGeometry args={[b.width + 0.1, b.height + 0.2, b.depth + 0.1]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>)}
    {selected && <Outline x={selected.x} z={selected.z} width={selected.width + 0.35} depth={selected.depth + 0.35} y={selected.base + 0.07} color="#497a61" />}
    {model.plantedSeeds.map((p) => {
      const host = model.buildings.find((b) => b.authoredId === p.buildingId)
      const x = host ? host.x : p.x, z = host ? host.z + host.depth / 2 + 0.3 : p.z, y = ground(x, z)
      return <group key={p.id} position={[x, y + 0.1, z]}>
        <mesh position={[0, 0.18, 0]} {...handlers(undefined, p)}><sphereGeometry args={[0.18, 10, 8]} /><meshStandardMaterial color={selectedId === p.id ? '#f4c37b' : SEEDS[p.kind].color} emissive={selectedId === p.id ? '#78633f' : '#000000'} /></mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}><ringGeometry args={[0.24, 0.29, 28]} /><meshBasicMaterial color={selectedId === p.id ? '#d2a05b' : '#faf2d8'} transparent opacity={0.85} /></mesh>
      </group>
    })}
    {hover && ghost && <group>
      <mesh position={[ghost.x, ground(ghost.x, ghost.z) + (ghost.height ?? ghost.floors * 1.95) / 2 + 0.12, ghost.z]} raycast={() => null}>
        <boxGeometry args={[ghost.width, ghost.height ?? ghost.floors * 1.95, ghost.depth]} /><meshStandardMaterial color={validColor} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <Outline x={ghost.x} z={ghost.z} width={ghost.width} depth={ghost.depth} y={ground(ghost.x, ghost.z) + 0.16} color={validColor} />
    </group>}
    {hover && mode === 'plant' && <mesh position={[hover.x, ground(hover.x, hover.z) + 0.15, hover.z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <ringGeometry args={[0.45, 0.52, 36]} /><meshBasicMaterial color={validColor} transparent opacity={0.9} />
    </mesh>}
  </group>
}
