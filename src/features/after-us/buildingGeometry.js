import { facadeHeight, facadePoint, MATERIALS, profileHeight, roofIndexAt } from './buildingModel.js'
import { clamp, randomFactory } from './worldMath.js'

export function weatherColor(color, amount, target = '#7c8069') {
  const a = Number.parseInt(color.slice(1), 16), b = Number.parseInt(target.slice(1), 16), t = clamp(amount)
  return `#${[16, 8, 0].map((shift) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t).toString(16).padStart(2, '0')).join('')}`
}
const NORMALS = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0]]
function face(vertices, points, normal) {
  for (let i = 1; i < points.length - 1; i += 1) {
    const a = points[0], b = points[i], c = points[i + 1]
    const ab = b.map((v, j) => v - a[j]), ac = c.map((v, j) => v - a[j])
    const dot = (ab[1] * ac[2] - ab[2] * ac[1]) * normal[0] + (ab[2] * ac[0] - ab[0] * ac[2]) * normal[1] + (ab[0] * ac[1] - ab[1] * ac[0]) * normal[2]
    vertices.push(...a, ...(dot >= 0 ? b : c), ...(dot >= 0 ? c : b))
  }
}
function wallSurface(b, side, profile, color, thickness = 0.28) {
  const vertices = [], normal = NORMALS[side]
  for (let i = 0; i < profile.length - 1; i += 1) {
    const u = i / (profile.length - 1), v = (i + 1) / (profile.length - 1)
    const front = [facadePoint(b, side, u, 0, 0), facadePoint(b, side, v, 0, 0), facadePoint(b, side, v, profile[i + 1], 0), facadePoint(b, side, u, profile[i], 0)]
    const back = [facadePoint(b, side, u, 0, -thickness), facadePoint(b, side, v, 0, -thickness), facadePoint(b, side, v, profile[i + 1], -thickness), facadePoint(b, side, u, profile[i], -thickness)]
    face(vertices, front, normal); face(vertices, back, normal.map((v) => -v))
    face(vertices, [front[3], front[2], back[2], back[3]], [0, 1, 0])
    if (i === 0) face(vertices, [front[0], front[3], back[3], back[0]], side % 2 === 0 ? [-1, 0, 0] : [0, 0, -1])
    if (i === profile.length - 2) face(vertices, [front[1], front[2], back[2], back[1]], side % 2 === 0 ? [1, 0, 0] : [0, 0, 1])
  }
  return { vertices, color, kind: 'wall', building: b.id, side, grounded: true, profile: [...profile] }
}
function horizontalSlab(x, y, z, w, d, loss, seed, color, kind, building) {
  const random = randomFactory(seed), corners = []
  // A chamfered, chipped outline replaces rectangular vanishing tiles. It stays
  // full size until cracking has developed, then retreats continuously at edges.
  for (let side = 0; side < 4; side += 1) for (const t of [0.05, 0.5, 0.95]) {
    const inset = loss * loss * (0.06 + random() * 0.32)
    const px = side === 0 ? -0.5 + t : side === 1 ? 0.5 - inset : side === 2 ? 0.5 - t : -0.5 + inset
    const pz = side === 0 ? -0.5 + inset : side === 1 ? -0.5 + t : side === 2 ? 0.5 - inset : 0.5 - t
    corners.push([x + px * w, y - loss * random() * 0.045, z + pz * d])
  }
  const vertices = [], top = [x, y, z], bottom = [x, y - 0.15, z]
  for (let i = 0; i < corners.length; i += 1) {
    const a = corners[i], c = corners[(i + 1) % corners.length], lowA = [a[0], a[1] - 0.15, a[2]], lowC = [c[0], c[1] - 0.15, c[2]]
    face(vertices, [top, a, c], [0, 1, 0]); face(vertices, [bottom, lowC, lowA], [0, -1, 0])
    face(vertices, [a, lowA, lowC, c], [a[0] - x, 0, a[2] - z])
  }
  return { vertices, color, kind, building, support: 'frame' }
}
function plasterPatch(b, side, u, y, w, h, progress, color, random, profile) {
  const points = [], vertices = []
  for (let i = 0; i < 7; i += 1) {
    const a = i / 7 * Math.PI * 2, radius = 0.7 + random() * 0.3
    const pu = clamp(u + Math.cos(a) * w * radius * progress, 0.015, 0.985)
    const py = Math.max(0.08, Math.min(y + Math.sin(a) * h * radius * progress, profileHeight(profile, pu) - 0.045))
    points.push(facadePoint(b, side, pu, py, 0.011))
  }
  face(vertices, points, NORMALS[side])
  return { vertices, color, kind: 'spall', building: b.id, support: 'wall' }
}

