import { advanceWorld, createDistrict, districtKey, requestedDistricts } from './worldModel.js'
import { buildingSignature } from './buildingModel.js'

const geometry = new Map()
const snapshots = new Map()
let view = null
let queue = []
let scheduled = false

function trim(map, limit) { while (map.size > limit) map.delete(map.keys().next().value) }
function tick() {
  scheduled = false
  const job = queue.shift()
  if (!job || !view) return
  const current = view
  const key = districtKey(job.x, job.z)
  const start = performance.now()
  const geometryKey = `${current.generation}/${key}`
  let model = geometry.get(geometryKey)
  if (!model) { model = createDistrict(current.seed, job.x, job.z, current.config); geometry.set(geometryKey, model); trim(geometry, 48) }
  else { geometry.delete(geometryKey); geometry.set(geometryKey, model) }
  const snapshotKey = `${key}/${current.signature}`
  let snapshot = snapshots.get(snapshotKey)
  if (!snapshot) { snapshot = advanceWorld(model, current.config, current.year); snapshots.set(snapshotKey, snapshot); trim(snapshots, 80) }
  self.postMessage({ type: 'district', epoch: current.epoch, key, x: job.x, z: job.z, model: current.known.includes(key) ? undefined : model, snapshot, computeMs: performance.now() - start, cachedDistricts: geometry.size, cachedSnapshots: snapshots.size })
  if (queue.length) { scheduled = true; setTimeout(tick, 0) }
}

self.onmessage = ({ data }) => {
  if (data.type !== 'view') return
  view = { ...data, generation: buildingSignature({ ...data.config, seed: data.seed }), signature: JSON.stringify([data.config, data.year]) }
  queue = requestedDistricts(data.center, 2)
  if (!scheduled) { scheduled = true; setTimeout(tick, 0) }
}
