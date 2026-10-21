import { clamp, randomFactory, seedNumber } from './worldMath.js'

export const BUILDING_DEFAULTS = Object.freeze({ buildingDensity: 1, buildingLayout: 'courtyard', buildingHeight: 1, buildingMaterial: 'mixed', weatheringRate: 1 })
export const MATERIALS = Object.freeze({
  brick: { name: 'Brick & plaster', resistance: 0.82, wall: '#c3a18b', exposed: '#a77c61' },
  concrete: { name: 'Reinforced concrete', resistance: 1.35, wall: '#b6b7a7', exposed: '#898f83' },
  steel: { name: 'Steel frame', resistance: 0.94, wall: '#87958a', exposed: '#9c7053' },
})
export function buildingSignature(config) {
  const signature = [config.seed, ...['buildingDensity', 'buildingLayout', 'buildingHeight', 'buildingMaterial'].map((key) => config[key] ?? BUILDING_DEFAULTS[key])]
  if (config.buildingLots) signature.push(config.buildingLots)
  return JSON.stringify(signature)
}

// Priority lots preserve existing footprints as density increases. Remaining lots use
// seeded rejection sampling: no overlapping footprints, roads, rail decks, or canals.
export function generateBuildings(context, options = {}) {
  const config = { ...BUILDING_DEFAULTS, ...options }, { tileSeed, kind, hero, ground, canal, rail } = context
  const random = randomFactory(tileSeed ^ 78391), buildings = []
  // Optional priority parcels use the same placement checks and building grammar.
  // Defining them before the habitat is generated keeps shade, roots, and decay
  // attached to the actual footprint instead of stretching rendered buildings.
  const lots = config.buildingLots ?? (config.buildingLayout === 'streets'
    ? [[-5.8, -5.8, 4.8, 5], [0, -5.8, 4.6, 5], [-5.8, 8, 4.6, 3], [0, 8, 4.4, 3]]
    : config.buildingLayout === 'clustered'
      ? [[-4.7, -4.3, 5.1, 4.5], [0.4, -1.3, 3.7, 3.8], [-5.5, 8, 4.3, 3], [1, -7.2, 3.4, 3.2]]
      : [[-3.8, -3.5, 7.7, 6.2], [3.1, -6.8, 3, 3.8], [-4.9, 8, 5.1, 3], [2.1, 0.7, 3.2, 2.8]])
  const target = Math.max(1, Math.round(config.buildingDensity * 3))
  for (let attempt = 0; attempt < 100 && buildings.length < target; attempt += 1) {
    const parcel = Array.isArray(lots[attempt]) ? undefined : lots[attempt]
    const lot = parcel ? [parcel.x, parcel.z, parcel.width, parcel.depth] : lots[attempt]
    let [x, z, width, depth] = lot || [(random() - 0.5) * 15.5, (random() - 0.5) * 16.6, 2.5 + random() * 1.4, 2.4 + random() * 1.5]
    if (lot && !hero && !parcel) {
      const shape = randomFactory(tileSeed ^ (attempt * 9137 + 32917))
      width *= 0.78 + shape() * 0.22; depth *= 0.8 + shape() * 0.2
    }
    if (!lot && config.buildingLayout === 'streets') { x = Math.round(x / 4.8) * 4.8; z = z < 2 ? -5.9 : 8 }
    if (!lot && config.buildingLayout === 'clustered') { x = -2.5 + (random() - 0.5) * 11; z = (random() - 0.5) * 15.5 }
    const gap = config.buildingLayout === 'clustered' ? 0.55 : 0.9
    if (Math.abs(x) + width / 2 > 9.15 || Math.abs(z) + depth / 2 > 9.55) continue
    if ([-depth / 2, 0, depth / 2].some((dz) => Math.abs(x - canal(z + dz)) < width / 2 + 1.5)) continue
    if ([-width / 2, 0, width / 2].some((dx) => Math.abs(z - rail(x + dx)) < depth / 2 + 1.35)) continue
    if (buildings.some((b) => Math.abs(x - b.x) < (width + b.width) / 2 + gap && Math.abs(z - b.z) < (depth + b.depth) / 2 + gap)) continue
    const id = buildings.length
    const type = parcel?.type ?? (id === 0 ? kind === 'glassworks' ? 'greenhouse' : kind === 'ruins' ? 'ruin' : kind === 'railworks' ? 'utility' : 'apartment'
      : id === 2 ? hero ? 'greenhouse' : kind === 'housing' ? 'apartment' : 'ruin' : id % 3 === 0 ? 'apartment' : 'utility')
    const buildingSeed = seedNumber(`${tileSeed}/building/${id}`)
    const variant = parcel?.variant ?? (type === 'greenhouse' ? (hero || buildingSeed % 2 ? 'conservatory' : 'glasshouse')
      : type === 'ruin' ? (buildingSeed % 2 ? 'pergola' : 'broken-hall')
        : type === 'utility' ? (kind === 'railworks' || buildingSeed % 3 === 0 ? 'workshop' : 'cottage')
          : hero ? 'terrace' : kind === 'courtyard' ? 'arcade' : buildingSeed % 2 ? 'townhouse' : 'terrace')
    const roofForm = variant === 'workshop' ? 'sawtooth' : ['cottage', 'townhouse'].includes(variant) ? 'gable' : 'flat'
    const baseFloors = hero && id === 0 ? 3 : variant === 'arcade' ? 2 : 1 + buildingSeed % 3
    const floors = type === 'apartment' ? Math.max(1, Math.round(parcel?.floors ?? baseFloors * config.buildingHeight)) : 1
    const height = type === 'apartment' ? floors * 1.95 : parcel?.height ?? (type === 'greenhouse' ? 3 : type === 'ruin' ? 2.8 : 2.7) * config.buildingHeight
    const material = type === 'greenhouse' ? 'steel' : config.buildingMaterial === 'mixed' ? (id % 2 ? 'concrete' : 'brick') : config.buildingMaterial
    const base = Math.max(...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => ground(x + sx * width / 2, z + sz * depth / 2))), ground(x, z), 0.35) + 0.04
    const b = { id, type, variant, roofForm, roofRise: Math.min(width * 0.25, 1.45) * config.buildingHeight, x, z, width, depth, height, floors, base, material, weather: random(), seed: buildingSeed,
      wallColor: (material === 'brick' ? ['#c3a18b', '#bba98f', '#c0a69a', '#b4ac96'] : ['#b6b7a7', '#aeb6ad', '#bdbcae'])[buildingSeed % (material === 'brick' ? 4 : 3)] }
    b.panels = wallPanels(b); b.roofTiles = roofTiles(b); b.fractures = fractureFields(b)
    buildings.push(b)
  }
  return buildings
}

