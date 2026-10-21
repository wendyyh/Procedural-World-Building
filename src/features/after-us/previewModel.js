import { createArchitecture } from './districtGeometry.js'
import { advanceWorld, clamp, createDistrict, DEFAULT_AGE, DEFAULT_WORLD, worldStats } from './worldModel.js'

export const PREVIEW_CYCLE_SECONDS = 32
export const SLICE_RADIUS = [11.8, 11.6]
// Staggered parcels form two street fronts and an open lane between them.
// The broad five-storey block steps down through three and two-storey neighbors.
const PREVIEW_BUILDINGS = Object.freeze({ ...DEFAULT_WORLD, buildingHeight: 1, buildingDensity: 2, buildingLayout: 'clustered', buildingLots: [
  { x: -5.7, z: -0.05, width: 4.2, depth: 3.4, type: 'greenhouse', variant: 'conservatory', height: 3.3 },
  { x: -5, z: -5.7, width: 4.8, depth: 5, type: 'apartment', variant: 'townhouse', floors: 3 },
  { x: -5.8, z: 7.95, width: 4.9, depth: 2.85, type: 'apartment', variant: 'arcade', floors: 2 },
  { x: 0.75, z: -6.6, width: 4.4, depth: 4.5, type: 'apartment', variant: 'terrace', floors: 5 },
  { x: 0.2, z: -0.55, width: 3.4, depth: 4.1, type: 'utility', variant: 'cottage', height: 2.7 },
  { x: 0.2, z: 8, width: 3.8, depth: 2.9, type: 'utility', variant: 'workshop', height: 2.7 },
] })
// A more favorable habitat makes the homepage's bare-to-lush contrast legible at a glance.
const PREVIEW_CONFIG = Object.freeze({ ...PREVIEW_BUILDINGS, humidity: 0.84, soilQuality: 0.9, density: 1.45, growthRate: 1.2, dispersal: 1.3 })
const smooth = (value) => { const t = clamp(value); return t * t * (3 - 2 * t) }

// A rounded, continuous outline rather than a square district boundary.
export function insideSlice(x, z, inset = 0) {
  return (Math.abs(x) / (SLICE_RADIUS[0] - inset)) ** 4 + (Math.abs(z) / (SLICE_RADIUS[1] - inset)) ** 4 <= 1
}
export function sliceBoundary(angle, radius = 1) {
  const c = Math.cos(angle), s = Math.sin(angle)
  return [Math.sign(c) * Math.sqrt(Math.abs(c)) * SLICE_RADIUS[0] * radius, Math.sign(s) * Math.sqrt(Math.abs(s)) * SLICE_RADIUS[1] * radius]
}
function boxFits(part) {
  const [x, , z] = part.position, [w, , d] = part.size
  return [-1, 1].every((sx) => [-1, 1].every((sz) => insideSlice(x + sx * w / 2, z + sz * d / 2, 0.03)))
}
function trimArchitecture(parts) {
  const boxes = []
  for (const part of parts.boxes) {
    // Break long street strips into short sections so their cut ends follow the curved edge.
    const [w, , d] = part.size, nx = part.kind === 'road' && w > 3 ? Math.ceil(w) : 1, nz = part.kind === 'road' && d > 3 ? Math.ceil(d) : 1
    for (let x = 0; x < nx; x += 1) for (let z = 0; z < nz; z += 1) {
      const piece = nx === 1 && nz === 1 ? part : { ...part, position: [part.position[0] - w / 2 + w / nx * (x + 0.5), part.position[1], part.position[2] - d / 2 + d / nz * (z + 0.5)], size: [w / nx, part.size[1], d / nz] }
      if (boxFits(piece)) boxes.push(piece)
    }
  }
  return { boxes, tubes: parts.tubes.filter((p) => [p.from, p.to].every(([x, , z]) => insideSlice(x, z, p.radius))), glass: parts.glass.filter(boxFits), surfaces: parts.surfaces.filter((part) => part.vertices.every((_, i, vertices) => i % 3 !== 0 || insideSlice(vertices[i], vertices[i + 2]))), glazing: parts.glazing.filter((part) => part.vertices.every((_, i, vertices) => i % 3 !== 0 || insideSlice(vertices[i], vertices[i + 2]))), debris: parts.debris.filter(boxFits) }
}
export function createPreviewData() {
  // A glassworks district two tiles north, with a mixed neighborhood around
  // its conservatory and railway. All parcels retain canal and rail clearance.
  const district = createDistrict(DEFAULT_WORLD.seed, 0, -2, PREVIEW_BUILDINGS)
  const model = { ...district, candidates: Object.fromEntries(Object.entries(district.candidates).map(([type, plants]) => [type, plants.filter((plant) => insideSlice(plant.x, plant.z, type === 'trees' ? 0.6 : 0.25))])) }
  // Use the main world's default weathering age for this showcase district.
  // The landing loop grows plants over this fixed ruin, so its geometry and
  // plant support checks must share one structural state throughout the loop.
  const architectureSnapshot = advanceWorld(model, DEFAULT_WORLD, DEFAULT_AGE)
  const snapshots = [0, 20, 40, 60, 80].map((year) => advanceWorld(model, PREVIEW_CONFIG, year))
  snapshots[0].cover.fill(0)
  snapshots[0].stats = worldStats(model, snapshots[0], PREVIEW_CONFIG)
  return { model, parts: trimArchitecture(createArchitecture(model, true, architectureSnapshot)), architectureSnapshot, snapshots, config: PREVIEW_CONFIG }
}
export function previewFrame(seconds) {
  const t = (((seconds % PREVIEW_CYCLE_SECONDS) + PREVIEW_CYCLE_SECONDS) % PREVIEW_CYCLE_SECONDS) / PREVIEW_CYCLE_SECONDS
  // Brief bare opening, 18.4 seconds of growth, eight seconds at maturity,
  // then a gentle two-second fade on either side of the hidden reset.
  const year = t < 0.625 ? smooth((t - 0.05) / 0.575) * 80 : t < 0.9375 ? 80 : 0
  const opacity = t < 0.875 ? 1 : t < 0.9375 ? 1 - smooth((t - 0.875) / 0.0625) : smooth((t - 0.9375) / 0.0625)
  return { year, opacity }
}
export function createPreviewSnapshot({ snapshots, architectureSnapshot }) {
  return { year: 0, cover: new Float32Array(snapshots[0].cover.length), climbers: snapshots[0].climbers.map(({ id }) => ({ id, value: 0 })), structures: architectureSnapshot.structures, environment: architectureSnapshot.environment }
}
export function interpolatePreview(snapshots, year, target) {
  const index = Math.min(snapshots.length - 2, Math.floor(clamp(year / 80) * (snapshots.length - 1)))
  const from = snapshots[index], to = snapshots[index + 1], t = clamp((year - from.year) / (to.year - from.year))
  target.year = year
  for (let i = 0; i < target.cover.length; i += 1) target.cover[i] = from.cover[i] + (to.cover[i] - from.cover[i]) * t
  for (let i = 0; i < target.climbers.length; i += 1) target.climbers[i].value = from.climbers[i].value + (to.climbers[i].value - from.climbers[i].value) * t
  return target
}
