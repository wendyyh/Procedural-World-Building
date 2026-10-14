import { createNoise2D } from 'simplex-noise'
import { simulateThermalErosion } from './simulateThermalErosion.js'

function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function hashSeed(seed) {
  const text = String(seed)
  let hash = 2166136261

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function mulberry32(initialSeed) {
  let seed = initialSeed

  return function random() {
    let value = seed += 0x6d2b79f5
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function sampleFbm(noise2D, x, y, octaves, persistence, lacunarity) {
  let value = 0
  let amplitude = 1
  let frequency = 1
  let amplitudeTotal = 0

  for (let octave = 0; octave < octaves; octave += 1) {
    value += noise2D(x * frequency, y * frequency) * amplitude
    amplitudeTotal += amplitude
    amplitude *= persistence
    frequency *= lacunarity
  }

  return value / amplitudeTotal
}

function shapeNoise(rawValue, normalizedValue, shaping, amount, gridX, gridY) {
  if (shaping === 'power') return Math.pow(normalizedValue, amount)
  if (shaping === 'ridged') return Math.pow(1 - Math.abs(rawValue), amount)

  if (shaping === 'terrace') {
    const steps = Math.max(2, Math.round(amount))
    return Math.round(normalizedValue * steps) / steps
  }

  if (shaping === 'island') {
    const distance = Math.hypot(gridX, gridY)
    const mask = 1 - smoothstep(0.2, 1, distance)
    return clamp01(normalizedValue * Math.pow(mask, amount) * 1.45)
  }

  return normalizedValue
}

export function createNoiseField({
  seed,
  resolution,
  frequency,
  octaves,
  persistence,
  lacunarity,
  shaping,
  shapeAmount,
  worldMode = 'bounded',
  originX = 0,
  originY = 0,
  erosionEnabled = false,
  erosionIterations = 0,
  erosionTalus = 0.025,
  erosionStrength = 0.24,
}) {
  const random = mulberry32(hashSeed(seed))
  const noise2D = createNoise2D(random)
  const side = resolution + 1
  const padding = worldMode === 'streaming' && erosionEnabled
    ? Math.max(0, Math.round(erosionIterations) + 2)
    : 0
  const paddedSide = side + padding * 2
  const sourceValues = new Float32Array(paddedSide * paddedSide)
  const effectiveShaping = worldMode === 'streaming' && shaping === 'island'
    ? 'linear'
    : shaping

  for (let row = 0; row < paddedSide; row += 1) {
    for (let column = 0; column < paddedSide; column += 1) {
      const index = row * paddedSide + column
      const localX = ((column - padding) / resolution - 0.5) * 2
      const localY = ((row - padding) / resolution - 0.5) * 2
      const worldX = localX + originX * 2
      const worldY = localY + originY * 2
      const rawValue = sampleFbm(
        noise2D,
        worldX / frequency,
        worldY / frequency,
        octaves,
        persistence,
        lacunarity,
      )
      const normalizedValue = clamp01(rawValue * 0.5 + 0.5)

      sourceValues[index] = clamp01(
        shapeNoise(
          rawValue,
          normalizedValue,
          effectiveShaping,
          shapeAmount,
          localX,
          localY,
        ),
      )
    }
  }

  const erosion = erosionEnabled
    ? simulateThermalErosion(sourceValues, paddedSide, {
      iterations: erosionIterations,
      talus: erosionTalus,
      strength: erosionStrength,
    })
    : { values: sourceValues, totalMoved: 0 }
  const values = new Float32Array(side * side)
  let minimum = 1
  let maximum = 0
  let total = 0

  for (let row = 0; row < side; row += 1) {
    for (let column = 0; column < side; column += 1) {
      const index = row * side + column
      const paddedIndex = (row + padding) * paddedSide + column + padding
      const value = erosion.values[paddedIndex]

      values[index] = value
      minimum = Math.min(minimum, value)
      maximum = Math.max(maximum, value)
      total += value
    }
  }

  return {
    values,
    resolution,
    side,
    minimum,
    maximum,
    mean: total / values.length,
    originX,
    originY,
    erosion: {
      enabled: erosionEnabled,
      iterations: erosionEnabled ? erosionIterations : 0,
      totalMoved: erosion.totalMoved,
      meanMoved: erosion.totalMoved / erosion.values.length,
    },
  }
}
