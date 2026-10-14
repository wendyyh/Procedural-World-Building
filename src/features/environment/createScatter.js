import { createNoise2D } from 'simplex-noise'
import { ENVIRONMENT_SIZE, ENVIRONMENT_WATER, randomFromSeed, sampleTerrain } from './terrainSampler.js'

export const SCATTER_LAYERS = {
  trees: { label: 'Trees', color: '#77b885', baseSlope: 30, baseClearance: 0.04 },
  rocks: { label: 'Rocks', color: '#b7b4a3', baseSlope: 57, baseClearance: 0.015 },
  shrubs: { label: 'Shrubs', color: '#a8cb73', baseSlope: 38, baseClearance: 0.03 },
}

export function createScatter(field, config) {
  const result = {}
  const stats = {}
  const distributionRandom = randomFromSeed(`${config.seed}:distribution`)
  const noise = createNoise2D(distributionRandom)

  for (const [kind, layer] of Object.entries(SCATTER_LAYERS)) {
    const random = randomFromSeed(`${config.seed}:${kind}`)
    const wanted = config.layers[kind].enabled ? config.layers[kind].count : 0
    const instances = []
    let attempted = 0
    let rejectedWater = 0
    let rejectedSlope = 0
    let rejectedMask = 0
    const maxAttempts = wanted * 12

    while (instances.length < wanted && attempted < maxAttempts) {
      attempted += 1
      const x = (random() - 0.5) * ENVIRONMENT_SIZE * 0.94
      const z = (random() - 0.5) * ENVIRONMENT_SIZE * 0.94
      const terrain = sampleTerrain(field, x, z)
      if (terrain.value < ENVIRONMENT_WATER + Math.max(layer.baseClearance, config.waterClearance)) {
        rejectedWater += 1
        continue
      }
      if (terrain.slope > Math.min(layer.baseSlope, config.maxSlope)) {
        rejectedSlope += 1
        continue
      }
      if (config.distribution === 'clustered') {
        const cluster = noise(x * config.clusterScale, z * config.clusterScale)
        if (cluster < config.clusterThreshold) {
          rejectedMask += 1
          continue
        }
      }
      instances.push({
        x,
        y: terrain.height,
        z,
        normal: terrain.normal,
        yaw: random() * Math.PI * 2,
        scale: 0.72 + random() * 0.58,
        value: terrain.value,
        colorVariant: random(),
      })
    }
    result[kind] = instances
    stats[kind] = { placed: instances.length, attempted, rejectedWater, rejectedSlope, rejectedMask }
  }

  return { instances: result, stats }
}
