import { canalX, railZ, terrainAt } from './worldModel.js'
import { SEEDS } from './plantedEcology.js'

export const SAVE_KEY = 'after-us-player-world-v1'
export const BUILD_KIT = Object.freeze({
  room: { name: 'Living room', type: 'apartment', variant: 'terrace', width: 4, depth: 3, floors: 1, roofForm: 'flat', material: 'brick', hint: 'Start with one room. Add storeys and choose a roof after placing it.' },
  workshop: { name: 'Workshop', type: 'utility', variant: 'workshop', width: 4.5, depth: 3, height: 2.7, roofForm: 'sawtooth', material: 'brick', hint: 'A low industrial shell with a sawtooth roof and space for a garden beside it.' },
  glasshouse: { name: 'Glasshouse', type: 'greenhouse', variant: 'glasshouse', width: 3.5, depth: 4, height: 2.6, roofForm: 'flat', material: 'steel', hint: 'A curved frame that gives climbing plants a place to grow.' },
  ruin: { name: 'Garden ruin', type: 'ruin', variant: 'broken-hall', width: 3, depth: 3, height: 2.5, roofForm: 'flat', material: 'brick', hint: 'Salvaged walls and an open frame. Plant ivy to reclaim their edges.' },
})
export const EMPTY_PARCEL = Object.freeze({ buildings: [], plants: [] })

export function newPlayerWorld() {
  return { version: 1, seed: 'after-us-city', year: 0, districts: {} }
}

export function buildingDraft(kind, x, z, turned = false) {
  const kit = BUILD_KIT[kind]
  return { ...kit, kind, x: Math.round(x * 2) / 2, z: Math.round(z * 2) / 2, width: turned ? kit.depth : kit.width, depth: turned ? kit.width : kit.depth }
}

export function validateBuilding(model, draft, ignoreId) {
  if (!model || !draft) return 'Choose a place in the current parcel.'
  const { x, z, width, depth } = draft
  if (![x, z, width, depth].every(Number.isFinite)) return 'Choose a place in the current parcel.'
  if (Math.abs(x) + width / 2 > 9.15 || Math.abs(z) + depth / 2 > 9.55) return 'Keep the streets around the parcel open.'
  if ([-depth / 2, 0, depth / 2].some((dz) => Math.abs(model.ox + x - canalX(model.ox + x, model.oz + z + dz, model.seed)) < width / 2 + 1.5)) return 'Leave space beside the canal.'
  if ([-width / 2, 0, width / 2].some((dx) => Math.abs(model.oz + z - railZ(model.ox + x + dx, model.oz + z)) < depth / 2 + 1.35)) return 'Keep the railway corridor clear.'
  if (model.buildings.some((b) => b.authoredId !== ignoreId && Math.abs(x - b.x) < (width + b.width) / 2 + 0.55 && Math.abs(z - b.z) < (depth + b.depth) / 2 + 0.55)) return 'Leave a little room between buildings.'
  if (model.plantedSeeds?.some((p) => p.kind !== 'ivy' && Math.abs(x - p.x) < width / 2 + (p.kind === 'birch' ? 1.2 : 0.3) && Math.abs(z - p.z) < depth / 2 + (p.kind === 'birch' ? 1.2 : 0.3))) return 'There is a planted seed here. Choose another spot.'
  return null
}

