import assert from 'node:assert/strict'
import { DEFAULT_BRANCH_CONFIG, createBranchModel, expandBranchGrammar, selectBranchLOD } from '../src/features/branching/createBranching.js'
import { WORLDLINE_STAGES, createWorldlineGraph, getWorldlineHistory } from '../src/features/worldlines/createWorldlines.js'

for (const form of ['tree', 'ivy']) {
  const config = { ...DEFAULT_BRANCH_CONFIG, form }
  const first = createBranchModel(config)
  const second = createBranchModel(config)
  assert.deepEqual(first, second, `${form} must be reproducible`)
  assert.notDeepEqual(first.segments, createBranchModel({ ...config, seed: 'another-seed' }).segments)
  assert.equal(first.segments.length, (form === 'tree' ? 6 : 4) ** config.iterations)
  assert.ok(first.segments.length < 6000)
  assert.ok(first.segments.every((segment) => segment.start.concat(segment.end).every(Number.isFinite)))
  assert.ok(first.segments.every((segment) => segment.radius > 0))
  const near = selectBranchLOD(first, 'near')
  const middle = selectBranchLOD(first, 'middle')
  const far = selectBranchLOD(first, 'far')
  assert.ok(near.segments.length > middle.segments.length)
  assert.ok(middle.segments.length > far.segments.length)
  assert.ok(near.leaves.length >= middle.leaves.length && middle.leaves.length >= far.leaves.length)
}
assert.throws(() => expandBranchGrammar({ form: 'tree', iterations: 5 }), /safe symbol limit/)

const world = createWorldlineGraph('tidal-atlas-04')
assert.equal(Object.keys(world).length, 2 ** (WORLDLINE_STAGES.length + 1) - 1)
assert.equal(Object.values(world).filter((node) => node.outcome).length, 2 ** WORLDLINE_STAGES.length)
assert.deepEqual(world, createWorldlineGraph('tidal-atlas-04'))
assert.notDeepEqual(world['01011'].state, createWorldlineGraph('another-seed')['01011'].state)
assert.equal(getWorldlineHistory(world, '01011').length, WORLDLINE_STAGES.length)
for (const node of Object.values(world)) {
  assert.ok(Object.values(node.state).every((value) => Number.isInteger(value) && value >= 0 && value <= 100))
  if (node.parent !== null) assert.ok(node.parent in world)
}

console.log('Branching verification passed: bounded grammar, deterministic geometry, LOD reduction, and reproducible world histories.')
