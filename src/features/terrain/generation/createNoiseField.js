import { createNoise2D } from 'simplex-noise'

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
}) {
  const random = mulberry32(hashSeed(seed))
  const noise2D = createNoise2D(random)
  const side = resolution + 1
  const values = new Float32Array(side * side)
  let minimum = 1
  let maximum = 0
  let total = 0

  for (let row = 0; row < side; row += 1) {
    for (let column = 0; column < side; column += 1) {
      const index = row * side + column
      const gridX = (column / resolution - 0.5) * 2
      const gridY = (row / resolution - 0.5) * 2
      const rawValue = sampleFbm(
        noise2D,
        gridX / frequency,
        gridY / frequency,
        octaves,
        persistence,
        lacunarity,
      )
      const normalizedValue = clamp01(rawValue * 0.5 + 0.5)
      const value = clamp01(
        shapeNoise(rawValue, normalizedValue, shaping, shapeAmount, gridX, gridY),
      )

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
  }
}
