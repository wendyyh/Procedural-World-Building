import assert from 'node:assert/strict'
import { parsePreset, validatePreset } from '../src/features/presets/presetSchema.js'

const terrain = {
  seed: 'archipelago-01', resolution: 64, size: 18, frequency: 0.52,
  octaves: 5, persistence: 0.5, lacunarity: 2, shaping: 'island',
  shapeAmount: 1.35, heightScale: 5.2, waterLevel: 0.34,
  worldMode: 'bounded', erosionEnabled: true, erosionIterations: 8,
  erosionTalus: 0.025, erosionStrength: 0.24, surfaceMode: 'topographic',
  contourInterval: 0.08,
}

const voxel = {
  seed: 'stone-atlas-04', shape: 'ridged', frequency: 0.27, detail: 0.72,
  resolution: 18, modifiers: [{
    id: 1, enabled: true, operation: 'subtract', primitive: 'sphere',
    x: 0, y: 0.2, z: 4.6, radius: 2.7,
  }],
}

const terrainSave = validatePreset('terrain', '  Coast study  ', { ...terrain, injected: true }, { wireframe: false, contours: true })
assert.equal(terrainSave.name, 'Coast study')
assert.equal(terrainSave.config.injected, undefined)
assert.deepEqual(parsePreset({ ...terrainSave, schemaVersion: 1 }, 'terrain'), terrainSave)

const voxelSave = validatePreset('voxel', 'Stone study', voxel, { wireframe: true, showChunks: false, sliceLevel: 0 })
assert.deepEqual(parsePreset({ ...voxelSave, schemaVersion: 1 }, 'voxel'), voxelSave)
assert.notEqual(voxelSave.config.modifiers[0], voxel.modifiers[0])

assert.throws(() => validatePreset('terrain', 'Bad resolution', { ...terrain, resolution: 10000 }, { wireframe: false, contours: true }))
assert.throws(() => validatePreset('voxel', 'Too many tools', { ...voxel, modifiers: Array(4).fill(voxel.modifiers[0]) }, { wireframe: false, showChunks: false, sliceLevel: 0 }))
assert.throws(() => parsePreset({ ...terrainSave, schemaVersion: 2 }, 'terrain'))
assert.throws(() => parsePreset({ ...terrainSave, schemaVersion: 1 }, 'voxel'))

console.log('Preset schema checks passed.')
