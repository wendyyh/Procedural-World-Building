import assert from 'node:assert/strict'
import { createVoxelWorld } from '../src/features/voxel/generation/createVoxelWorld.js'

const subtract = {
  enabled: true, operation: 'subtract', primitive: 'sphere',
  x: 0, y: 0.2, z: 4.6, radius: 2.7,
}
const union = {
  enabled: true, operation: 'union', primitive: 'sphere',
  x: 0, y: 0.2, z: 4.6, radius: 1.7,
}
const base = {
  seed: 'verification-stone', shape: 'ridged',
  frequency: 0.27, detail: 0.72, resolution: 12,
}

const first = createVoxelWorld({ ...base, modifiers: [subtract, union] })
const repeated = createVoxelWorld({ ...base, modifiers: [subtract, union] })
const reordered = createVoxelWorld({ ...base, modifiers: [union, subtract] })

assert.equal(first.stats.chunks, 4)
assert.equal(first.stats.cells, 4 * base.resolution ** 3)
assert.ok(first.stats.activeCells > 0 && first.stats.activeCells < first.stats.cells)
assert.ok(first.stats.triangles > 0)
assert.ok(first.stats.meshBytes > 0)
assert.equal(first.stats.triangles, repeated.stats.triangles, 'same inputs must produce the same topology')
assert.notEqual(first.stats.triangles, reordered.stats.triangles, 'CSG order must affect overlapping shapes')

for (let chunk = 0; chunk < first.chunks.length; chunk += 1) {
  assert.deepEqual(first.chunks[chunk].positions, repeated.chunks[chunk].positions)
  assert.deepEqual(first.chunks[chunk].colors, repeated.chunks[chunk].colors)
  assert.ok(first.chunks[chunk].positions.every(Number.isFinite))
}

function seamVertices(chunk, axis, coordinate) {
  const vertices = new Set()
  const positions = chunk.positions
  for (let offset = 0; offset < positions.length; offset += 3) {
    if (Math.abs(positions[offset + axis] - coordinate) > 1e-5) continue
    vertices.add(
      [positions[offset], positions[offset + 1], positions[offset + 2]]
        .map((value) => value.toFixed(4)).join(','),
    )
  }
  return [...vertices].sort()
}

assert.deepEqual(seamVertices(first.chunks[0], 0, 0), seamVertices(first.chunks[1], 0, 0), 'east/west surface seam')
assert.deepEqual(seamVertices(first.chunks[2], 0, 0), seamVertices(first.chunks[3], 0, 0), 'east/west surface seam')
assert.deepEqual(seamVertices(first.chunks[0], 2, 0), seamVertices(first.chunks[2], 2, 0), 'north/south surface seam')
assert.deepEqual(seamVertices(first.chunks[1], 2, 0), seamVertices(first.chunks[3], 2, 0), 'north/south surface seam')

console.log('Voxel verification passed: deterministic, order-sensitive, finite, and seam-safe.')
