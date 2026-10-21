import { canalX, CHUNK_SIZE, railZ, randomFactory, terrainAt } from './worldModel.js'
import { createBuildingShell, decorationSupported, trimSupportedDecoration, weatherColor } from './buildingGeometry.js'
import { conservatory, roofVariants } from './buildingVariants.js'

export function createArchitecture(model, detailed = true, snapshot) {
  const boxes = [], tubes = [], glass = [], surfaces = [], glazing = [], debris = [], piles = []
  let currentBuilding = null, roofSupports
  const random = randomFactory(model.tileSeed ^ 51913)
  const box = (position, size, color, kind = 'structure', rotation = [0, 0, 0]) => boxes.push({ position, size, color, kind, rotation, building: currentBuilding?.id, roofSupports })
  const tube = (from, to, radius, color, kind = 'structure', support) => tubes.push({ from, to, radius, color, kind, support, building: currentBuilding?.id, roofSupports })
  const supportedFootprint = (x, z, w, d) => [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [x + sx * w, z + sz * d]))
  const cylinder = (x, y, z, radius, height, color) => tube([x, y - height / 2, z], [x, y + height / 2, z], radius, color)
  const ground = (x, z) => terrainAt(model.ox + x, model.oz + z, model.seed)
  const chair = (x, y, z, color) => {
    const previousSupport = roofSupports
    if (currentBuilding && y >= currentBuilding.base + currentBuilding.height) roofSupports = supportedFootprint(x, z, 0.24, 0.24)
    box([x, y + 0.45, z], [0.48, 0.06, 0.48], color)
    box([x, y + 0.76, z - 0.22], [0.48, 0.55, 0.045], color)
    for (const dx of [-0.19, 0.19]) for (const dz of [-0.19, 0.19]) cylinder(x + dx, y + 0.22, z + dz, 0.018, 0.45, '#8e8c7b')
    roofSupports = previousSupport
  }

  for (const b of model.buildings) {
    currentBuilding = b; roofSupports = undefined
    const state = snapshot?.structures?.find((entry) => entry.id === b.id), damage = state?.damage || 0
    const { x, z, width: w, depth: d, height: h, base: y } = b
    const shell = createBuildingShell(b, state, detailed, ground)
    boxes.push(...shell.boxes); tubes.push(...shell.tubes); surfaces.push(...shell.surfaces); debris.push(...shell.debris); piles.push(...shell.piles)
    if (b.variant === 'conservatory') {
      const dome = conservatory(b, state, detailed)
      surfaces.push(...dome.surfaces); tubes.push(...dome.tubes); glazing.push(...dome.glazing)
      continue
    }
    if (b.type !== 'greenhouse' && b.type !== 'ruin') {
      const roof = roofVariants(b, state, detailed)
      surfaces.push(...roof.surfaces); tubes.push(...roof.tubes); boxes.push(...roof.boxes)
    }
    if (b.type === 'ruin') {
      if (b.variant === 'broken-hall') for (const rz of [z - d / 2, z, z + d / 2]) {
        tube([x - w / 2 + 0.15, y, rz], [x - w / 2 + 0.15, y + h, rz], 0.055, '#8d775b', 'structure', 'frame')
        tube([x + w / 2 - 0.15, y, rz], [x + w / 2 - 0.15, y + h, rz], 0.055, '#8d775b', 'structure', 'frame')
        tube([x - w / 2 + 0.15, y + h, rz], [x, y + h + 0.8, rz], 0.06, '#8d775b', 'structure', 'frame')
        tube([x, y + h + 0.8, rz], [x + w / 2 - 0.15, y + h, rz], 0.06, '#8d775b', 'structure', 'frame')
      }
      tube([x - w / 2, y + h, z + d / 2], [x + w / 2, y + h * 0.78, z + d / 2], 0.07, '#8d775b', 'structure', 'frame')
      if (detailed) {
        for (let i = 0; i < 7; i += 1) tube([x - w / 2 + i * w / 6, y + 0.15, z + d / 2], [x - w / 2 + i * w / 6, y + h * 0.82, z + d / 2], 0.025, '#797f60', 'structure', 'frame')
        for (let i = 0; i < 6; i += 1) tube([x - w / 2, y + 0.3 + i * h * 0.13, z + d / 2], [x + w / 2, y + 0.3 + i * h * 0.13, z + d / 2], 0.025, '#797f60', 'structure', 'frame')
        for (let i = 0; i < 12; i += 1) box([x - w * 0.4 + (i % 4) * w * 0.24, y + 0.4 + Math.floor(i / 4) * 0.24, z - d / 2 + 0.18], [0.4, 0.14, 0.06], i % 3 ? '#b48366' : '#9c9774')
      }
      continue
    }
    if (b.type === 'greenhouse') {
      box([x, y + 0.25, z], [w, 0.5, d], '#9b9a83')
      const ribs = detailed ? 6 : 3
      for (let rib = 0; rib < ribs; rib += 1) {
        const rz = z + (rib / (ribs - 1) - 0.5) * d
        for (let segment = 0; segment < 12; segment += 1) {
          const a = segment / 12 * Math.PI, a2 = (segment + 1) / 12 * Math.PI
          if ((detailed && (rib + segment) % 13 === 8) || (damage > 0.45 && (rib * 7 + segment * 3) % 11 < (damage - 0.4) * 8)) continue
          tube([x + Math.cos(a) * w / 2, y + 0.4 + Math.sin(a) * h, rz], [x + Math.cos(a2) * w / 2, y + 0.4 + Math.sin(a2) * h, rz], 0.045, '#746b52')
        }
      }
      for (const a of [0.25, 0.65, 1.05, 1.55, 2.1, 2.65, 2.95]) tube([x + Math.cos(a) * w / 2, y + 0.4 + Math.sin(a) * h, z - d / 2], [x + Math.cos(a) * w / 2, y + 0.4 + Math.sin(a) * h, z + d / 2], 0.035, '#8e795a')
      if (detailed) {
        for (let i = 0; i < 9; i += 1) {
          const a = 0.4 + (i % 3) * 0.67
          if (damage > 0.12 + (i * 7 % 9) * 0.07) continue
          glass.push({ building: b.id, position: [x + Math.cos(a) * w * 0.47, y + 0.4 + Math.sin(a) * h, z - d * 0.3 + Math.floor(i / 3) * d * 0.3], size: [w * 0.37, 0.035, d * 0.27], color: '#99b8ad', rotation: [0, 0, a - Math.PI / 2] })
        }
        for (const side of [-1, 1]) for (let i = 0; i < 3; i += 1) box([x + side * w * 0.31, y + 0.56, z + (i - 1) * d * 0.27], [w * 0.28, 0.24, d * 0.2], '#858663')
      }
      continue
    }

    if (!detailed) {
      for (let floor = 0; floor < b.floors; floor += 1) for (let col = 0; col < 3; col += 1) {
        box([x + (col - 1) * w * 0.29, y + 1 + floor * (h - 0.8) / b.floors, z + d / 2 + 0.03], [0.72, 0.85, 0.045], '#7a8c80', 'window')
      }
      continue
    }

    for (let floor = 0; floor < b.floors; floor += 1) {
      const wy = y + 0.75 + floor * (h - 0.8) / b.floors
      const cols = Math.max(2, Math.round(w / (b.variant === 'workshop' ? 2 : 1.8)))
      for (let col = 0; col < cols; col += 1) {
        const wx = x + (col / (cols - 1) - 0.5) * w * 0.73
        const missing = (floor + col + model.tileSeed) % 7 === 0
        box([wx, wy + 0.35, z + d / 2 + 0.025], [0.87, 1.05, 0.08], '#dfcbb1')
        box([wx, wy + 0.35, z + d / 2 + 0.075], [0.7, 0.88, 0.035], missing ? '#696c5d' : '#657f7a', 'window')
        if (missing) for (let plank = 0; plank < 3; plank += 1) box([wx, wy + 0.1 + plank * 0.23, z + d / 2 + 0.12], [0.8, 0.13, 0.055], '#9b8566', 'structure', [0, 0, -0.1])
        else box([wx, wy + 0.35, z + d / 2 + 0.12], [0.035, 0.88, 0.04], '#c4c3ab')
        if ((floor + col) % 3 === 0) {
          box([wx + 0.48, wy - 0.33, z + d / 2 + 0.28], [0.86, 0.5, 0.5], '#b6b9ab')
          tube([wx + 0.43, wy - 0.32, z + d / 2 + 0.52], [wx + 0.43, wy - 0.32, z + d / 2 + 0.55], 0.17, '#7e897f')
          for (let slot = 0; slot < 4; slot += 1) box([wx + 0.77, wy - 0.48 + slot * 0.09, z + d / 2 + 0.54], [0.16, 0.025, 0.035], '#7e897f')
        }
      }
      for (let col = 0; col < 3; col += 1) {
        const wz = z + (col - 1) * d * 0.28
        box([x + w / 2 + 0.025, wy + 0.35, wz], [0.08, 1.02, 0.85], '#d6c8b2')
        box([x + w / 2 + 0.075, wy + 0.35, wz], [0.035, 0.84, 0.67], '#6e8580', 'window')
      }
      box([x, wy + 1.02, z + d / 2 + 0.035], [w, 0.095, 0.11], '#aa8f79')
    }
    for (const side of [-1, 1]) {
      tube([x + side * (w / 2 - 0.18), y + 0.15, z + d / 2 + 0.2], [x + side * (w / 2 - 0.18), y + h + 0.6, z + d / 2 + 0.2], 0.045, '#7e826f')
    }
    if (b.variant === 'arcade') {
      // Repeated curved entry surrounds distinguish old civic courtyard blocks.
      for (let bay = 0; bay < Math.max(2, Math.floor(w / 1.8)); bay += 1) {
        const count = Math.max(2, Math.floor(w / 1.8)), cx = x + ((bay + 0.5) / count - 0.5) * w * 0.92, az = z + d / 2 + 0.12, r = w / count * 0.32
        box([cx, y + 0.66, az - 0.04], [r * 1.8, 1.25, 0.08], '#6f7e73', 'window')
        for (const side of [-1, 1]) tube([cx + side * r, y + 0.08, az], [cx + side * r, y + 1.15, az], 0.065, '#c5baa1')
        for (let segment = 0; segment < 10; segment += 1) {
          const a = segment / 10 * Math.PI, a2 = (segment + 1) / 10 * Math.PI
          tube([cx + Math.cos(a) * r, y + 1.15 + Math.sin(a) * r, az], [cx + Math.cos(a2) * r, y + 1.15 + Math.sin(a2) * r, az], 0.065, '#c5baa1')
        }
      }
    }
    if (b.roofForm !== 'flat') continue
    roofSupports = supportedFootprint(x + w * 0.24, z - d * 0.24, w * 0.17, d * 0.195)
    box([x + w * 0.24, y + h + 0.65, z - d * 0.24], [w * 0.3, 1.2, d * 0.34], '#aaa18d')
    box([x + w * 0.24, y + h + 1.29, z - d * 0.24], [w * 0.34, 0.12, d * 0.39], '#939a87')
    box([x + w * 0.24, y + h + 0.58, z - d * 0.06], [0.52, 1.06, 0.06], '#69776b', 'window')
    roofSupports = undefined
    for (let step = 0; step < 6; step += 1) box([x + w * 0.23, y + h + step * 0.15, z + d * 0.21 - step * 0.25], [0.84, 0.15, 0.28], '#bab4a0', 'roof')
    const tankX = x - w * 0.27, tankZ = z - d * 0.25
    roofSupports = supportedFootprint(tankX, tankZ, 0.69, 0.69)
    cylinder(tankX, y + h + 1, tankZ, 0.65, 1.35, '#8b998e')
    cylinder(tankX, y + h + 1.72, tankZ, 0.69, 0.1, '#6c7b71')
    for (const side of [-1, 1]) tube([tankX + side * 0.42, y + h + 0.1, tankZ], [tankX + side * 0.42, y + h + 0.7, tankZ], 0.035, '#706e5b')
    roofSupports = undefined
    chair(x - 0.6, y + h + 0.18, z + 0.45, '#c1c1a7')
    chair(x + 0.65, y + h + 0.18, z + 0.85, '#879a8b')
    roofSupports = supportedFootprint(x + 0.02, z + 0.42, 0.48, 0.48)
    cylinder(x + 0.02, y + h + 0.54, z + 0.42, 0.035, 0.65, '#858877')
    cylinder(x + 0.02, y + h + 0.9, z + 0.42, 0.48, 0.065, '#c5bdab')
    for (let pot = 0; pot < 5; pot += 1) {
      const potX = x - w * 0.35 + pot * w * 0.17, potZ = z + d * 0.34
      roofSupports = supportedFootprint(potX, potZ, 0.2, 0.2)
      cylinder(potX, y + h + 0.37, potZ, 0.17 + (pot % 2) * 0.04, 0.38, '#ad795b')
    }
    roofSupports = [[x - w * 0.39, z + d * 0.36], [x + w * 0.39, z + d * 0.36]]
    for (const side of [-1, 1]) {
      tube([x + side * w * 0.39, y + h + 0.3, z + d * 0.36], [x + side * w * 0.39, y + h + 1.8, z + d * 0.36], 0.04, '#8b795d')
    }
    tube([x - w * 0.39, y + h + 1.68, z + d * 0.36], [x + w * 0.39, y + h + 1.68, z + d * 0.36], 0.012, '#6c6d58')
    for (let cloth = 0; cloth < 4; cloth += 1) box([x - w * 0.24 + cloth * w * 0.16, y + h + 1.28, z + d * 0.36], [w * 0.11, 0.68 + (cloth % 2) * 0.18, 0.035], ['#c6b4ad', '#c3b99a', '#768687', '#a47e72'][cloth])
    roofSupports = undefined
    if (b.type === 'apartment') {
      const trellisZ = z + d / 2 + 0.23
      for (let col = 0; col < 5; col += 1) tube([x - w * 0.37 + col * 0.48, y + 1.8, trellisZ], [x - w * 0.37 + col * 0.48, y + h, trellisZ], 0.024, '#686f59')
      for (let row = 0; row < 8; row += 1) tube([x - w * 0.37, y + 1.8 + row * 0.42, trellisZ], [x - w * 0.37 + 1.92, y + 1.8 + row * 0.42, trellisZ], 0.024, '#686f59')
    }
  }

  currentBuilding = null; roofSupports = undefined

  // Shared-coordinate road markings and rail decks continue across district edges.
  box([0, 0.29, -10.65], [CHUNK_SIZE, 0.09, 2.6], '#8c9288', 'road')
  box([-10.65, 0.29, 0], [2.6, 0.09, CHUNK_SIZE], '#8c9288', 'road')
  if (detailed) for (let i = 0; i < 9; i += 1) {
    if (i % 4 !== model.tileSeed % 4) box([-11 + i * 2.8, 0.344, -10.65], [1.2, 0.014, 0.055], '#c6bda2', 'road')
    box([-10.65, 0.344, -11 + i * 2.8], [0.055, 0.014, 1.2], '#c6bda2', 'road')
  }
  const rail = railZ(model.ox, model.oz) - model.oz
  if (Math.abs(rail) < 11) {
    for (let segment = 0; segment < 24; segment += 1) {
      const x = -11.5 + segment, z = railZ(model.ox + x, model.oz) - model.oz, y = 3.2
      box([x, y, z], [1.05, 0.28, 2.1], '#9d9d88', 'rail')
      if (detailed || segment % 2 === 0) {
        box([x, y + 0.2, z], [0.16, 0.12, 1.6], '#8e7c5d', 'rail')
        for (const side of [-1, 1]) box([x, y + 0.29, z + side * 0.55], [1.04, 0.065, 0.065], '#777b68', 'rail')
      }
      if ((Math.round(model.ox + x) + 12) % 5 === 0) for (const side of [-1, 1]) {
        box([x, (ground(x, z) + y) / 2, z + side * 0.72], [0.4, y - ground(x, z), 0.45], '#aaa491', 'rail')
        if (detailed) tube([x, y - 0.2, z + side * 1.0], [x, y + 0.8, z + side * 1.0], 0.03, '#8e7155', 'rail')
      }
    }
    if (model.cx === 0 && model.cz === 0) {
      const z = railZ(-3, 0)
      box([-3, 4.23, z], [4.7, 1.45, 1.72], '#8d9b8a', 'rail')
      box([-3, 5.02, z], [4.9, 0.2, 1.86], '#a59b82', 'rail')
      for (let i = 0; i < 5; i += 1) {
        box([-4.8 + i * 0.86, 4.43, z + 0.88], [0.52, 0.65, 0.045], '#617a75', 'window')
        box([-4.8 + i * 0.86, 3.72, z + 0.88], [0.65, 0.14, 0.05], '#a37f61', 'rail')
      }
    }
  }

  const canal = canalX(model.ox, model.oz - 10.65, model.seed) - model.ox
  if (Math.abs(canal) < 11) {
    box([canal, 0.35, -10.65], [4.9, 0.25, 2.7], '#a9a490', 'bridge')
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i += 1) tube([canal - 2.3 + i * 0.76, 0.5, -10.65 + side * 1.22], [canal - 2.3 + i * 0.76, 1.2, -10.65 + side * 1.22], 0.03, '#8a7155', 'bridge')
      tube([canal - 2.3, 1.2, -10.65 + side * 1.22], [canal + 2.3, 1.2, -10.65 + side * 1.22], 0.035, '#8a7155', 'bridge')
    }
  }
  if (detailed) {
    for (let i = 0; i < 42; i += 1) {
      const x = (random() - 0.5) * 19, z = (random() - 0.5) * 19
      if (ground(x, z) < 0 || model.buildings.some((b) => Math.abs(x - b.x) < b.width / 2 && Math.abs(z - b.z) < b.depth / 2)) continue
      box([x, ground(x, z) + 0.025, z], [0.3 + random() * 0.65, 0.04, 0.25 + random() * 0.5], i % 3 ? '#b3af99' : '#999c89', 'paving', [0, random() * 0.2, 0])
      if (i % 3 === 0) box([x, ground(x, z) + 0.052, z], [0.025, 0.012, 0.4 + random() * 0.5], '#82866d', 'paving', [0, random() * Math.PI, 0])
    }
    for (const [x, z] of [[-7, 1.2], [1.5, 1.4]]) {
      chair(x, ground(x, z), z, '#98977e')
      box([x + 0.8, ground(x, z) + 0.25, z], [0.4, 0.5, 0.4], '#a58b6b')
    }
    tube([-8.8, 0.4, 0], [-8.8, 3.8, 0], 0.05, '#7e816a')
    tube([-8.8, 3.8, 0], [-7.8, 3.8, 0], 0.05, '#7e816a')
    cylinder(-7.8, 3.65, 0, 0.21, 0.15, '#b9b29b')
  }
  const finish = (parts) => parts.map((part) => part.building === undefined ? part : trimSupportedDecoration(part, model.buildings[part.building], snapshot?.structures?.[part.building])).filter((part) => part && (part.building === undefined || decorationSupported(part, model.buildings[part.building], snapshot?.structures?.[part.building]))).map((part) => {
    const state = snapshot?.structures?.[part.building]
    return state && !part.support ? { ...part, color: weatherColor(part.color, state.damage * (part.kind === 'window' ? 0.28 : 0.2)) } : part
  })
  return { boxes: finish(boxes), tubes: finish(tubes), glass: finish(glass), surfaces, glazing, debris, piles }
}
