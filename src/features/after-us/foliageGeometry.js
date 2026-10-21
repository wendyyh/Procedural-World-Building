import { BufferAttribute, BufferGeometry, Color, Vector3 } from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { randomFactory } from './worldMath.js'

// Each species has its own silhouette. Curved, indexed leaf surfaces share
// normals along their midrib, so lighting stays soft even at miniature scale.
class PlantMesh {
  positions = []; colors = []; indices = []
  vertex(point, shade = 1) {
    const index = this.positions.length / 3
    this.positions.push(...point); this.colors.push(shade, shade, shade)
    return index
  }
  leaf(origin, direction, length, width, shade = 1, curl = 0.12, segments = 5) {
    const along = new Vector3(...direction).normalize()
    const across = new Vector3().crossVectors(along, Math.abs(along.y) > 0.94 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0)).normalize()
    const normal = new Vector3().crossVectors(across, along).normalize()
    const start = this.positions.length / 3
    for (let row = 0; row <= segments; row += 1) {
      const t = row / segments, breadth = Math.pow(Math.sin(Math.PI * t), 0.72) * width
      const center = new Vector3(...origin).addScaledVector(along, t * length).addScaledVector(normal, Math.sin(Math.PI * t) * curl * length)
      for (const side of [-1, 0, 1]) {
        const point = center.clone().addScaledVector(across, side * breadth).addScaledVector(normal, side === 0 ? breadth * 0.12 : 0)
        this.vertex(point.toArray(), shade * (0.95 + 0.05 * t))
      }
    }
    for (let row = 0; row < segments; row += 1) for (let col = 0; col < 2; col += 1) {
      const a = start + row * 3 + col, b = a + 3
      this.indices.push(a, b, a + 1, a + 1, b, b + 1)
    }
  }
  branch(a, b, radius, shade = 0.8, sides = 5) {
    const direction = new Vector3(...b).sub(new Vector3(...a)).normalize()
    const right = new Vector3().crossVectors(direction, Math.abs(direction.y) > 0.95 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)).normalize()
    const forward = new Vector3().crossVectors(direction, right).normalize(), start = this.positions.length / 3
    for (const [point, taper] of [[a, 1], [b, 0.68]]) for (let i = 0; i < sides; i += 1) {
      const angle = i / sides * Math.PI * 2
      this.vertex(new Vector3(...point).addScaledVector(right, Math.cos(angle) * radius * taper).addScaledVector(forward, Math.sin(angle) * radius * taper).toArray(), shade)
    }
    for (let i = 0; i < sides; i += 1) {
      const n = (i + 1) % sides
      this.indices.push(start + i, start + n, start + sides + i, start + n, start + sides + n, start + sides + i)
    }
  }
  finish() {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.positions), 3))
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(this.colors), 3))
    geometry.setIndex(this.indices)
    const smooth = mergeVertices(geometry); geometry.dispose()
    smooth.computeVertexNormals(); smooth.computeBoundingSphere()
    return smooth
  }
}

export const FOLIAGE_COLORS = {
  clover: ['#779364', '#9aab7a'], fern: ['#6e9060', '#91a46c'], grass: ['#929d75', '#b1af83'],
  reed: ['#7f9876', '#a1ac82'], shrub: ['#65846a', '#8ba180'], ivy: ['#688b65', '#94ad7d'],
  sedum: ['#9aa87f', '#b5b68a'], broadleaf: ['#7a9665', '#a0ad79'], birch: ['#8fa780', '#afb68a'], willow: ['#7e9b75', '#a3b486'],
}
export function foliageColor(species, variation, humidity) {
  const palette = FOLIAGE_COLORS[species] || FOLIAGE_COLORS.clover
  return new Color(palette[0]).lerp(new Color(palette[1]), variation * 0.7).offsetHSL(0, -0.03, (humidity - 0.5) * -0.03)
}

