import { clamp } from './worldMath.js'

// A short gravity-shaped fall ends exactly on the precomputed pile surface.
// Reverse scrubbing restores the deterministic state without replaying a fall.
export function sampleDebrisFall(part, progress, delay = 0) {
  const t = clamp((progress - delay) / 0.84), source = part.fallFrom, target = part.position
  return {
    position: [target[0] + (source[0] - target[0]) * (1 - t), target[1] + Math.max(0, source[1] - target[1]) * (1 - t * t), target[2] + (source[2] - target[2]) * (1 - t)],
    remaining: 1 - t,
  }
}
