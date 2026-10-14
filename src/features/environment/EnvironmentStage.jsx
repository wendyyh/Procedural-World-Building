import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { TerrainMesh } from '../terrain/TerrainMesh.jsx'
import { ENVIRONMENT_RELIEF, ENVIRONMENT_SIZE, ENVIRONMENT_WATER } from './terrainSampler.js'

function StageContents({ field, children, wireframe = false }) {
  return (
    <>
      <color attach="background" args={['#07101a']} />
      <fog attach="fog" args={['#07101a', 20, 42]} />
      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#e2fff2', '#193324', 1.3]} />
      <directionalLight position={[8, 12, 7]} intensity={2.5} />
      <TerrainMesh
        field={field}
        size={ENVIRONMENT_SIZE}
        heightScale={ENVIRONMENT_RELIEF}
        waterLevel={ENVIRONMENT_WATER}
        wireframe={wireframe}
        surfaceMode="topographic"
        contours={false}
        contourInterval={0.08}
      />
      {children}
      <Grid
        position={[0, -ENVIRONMENT_WATER * ENVIRONMENT_RELIEF - 0.2, 0]}
        args={[28, 28]}
        cellSize={0.75}
        cellColor="#244759"
        sectionSize={3}
        sectionColor="#579d9a"
        fadeDistance={20}
        fadeStrength={1.4}
        infiniteGrid
      />
      <OrbitControls makeDefault target={[0, 0.4, 0]} enableDamping minDistance={7} maxDistance={32} maxPolarAngle={Math.PI / 2.05} />
    </>
  )
}

export function EnvironmentStage({ field, children, wireframe = false, label, cameraPosition = [12.5, 9.5, 14.5] }) {
  return (
    <section className="canvas-panel" aria-label={label}>
      <Canvas dpr={[1, 2]} camera={{ position: cameraPosition, fov: 42, near: 0.1, far: 100 }} gl={{ antialias: true, alpha: false }}>
        <StageContents field={field} wireframe={wireframe}>{children}</StageContents>
      </Canvas>
      <div className="canvas-help" aria-hidden="true"><span>Drag to orbit</span><span>Scroll to zoom</span></div>
    </section>
  )
}
