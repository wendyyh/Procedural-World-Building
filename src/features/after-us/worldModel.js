import { clamp, randomFactory, seedNumber } from './worldMath.js'
import { BUILDING_DEFAULTS, buildingSignature, buildingState, generateBuildings, roofIndexAt, roofSurfaceAt, structureSupport, wallIndexAt } from './buildingModel.js'
import { plantSpecies, plantVigor } from './plantHabitat.js'
export { clamp, randomFactory, seedNumber } from './worldMath.js'

export const CHUNK_SIZE = 24
export const GRID = 25
export const DEFAULT_AGE = 32
export const DEFAULT_WORLD = Object.freeze({ ...BUILDING_DEFAULTS, seed: 'after-us-city', sunlight: 0.7, humidity: 0.7, soilQuality: 0.65, waterLevel: 0.45, density: 1, growthRate: 1, dispersal: 1, community: 'balanced' })
export const PALETTE = Object.freeze({ sky: '#ead7cb', concrete: '#c4b4a1', plaster: '#c99f89', metal: '#718889', rust: '#8c5d48', leaf: '#566b3c', newLeaf: '#a5b86b', water: '#83aaa6' })
function hash(x, z, seed) { let h = Math.imul(x, 374761393) + Math.imul(z, 668265263) + seed; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295 }
const mix = (a, b, t) => a + (b - a) * t
function noise(x, z, seed) { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz; const a = fx * fx * (3 - 2 * fx), b = fz * fz * (3 - 2 * fz); return mix(mix(hash(ix, iz, seed), hash(ix + 1, iz, seed), a), mix(hash(ix, iz + 1, seed), hash(ix + 1, iz + 1, seed), a), b) }
export const districtKey = (x, z) => `${x}:${z}`
export const localCoordinate = (value) => value - Math.round(value / CHUNK_SIZE) * CHUNK_SIZE
export function canalX(x, z, seed) { const base = 7 + Math.sin(z * 0.055 + (seed % 79) * 0.02) * 1.15; return base + Math.round((x - base) / 72) * 72 }
export function railZ(x, z) { const base = 4.4 + Math.sin(x * 0.045) * 0.55; return base + Math.round((z - base) / 48) * 48 }
export function terrainAt(x, z, seed) {
  const canal = Math.abs(x - canalX(x, z, seed))
  const street = Math.max(Math.abs(localCoordinate(x)), Math.abs(localCoordinate(z))) > 9.7
  const h = 0.22 + noise(x * 0.065, z * 0.065, seed) * 0.38 + noise(x * 0.3, z * 0.3, seed) * 0.06
  return (street ? mix(h, 0.32, 0.85) : h) - Math.exp(-canal * canal / 1.2) * 1.4
}
export const waterHeight = (config) => -0.75 + config.waterLevel * 1.05
export function cellAt(x, z) { return clamp(Math.round(z + 12), 0, GRID - 1) * GRID + clamp(Math.round(x + 12), 0, GRID - 1) }
export const COMMUNITY = Object.freeze({ balanced: { pioneers: 1, climbers: 1, woodland: 0.9 }, climbers: { pioneers: 0.6, climbers: 1.65, woodland: 0.4 }, meadow: { pioneers: 1.65, climbers: 0.45, woodland: 0.4 }, woodland: { pioneers: 0.65, climbers: 0.7, woodland: 1.6 } })
const NAMES = ['The Glassworks', 'Canal Quarter', 'The Old Exchange', 'Railway Gardens', 'Quiet Courtyards', 'Foundry Row']