export function validateSeed(model, kind, x, z, host) {
  if (!model || !SEEDS[kind]) return 'Choose a seed and a place to plant.'
  if (kind === 'ivy') {
    if (!host) return 'Click a building to give ivy a climbing surface.'
    if (model.plantedSeeds.some((p) => p.buildingId === host.authoredId)) return 'Ivy is already growing on this building.'
    return null
  }
  if (host) return 'Plant this seed on open ground.'
  if (Math.max(Math.abs(x), Math.abs(z)) > 9.2) return 'Plant inside the parcel, away from the street.'
  if (terrainAt(model.ox + x, model.oz + z, model.seed) < -0.2) return 'These roots need dry ground beside the water.'
  const clearance = kind === 'birch' ? 1.2 : 0.2
  if (model.buildings.some((b) => Math.abs(x - b.x) < b.width / 2 + clearance && Math.abs(z - b.z) < b.depth / 2 + clearance)) return kind === 'birch' ? 'Leave room for the tree’s roots and canopy.' : 'Plant outside the building footprint.'
  if (kind === 'birch' && Math.abs(model.oz + z - railZ(model.ox + x, model.oz + z)) < 2) return 'The tree needs room away from the railway.'
  if (model.plantedSeeds.some((p) => p.kind !== 'ivy' && Math.hypot(p.x - x, p.z - z) < (kind === 'birch' || p.kind === 'birch' ? 1.6 : 0.6))) return 'Give this seed a little more space.'
  return null
}

export function changeParcel(world, key, update) {
  return { ...world, districts: { ...world.districts, [key]: update(world.districts[key] ?? EMPTY_PARCEL) } }
}

export function removePlacement(world, key, id) {
  return changeParcel(world, key, (parcel) => ({
    buildings: parcel.buildings.filter((b) => b.id !== id),
    plants: parcel.plants.filter((p) => p.id !== id && p.buildingId !== id),
  }))
}

export function historyReducer(state, action) {
  if (action.type === 'edit') {
    const next = action.update(state.present)
    if (next === state.present) return state
    return { present: next, past: [...state.past.slice(-39), state.present], future: [] }
  }
  if (action.type === 'year') return { ...state, present: { ...state.present, year: Math.min(9999, state.present.year + action.amount) } }
  if (action.type === 'undo' && state.past.length) return { present: state.past.at(-1), past: state.past.slice(0, -1), future: [state.present, ...state.future] }
  if (action.type === 'redo' && state.future.length) return { present: state.future[0], past: [...state.past, state.present], future: state.future.slice(1) }
  return state
}

// Validate a saved document before it can become worker/generator input.
export function parsePlayerWorld(value) {
  try {
    const world = JSON.parse(value)
    if (world?.version !== 1 || typeof world.seed !== 'string' || !Number.isFinite(world.year) || world.year < 0 || world.year > 9999 || !world.districts || Array.isArray(world.districts)) return null
    for (const [key, parcel] of Object.entries(world.districts)) {
      if (!/^-?\d+:-?\d+$/.test(key) || !Array.isArray(parcel.buildings) || !Array.isArray(parcel.plants) || parcel.buildings.length > 40 || parcel.plants.length > 150) return null
      const ids = new Set()
      for (const b of parcel.buildings) {
        if (!BUILD_KIT[b.kind] || typeof b.id !== 'string' || ids.has(b.id) || ![b.x, b.z, b.width, b.depth, b.createdAt].every(Number.isFinite) || b.width <= 0 || b.depth <= 0 || b.createdAt < 0 || b.createdAt > world.year || !['brick', 'concrete', 'steel'].includes(b.material) || !['flat', 'gable', 'sawtooth'].includes(b.roofForm)) return null
        if (b.type !== BUILD_KIT[b.kind].type || b.variant !== BUILD_KIT[b.kind].variant || (b.type === 'apartment' && (!Number.isInteger(b.floors) || b.floors < 1 || b.floors > 4))) return null
        ids.add(b.id)
      }
      for (const p of parcel.plants) {
        if (!SEEDS[p.kind] || typeof p.id !== 'string' || ids.has(p.id) || ![p.x, p.z, p.plantedAt].every(Number.isFinite) || Math.max(Math.abs(p.x), Math.abs(p.z)) > 12 || p.plantedAt < 0 || p.plantedAt > world.year || (p.kind === 'ivy' && !parcel.buildings.some((b) => b.id === p.buildingId))) return null
        ids.add(p.id)
      }
    }
    return world
  } catch { return null }
}