function addWallDetails(b, side, profile, damage, material, boxes, tubes, surfaces) {
  const random = randomFactory(b.seed ^ (side * 7121 + 341)), span = side % 2 === 0 ? b.width : b.depth
  const tube = (from, to, radius, color, kind) => tubes.push({ from, to, radius, color, kind, building: b.id, support: 'wall' })
  for (let i = 0; i < Math.ceil(span * 1.7); i += 1) {
    const u = 0.04 + random() * 0.92, y = 0.24 + random() * (b.height - 0.4), threshold = 0.08 + random() * 0.2
    const progress = clamp((damage - threshold) / 0.38), w = (0.16 + random() * 0.38) / span, h = 0.16 + random() * 0.42
    if (progress > 0.03 && y + 0.08 < profileHeight(profile, u)) {
      surfaces.push(plasterPatch(b, side, u, y, w, h, progress, material.exposed, random, profile))
      // Small mortar joints remain on exposed brick, even in late decay.
      for (let course = -1; b.material === 'brick' && course <= 1; course += 1) {
        const py = y + course * 0.14, half = w * progress * 0.65
        if (py > 0.06 && py < Math.min(profileHeight(profile, u - half), profileHeight(profile, u + half)) - 0.05) tube(facadePoint(b, side, u - half, py, 0.018), facadePoint(b, side, u + half, py, 0.018), 0.008, '#cab69a', 'mortar')
      }
    }
  }
  // Long, branching fractures grow from stable seeded origins; they are visible
  // well before any masonry falls. Each segment is clipped to the surviving wall.
  for (let crack = 0; crack < Math.ceil(span * 0.8); crack += 1) {
    const originU = 0.08 + random() * 0.84, originY = b.height * (0.15 + random() * 0.7), start = 0.05 + random() * 0.15
    const progress = clamp((damage - start) / 0.42), direction = random() > 0.5 ? 1 : -1
    const path = Array.from({ length: 10 }, (_, i) => [clamp(originU + direction * i * 0.055 / span + Math.sin(i * 2.3 + crack) * 0.045 / span, 0.015, 0.985), originY + i * (0.11 + b.height * 0.014)])
    for (let step = 1; step < path.length; step += 1) {
      const amount = clamp(progress * (path.length - 1) - step + 1)
      if (amount <= 0) continue
      const a = path[step - 1], end = path[step], c = a.map((v, j) => v + (end[j] - v) * amount)
      if (a[1] >= profileHeight(profile, a[0]) - 0.035 || c[1] >= profileHeight(profile, c[0]) - 0.035) continue
      tube(facadePoint(b, side, ...a, 0.02), facadePoint(b, side, ...c, 0.02), (0.008 + damage * 0.022) * (1 - step * 0.035), '#786b59', 'crack')
      if (step % 3 === 0) {
        const fork = [clamp(c[0] - direction * 0.12 / span, 0.01, 0.99), c[1] + 0.1]
        if (fork[1] < profileHeight(profile, fork[0])) tube(facadePoint(b, side, ...c, 0.02), facadePoint(b, side, ...fork, 0.02), 0.008 + damage * 0.01, '#786b59', 'crack')
      }
    }
  }
  for (let i = 1; i < profile.length - 1; i += 2) {
    const u = i / (profile.length - 1), y = profile[i]
    if (y < 0.1 || y > b.height - 0.02) continue
    const a = facadePoint(b, side, u, y - 0.12, 0), bend = facadePoint(b, side, u + 0.015, y + 0.12 + random() * 0.16, 0.015)
    tube(a, bend, 0.012, '#776b54', 'rebar')
    tube(bend, facadePoint(b, side, u + 0.025, bend[1] - b.base + 0.045, 0.12), 0.011, '#8d7058', 'rebar')
    if (b.material === 'brick') {
      const center = facadePoint(b, side, u, y - 0.07, 0.015)
      boxes.push({ position: center, size: side % 2 === 0 ? [0.2, 0.1, 0.3] : [0.3, 0.1, 0.2], color: material.exposed, rotation: [0, 0, 0], kind: 'edgeBrick', building: b.id, support: 'wall' })
    }
  }
}