export function createDistrict(seedValue, cx = 0, cz = 0, config = DEFAULT_WORLD) {
  const seed = seedNumber(seedValue), tileSeed = seedNumber(`${seedValue}/${cx}/${cz}`), random = randomFactory(tileSeed)
  const ox = cx * CHUNK_SIZE, oz = cz * CHUNK_SIZE
  const hero = cx === 0 && cz === 0
  const kind = hero ? 'courtyard' : ['housing', 'housing', 'courtyard', 'glassworks', 'railworks', 'ruins'][tileSeed % 6]
  const buildings = generateBuildings({ tileSeed, kind, hero, ground: (x, z) => terrainAt(ox + x, oz + z, seed), canal: (z) => canalX(ox, oz + z, seed) - ox, rail: (x) => railZ(ox + x, oz) - oz }, config)
  const cells = GRID * GRID, heights = new Float32Array(cells), light = new Float32Array(cells), moisture = new Float32Array(cells), soil = new Float32Array(cells), barrier = new Float32Array(cells), initialCover = new Float32Array(cells), buildingCell = new Int16Array(cells).fill(-1)
  for (let row = 0; row < GRID; row += 1) for (let col = 0; col < GRID; col += 1) {
    const i = row * GRID + col, x = col - 12, z = row - 12, wx = ox + x, wz = oz + z
    const h = terrainAt(wx, wz, seed), canal = Math.abs(wx - canalX(wx, wz, seed)), rail = Math.abs(wz - railZ(wx, wz))
    const road = Math.max(Math.abs(x), Math.abs(z)) > 9.7
    let shade = 0, occupied = false
    for (const b of buildings) {
      if (b.type !== 'ruin' && b.type !== 'greenhouse' && Math.abs(x - b.x) < b.width / 2 && Math.abs(z - b.z) < b.depth / 2) { occupied = true; buildingCell[i] = b.id }
      const dx = x - b.x, dz = z - b.z
      shade = Math.max(shade, Math.exp(-(dx * dx / (b.width * b.width) + (dz + b.height * 0.38) ** 2 / (b.depth * b.depth))) * 0.72)
    }
    heights[i] = h; light[i] = clamp(0.97 - shade - (rail < 1.1 ? 0.3 : 0), 0.12)
    moisture[i] = clamp(0.22 + Math.exp(-canal * 0.3) * 0.6 + shade * 0.22)
    soil[i] = clamp((road ? 0.2 : rail < 1.4 ? 0.62 : 0.42 + noise(wx * 0.24, wz * 0.24, seed ^ 12193) * 0.52) - (occupied ? 0.35 : 0))
    barrier[i] = occupied ? 0.92 : road ? 0.68 : rail < 1.3 ? 0.24 : 0.06
    const patch = noise(wx * 0.23 + 8, wz * 0.23 - 4, seed ^ 84219)
    initialCover[i] = h < -0.3 ? 0 : clamp((patch - 0.41) * 0.95) * soil[i] * (1 - barrier[i] * 0.85)
  }
  const model = { key: districtKey(cx, cz), generation: buildingSignature({ ...config, seed: seedValue }), cx, cz, ox, oz, seed, tileSeed, name: hero ? 'The Old Exchange' : NAMES[tileSeed % NAMES.length], kind, buildings, heights, light, moisture, soil, barrier, initialCover, buildingCell }
  const candidates = { pioneers: [], shrubs: [], trees: [], vines: [], roof: [], flowers: [] }
  for (const [type, amount] of [['pioneers', 420], ['shrubs', 65], ['trees', 22], ['flowers', 75]]) {
    let origin = null
    for (let i = 0; i < amount; i += 1) {
      const clustered = type !== 'trees' && i % 5 !== 0 && origin
      const x = clustered ? clamp(origin.x + (random() - 0.5) * 1.35, -11.5, 11.5) : (random() - 0.5) * 23
      const z = clustered ? clamp(origin.z + (random() - 0.5) * 1.35, -11.5, 11.5) : (random() - 0.5) * 23
      if (!clustered) origin = { x, z }
      const cell = cellAt(x, z)
      if (heights[cell] < -0.25) continue
      if (type === 'trees' && buildings.some((b) => Math.abs(x - b.x) < b.width / 2 + 0.5 && Math.abs(z - b.z) < b.depth / 2 + 0.5)) continue
      if (type === 'trees' && (Math.abs(oz + z - railZ(ox + x, oz + z)) < 2 || Math.max(Math.abs(x), Math.abs(z)) > 8.8)) continue
      const separation = type === 'trees' ? 2.8 : type === 'shrubs' ? 0.8 : type === 'flowers' ? 0.23 : 0.3
      if (candidates[type].some((plant) => Math.hypot(plant.x - x, plant.z - z) < separation)) continue
      const interior = buildings.find((b) => Math.abs(x - b.x) < b.width / 2 && Math.abs(z - b.z) < b.depth / 2)
      candidates[type].push({ x, y: interior ? interior.base + 0.16 : terrainAt(ox + x, oz + z, seed), z, cell, interior: buildingCell[cell], variation: random(), rank: random(), rotation: random() * Math.PI * 2 })
    }
  }
  const stems = []
  for (const b of buildings) {
    if (b.variant === 'conservatory') {
      for (let rib = 0; rib < 16; rib += 1) {
        const angle = rib / 16 * Math.PI * 2, path = [], growthBias = 0.48 + random() * 0.64
        for (let step = 0; step <= 18; step += 1) {
          const t = step / 18 * 0.9, radial = Math.cos(t * Math.PI / 2)
          const x = b.x + Math.cos(angle) * (b.width / 2 + 0.035) * radial, z = b.z + Math.sin(angle) * (b.depth / 2 + 0.035) * radial, y = b.base + 0.4 + Math.sin(t * Math.PI / 2) * b.height
          path.push([x, y, z])
          candidates.vines.push({ x, y, z, building: b.id, frameRib: rib, frameProgress: t, growthBias, facing: Math.PI / 2 - angle, progress: step / 18, variation: random(), rank: random(), rotation: angle, cell: cellAt(x, z) })
        }
        stems.push({ building: b.id, path, frameRib: rib, growthBias })
      }
      continue
    }
    const surfaceHeight = b.type === 'greenhouse' ? b.height * 0.85 : b.height
    for (let side = 0; side < 3; side += 1) for (let route = 0; route < (side === 0 ? 9 : 5); route += 1) {
      const width = side === 0 ? b.width : b.depth
      const growthBias = 0.55 + random() * 0.58
      const origin = (route / (side === 0 ? 8 : 4) - 0.5) * width * 0.94
      const routeHeight = b.type === 'greenhouse' ? side === 0 ? 0.4 + Math.sqrt(Math.max(0, 1 - (origin / (b.width / 2)) ** 2)) * b.height : 0.6 : surfaceHeight
      const path = []
      for (let step = 0; step <= 18; step += 1) {
        const t = step / 18, sway = Math.sin(t * 12 + route * 1.7) * 0.22 + Math.sin(t * 4 + route) * 0.18
        const x = side === 0 ? b.x + origin + sway : b.x + (side === 1 ? 1 : -1) * (b.width / 2 + 0.07 + Math.sin(t * 8) * 0.03)
        const z = side === 0 ? b.z + b.depth / 2 + 0.09 : b.z + origin + sway
        const y = b.base + t * routeHeight + 0.08
        path.push([x, y, z])
        candidates.vines.push({ x, y, z, building: b.id, wallIndex: b.type === 'greenhouse' ? undefined : wallIndexAt(b, x, y, z, side === 2 ? 3 : side), growthBias, progress: t, variation: random(), rank: random(), rotation: random() * Math.PI * 2, side, cell: cellAt(b.x, b.z + b.depth / 2 + 0.5) })
      }
      stems.push({ building: b.id, path, growthBias, wallIndices: path.map(([x, y, z]) => b.type === 'greenhouse' ? undefined : wallIndexAt(b, x, y, z, side === 2 ? 3 : side)) })
    }
    if (b.type === 'apartment' && b.roofForm === 'flat') for (let route = 0; route < 4; route += 1) {
      const rootX = b.x + (route / 3 - 0.5) * b.width * 0.88, rootZ = b.z + b.depth / 2 - 0.08
      const roofIndex = roofIndexAt(b, rootX, rootZ), path = [], growthBias = 0.7 + random() * 0.3
      for (let step = 0; step <= 18; step += 1) {
        const t = step / 18, x = rootX + Math.sin(t * 3 + route) * t * 0.16, z = rootZ + 0.2 + Math.sin(t * Math.PI) * 0.13, y = b.base + b.height + 0.12 - t * Math.min(2.5, b.height * 0.7)
        path.push([x, y, z])
        candidates.vines.push({ x, y, z, building: b.id, roofIndex, growthBias, progress: 0.28 + t * 0.72, variation: random(), rank: random(), rotation: 0, facing: 0, cell: cellAt(rootX, rootZ) })
      }
      stems.push({ building: b.id, path, roofIndex, growthBias, hanging: true })
    }
    for (let i = 0; i < 70; i += 1) {
      const x = b.type === 'ruin' ? b.x - b.width / 2 + (random() - 0.5) * 0.2 : b.x + (random() - 0.5) * b.width * 0.92
      const z = b.z + (random() - 0.5) * b.depth * 0.92
      const y = b.type === 'ruin' ? b.base + b.height * 0.76 + 0.13 : roofSurfaceAt(b, x, z) + 0.025
      candidates.roof.push({ x, y, z, building: b.id, roofIndex: b.type === 'greenhouse' || b.type === 'ruin' ? undefined : roofIndexAt(b, x, z), wallIndex: b.type === 'ruin' ? wallIndexAt(b, x, y, z, 3) : undefined, variation: random(), rank: random(), rotation: random() * Math.PI * 2, cell: cellAt(x, z) })
    }
  }
  const localRail = railZ(ox, oz) - oz
  if (Math.abs(localRail) < 11) {
    for (let i = 0; i < 130; i += 1) {
      const x = (random() - 0.5) * 23.5, z = railZ(ox + x, oz) - oz + (random() - 0.5) * 1.7
      candidates.roof.push({ x, y: 3.5, z, surface: 'rail', cell: cellAt(x, z), variation: random(), rank: random(), rotation: random() * Math.PI * 2 })
    }
    for (let route = 0; route < 10; route += 1) for (let step = 0; step < 9; step += 1) {
      const x = -10.5 + route * 2.3, z = railZ(ox + x, oz) - oz + (route % 2 ? 1.05 : -1.05)
      candidates.vines.push({ x: x + Math.sin(step * 0.8) * 0.13, y: 3.2 - step * 0.31, z, progress: step / 9, surface: 'rail', cell: cellAt(x, z), variation: random(), rank: random(), rotation: random() * Math.PI * 2 })
    }
    if (hero) for (let i = 0; i < 42; i += 1) {
      const x = -5.1 + random() * 4.3, z = railZ(-3, 0) + (random() - 0.5) * 1.5
      candidates.roof.push({ x, y: 5.14, z, surface: 'rail', cell: cellAt(x, z), variation: random(), rank: random(), rotation: random() * Math.PI * 2 })
    }
  }
  for (const [type, plants] of Object.entries(candidates)) for (const plant of plants) {
    const patch = noise((ox + plant.x) * 0.16, (oz + plant.z) * 0.16, seed ^ 71933)
    const waterside = Math.abs(ox + plant.x - canalX(ox + plant.x, oz + plant.z, seed)) < 3.7
    plant.species = plantSpecies(type, { patch, waterside, moisture: moisture[plant.cell], light: light[plant.cell], kind })
    plant.siteMoisture = moisture[plant.cell]; plant.siteLight = light[plant.cell]
    if (type === 'flowers') plant.flowerColor = patch > 0.62 ? '#b9a0b6' : patch < 0.4 ? '#cf9e9d' : '#d7cfab'
    if (type === 'vines') plant.facing ??= plant.surface === 'rail' ? (plant.z > railZ(ox + plant.x, oz) - oz ? 0 : Math.PI) : plant.side === 1 ? Math.PI / 2 : plant.side === 2 ? -Math.PI / 2 : 0
  }
  return { ...model, candidates, stems }
}

