import { Quaternion, Vector3 } from 'three'
import { randomFromSeed } from '../environment/terrainSampler.js'

export const BRANCHING_PRESETS = {
  tree: {
    label: 'Canopy tree',
    axiom: 'F',
    rule: 'F[+F][-F][&F][^F]F',
    description: 'Four directions split from each stem, then the main stem continues upward.',
  },
  ivy: {
    label: 'Climbing ivy',
    axiom: 'F',
    rule: 'F[+F][-F]F',
    description: 'A planar grammar sends tendrils across a vertical surface.',
  },
}

export const DEFAULT_BRANCH_CONFIG = {
  seed: 'arboretum-08',
  form: 'tree',
  iterations: 3,
  angle: 32,
  lengthDecay: 0.84,
  widthDecay: 0.66,
  jitter: 0.18,
  leafDensity: 0.75,
  lod: 'auto',
  skeleton: false,
}

const AXIS_X = new Vector3(1, 0, 0)
const AXIS_Z = new Vector3(0, 0, 1)
const UP = new Vector3(0, 1, 0)
const MAX_SYMBOLS = 20000

export function expandBranchGrammar({ form, iterations }) {
  const preset = BRANCHING_PRESETS[form]
  if (!preset) throw new Error(`Unknown branching form: ${form}`)
  if (!Number.isInteger(iterations) || iterations < 0 || iterations > 5) throw new Error('Iterations must be an integer from 0 to 5')
  let sentence = preset.axiom
  for (let step = 0; step < iterations; step += 1) {
    sentence = [...sentence].map((symbol) => symbol === 'F' ? preset.rule : symbol).join('')
    if (sentence.length > MAX_SYMBOLS) throw new Error('Branch grammar exceeds the safe symbol limit')
  }
  return sentence
}

export function createBranchModel(config) {
  const sentence = expandBranchGrammar(config)
  const random = randomFromSeed(`${config.seed}:${config.form}:structure`)
  const ivy = config.form === 'ivy'
  const baseLength = ivy ? 5.5 / (2 ** config.iterations) : 6 / (2 ** config.iterations)
  const position = new Vector3(0, 0, ivy ? 0.04 : 0)
  let rotation = new Quaternion()
  let depth = 0
  const stack = []
  const segments = []
  const leaves = []
  const branchAngle = config.angle * Math.PI / 180

  for (let index = 0; index < sentence.length; index += 1) {
    const symbol = sentence[index]
    if (symbol === 'F') {
      const start = position.clone()
      const length = baseLength * config.lengthDecay ** depth * (0.88 + random() * 0.24)
      const heading = UP.clone().applyQuaternion(rotation)
      position.addScaledVector(heading, length)
      if (ivy) position.z = 0.04 + depth * 0.007
      segments.push({
        start: start.toArray(),
        end: position.toArray(),
        depth,
        radius: (ivy ? 0.052 : 0.15) * config.widthDecay ** depth,
      })
      continue
    }
    if (symbol === '[') {
      stack.push({ position: position.clone(), rotation: rotation.clone(), depth })
      depth += 1
      continue
    }
    if (symbol === ']') {
      if (!stack.length) throw new Error('Unbalanced branch grammar')
      if (depth > 0 && (ivy || position.y > 3) && random() < config.leafDensity) {
        leaves.push({ position: position.toArray(), depth, scale: 0.75 + random() * 0.6, tint: random() })
      }
      const saved = stack.pop()
      position.copy(saved.position)
      rotation = saved.rotation
      depth = saved.depth
      continue
    }
    const variation = 1 + (random() - 0.5) * config.jitter * 2
    const angle = branchAngle * variation
    if (symbol === '+' || symbol === '-') rotation.multiply(new Quaternion().setFromAxisAngle(AXIS_Z, (symbol === '+' ? 1 : -1) * angle))
    if (symbol === '&' || symbol === '^') rotation.multiply(new Quaternion().setFromAxisAngle(AXIS_X, (symbol === '&' ? 1 : -1) * angle))
  }
  if (stack.length) throw new Error('Unbalanced branch grammar')
  if (random() < config.leafDensity) leaves.push({ position: position.toArray(), depth: 1, scale: 1, tint: random() })
  return { sentence, segments, leaves, bounds: measureBounds(segments) }
}

function measureBounds(segments) {
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
  for (const segment of segments) {
    for (const point of [segment.start, segment.end]) {
      for (let axis = 0; axis < 3; axis += 1) {
        bounds.min[axis] = Math.min(bounds.min[axis], point[axis])
        bounds.max[axis] = Math.max(bounds.max[axis], point[axis])
      }
    }
  }
  return bounds
}

export function selectBranchLOD(model, level) {
  if (!['near', 'middle', 'far'].includes(level)) throw new Error(`Unknown detail level: ${level}`)
  if (level === 'near') return { segments: model.segments, leaves: model.leaves }
  const maxDepth = level === 'middle' ? 2 : 1
  const stride = level === 'middle' ? 3 : 8
  return {
    segments: model.segments.filter((segment) => segment.depth <= maxDepth),
    leaves: model.leaves.filter((_, index) => index % stride === 0),
  }
}