export function rubbleHeight(pile, x, z) {
  const r = ((x - pile.x) / pile.rx) ** 2 + ((z - pile.z) / pile.rz) ** 2
  return pile.height * Math.max(0, 1 - r) ** 1.6
}
export function rubbleSurfaceY(pile, x, z) {
  for (let i = 0; i < pile.rim.length; i += 1) {
    const a = pile.top, b = pile.rim[i], c = pile.rim[(i + 1) % pile.rim.length]
    const denominator = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2])
    const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / denominator
    const v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / denominator
    if (u >= -0.0001 && v >= -0.0001 && u + v <= 1.0001) return u * a[1] + v * b[1] + (1 - u - v) * c[1]
  }
  return null
}
function rubblePile(b, side, profile, damage, ground, detailed, material) {
  const random = randomFactory(b.seed ^ (side * 179 + 3119)), span = side % 2 === 0 ? b.width : b.depth
  const original = b.type === 'ruin' ? side < 2 ? 0 : side === 2 ? 0.45 : 0.76 : 1
  const missing = profile.reduce((sum, h) => sum + Math.max(0, b.height * original - h), 0) / profile.length * span
  const spall = Math.max(0, damage - 0.15) * span * 0.12
  const volume = missing * 0.28 * 1.3 + spall
  if (volume < 0.035) return null
  const weights = profile.map((h) => Math.max(0.01, original * b.height - h)), weight = weights.reduce((a, c) => a + c, 0)
  const u = weights.reduce((sum, w, i) => sum + w * i / (profile.length - 1), 0) / weight
  const landing = facadePoint(b, side, u, 0, 0.6), normal = NORMALS[side]
  const radius = Math.min(span * 0.5, 0.62 + Math.sqrt(volume) * 0.48)
  const pile = { id: `${b.id}/${side}`, building: b.id, side, x: landing[0], z: landing[2], rx: side % 2 ? radius * 0.75 : radius, rz: side % 2 ? radius : radius * 0.75, height: clamp(volume / (Math.PI * radius * radius) * 1.9, 0.07, 0.85), volume }
  const vertices = [], segments = detailed ? 14 : 8, center = [pile.x, ground(pile.x, pile.z) + pile.height, pile.z]
  const rim = Array.from({ length: segments }, (_, i) => {
    const angle = i / segments * Math.PI * 2, r = 0.88 + random() * 0.12, x = pile.x + Math.cos(angle) * pile.rx * r, z = pile.z + Math.sin(angle) * pile.rz * r
    return [x, ground(x, z) + rubbleHeight(pile, x, z), z]
  })
  pile.top = center; pile.rim = rim
  for (let i = 0; i < segments; i += 1) face(vertices, [center, rim[i], rim[(i + 1) % segments]], [0, 1, 0])
  const surface = { vertices, color: weatherColor(material.wall, 0.38, '#8c8673'), kind: 'rubbleMound', building: b.id, support: 'ground' }
  const debris = [], count = Math.min(detailed ? 45 : 12, Math.max(2, Math.floor(volume * (detailed ? 25 : 8))))
  for (let i = 0; i < count; i += 1) {
    const angle = random() * Math.PI * 2, r = Math.sqrt(random()) * 0.83
    const x = pile.x + Math.cos(angle) * pile.rx * r, z = pile.z + Math.sin(angle) * pile.rz * r
    const large = i % 7 === 0, w = (large ? 0.38 : 0.12) + random() * (large ? 0.28 : 0.24), h = 0.05 + random() * (large ? 0.22 : 0.12), d = 0.12 + random() * 0.28
    const supportY = rubbleSurfaceY(pile, x, z)
    if (supportY === null) continue
    debris.push({ id: `${pile.id}/${i}`, building: b.id, position: [x, supportY + h / 2, z], size: [w, h, d], rotation: [0, random() * Math.PI * 2, 0], color: i % 3 === 0 ? material.exposed : i % 3 === 1 ? '#baa58b' : weatherColor(material.wall, 0.25), supportY, pile: pile.id,
      fallFrom: [x - normal[0] * (0.4 + r), b.base + Math.max(0.6, profileHeight(profile, u)) + 0.4 + random(), z - normal[2] * (0.4 + r)] })
  }
  return { pile, surface, debris }
}