export function habitat(model, i, config, environment) {
  const wetness = clamp(model.moisture[i] * 0.6 + config.humidity * 0.64 + Math.exp(-Math.abs(model.ox + (i % GRID) - 12 - canalX(model.ox + (i % GRID) - 12, model.oz + Math.floor(i / GRID) - 12, model.seed)) * 0.35) * config.waterLevel * 0.16)
  const light = clamp((environment?.light || model.light)[i] * (0.22 + config.sunlight * 1.1))
  const soil = clamp((environment?.soil || model.soil)[i] * (0.25 + config.soilQuality * 1.1))
  return { wetness, light, soil }
}

export function structuralEnvironment(model, structures) {
  const light = new Float32Array(model.light), soil = new Float32Array(model.soil), barrier = new Float32Array(model.barrier)
  for (let i = 0; i < light.length; i += 1) {
    const id = model.buildingCell[i]
    if (id < 0) continue
    const opening = structures[id]?.opening || 0
    light[i] = clamp(light[i] + opening * 0.55)
    soil[i] = clamp(soil[i] + opening * 0.35)
    barrier[i] *= 1 - opening * 0.9
  }
  return { light, soil, barrier }
}

export function advanceWorld(model, config, years) {
  let cover = new Float32Array(model.initialCover)
  const capacity = new Float32Array(cover.length), rate = new Float32Array(cover.length)
  const weights = COMMUNITY[config.community] || COMMUNITY.balanced
  let structures = model.buildings.map((b) => buildingState(b, model, config, 0)), environment = structuralEnvironment(model, structures)
  for (let year = 0; year < Math.floor(years); year += 1) {
    structures = model.buildings.map((b) => buildingState(b, model, config, year + 1))
    environment = structuralEnvironment(model, structures)
    for (let i = 0; i < cover.length; i += 1) {
      const h = habitat(model, i, config, environment)
      const climate = clamp(1 - Math.abs(h.wetness - 0.65) * 1.5) * (0.3 + h.light * 0.7)
      capacity[i] = model.heights[i] < waterHeight(config) ? 0 : clamp((0.18 + h.soil * 0.9) * (0.3 + climate * 0.8) * config.density * (0.7 + weights.pioneers * 0.3)) * (1 - environment.barrier[i] * 0.87)
      rate[i] = config.growthRate * (0.035 + climate * 0.18)
    }
    const next = new Float32Array(cover.length)
    for (let z = 0; z < GRID; z += 1) for (let x = 0; x < GRID; x += 1) {
      const i = z * GRID + x, here = cover[i]
      let near = 0, count = 0
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (x + dx >= 0 && x + dx < GRID && z + dz >= 0 && z + dz < GRID) { near += cover[i + dz * GRID + dx]; count += 1 }
      const spread = near / count * config.dispersal * 0.22 * (1 - environment.barrier[i] * 0.75)
      next[i] = clamp(here + (here + spread + 0.002) * rate[i] * (capacity[i] - here) - Math.max(0, here - capacity[i]) * 0.06)
    }
    cover = next
  }
  const climbers = model.buildings.map((b) => {
    const i = cellAt(b.x, b.z + b.depth / 2 + 0.6), h = habitat(model, i, config, environment)
    const lightPreference = 0.5 + Math.min(1, h.light * 2) * (1 - h.light * 0.25)
    return { id: b.id, value: clamp((1 - Math.exp(-years * 0.055 * config.growthRate)) * (0.4 + h.wetness * 0.6) * (0.5 + config.soilQuality * 0.5) * weights.climbers * config.density * (0.7 + config.dispersal * 0.3) * lightPreference) }
  })
  const snapshot = { cover, climbers, structures, environment, year: years }
  return { ...snapshot, stats: worldStats(model, snapshot, config) }
}

