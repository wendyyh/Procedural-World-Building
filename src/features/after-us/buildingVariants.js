import { roofIndexAt, roofSurfaceAt } from './buildingModel.js'
import { weatherColor } from './buildingGeometry.js'

const quad = (a, b, c, d) => [...a, ...b, ...c, ...a, ...c, ...d]

export function roofVariants(b, state, detailed) {
  const surfaces = [], tubes = [], boxes = [], damage = state?.damage || 0
  if (b.roofForm === 'flat') return { surfaces, tubes, boxes }
  const industrial = b.roofForm === 'sawtooth', bays = Math.max(2, Math.round(b.width / 2))
  const creases = industrial ? Array.from({ length: bays }, (_, i) => [i / bays, (i + 0.8) / bays, (i + 1) / bays]).flat() : [0, 0.5, 1]
  const roofColor = weatherColor(industrial ? '#839797' : ['#a47f69', '#8b9991', '#af9581'][b.seed % 3], damage * 0.3)
  const point = (x, z) => [x, roofSurfaceAt(b, x, z), z]
  for (const tile of b.roofTiles) {
    if ((state?.roofLoss[tile.index] || 0) >= 0.55) continue
    const lo = tile.x - tile.width / 2, hi = tile.x + tile.width / 2, front = tile.z + tile.depth / 2, back = tile.z - tile.depth / 2
    const cuts = [lo, ...creases.map((u) => b.x + (u - 0.5) * b.width).filter((x) => x > lo + 0.0001 && x < hi - 0.0001), hi].sort((a, c) => a - c)
    for (let i = 0; i < cuts.length - 1; i += 1) {
      const a = cuts[i], c = cuts[i + 1]
      surfaces.push({ vertices: quad(point(a, back), point(a, front), point(c, front), point(c, back)), color: roofColor, kind: 'roof', building: b.id, tile: tile.index, support: 'roof' })
      // Each roof patch has a strut on its surviving slab; late decay cannot
      // leave a pitched skin detached above a missing floor plate.
      const x = (a + c) / 2
      tubes.push({ from: [x, b.base + b.height, tile.z], to: point(x, tile.z), radius: 0.035, color: '#827765', building: b.id, support: 'roof' })
      if (detailed) for (const z of [back + 0.03, tile.z, front - 0.03]) tubes.push({ from: point(a, z).map((v, j) => j === 1 ? v + 0.018 : v), to: point(c, z).map((v, j) => j === 1 ? v + 0.018 : v), radius: 0.014, color: '#b5b2a0', kind: 'roofSeam', building: b.id, support: 'roof' })
      // Close exposed gable ends with faded timber panels.
      for (const z of [back, front]) if (Math.abs(z - b.z) >= b.depth / 2 - 0.001) surfaces.push({ vertices: quad([a, b.base + b.height, z], point(a, z), point(c, z), [c, b.base + b.height, z]), color: weatherColor(b.wallColor, damage * 0.3), kind: 'gable', building: b.id, tile: tile.index, support: 'roof' })
    }
  }
  const x = b.x - b.width * 0.22, z = b.z - b.depth * 0.23, tile = roofIndexAt(b, x, z)
  if (detailed && (state?.roofLoss[tile] || 0) < 0.55) {
    const y = roofSurfaceAt(b, x, z)
    boxes.push({ position: [x, y + 0.34, z], size: [0.38, 0.7, 0.4], color: '#a28d76', building: b.id, roofSupports: [[x, z]], kind: 'chimney' })
    boxes.push({ position: [x, y + 0.72, z], size: [0.49, 0.1, 0.51], color: '#8c8d7e', building: b.id, roofSupports: [[x, z]], kind: 'chimney' })
  }
  return { surfaces, tubes, boxes }
}

export function conservatory(b, state, detailed) {
  const surfaces = [], tubes = [], glazing = [], damage = state?.damage || 0, ribs = 16, steps = 10
  const point = (angle, t, scale = 1) => [b.x + Math.cos(angle) * b.width / 2 * Math.cos(t * Math.PI / 2) * scale, b.base + 0.4 + Math.sin(t * Math.PI / 2) * b.height, b.z + Math.sin(angle) * b.depth / 2 * Math.cos(t * Math.PI / 2) * scale]
  const liveSteps = (rib) => state?.frameLimits ? Math.round(state.frameLimits[rib] * steps) : steps
  for (let rib = 0; rib < ribs; rib += 1) {
    const angle = rib / ribs * Math.PI * 2, next = (rib + 1) / ribs * Math.PI * 2
    const outerA = point(angle, 0, 1.035), outerB = point(next, 0, 1.035), lower = (p) => [p[0], b.base - 0.03, p[2]]
    surfaces.push({ vertices: quad(lower(outerA), outerA, outerB, lower(outerB)), color: rib % 3 ? '#a4a58f' : '#b2ae97', kind: 'foundation', building: b.id, support: 'ground' })
    for (let step = 0; step < liveSteps(rib); step += 1) {
      const a = point(angle, step / steps), c = point(angle, (step + 1) / steps)
      tubes.push({ from: a, to: c, radius: 0.043, color: '#7a806b', building: b.id, support: 'frame' })
      if (step % 2 === 0 && step < liveSteps((rib + 1) % ribs)) tubes.push({ from: a, to: point(next, step / steps), radius: 0.029, color: '#918271', building: b.id, support: 'frame' })
      if (detailed && step < liveSteps((rib + 1) % ribs) && (rib * 13 + step * 7) % 17 > 3 + damage * 12) glazing.push({ vertices: quad(a, c, point(next, (step + 1) / steps), point(next, step / steps)), color: '#a3beb4', kind: 'window', building: b.id })
    }
  }
  return { surfaces, tubes, glazing }
}
