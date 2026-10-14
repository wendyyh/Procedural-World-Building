import assert from 'node:assert/strict'
import { createNoiseStudyField } from '../src/features/noise/createNoiseStudyField.js'

const base = {
  seed: 'verification-seed', source: 'simplex', resolution: 32,
  scale: 4.8, octaves: 4, falloff: 0.5, lacunarity: 2,
  shaping: 'linear', shapeAmount: 2.5,
}

const first = createNoiseStudyField(base)
const repeated = createNoiseStudyField(base)
const changedSeed = createNoiseStudyField({ ...base, seed: 'other-seed' })
assert.equal(first.values.length, 33 * 33)
assert.deepEqual(first.values, repeated.values, 'same seed and settings must reproduce the field')
assert.notDeepEqual(first.values, changedSeed.values, 'a new seed must change the field')

for (const source of ['simplex', 'cellular', 'white']) {
  for (const shaping of ['linear', 'ridged', 'billow', 'terrace', 'power']) {
    const field = createNoiseStudyField({ ...base, source, shaping })
    assert.equal(field.values.length, first.values.length)
    assert.ok(field.values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1), `${source}/${shaping} must stay normalized`)
  }
}

const lowerResolution = createNoiseStudyField({ ...base, resolution: 16 })
assert.equal(lowerResolution.values.length, 17 * 17)
console.log('Noise field verification passed: reproducibility, sources, shaping, normalization, and resolution.')