export function roofSurfaceAt(b, x, z) {
  const u = clamp((x - b.x) / b.width + 0.5)
  if (b.type === 'greenhouse') {
    const nx = (x - b.x) / (b.width / 2), nz = b.variant === 'conservatory' ? (z - b.z) / (b.depth / 2) : 0
    return b.base + 0.4 + Math.sqrt(Math.max(0, 1 - nx * nx - nz * nz)) * b.height
  }
  if (b.roofForm === 'gable') return b.base + b.height + 0.12 + (1 - Math.abs(u * 2 - 1)) * b.roofRise
  if (b.roofForm === 'sawtooth') {
    const bays = Math.max(2, Math.round(b.width / 2)), t = Math.min(0.99999, u) * bays % 1
    return b.base + b.height + 0.12 + (t < 0.8 ? t / 0.8 : (1 - t) / 0.2) * b.roofRise * 0.72
  }
  return b.base + b.height + 0.13
}

// A small shape grammar: footprint → floors → facade bays → roof tiles.
export function wallPanels(b) {
  if (b.type === 'greenhouse') return []
  const panels = [], random = randomFactory(b.seed), rows = Math.max(2, b.floors * 2)
  for (let side = 0; side < 4; side += 1) {
    const span = side % 2 === 0 ? b.width : b.depth, cols = Math.ceil(span / 1.25)
    for (let col = 0; col < cols; col += 1) {
      const seam = random()
      for (let row = 0; row < rows; row += 1) {
        const u = (col + 0.5) / cols, v = (row + 0.5) / rows
        const position = side % 2 === 0 ? [b.x + (u - 0.5) * b.width, b.base + v * b.height, b.z + (side === 0 ? 1 : -1) * b.depth / 2]
          : [b.x + (side === 1 ? 1 : -1) * b.width / 2, b.base + v * b.height, b.z + (u - 0.5) * b.depth]
        const existingRuin = b.type === 'ruin' && (side === 0 || side === 1 || v > (side === 2 ? 0.45 : 0.76))
        panels.push({ index: panels.length, side, col, row, cols, rows, u, v, position, size: side % 2 === 0 ? [span / cols, b.height / rows, 0.28] : [0.28, b.height / rows, span / cols], threshold: 0.24 + seam * 0.38 + random() * 0.16 + (row === 0 ? 0.14 : 0), existingRuin })
      }
    }
  }
  return panels
}
function roofTiles(b) {
  if (b.type === 'greenhouse') return []
  const tiles = [], nx = Math.ceil(b.width / 1.5), nz = Math.ceil(b.depth / 1.5), random = randomFactory(b.seed ^ 7813)
  for (let z = 0; z < nz; z += 1) for (let x = 0; x < nx; x += 1) tiles.push({ index: tiles.length, x: b.x + ((x + 0.5) / nx - 0.5) * b.width, z: b.z + ((z + 0.5) / nz - 0.5) * b.depth, width: b.width / nx, depth: b.depth / nz, threshold: 0.45 + random() * 0.4 })
  return tiles
}
export function wallIndexAt(b, x, y, z, chosenSide) {
  const side = chosenSide ?? (Math.abs(Math.abs(x - b.x) - b.width / 2) < Math.abs(Math.abs(z - b.z) - b.depth / 2) ? x > b.x ? 1 : 3 : z > b.z ? 0 : 2)
  const rows = Math.max(2, b.floors * 2), span = side % 2 === 0 ? b.width : b.depth, cols = Math.ceil(span / 1.25)
  const u = side % 2 === 0 ? (x - b.x) / b.width + 0.5 : (z - b.z) / b.depth + 0.5
  let offset = 0
  for (let s = 0; s < side; s += 1) offset += Math.ceil((s % 2 === 0 ? b.width : b.depth) / 1.25) * rows
  return offset + clamp(Math.floor(u * cols), 0, cols - 1) * rows + clamp(Math.floor((y - b.base) / b.height * rows), 0, rows - 1)
}
export function roofIndexAt(b, x, z) {
  const nx = Math.ceil(b.width / 1.5), nz = Math.ceil(b.depth / 1.5)
  return clamp(Math.floor(((z - b.z) / b.depth + 0.5) * nz), 0, nz - 1) * nx + clamp(Math.floor(((x - b.x) / b.width + 0.5) * nx), 0, nx - 1)
}

