function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

const NEIGHBORS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
]

/**
 * Repeatedly moves material from a cell to its steepest lower neighbor.
 * The operation is deterministic and mass-conserving before the final clamp.
 */
export function simulateThermalErosion(
  source,
  side,
  { iterations = 0, talus = 0.025, strength = 0.24 } = {},
) {
  const values = new Float32Array(source)
  const delta = new Float32Array(values.length)
  let totalMoved = 0

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    delta.fill(0)

    for (let row = 0; row < side; row += 1) {
      for (let column = 0; column < side; column += 1) {
        const index = row * side + column
        const height = values[index]
        let lowestIndex = -1
        let largestDrop = 0

        for (const [columnOffset, rowOffset] of NEIGHBORS) {
          const neighborColumn = column + columnOffset
          const neighborRow = row + rowOffset

          if (
            neighborColumn < 0
            || neighborColumn >= side
            || neighborRow < 0
            || neighborRow >= side
          ) continue

          const neighborIndex = neighborRow * side + neighborColumn
          const drop = height - values[neighborIndex]

          if (drop > largestDrop) {
            largestDrop = drop
            lowestIndex = neighborIndex
          }
        }

        if (lowestIndex === -1 || largestDrop <= talus) continue

        const moved = Math.min(height, (largestDrop - talus) * strength)
        delta[index] -= moved
        delta[lowestIndex] += moved
        totalMoved += moved
      }
    }

    for (let index = 0; index < values.length; index += 1) {
      values[index] = clamp01(values[index] + delta[index])
    }
  }

  return { values, totalMoved }
}