export function createBuildingShell(b, state, detailed, ground) {
  const boxes = [], tubes = [], surfaces = [], debris = [], piles = [], material = { ...MATERIALS[b.material], wall: b.wallColor || MATERIALS[b.material].wall }, damage = state?.damage || 0
  const add = (position, size, color, kind = 'structure', rotation = [0, 0, 0], support = 'frame') => boxes.push({ position, size, color, kind, rotation, building: b.id, support })
  if (b.variant !== 'conservatory') add([b.x, b.base + 0.06, b.z], [b.width + 0.35, 0.18, b.depth + 0.35], '#9f9b88', 'foundation')
  if (b.type === 'greenhouse') return { boxes, tubes, surfaces, debris, piles }
  for (let side = 0; side < 4; side += 1) {
    const original = b.type === 'ruin' ? side < 2 ? 0 : side === 2 ? 0.45 : 0.76 : 1
    const profile = state?.wallProfiles?.[side] || new Float32Array(b.fractures[side].points.length).fill(b.height * original)
    if (profile.some((h) => h > 0.03)) {
      surfaces.push(wallSurface(b, side, profile, weatherColor(material.wall, damage * 0.24)))
      if (detailed) addWallDetails(b, side, profile, damage, material, boxes, tubes, surfaces)
    }
    const rubble = rubblePile(b, side, profile, damage, ground, detailed, material)
    if (rubble) { piles.push(rubble.pile); surfaces.push(rubble.surface); debris.push(...rubble.debris) }
  }
  // Corner posts form an explicit continuous load path from slab to foundation.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const height = b.height * (b.type === 'ruin' && sx === sz ? 0.76 : 1)
    add([b.x + sx * (b.width / 2 - 0.15), b.base + height / 2, b.z + sz * (b.depth / 2 - 0.15)], [0.24, height, 0.24], weatherColor('#b0ab97', damage * 0.25), 'frame')
  }
  if (b.type !== 'ruin') {
    const beam = (a, c, floor) => {
      const dx = c[0] - a[0], dz = c[2] - a[2], length = Math.hypot(dx, dz)
      if (length < 0.001) return
      add([(a[0] + c[0]) / 2, a[1], (a[2] + c[2]) / 2], [length + 0.03, 0.11, 0.11], '#858774', 'slabBeam', [0, -Math.atan2(dz, dx), 0])
      boxes.at(-1).floor = floor
    }
    for (let floor = 1; floor <= b.floors; floor += 1) for (const tile of b.roofTiles) {
      const roof = floor === b.floors, loss = state?.floorLoss?.[floor - 1]?.[tile.index] || 0
      if (loss >= 1) continue
      const y = b.base + b.height * floor / b.floors
      surfaces.push({ ...horizontalSlab(tile.x, y + 0.11, tile.z, tile.width, tile.depth, loss, b.seed ^ (tile.index * 71 + floor * 1301), weatherColor('#aaa695', damage * 0.24 + loss * 0.12), roof ? 'roof' : 'floor', b.id), tile: tile.index, floor })
      const nx = Math.ceil(b.width / 1.5), nz = Math.ceil(b.depth / 1.5), col = tile.index % nx, row = Math.floor(tile.index / nx)
      for (const next of [col + 1 < nx ? tile.index + 1 : -1, row + 1 < nz ? tile.index + nx : -1]) {
        if (next < 0 || (state?.floorLoss?.[floor - 1]?.[next] || 0) >= 1) continue
        const neighbor = b.roofTiles[next]
        beam([tile.x, y - 0.08, tile.z], [neighbor.x, y - 0.08, neighbor.z], floor)
      }
      if ((col === 0 || col === nx - 1) && (row === 0 || row === nz - 1)) beam([tile.x, y - 0.08, tile.z], [b.x + (col === 0 ? -1 : 1) * (b.width / 2 - 0.15), y - 0.08, b.z + (row === 0 ? -1 : 1) * (b.depth / 2 - 0.15)], floor)
    }
    // Parapets are retained only where the entire wall still meets the roof.
    for (const p of b.panels.filter((panel) => b.roofForm === 'flat' && panel.row === panel.rows - 1)) {
      const height = state?.wallProfiles ? profileHeight(state.wallProfiles[p.side], p.u) : b.height
      if (height < b.height - 0.06) continue
      add([p.position[0], b.base + b.height + 0.31, p.position[2]], [p.size[0], 0.48, p.size[2]], weatherColor(material.wall, damage * 0.3), 'roof')
    }
  }
  return { boxes, tubes, surfaces, debris, piles }
}

