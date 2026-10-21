import { clamp } from './worldMath.js'

// Species are chosen from the site's stable microhabitat and a continuous
// spatial field. Neighboring roots tend to belong to the same community.
export function plantSpecies(type, { moisture, light, patch, waterside, kind }) {
  if (type === 'vines') return 'ivy'
  if (type === 'trees') return waterside ? 'willow' : patch > 0.56 || kind === 'ruins' ? 'birch' : 'broadleaf'
  if (type === 'roof') return patch > 0.63 ? 'grass' : 'sedum'
  if (type === 'shrubs') return moisture > 0.47 && light < 0.7 ? 'fern' : 'shrub'
  if (waterside && patch > 0.42) return 'reed'
  if (moisture > 0.4 && light < 0.72 && patch > 0.32) return 'fern'
  return patch > 0.57 ? 'grass' : 'clover'
}

export function plantVigor(plant, config) {
  const wet = clamp((plant.siteMoisture ?? 0.5) * 0.6 + config.humidity * 0.64)
  const light = clamp((plant.siteLight ?? 0.7) * (0.22 + config.sunlight * 1.1))
  switch (plant.species) {
    case 'fern': return clamp(0.25 + wet * 0.95 - Math.max(0, light - 0.65) * 0.65, 0.2, 1)
    case 'reed': case 'willow': return clamp(0.2 + wet * 0.95, 0.25, 1)
    case 'grass': case 'sedum': return clamp(0.55 + light * 0.5 - Math.max(0, wet - 0.8) * 0.6, 0.35, 1)
    default: return 0.85 + wet * 0.15
  }
}
