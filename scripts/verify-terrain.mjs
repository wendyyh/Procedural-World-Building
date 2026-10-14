import assert from 'node:assert/strict'
import { createNoiseField } from '../src/features/terrain/generation/createNoiseField.js'

const baseConfig = {
  seed: 'verification-seed',
  resolution: 32,
  frequency: 0.52,
  octaves: 5,
  persistence: 0.5,
  lacunarity: 2,
  shaping: 'linear',
  shapeAmount: 1,
  worldMode: 'streaming',
  erosionEnabled: true,
  erosionIterations: 6,
  erosionTalus: 0.025,
  erosionStrength: 0.24,
}

const first = createNoiseField({ ...baseConfig, originX: 0, originY: 0 })
const repeated = createNoiseField({ ...baseConfig, originX: 0, originY: 0 })
const east = createNoiseField({ ...baseConfig, originX: 1, originY: 0 })

assert.deepEqual(first.values, repeated.values, 'the same seed and parameters must be deterministic')
assert.equal(first.values.length, (baseConfig.resolution + 1) ** 2)
assert.ok(first.minimum >= 0 && first.maximum <= 1, 'simulated heights must stay normalized')
assert.ok(first.erosion.totalMoved > 0, 'erosion must move material')

for (let row = 0; row < first.side; row += 1) {
  const westEdge = first.values[row * first.side + first.resolution]
  const eastEdge = east.values[row * east.side]
  assert.ok(
    Math.abs(westEdge - eastEdge) < 1e-6,
    `streamed tile seam diverged at row ${row}`,
  )
}

console.log('Terrain verification passed: deterministic, normalized, eroded, and seam-safe.')