function fractureFields(b) {
  if (b.type === 'greenhouse') return []
  const random = randomFactory(b.seed ^ 92741)
  return Array.from({ length: 4 }, (_, side) => {
    const span = side % 2 === 0 ? b.width : b.depth, count = Math.ceil(span / 0.38)
    const center = 0.2 + random() * 0.6, width = 0.2 + random() * 0.16, secondary = random()
    return { side, trigger: 0.27 + random() * 0.12, points: Array.from({ length: count + 1 }, (_, i) => {
      const u = i / count, main = Math.exp(-(((u - center) / width) ** 2)), other = Math.exp(-(((u - secondary) / 0.2) ** 2))
      return { u, weakness: clamp(main * 0.86 + other * 0.24 + (random() - 0.5) * 0.09), tooth: random() }
    }) }
  })
}
export function facadePoint(b, side, u, height, offset = 0) {
  if (side % 2 === 0) return [b.x + (u - 0.5) * b.width, b.base + height, b.z + (side === 0 ? 1 : -1) * (b.depth / 2 + offset)]
  return [b.x + (side === 1 ? 1 : -1) * (b.width / 2 + offset), b.base + height, b.z + (u - 0.5) * b.depth]
}
export function profileHeight(profile, u) {
  const t = clamp(u) * (profile.length - 1), i = Math.min(profile.length - 2, Math.floor(t))
  return profile[i] + (profile[i + 1] - profile[i]) * (t - i)
}
export function facadeHeight(b, state, x, z, side) {
  const u = side % 2 === 0 ? (x - b.x) / b.width + 0.5 : (z - b.z) / b.depth + 0.5
  return state?.wallProfiles ? profileHeight(state.wallProfiles[side], u) : b.height
}

