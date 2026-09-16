import { useEffect, useMemo } from 'react'
import { Grid } from '@react-three/drei'
import * as THREE from 'three'
import { heightToRgb } from './generation/terrainColors.js'

export function TerrainMesh({ field, size, heightScale, waterLevel, wireframe }) {
  const geometry = useMemo(() => {
    const nextGeometry = new THREE.PlaneGeometry(
      size,
      size,
      field.resolution,
      field.resolution,
    )
    const positions = nextGeometry.attributes.position
    const colors = new Float32Array(positions.count * 3)

    for (let index = 0; index < positions.count; index += 1) {
      const value = field.values[index]
      const height = (value - waterLevel) * heightScale
      const [red, green, blue] = heightToRgb(value, waterLevel)

      positions.setZ(index, height)
      colors[index * 3] = red / 255
      colors[index * 3 + 1] = green / 255
      colors[index * 3 + 2] = blue / 255
    }

    positions.needsUpdate = true
    nextGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    nextGeometry.computeVertexNormals()
    nextGeometry.computeBoundingBox()
    nextGeometry.computeBoundingSphere()
    return nextGeometry
  }, [field, heightScale, size, waterLevel])

  useEffect(() => () => geometry.dispose(), [geometry])

  const gridHeight = -waterLevel * heightScale - 0.18

  return (
    <group>
      <mesh
        geometry={geometry}
        rotation-x={-Math.PI / 2}
        receiveShadow
      >
        <meshStandardMaterial
          vertexColors
          roughness={0.82}
          metalness={0.02}
          wireframe={wireframe}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position-y={0.025} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[size * 1.08, size * 1.08]} />
        <meshPhysicalMaterial
          color="#1c6c91"
          transparent
          opacity={0.42}
          roughness={0.2}
          metalness={0.08}
          depthWrite={false}
        />
      </mesh>

      <Grid
        position={[0, gridHeight, 0]}
        args={[size * 1.5, size * 1.5]}
        cellSize={size / field.resolution}
        cellThickness={0.45}
        cellColor="#244759"
        sectionSize={2}
        sectionThickness={0.9}
        sectionColor="#5ca7a7"
        fadeDistance={size * 0.95}
        fadeStrength={1.5}
        infiniteGrid
      />
    </group>
  )
}
