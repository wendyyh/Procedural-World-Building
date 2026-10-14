import { createNoiseField } from './createNoiseField.js'

const CACHE_LIMIT = 48
const cache = new Map()

function createCacheKey(config) {
  return JSON.stringify([
    config.seed,
    config.resolution,
    config.frequency,
    config.octaves,
    config.persistence,
    config.lacunarity,
    config.shaping,
    config.shapeAmount,
    config.worldMode,
    config.originX ?? 0,
    config.originY ?? 0,
    config.erosionEnabled,
    config.erosionIterations,
    config.erosionTalus,
    config.erosionStrength,
  ])
}

export function getTerrainField(config) {
  const key = createCacheKey(config)
  const cached = cache.get(key)

  if (cached) {
    cache.delete(key)
    cache.set(key, cached)
    return cached
  }

  const field = createNoiseField(config)
  cache.set(key, field)

  if (cache.size > CACHE_LIMIT) {
    cache.delete(cache.keys().next().value)
  }

  return field
}
