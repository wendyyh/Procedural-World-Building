import { Color, Vector3 } from 'three'
import { randomFactory, terrainAt } from './worldModel.js'
import { sliceBoundary } from './previewModel.js'

export const EXCAVATION_DEPTH = 6.4
const LEVELS = [0, 0.065, 0.17, 0.32, 0.51, 0.72, 0.88, 1]
const SHADES = ['#a59a7e', '#8e826b', '#a4977e', '#918a76', '#898675', '#7d8275', '#7a8075']

// The upper rim is exactly the existing terrain boundary. Deeper layers recede
// slightly and fracture independently, giving the cut mass a rough underside.
export function excavationPoint(angle, depth, seed, ox = 0, oz = 0) {
  const [x, z] = sliceBoundary(angle), top = terrainAt(ox + x, oz + z, seed), phase = seed % 37
  const ripple = Math.sin(angle * 7 + phase) * 0.16 + Math.sin(angle * 19 + phase * 0.3) * 0.08
  const scale = 1 - depth * 0.035 - depth * depth * 0.022 + Math.sin(angle * 23 + depth * 9) * 0.012 * depth
  const y = top * (1 - depth) - EXCAVATION_DEPTH * depth + ripple * Math.sin(depth * Math.PI) + Math.sin(angle * 13 + phase) * 0.18 * depth ** 4
  return [x * scale, y, z * scale]
}

export function createExcavation(model) {
  const positions = [], colors = [], roots = [], sectors = 128, random = randomFactory(model.seed ^ 391477)
  const pointAt = (angle, depth) => excavationPoint(angle, depth, model.seed, model.ox, model.oz)
  const triangle = (a, b, c, color) => {
    positions.push(...a, ...b, ...c)
    for (let i = 0; i < 3; i += 1) colors.push(color.r, color.g, color.b)
  }
  for (let side = 0; side < sectors; side += 1) {
    const a = side / sectors * Math.PI * 2, b = (side + 1) / sectors * Math.PI * 2
    for (let layer = 0; layer < LEVELS.length - 1; layer += 1) {
      const at = pointAt(a, LEVELS[layer]), bt = pointAt(b, LEVELS[layer])
      const ab = pointAt(a, LEVELS[layer + 1]), bb = pointAt(b, LEVELS[layer + 1])
      const color = new Color(SHADES[layer]).multiplyScalar(0.95 + random() * 0.1)
      triangle(at, bt, ab, color); triangle(bt, bb, ab, color)
    }
    const bottomA = pointAt(a, 1), bottomB = pointAt(b, 1)
    triangle(bottomA, bottomB, [0, -EXCAVATION_DEPTH - 0.25, 0], new Color('#7b8073'))
  }

  // Embedded stones and occasional old brick show through the exposed soil.
  // Their facets are part of the same mesh and share its atmospheric fade.
  for (let stone = 0; stone < 150; stone += 1) {
    const angle = random() * Math.PI * 2, depth = 0.12 + random() * 0.76
    const center = new Vector3(...pointAt(angle, depth))
    const tangent = new Vector3(...pointAt(angle + 0.002, depth)).sub(center).normalize()
    const normal = new Vector3(tangent.z, 0, -tangent.x).normalize()
    const width = 0.16 + random() * 0.45, height = 0.08 + random() * 0.15, protrusion = 0.025 + random() * 0.07
    center.addScaledVector(normal, 0.025)
    const tip = center.clone().addScaledVector(normal, protrusion), ring = []
    for (let i = 0; i < 7; i += 1) {
      const theta = i / 7 * Math.PI * 2, r = 0.75 + random() * 0.25
      ring.push(center.clone().addScaledVector(tangent, Math.cos(theta) * width * r).add(new Vector3(0, Math.sin(theta) * height * r, 0)).toArray())
    }
    const color = new Color(depth < 0.36 && stone % 5 === 0 ? '#aa8b70' : stone % 3 ? '#a7a48e' : '#777d6e')
    for (let i = 0; i < ring.length; i += 1) triangle(tip.toArray(), ring[(i + 1) % ring.length], ring[i], color.clone().multiplyScalar(0.92 + random() * 0.1))
  }

  const outside = (angle, depth) => {
    const p = pointAt(angle, depth), next = pointAt(angle + 0.001, depth)
    const tangent = new Vector3(...next).sub(new Vector3(...p)).normalize()
    return [p[0] + tangent.z * 0.045, p[1], p[2] - tangent.x * 0.045]
  }
  for (let root = 0; root < 18; root += 1) {
    const angle = random() * Math.PI * 2, length = 0.13 + random() * 0.23, direction = random() > 0.5 ? 1 : -1
    let previous = outside(angle, 0.012)
    for (let step = 1; step <= 9; step += 1) {
      const t = step / 9, a = angle + Math.sin(t * 5 + root) * t * 0.014 + direction * t * 0.025
      const point = outside(a, 0.012 + t * length)
      roots.push({ from: previous, to: point, radius: 0.028 * (1 - t * 0.7), color: root % 3 ? '#726b51' : '#968768', kind: 'root' })
      if (step === 4 || step === 6) {
        const fork = outside(a + direction * 0.022, 0.012 + t * length + 0.04)
        roots.push({ from: point, to: fork, radius: 0.009, color: '#82765a', kind: 'root' })
      }
      previous = point
    }
  }
  return { positions, colors, roots }
}

export function excavationShader(shader) {
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vExcavation;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvExcavation = (modelMatrix * vec4(position, 1.0)).xyz;')
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vExcavation;').replace('#include <color_fragment>', `#include <color_fragment>
    vec3 grainCell = floor(vExcavation * 19.0);
    float grain = fract(sin(dot(grainCell, vec3(127.1, 311.7, 74.7))) * 43758.5453);
    diffuseColor.rgb *= 0.96 + grain * 0.08;
    float depthMist = smoothstep(-6.65, -3.55, vExcavation.y);
    diffuseColor.a *= depthMist;
  `)
}
