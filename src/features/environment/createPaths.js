import { CatmullRomCurve3, Vector3 } from 'three'
import { ENVIRONMENT_RELIEF, ENVIRONMENT_SIZE, sampleValue } from './terrainSampler.js'

export const DEFAULT_PATH_POINTS = [
  { x: 0.08, z: 0.80 },
  { x: 0.23, z: 0.67 },
  { x: 0.37, z: 0.55 },
  { x: 0.53, z: 0.53 },
  { x: 0.69, z: 0.35 },
  { x: 0.91, z: 0.16 },
]

export const DEFAULT_PATH_CONFIG = {
  seed: 'watershed-03',
  kind: 'river',
  width: 0.7,
  depth: 0.6,
  points: DEFAULT_PATH_POINTS,
}

const clamp01 = (value) => Math.max(0, Math.min(1, value))

export function createPathSamples(points, count = 144) {
  const curve = new CatmullRomCurve3(points.map(({ x, z }) => new Vector3(
    (x - 0.5) * ENVIRONMENT_SIZE,
    0,
    (z - 0.5) * ENVIRONMENT_SIZE,
  )), false, 'centripetal')
  return Array.from({ length: count + 1 }, (_, index) => {
    const point = curve.getPoint(index / count)
    return { x: point.x, z: point.z }
  })
}

export function nearestPathPoint(x, z, samples) {
  let bestDistanceSquared = Infinity
  let bestX = 0
  let bestZ = 0
  let bestSegment = 0
  let bestT = 0

  for (let index = 0; index < samples.length - 1; index += 1) {
    const start = samples[index]
    const end = samples[index + 1]
    const dx = end.x - start.x
    const dz = end.z - start.z
    const lengthSquared = dx * dx + dz * dz
    const t = lengthSquared > 0 ? clamp01(((x - start.x) * dx + (z - start.z) * dz) / lengthSquared) : 0
    const nearestX = start.x + dx * t
    const nearestZ = start.z + dz * t
    const distanceSquared = (x - nearestX) ** 2 + (z - nearestZ) ** 2
    if (distanceSquared < bestDistanceSquared) {
      bestDistanceSquared = distanceSquared
      bestX = nearestX
      bestZ = nearestZ
      bestSegment = index
      bestT = t
    }
  }
  return { distance: Math.sqrt(bestDistanceSquared), x: bestX, z: bestZ, segment: bestSegment, t: bestT }
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

export function carvePathField(field, samples, { width, depth, kind }) {
  const values = new Float32Array(field.values.length)
  let changed = 0
  let minimum = 1
  let maximum = 0
  let total = 0

  for (let row = 0; row < field.side; row += 1) {
    for (let column = 0; column < field.side; column += 1) {
      const index = row * field.side + column
      const x = (column / field.resolution - 0.5) * ENVIRONMENT_SIZE
      const z = (row / field.resolution - 0.5) * ENVIRONMENT_SIZE
      const nearest = nearestPathPoint(x, z, samples)
      const blend = 1 - smoothstep(width * 0.45, width * 1.35, nearest.distance)
      const centerValue = sampleValue(field, nearest.x, nearest.z)
      const target = kind === 'river' ? centerValue - depth / ENVIRONMENT_RELIEF : centerValue
      const value = clamp01(field.values[index] * (1 - blend) + target * blend)
      values[index] = value
      if (Math.abs(value - field.values[index]) > 0.001) changed += 1
      minimum = Math.min(minimum, value)
      maximum = Math.max(maximum, value)
      total += value
    }
  }

  return { ...field, values, minimum, maximum, mean: total / values.length, changed }
}