export function plantGrowth(plant, type, snapshot, config) {
  if (plant.rank > clamp(config.density / 1.5)) return 0
  if (!structureSupport(plant, snapshot)) return 0
  if (plant.interior >= 0 && (snapshot.structures?.[plant.interior]?.opening || 0) < 0.08) return 0
  const weights = COMMUNITY[config.community] || COMMUNITY.balanced
  if (type === 'vines' || type === 'roof') {
    const value = plant.surface === 'rail' ? clamp((1 - Math.exp(-snapshot.year * 0.03 * config.growthRate)) * (0.3 + config.humidity * 0.7) * (0.35 + config.soilQuality * 0.65) * weights.climbers) : snapshot.climbers.find((b) => b.id === plant.building)?.value || 0
    const roofRetention = clamp(0.28 + config.humidity * 0.68 + config.soilQuality * 0.24 - config.sunlight * 0.22)
    return type === 'vines' ? clamp((value * (plant.growthBias ?? 1) - plant.progress * 0.83) * 3.4) : clamp(value * roofRetention * 1.8 - plant.variation * 0.3)
  }
  const value = snapshot.cover[plant.cell] * plantVigor(plant, config)
  if (type === 'trees') return clamp((value * weights.woodland - 0.12) * 1.8 + Math.min(0.33, snapshot.year * 0.012) * weights.woodland - plant.variation * 0.16)
  return clamp((value * (type === 'shrubs' ? weights.woodland : weights.pioneers) - (type === 'shrubs' ? 0.11 : 0.025)) * 2.5)
}

