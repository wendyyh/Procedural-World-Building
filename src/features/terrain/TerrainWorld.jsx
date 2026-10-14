import { Grid } from '@react-three/drei'
import { TerrainMesh } from './TerrainMesh.jsx'

export function TerrainWorld({
  chunks,
  activeChunk,
  config,
  wireframe,
  contours,
}) {
  const streaming = config.worldMode === 'streaming'
  const worldSpan = streaming ? config.size * 3.2 : config.size * 1.08
  const centerX = streaming ? activeChunk.x * config.size : 0
  const centerZ = streaming ? activeChunk.z * config.size : 0
  const gridHeight = -config.waterLevel * config.heightScale - 0.18

  return (
    <group>
      {chunks.map((chunk) => (
        <TerrainMesh
          key={`${chunk.x}:${chunk.z}`}
          field={chunk.field}
          size={config.size}
          heightScale={config.heightScale}
          waterLevel={config.waterLevel}
          wireframe={wireframe}
          surfaceMode={config.surfaceMode}
          contours={contours}
          contourInterval={config.contourInterval}
          position={[chunk.x * config.size, 0, chunk.z * config.size]}
        />
      ))}

      <mesh position={[centerX, 0.025, centerZ]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[worldSpan, worldSpan]} />
        <meshPhysicalMaterial
          color="#1c6c91"
          transparent
          opacity={0.38}
          roughness={0.2}
          metalness={0.08}
          depthWrite={false}
        />
      </mesh>

      <Grid
        position={[centerX, gridHeight, centerZ]}
        args={[worldSpan, worldSpan]}
        cellSize={config.size / chunks[0].field.resolution}
        cellThickness={0.42}
        cellColor="#244759"
        sectionSize={2}
        sectionThickness={0.85}
        sectionColor="#5ca7a7"
        fadeDistance={worldSpan * 0.62}
        fadeStrength={1.4}
        infiniteGrid
      />
    </group>
  )
}
