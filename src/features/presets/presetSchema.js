export const PRESET_SCHEMA_VERSION = 1

const TERRAIN_FIELDS = {
  seed: ['string', 0, 80],
  resolution: ['oneOf', [48, 64, 72, 96, 128]],
  size: ['number', 10, 32],
  frequency: ['number', 0.15, 1.2],
  octaves: ['integer', 1, 8],
  persistence: ['number', 0.2, 0.8],
  lacunarity: ['number', 1.2, 3.5],
  shaping: ['oneOf', ['linear', 'power', 'ridged', 'terrace', 'island']],
  shapeAmount: ['number', 0.5, 16],
  heightScale: ['number', 1, 8],
  waterLevel: ['number', 0.15, 0.65],
  worldMode: ['oneOf', ['bounded', 'streaming']],
  erosionEnabled: ['boolean'],
  erosionIterations: ['integer', 1, 28],
  erosionTalus: ['number', 0.005, 0.08],
  erosionStrength: ['number', 0.05, 0.5],
  surfaceMode: ['oneOf', ['topographic', 'elevation', 'slope']],
  contourInterval: ['number', 0.03, 0.2],
}

const VOXEL_FIELDS = {
  seed: ['string', 0, 80],
  shape: ['oneOf', ['ground', 'fbm', 'ridged', 'terraced', 'floating', 'planet', 'strata']],
  frequency: ['number', 0.1, 0.6],
  detail: ['number', 0, 1.5],
  resolution: ['oneOf', [12, 18, 24]],
}

const MODIFIER_FIELDS = {
  id: ['integer', 1, 1000000],
  enabled: ['boolean'],
  operation: ['oneOf', ['subtract', 'union', 'smooth', 'intersect']],
  primitive: ['oneOf', ['sphere', 'box', 'tunnel']],
  x: ['number', -5, 5],
  y: ['number', -5, 5],
  z: ['number', -5, 5],
  radius: ['number', 0.8, 5],
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function pickValidated(source, fields) {
  if (!isRecord(source)) throw new Error('This configuration is not valid.')
  const result = {}

  for (const [key, [type, min, max]] of Object.entries(fields)) {
    const value = source[key]
    const valid = type === 'string'
      ? typeof value === 'string' && value.length >= min && value.length <= max
      : type === 'number'
        ? typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
        : type === 'integer'
          ? Number.isInteger(value) && value >= min && value <= max
          : type === 'boolean'
            ? typeof value === 'boolean'
            : min.includes(value)

    if (!valid) throw new Error(`Unsupported ${key} setting in this save.`)
    result[key] = value
  }

  return result
}

export function validatePreset(kind, name, config, view) {
  if (kind !== 'terrain' && kind !== 'voxel') throw new Error('Unknown experiment type.')
  const cleanName = typeof name === 'string' ? name.trim() : ''
  if (!cleanName || cleanName.length > 60) throw new Error('Choose a name between 1 and 60 characters.')

  if (kind === 'terrain') {
    const cleanConfig = pickValidated(config, TERRAIN_FIELDS)
    if (cleanConfig.worldMode === 'streaming' && cleanConfig.shaping === 'island') {
      throw new Error('Island shaping is not supported in streaming mode.')
    }
    const cleanView = pickValidated(view, {
      wireframe: ['boolean'],
      contours: ['boolean'],
    })
    return { kind, name: cleanName, config: cleanConfig, view: cleanView }
  }

  const cleanConfig = pickValidated(config, VOXEL_FIELDS)
  if (!Array.isArray(config.modifiers) || config.modifiers.length > 3) {
    throw new Error('This save has too many shape operations.')
  }
  cleanConfig.modifiers = config.modifiers.map((modifier) => pickValidated(modifier, MODIFIER_FIELDS))
  if (new Set(cleanConfig.modifiers.map((modifier) => modifier.id)).size !== cleanConfig.modifiers.length) {
    throw new Error('Shape operation IDs must be unique.')
  }
  const cleanView = pickValidated(view, {
    wireframe: ['boolean'],
    showChunks: ['boolean'],
    sliceLevel: ['number', -3.5, 4.5],
  })
  return { kind, name: cleanName, config: cleanConfig, view: cleanView }
}

export function parsePreset(data, expectedKind) {
  if (!isRecord(data) || data.schemaVersion !== PRESET_SCHEMA_VERSION) {
    throw new Error('This save uses an unsupported format.')
  }
  if (data.kind !== expectedKind) throw new Error('This save belongs to another experiment.')
  return validatePreset(data.kind, data.name, data.config, data.view)
}
