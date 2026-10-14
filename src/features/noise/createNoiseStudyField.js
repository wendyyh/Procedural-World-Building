import { createNoise2D } from 'simplex-noise'

const clamp01 = (value) => Math.max(0, Math.min(1, value))

function hashSeed(seed) {
  let hash = 2166136261
  for (const character of String(seed)) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(initialSeed) {
  let state = initialSeed
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function hashCell(x, y, seed) {
  let value = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed
  value = Math.imul(value ^ (value >>> 13), 1274126177)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296
}

function cellular(x, y, seed) {
  const cellX = Math.floor(x)
  const cellY = Math.floor(y)
  let nearest = Infinity
  for (let row = -1; row <= 1; row += 1) {
    for (let column = -1; column <= 1; column += 1) {
      const pointX = cellX + column + hashCell(cellX + column, cellY + row, seed)
      const pointY = cellY + row + hashCell(cellX + column, cellY + row, seed ^ 0x9e3779b9)
      nearest = Math.min(nearest, Math.hypot(pointX - x, pointY - y))
    }
  }
  return clamp01(nearest / 1.15) * 2 - 1
}

function shape(value, mode, amount) {
  const normalized = clamp01(value * 0.5 + 0.5)
  if (mode === 'ridged') return clamp01(Math.pow(1 - Math.abs(value), amount))
  if (mode === 'billow') return clamp01(Math.pow(Math.abs(value), amount))
  if (mode === 'terrace') {
    const steps = Math.max(2, Math.round(amount))
    return Math.round(normalized * steps) / steps
  }
  if (mode === 'power') return Math.pow(normalized, amount)
  return normalized
}

export function createNoiseStudyField(config) {
  const {
    seed, source, resolution, scale, octaves, falloff, lacunarity, shaping, shapeAmount,
  } = config
  const seedNumber = hashSeed(seed)
  const simplex = createNoise2D(mulberry32(seedNumber))
  const side = resolution + 1
  const values = new Float32Array(side * side)
  let minimum = 1
  let maximum = 0
  let total = 0

  for (let row = 0; row < side; row += 1) {
    for (let column = 0; column < side; column += 1) {
      const x = (column / resolution - 0.5) * scale
      const y = (row / resolution - 0.5) * scale
      let raw = 0
      if (source === 'white') {
        raw = hashCell(column, row, seedNumber) * 2 - 1
      } else {
        let amplitude = 1
        let frequency = 1
        let totalAmplitude = 0
        for (let octave = 0; octave < octaves; octave += 1) {
          const sample = source === 'cellular'
            ? cellular(x * frequency, y * frequency, seedNumber)
            : simplex(x * frequency, y * frequency)
          raw += sample * amplitude
          totalAmplitude += amplitude
          amplitude *= falloff
          frequency *= lacunarity
        }
        raw /= totalAmplitude
      }
      const value = shape(raw, shaping, shapeAmount)
      values[row * side + column] = value
      minimum = Math.min(minimum, value)
      maximum = Math.max(maximum, value)
      total += value
    }
  }

  return { values, resolution, side, minimum, maximum, mean: total / values.length }
}
