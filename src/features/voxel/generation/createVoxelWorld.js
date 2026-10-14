import { createNoise2D, createNoise3D } from 'simplex-noise'

export const VOXEL_BOUNDS = {
  x: 7,
  yMin: -4.5,
  yMax: 5.5,
  z: 7,
}

const TETRAHEDRA = [
  [0, 5, 1, 6],
  [0, 1, 2, 6],
  [0, 2, 3, 6],
  [0, 3, 7, 6],
  [0, 7, 4, 6],
  [0, 4, 5, 6],
]

const CORNERS = [
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
  [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
]

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))

function hashSeed(seed) {
  let hash = 2166136261
  for (const character of String(seed)) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(initialSeed) {
  let seed = initialSeed
  return () => {
    let value = seed += 0x6d2b79f5
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function smoothMinimum(a, b, smoothing) {
  const k = Math.max(0.001, smoothing)
  const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1)
  return b * (1 - h) + a * h - k * h * (1 - h)
}

function boxDistance(x, y, z, halfX, halfY, halfZ) {
  const qx = Math.abs(x) - halfX
  const qy = Math.abs(y) - halfY
  const qz = Math.abs(z) - halfZ
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0))
    + Math.min(Math.max(qx, qy, qz), 0)
}

function modifierDistance(x, y, z, modifier) {
  const px = x - modifier.x
  const py = y - modifier.y
  const pz = z - modifier.z
  const radius = modifier.radius

  if (modifier.primitive === 'box') {
    return boxDistance(px, py, pz, radius, radius * 0.75, radius)
  }
  if (modifier.primitive === 'tunnel') {
    return Math.hypot(py, pz) - radius
  }
  return Math.hypot(px, py, pz) - radius
}

export function createDensitySampler(config) {
  const random = mulberry32(hashSeed(config.seed))
  const noise2D = createNoise2D(random)
  const noise3D = createNoise3D(random)
  const frequency = config.frequency
  const detail = config.detail
  const modifiers = config.modifiers ?? []

  function fbm3(x, y, z) {
    let value = 0
    let amplitude = 1
    let total = 0
    let scale = 1
    for (let octave = 0; octave < 3; octave += 1) {
      value += noise3D(x * scale, y * scale, z * scale) * amplitude
      total += amplitude
      amplitude *= 0.5
      scale *= 2.1
    }
    return value / total
  }

  return (x, y, z) => {
    const large = noise2D(x * frequency, z * frequency)
    const small = noise2D(x * frequency * 2.35 + 31, z * frequency * 2.35 - 19)
    const spatial = fbm3(x * frequency, y * frequency, z * frequency)
    let distance

    switch (config.shape) {
      case 'fbm':
        distance = y - (0.6 + large * 2.1 + small * 0.8 + spatial * detail * 1.4)
        break
      case 'ridged': {
        const ridge = Math.pow(1 - Math.abs(large), 2.8)
        distance = y - (-0.75 + ridge * 4.6 + small * 0.65 + spatial * detail * 0.8)
        break
      }
      case 'terraced': {
        const height = 0.7 + large * 2.4 + small * 0.5
        distance = y - (Math.round(height * 2.3) / 2.3 + spatial * detail * 0.25)
        break
      }
      case 'floating': {
        const ellipsoid = Math.hypot(x / 5.6, (y - 0.7) / 2.3, z / 5.2) - 1
        distance = ellipsoid * 2.4 + spatial * detail * 0.85
        break
      }
      case 'planet':
        distance = Math.hypot(x, y - 0.3, z) - (4.3 + spatial * detail * 1.1)
        break
      case 'strata': {
        const layer = Math.sin(y * 5.3 + large * 2) * 0.22
        distance = y - (0.4 + large * 1.8 + small * 0.6 + layer + spatial * detail * 0.35)
        break
      }
      case 'ground':
      default:
        distance = y - (0.5 + large * 1.4 + spatial * detail * 0.3)
    }

    // Close the finite study volume before the sampling lattice ends.
    const enclosure = boxDistance(x, y - 0.5, z, 6.72, 4.65, 6.72)
    distance = Math.max(distance, enclosure)

    for (const modifier of modifiers) {
      if (!modifier.enabled) continue
      const other = modifierDistance(x, y, z, modifier)
      if (modifier.operation === 'union') distance = Math.min(distance, other)
      else if (modifier.operation === 'smooth') distance = smoothMinimum(distance, other, 1.15)
      else if (modifier.operation === 'intersect') distance = Math.max(distance, other)
      else if (modifier.operation === 'subtract') distance = Math.max(distance, -other)
    }

    return distance
  }
}