export function worldStats(model, snapshot, config) {
  let total = 0, connected = 0, wet = 0, suitable = 0
  for (let i = 0; i < snapshot.cover.length; i += 1) {
    if (model.heights[i] < waterHeight(config) || (snapshot.environment?.barrier || model.barrier)[i] > 0.8) continue
    suitable += 1; total += snapshot.cover[i]; wet += habitat(model, i, config, snapshot.environment).wetness
    if (snapshot.cover[i] > 0.2 && ((i % GRID < GRID - 1 && snapshot.cover[i + 1] > 0.2) || (i + GRID < snapshot.cover.length && snapshot.cover[i + GRID] > 0.2))) connected += 1
  }
  const structures = snapshot.structures || []
  return { coverage: Math.round(total / Math.max(1, suitable) * 100), facades: Math.round(snapshot.climbers.reduce((sum, b) => sum + b.value, 0) / Math.max(1, snapshot.climbers.length) * 100), connected: Math.round(connected / Math.max(1, suitable) * 100), moisture: Math.round(wet / Math.max(1, suitable) * 100), buildings: model.buildings.length, integrity: Math.round(structures.reduce((sum, b) => sum + b.integrity, 0) / Math.max(1, structures.length) * 100), fallen: structures.reduce((sum, b) => sum + b.fallen, 0) }
}

export function requestedDistricts(center, radius = 2) {
  const list = []
  for (let z = center.z - radius; z <= center.z + radius; z += 1) for (let x = center.x - radius; x <= center.x + radius; x += 1) list.push({ x, z, distance: Math.hypot(x - center.x, z - center.z) })
  return list.sort((a, b) => a.distance - b.distance)
}