export function createPlantGeometry(species, detailed = true) {
  const mesh = new PlantMesh(), random = randomFactory(67133 + species.length * 9127)
  if (species === 'fern') {
    for (let frond = 0; frond < (detailed ? 5 : 3); frond += 1) {
      const angle = frond * 2.399, length = 0.55 + random() * 0.35, point = (t) => [Math.cos(angle) * length * t, 0.035 + Math.sin(t * 2.3) * length * 0.65, Math.sin(angle) * length * t]
      let previous = point(0)
      for (let step = 1; step <= 7; step += 1) {
        const t = step / 8, p = point(t), spread = Math.sin(Math.PI * t) * 0.21
        mesh.branch(previous, p, 0.009, 0.74); previous = p
        for (const side of [-1, 1]) mesh.leaf(p, [Math.cos(angle) * 0.22 - Math.sin(angle) * side, 0.12 - t * 0.35, Math.sin(angle) * 0.22 + Math.cos(angle) * side], spread, spread * 0.2, 0.86 + t * 0.14, 0.12, 3)
      }
    }
  } else if (species === 'grass' || species === 'reed') {
    const reed = species === 'reed', count = detailed ? 9 : 5
    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.399, radius = random() * 0.12, length = (reed ? 0.7 : 0.34) + random() * 0.35
      mesh.leaf([Math.cos(angle) * radius, 0, Math.sin(angle) * radius], [Math.cos(angle) * 0.42, 0.95, Math.sin(angle) * 0.42], length, reed ? 0.028 : 0.023, 0.85 + random() * 0.15, -0.42, detailed ? 6 : 4)
      if (reed && i % 3 === 0) {
        mesh.branch([0, 0, 0], [Math.cos(angle) * 0.13, length * 0.85, Math.sin(angle) * 0.13], 0.012)
      }
    }
  } else if (species === 'ivy') {
    // A short cascade of rounded leaves follows each host stem, rather than
    // rotating a ground weed onto the facade.
    for (let i = 0; i < (detailed ? 8 : 5); i += 1) {
      const t = i / 7, side = i % 2 ? 1 : -1, p = [Math.sin(t * 5) * 0.07, 0.25 - t * 0.58, 0.025]
      mesh.leaf(p, [side * 0.75, -0.4, 0.32], 0.16 + random() * 0.055, 0.095, 0.87 + random() * 0.13, 0.16)
      if (i) mesh.branch([Math.sin((t - 1 / 7) * 5) * 0.07, 0.25 - (t - 1 / 7) * 0.58, 0.025], p, 0.008, 0.7)
    }
  } else if (species === 'shrub') {
    for (let stem = 0; stem < (detailed ? 7 : 4); stem += 1) {
      const angle = stem * 2.399, height = 0.35 + random() * 0.38, end = [Math.cos(angle) * 0.28, height, Math.sin(angle) * 0.28]
      mesh.branch([0, 0, 0], end, 0.018, 0.65)
      for (let i = 1; i <= 5; i += 1) {
        const t = i / 5, a = angle + i * 2.399
        mesh.leaf(end.map((v) => v * t), [Math.cos(a), 0.3, Math.sin(a)], 0.19 + random() * 0.12, 0.105, 0.83 + t * 0.17, 0.18, 4)
      }
    }
  } else {
    const sedum = species === 'sedum', count = detailed ? 9 : 6
    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.399, radius = Math.sqrt(i / count) * 0.28
      const base = [Math.cos(angle) * radius, sedum ? 0.03 : 0.08 + random() * 0.12, Math.sin(angle) * radius]
      if (!sedum) mesh.branch([base[0], 0, base[2]], base, 0.007, 0.7)
      for (let leaf = 0; leaf < (sedum ? 4 : 3); leaf += 1) {
        const a = angle + leaf * Math.PI * 2 / (sedum ? 4 : 3)
        mesh.leaf(base, [Math.cos(a), sedum ? 0.35 : 0.08, Math.sin(a)], sedum ? 0.12 : 0.115, sedum ? 0.055 : 0.075, 0.86 + random() * 0.14, 0.2, 4)
      }
    }
  }
  return mesh.finish()
}

export function createTreeGeometry(species, detailed = true) {
  const leaves = new PlantMesh(), wood = new PlantMesh(), random = randomFactory(7781 + species.length)
  const slender = species === 'birch', willow = species === 'willow', count = detailed ? 7 : 5
  const lean = slender ? 0.08 : -0.04
  wood.branch([0, 0, 0], [lean, 0.75, 0], slender ? 0.035 : 0.06, 1, 7)
  wood.branch([lean, 0.75, 0], [lean * 1.7, 1.32, 0.015], 0.026, 0.94)
  for (let i = 0; i < count; i += 1) {
    const angle = i * 2.399, radius = (slender ? 0.28 : 0.45) * (0.75 + random() * 0.4)
    const center = [Math.cos(angle) * radius + lean, 0.98 + i / count * 0.38, Math.sin(angle) * radius]
    wood.branch([lean, 0.55 + i * 0.075, 0], center, 0.018 + (count - i) * 0.002, 0.92)
    const scale = slender ? [0.25, 0.31, 0.25] : [0.37, 0.26 + random() * 0.1, 0.35]
    const leafCount = detailed ? 42 : 22
    for (let leaf = 0; leaf < leafCount; leaf += 1) {
      const a = leaf * 2.399, y = (leaf / leafCount - 0.5) * 1.8, r = Math.sqrt(Math.max(0, 1 - y * y)) * (0.65 + random() * 0.35)
      const p = [center[0] + Math.cos(a) * scale[0] * r, center[1] + y * scale[1], center[2] + Math.sin(a) * scale[2] * r]
      leaves.leaf(p, [Math.cos(a), 0.25 - y * 0.3, Math.sin(a)], 0.16 + random() * 0.09, slender ? 0.06 : 0.09, 0.82 + random() * 0.18, 0.16, 3)
    }
    if (willow) for (let strand = 0; strand < (detailed ? 4 : 2); strand += 1) {
      const a = angle + strand * 1.6, length = 0.45 + random() * 0.46
      let previous = [center[0] + Math.cos(a) * 0.22, center[1], center[2] + Math.sin(a) * 0.22]
      for (let step = 1; step <= 7; step += 1) {
        const t = step / 7, p = [previous[0] + Math.cos(a) * (1 - t) * 0.025, center[1] - length * t, previous[2] + Math.sin(a) * (1 - t) * 0.025]
        wood.branch(previous, p, 0.004, 0.75)
        leaves.leaf(p, [Math.cos(a) * (step % 2 ? 1 : -1), -1, Math.sin(a)], 0.15, 0.035, 0.93, 0.08, 3)
        previous = p
      }
    }
  }
  return { leaves: leaves.finish(), wood: wood.finish() }
}

// Ten species × two detail levels, shared across streamed districts and the
// overview. Exploring more districts never grows this asset cache.
const assets = new Map()
export function foliageAsset(species, detailed) {
  const key = `${species}/${detailed}`
  if (!assets.has(key)) assets.set(key, ['broadleaf', 'birch', 'willow'].includes(species) ? createTreeGeometry(species, detailed) : createPlantGeometry(species, detailed))
  return assets.get(key)
}
if (import.meta.hot) import.meta.hot.dispose(() => {
  for (const asset of assets.values()) {
    if (asset.leaves) { asset.leaves.dispose(); asset.wood.dispose() } else asset.dispose()
  }
  assets.clear()
})