// Slabs must connect to a grounded corner column. Any isolated remnant falls with
// the surrounding span, including at low detail where floor plates still show.
export function pruneSlabIslands(b, loss) {
  const nx = Math.ceil(b.width / 1.5), nz = Math.ceil(b.depth / 1.5), connected = new Uint8Array(loss.length), queue = []
  for (const index of [0, nx - 1, (nz - 1) * nx, nz * nx - 1]) if (loss[index] < 1 && !connected[index]) { connected[index] = 1; queue.push(index) }
  for (let n = 0; n < queue.length; n += 1) {
    const index = queue[n], x = index % nx, z = Math.floor(index / nx)
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const tx = x + dx, tz = z + dz, next = tz * nx + tx
      if (tx >= 0 && tx < nx && tz >= 0 && tz < nz && !connected[next] && loss[next] < 1) { connected[next] = 1; queue.push(next) }
    }
  }
  loss.forEach((_, i) => { if (!connected[i]) loss[i] = 1 })
  return connected
}

export function buildingDamage(b, model, config, year) {
  const cell = clamp(Math.round(b.z + 12), 0, 24) * 25 + clamp(Math.round(b.x + 12), 0, 24)
  const damp = clamp(model.moisture[cell] * 0.55 + config.humidity * 0.65)
  const flood = Math.max(0, config.waterLevel - 0.55) * model.moisture[cell]
  const rootWeight = { balanced: 1, climbers: 0.9, meadow: 0.45, woodland: 1.35 }[config.community] || 1
  const seeds = clamp(config.density / 1.5), roots = (1 - Math.exp(-Math.max(0, year - 8) * config.growthRate * 0.035)) * seeds * config.soilQuality * damp * rootWeight
  const exposure = 0.26 + damp * 0.72 + config.sunlight * 0.12 + flood * 0.45 + roots * 0.25
  // Cumulative exposure is monotonic; reinforced concrete retains its frame longer.
  return clamp(1 - Math.exp(-Math.max(0, year) * 0.016 * (config.weatheringRate ?? 1) * exposure / MATERIALS[b.material].resistance), 0, 0.94)
}
export function buildingState(b, model, config, year) {
  const damage = buildingDamage(b, model, config, year), wallLoss = new Float32Array(b.panels.length)
  if (b.type === 'greenhouse') return { id: b.id, damage, wallLoss, roofLoss: new Float32Array(), frameLimits: b.variant === 'conservatory' ? Array.from({ length: 16 }, (_, rib) => Math.max(4, 10 - Math.floor(Math.max(0, damage - 0.35) * (3 + rib % 4) * 1.8)) / 10) : undefined, fallen: 0, opening: 0, integrity: clamp(1 - damage * 0.72) }
  const wallProfiles = b.fractures.map((field) => {
    const t = clamp((damage - field.trigger) / 0.45), collapse = t * t * (3 - 2 * t)
    const original = b.type === 'ruin' ? field.side < 2 ? 0 : field.side === 2 ? 0.45 : 0.76 : 1
    return new Float32Array(field.points.map((p) => Math.max(0, original * b.height * (1 - collapse * (0.12 + p.weakness * 0.84)) - collapse * p.tooth * 0.36)))
  })
  let fallen = 0
  for (const p of b.panels) {
    const height = profileHeight(wallProfiles[p.side], p.u), bottom = p.row / p.rows * b.height
    wallLoss[p.index] = clamp(1 - (height - bottom) / p.size[1])
    if (!p.existingRuin && wallLoss[p.index] >= 1) fallen += 1
  }
  const floorLoss = Array.from({ length: b.floors }, (_, floor) => {
    const level = (floor + 1) / b.floors, loss = new Float32Array(b.roofTiles.length)
    for (const tile of b.roofTiles) {
      const side = Math.abs(Math.abs(tile.x - b.x) - b.width / 2) < Math.abs(Math.abs(tile.z - b.z) - b.depth / 2) ? tile.x > b.x ? 1 : 3 : tile.z > b.z ? 0 : 2
      const shelter = profileHeight(wallProfiles[side], side % 2 === 0 ? (tile.x - b.x) / b.width + 0.5 : (tile.z - b.z) / b.depth + 0.5)
      const supportLoss = clamp(1 - shelter / (b.height * level))
      loss[tile.index] = b.type === 'ruin' ? 1 : clamp((damage * (0.62 + level * 0.38) + supportLoss * 0.6 - tile.threshold) / 0.3)
    }
    pruneSlabIslands(b, loss)
    return loss
  })
  const roofLoss = floorLoss.at(-1)
  const wallOpen = wallLoss.reduce((sum, loss) => sum + loss, 0) / Math.max(1, wallLoss.length)
  const roofOpen = roofLoss.reduce((sum, loss) => sum + loss, 0) / Math.max(1, roofLoss.length)
  const bounds = { x: b.x, z: b.z, width: b.width, depth: b.depth, height: b.height, base: b.base }
  return { id: b.id, damage, bounds, wallProfiles, wallLoss, roofLoss, floorLoss, fallen, opening: clamp(wallOpen * 0.6 + roofOpen * 0.4), integrity: clamp(1 - damage * 0.38 - wallOpen * 0.38 - roofOpen * 0.24) }
}
export function structureSupport(plant, snapshot) {
  if (plant.surface === 'rail' || plant.building === undefined || !snapshot.structures) return 1
  const state = snapshot.structures.find((b) => b.id === plant.building)
  if (plant.frameRib !== undefined && state?.frameLimits) return plant.frameProgress <= state.frameLimits[plant.frameRib] ? 1 : 0
  const loss = plant.roofIndex !== undefined ? state?.roofLoss[plant.roofIndex] : state?.wallLoss[plant.wallIndex]
  if (plant.roofIndex !== undefined) return loss > 0.55 ? 0 : 1
  if (plant.wallIndex !== undefined && state?.bounds && Number.isFinite(plant.y)) {
    const b = state.bounds
    const side = Math.abs(Math.abs(plant.x - b.x) - b.width / 2) < Math.abs(Math.abs(plant.z - b.z) - b.depth / 2) ? plant.x > b.x ? 1 : 3 : plant.z > b.z ? 0 : 2
    return plant.y <= b.base + facadeHeight(b, state, plant.x, plant.z, side) + (plant.progress === undefined ? 0.2 : 0.07) ? 1 : 0
  }
  // Panels are only ecological lookup cells; visible wall boundaries are continuous.
  return loss >= 0.95 ? 0 : 1
}
export const structureStage = (damage) => damage < 0.12 ? 'Surface wear' : damage < 0.3 ? 'Cracks & exposed masonry' : damage < 0.52 ? 'Wall fragments falling' : 'Partial structural loss'