export function decorationSupported(part, b, state) {
  if (!state || part.support || b.type === 'greenhouse') return true
  if (part.roofSupports) return part.roofSupports.every(([x, z]) => state.roofLoss[roofIndexAt(b, x, z)] < 0.55)
  const center = part.position || part.from.map((v, i) => (v + part.to[i]) / 2)
  const points = part.position ? [-1, 0, 1].flatMap((sx) => [-1, 0, 1].map((sz) => [center[0] + sx * part.size[0] / 2, center[1] + part.size[1] / 2, center[2] + sz * part.size[2] / 2])) : [part.from, center, part.to]
  if (center[1] >= b.base + b.height - 0.12 && b.type !== 'ruin') return points.every(([x, , z]) => state.roofLoss[roofIndexAt(b, x, z)] < 0.55)
  const side = Math.abs(Math.abs(center[0] - b.x) - b.width / 2) < Math.abs(Math.abs(center[2] - b.z) - b.depth / 2) ? center[0] > b.x ? 1 : 3 : center[2] > b.z ? 0 : 2
  const ends = part.position ? [points[0], points.at(-1)] : [part.from, part.to]
  const span = Math.hypot(ends[1][0] - ends[0][0], ends[1][2] - ends[0][2]), steps = Math.ceil(span / 0.3)
  for (let i = 1; i < steps; i += 1) points.push(ends[0].map((value, j) => value + (ends[1][j] - value) * i / steps))
  return points.every(([x, y, z]) => y <= b.base + facadeHeight(b, state, x, z, side) + 0.025)
}

export function trimSupportedDecoration(part, b, state) {
  if (!state || part.support || part.roofSupports || b.type === 'greenhouse' || !part.from || Math.hypot(part.from[0] - part.to[0], part.from[2] - part.to[2]) > 0.06) return part
  const [x, , z] = part.from
  const side = Math.abs(Math.abs(x - b.x) - b.width / 2) < Math.abs(Math.abs(z - b.z) - b.depth / 2) ? x > b.x ? 1 : 3 : z > b.z ? 0 : 2
  const top = b.base + facadeHeight(b, state, x, z, side) + 0.015
  if (Math.min(part.from[1], part.to[1]) > top - 0.06) return null
  return { ...part, from: [x, Math.min(part.from[1], top), z], to: [part.to[0], Math.min(part.to[1], top), part.to[2]] }
}
