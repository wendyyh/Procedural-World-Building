import assert from 'node:assert/strict'
import { getEnvironmentField, sampleTerrain } from '../src/features/environment/terrainSampler.js'
import { createScatter } from '../src/features/environment/createScatter.js'
import { carvePathField, createPathSamples, DEFAULT_PATH_POINTS, nearestPathPoint } from '../src/features/environment/createPaths.js'
import { createFlowSampler, createInitialParticles } from '../src/features/environment/createFlowField.js'

const field = getEnvironmentField('environment-verification')
assert.equal(field.values.length, (field.resolution + 1) ** 2)
for (const [x, z] of [[0, 0], [-8, -8], [8, 8], [3.1, -2.7]]) {
  const terrain = sampleTerrain(field, x, z)
  assert.ok(Number.isFinite(terrain.height) && Number.isFinite(terrain.slope))
  assert.ok(terrain.slope >= 0 && terrain.slope <= 90)
}

const scatterConfig = {
  seed: 'scatter-check', distribution: 'clustered', clusterScale: 0.4,
  clusterThreshold: -0.08, maxSlope: 40, waterClearance: 0.035,
  layers: {
    trees: { enabled: true, count: 60 },
    rocks: { enabled: true, count: 30 },
    shrubs: { enabled: false, count: 40 },
  },
}
const firstScatter = createScatter(field, scatterConfig)
const repeatedScatter = createScatter(field, scatterConfig)
assert.deepEqual(firstScatter, repeatedScatter, 'scatter placement must be reproducible')
assert.equal(firstScatter.instances.shrubs.length, 0)
for (const instances of Object.values(firstScatter.instances)) {
  for (const instance of instances) {
    const sample = sampleTerrain(field, instance.x, instance.z)
    assert.ok(sample.slope <= scatterConfig.maxSlope + 1e-6)
    assert.ok(sample.value >= 0.34 + scatterConfig.waterClearance - 1e-6)
  }
}

const path = createPathSamples(DEFAULT_PATH_POINTS, 96)
assert.equal(path.length, 97)
assert.ok(nearestPathPoint(path[20].x, path[20].z, path).distance < 1e-6)
const river = carvePathField(field, path, { width: 0.7, depth: 0.6, kind: 'river' })
const road = carvePathField(field, path, { width: 0.7, depth: 0.6, kind: 'road' })
assert.ok(river.changed > 0 && road.changed > 0)
assert.ok(river.values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1))
assert.notDeepEqual(river.values, road.values)
assert.deepEqual(river.values, carvePathField(field, path, { width: 0.7, depth: 0.6, kind: 'river' }).values)

for (const mode of ['river', 'wind']) {
  const config = { seed: 'flow-check', mode, count: 40, turbulence: 0.65, pathWidth: 0.75 }
  const sampleFlow = createFlowSampler(config, path)
  const particles = createInitialParticles(config, path)
  assert.deepEqual(particles, createInitialParticles(config, path))
  assert.equal(particles.length, 40)
  for (const particle of particles) {
    const vector = sampleFlow(particle.x, particle.z)
    assert.ok(Number.isFinite(vector.x) && Number.isFinite(vector.z))
    assert.ok(Math.abs(Math.hypot(vector.x, vector.z) - 1) < 1e-6)
  }
}

console.log('Environment verification passed: terrain sampling, deterministic scattering, path deformation, and flow vectors.')
