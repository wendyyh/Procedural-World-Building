import { clamp, randomFactory, seedNumber } from './worldMath.js'

export const SEEDS = Object.freeze({
  meadow: { name: 'Wild meadow', species: 'clover', type: 'pioneers', color: '#a8af79', hint: 'A soft carpet of clover, grass, and small flowers. Give it open ground.' },
  fern: { name: 'Woodland fern', species: 'fern', type: 'shrubs', color: '#77966d', hint: 'Lush fronds favor damp ground and the shade beside your buildings.' },
  ivy: { name: 'Climbing ivy', species: 'ivy', type: 'vines', color: '#587d60', hint: 'Click a building to plant at its base. Its walls become a climbing route.' },
  birch: { name: 'Silver birch', species: 'birch', type: 'trees', color: '#bac399', hint: 'One seed becomes one tree. Leave space for its canopy and roots.' },
})

// Authored plants keep their own random stream and planting time. Adding another
// seed never shuffles an existing patch, and an empty parcel never grows itself.
export function plantedCandidates(model, generated, stems, ground) {
  const candidates = { pioneers: [], shrubs: [], trees: [], vines: [], roof: [], flowers: [] }
  const activeStems = []
  for (const source of model.plantedSeeds) {
    const seed = SEEDS[source.kind]
    if (!seed) continue
    const random = randomFactory(seedNumber(`${model.tileSeed}/plant/${source.id}`))
    const common = { sourceId: source.id, plantedAt: source.plantedAt, authored: true, rank: 0, species: seed.species }
    if (source.kind === 'ivy') {
      const host = model.buildings.find((b) => b.authoredId === source.buildingId)
      if (!host) continue
      candidates.vines.push(...generated.vines.filter((p) => p.building === host.id).map((p) => ({ ...p, ...common })))
      activeStems.push(...stems.filter((s) => s.building === host.id))
      continue
    }
    const count = source.kind === 'birch' ? 1 : source.kind === 'fern' ? 24 : 95
    const radius = source.kind === 'fern' ? 2.6 : 3.5
    for (let n = 0; n < count; n += 1) {
      const angle = random() * Math.PI * 2, distance = n === 0 ? 0 : Math.sqrt(random()) * radius
      const x = source.x + Math.cos(angle) * distance, z = source.z + Math.sin(angle) * distance
      const variation = random(), rotation = random() * Math.PI * 2
      if (Math.max(Math.abs(x), Math.abs(z)) > 9.2) continue
      const cell = Math.round(z + 12) * 25 + Math.round(x + 12)
      if (model.heights[cell] < -0.2 || model.barrier[cell] > 0.8) continue
      const plant = { ...common, x, z, y: ground(x, z), cell, distance, variation, rotation, siteMoisture: model.moisture[cell], siteLight: model.light[cell] }
      if (source.kind === 'meadow' && n % 5 === 0) {
        candidates.flowers.push({ ...plant, flowerColor: n % 2 ? '#d7cfab' : '#c79e9b' })
      } else candidates[seed.type].push({ ...plant, species: source.kind === 'meadow' && n % 3 === 0 ? 'grass' : seed.species })
    }
  }
  return { candidates, stems: activeStems }
}

export function seedMaturity(source, year, config) {
  if (year < source.plantedAt) return 0
  return clamp(0.1 + (1 - Math.exp(-(year - source.plantedAt) * 0.13 * config.growthRate)) * 0.9)
}

export function plantedGroundCover(model, config, year) {
  const cover = new Float32Array(625)
  for (const source of model.plantedSeeds) {
    if (source.kind === 'ivy' || source.kind === 'birch' || year < source.plantedAt) continue
    const maturity = seedMaturity(source, year, config), radius = 0.6 + maturity * (source.kind === 'fern' ? 2 : 3)
    for (let i = 0; i < cover.length; i += 1) {
      if (model.barrier[i] > 0.8 || model.heights[i] < -0.2) continue
      const distance = Math.hypot(i % 25 - 12 - source.x, Math.floor(i / 25) - 12 - source.z)
      cover[i] = Math.max(cover[i], clamp(1 - distance / radius) * maturity)
    }
  }
  return cover
}