function interpolate(a, b, va, vb) {
  const t = Math.abs(va - vb) < 1e-8 ? 0.5 : clamp(va / (va - vb), 0, 1)
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

function emitTetra(points, values, positions, colors) {
  const inside = []
  const outside = []
  for (let index = 0; index < 4; index += 1) {
    if (values[index] < 0) inside.push(index)
    else outside.push(index)
  }
  if (inside.length === 0 || inside.length === 4) return 0

  const outward = [0, 0, 0]
  for (const index of outside) for (let axis = 0; axis < 3; axis += 1) outward[axis] += points[index][axis] / outside.length
  for (const index of inside) for (let axis = 0; axis < 3; axis += 1) outward[axis] -= points[index][axis] / inside.length

  function triangle(a, b, c) {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    const cross = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ]
    if (cross[0] * outward[0] + cross[1] * outward[1] + cross[2] * outward[2] < 0) {
      ;[b, c] = [c, b]
    }
    const normalY = Math.abs(cross[1]) / (Math.hypot(...cross) || 1)
    for (const vertex of [a, b, c]) {
      positions.push(...vertex)
      const elevation = clamp((vertex[1] + 4.5) / 10, 0, 1)
      const stone = normalY < 0.5 ? 0.76 : 1
      colors.push(
        (0.19 + elevation * 0.49) * stone,
        (0.38 + elevation * 0.39) * stone,
        (0.38 + elevation * 0.36) * stone,
      )
    }
  }

  if (inside.length === 1 || inside.length === 3) {
    const pivot = inside.length === 1 ? inside[0] : outside[0]
    const others = inside.length === 1 ? outside : inside
    const vertices = others.map((other) => interpolate(points[pivot], points[other], values[pivot], values[other]))
    triangle(vertices[0], vertices[1], vertices[2])
    return 1
  }

  const a = interpolate(points[inside[0]], points[outside[0]], values[inside[0]], values[outside[0]])
  const b = interpolate(points[inside[0]], points[outside[1]], values[inside[0]], values[outside[1]])
  const c = interpolate(points[inside[1]], points[outside[0]], values[inside[1]], values[outside[0]])
  const d = interpolate(points[inside[1]], points[outside[1]], values[inside[1]], values[outside[1]])
  triangle(a, b, c)
  triangle(b, d, c)
  return 2
}

export function createVoxelWorld(config) {
  const started = performance.now()
  const sample = createDensitySampler(config)
  const resolution = config.resolution
  const side = resolution + 1
  const ySpan = VOXEL_BOUNDS.yMax - VOXEL_BOUNDS.yMin
  const cellSizeX = VOXEL_BOUNDS.x / resolution
  const cellSizeY = ySpan / resolution
  const chunks = []
  let activeCells = 0
  let triangles = 0

  for (let chunkZ = 0; chunkZ < 2; chunkZ += 1) {
    for (let chunkX = 0; chunkX < 2; chunkX += 1) {
      const startX = -VOXEL_BOUNDS.x + chunkX * VOXEL_BOUNDS.x
      const startZ = -VOXEL_BOUNDS.z + chunkZ * VOXEL_BOUNDS.z
      const lattice = new Float32Array(side ** 3)
      const indexAt = (x, y, z) => (z * side + y) * side + x

      for (let z = 0; z < side; z += 1) {
        for (let y = 0; y < side; y += 1) {
          for (let x = 0; x < side; x += 1) {
            lattice[indexAt(x, y, z)] = sample(
              startX + x * cellSizeX,
              VOXEL_BOUNDS.yMin + y * cellSizeY,
              startZ + z * cellSizeX,
            )
          }
        }
      }

      const positions = []
      const colors = []
      for (let z = 0; z < resolution; z += 1) {
        for (let y = 0; y < resolution; y += 1) {
          for (let x = 0; x < resolution; x += 1) {
            const points = CORNERS.map(([dx, dy, dz]) => [
              startX + (x + dx) * cellSizeX,
              VOXEL_BOUNDS.yMin + (y + dy) * cellSizeY,
              startZ + (z + dz) * cellSizeX,
            ])
            const values = CORNERS.map(([dx, dy, dz]) => lattice[indexAt(x + dx, y + dy, z + dz)])
            const insideCount = values.filter((value) => value < 0).length
            if (insideCount === 0 || insideCount === 8) continue
            activeCells += 1
            for (const tetra of TETRAHEDRA) {
              triangles += emitTetra(
                tetra.map((corner) => points[corner]),
                tetra.map((corner) => values[corner]),
                positions,
                colors,
              )
            }
          }
        }
      }

      chunks.push({
        key: `${chunkX}:${chunkZ}`,
        positions: new Float32Array(positions),
        colors: new Float32Array(colors),
      })
    }
  }

  return {
    chunks,
    sample,
    stats: {
      chunks: chunks.length,
      cells: 4 * resolution ** 3,
      samples: 4 * side ** 3,
      activeCells,
      triangles,
      meshBytes: chunks.reduce((total, chunk) => total + chunk.positions.byteLength + chunk.colors.byteLength, 0),
      milliseconds: performance.now() - started,
    },
  }
}
