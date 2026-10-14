import { getTerrainField } from '../terrain/generation/terrainFieldCache.js'

export const ENVIRONMENT_SIZE = 18
export const ENVIRONMENT_WATER = 0.34
export const ENVIRONMENT_RELIEF = 5.2

const clamp = (value, low, high) => Math.max(low, Math.min(high, value))

export function getEnvironmentField(seed) {
  return getTerrainField({
    seed,
    resolution: 80,
    frequency: 0.52,
    octaves: 5,
    persistence: 0.5,
    lacunarity: 2,
    shaping: 'linear',
    shapeAmount: 1,
    worldMode: 'bounded',
    erosionEnabled: true,
    erosionIterations: 6,
    erosionTalus: 0.025,
    erosionStrength: 0.22,
  })
}

export function sampleValue(field, x, z, size = ENVIRONMENT_SIZE) {
  const gridX = clamp((x / size + 0.5) * field.resolution, 0, field.resolution)
  const gridZ = clamp((z / size + 0.5) * field.resolution, 0, field.resolution)
  const x0 = Math.floor(gridX)
  const z0 = Math.floor(gridZ)
  const x1 = Math.min(field.resolution, x0 + 1)
  const z1 = Math.min(field.resolution, z0 + 1)
  const tx = gridX - x0
  const tz = gridZ - z0
  const top = field.values[z0 * field.side + x0] * (1 - tx) + field.values[z0 * field.side + x1] * tx
  const bottom = field.values[z1 * field.side + x0] * (1 - tx) + field.values[z1 * field.side + x1] * tx
  return top * (1 - tz) + bottom * tz
}

export function sampleTerrain(field, x, z, {
  size = ENVIRONMENT_SIZE,
  waterLevel = ENVIRONMENT_WATER,
  relief = ENVIRONMENT_RELIEF,
} = {}) {
  const value = sampleValue(field, x, z, size)
  const height = (value - waterLevel) * relief
  const delta = size / field.resolution
  const dx = ((sampleValue(field, x + delta, z, size) - sampleValue(field, x - delta, z, size)) * relief) / (2 * delta)
  const dz = ((sampleValue(field, x, z + delta, size) - sampleValue(field, x, z - delta, size)) * relief) / (2 * delta)
  const length = Math.hypot(dx, 1, dz)
  const normal = [-dx / length, 1 / length, -dz / length]
  const slope = Math.atan(Math.hypot(dx, dz)) * 180 / Math.PI
  return { value, height, normal, slope }
}

export function hashSeed(seed) {
  let hash = 2166136261
  for (const character of String(seed)) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function randomFromSeed(seed) {
  let state = hashSeed(seed)
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
