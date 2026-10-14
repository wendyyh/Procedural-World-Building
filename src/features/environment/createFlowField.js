import { createNoise2D } from 'simplex-noise'
import { ENVIRONMENT_SIZE, randomFromSeed } from './terrainSampler.js'
import { nearestPathPoint } from './createPaths.js'

export function createFlowSampler(config, pathSamples) {
  const noise = createNoise2D(randomFromSeed(`${config.seed}:flow`))
  const edge = 0.035

  return (x, z) => {
    const frequency = 0.34
    const nx = x * frequency
    const nz = z * frequency
    const curlX = (noise(nx, nz + edge) - noise(nx, nz - edge)) / (2 * edge)
    const curlZ = -(noise(nx + edge, nz) - noise(nx - edge, nz)) / (2 * edge)
    let vx = 0.75 + curlX * config.turbulence * 0.48
    let vz = 0.2 + curlZ * config.turbulence * 0.48

    if (config.mode === 'river') {
      const nearest = nearestPathPoint(x, z, pathSamples)
      const start = pathSamples[nearest.segment]
      const end = pathSamples[nearest.segment + 1]
      const dx = end.x - start.x
      const dz = end.z - start.z
      const length = Math.hypot(dx, dz) || 1
      const towardX = nearest.x - x
      const towardZ = nearest.z - z
      vx = dx / length * 1.4 + towardX * 0.9 + curlX * config.turbulence * 0.08
      vz = dz / length * 1.4 + towardZ * 0.9 + curlZ * config.turbulence * 0.08
    }

    const magnitude = Math.hypot(vx, vz) || 1
    return { x: vx / magnitude, z: vz / magnitude }
  }
}

export function createInitialParticles(config, pathSamples) {
  const random = randomFromSeed(`${config.seed}:${config.mode}:particles`)
  return Array.from({ length: config.count }, () => {
    if (config.mode === 'river') {
      const index = Math.floor(random() * (pathSamples.length - 1))
      const point = pathSamples[index]
      return { x: point.x + (random() - 0.5) * config.pathWidth, z: point.z + (random() - 0.5) * config.pathWidth }
    }
    return { x: (random() - 0.5) * ENVIRONMENT_SIZE, z: (random() - 0.5) * ENVIRONMENT_SIZE }
  })
}
