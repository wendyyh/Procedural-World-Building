const STOPS = [
  { value: 0, color: [5, 25, 43] },
  { value: 0.33, color: [17, 77, 111] },
  { value: 0.38, color: [83, 151, 165] },
  { value: 0.42, color: [211, 190, 134] },
  { value: 0.5, color: [82, 137, 79] },
  { value: 0.68, color: [50, 93, 59] },
  { value: 0.82, color: [101, 99, 91] },
  { value: 1, color: [230, 235, 231] },
]

function lerp(start, end, amount) {
  return start + (end - start) * amount
}

export function heightToRgb(value, waterLevel) {
  const adjustedStops = STOPS.map((stop, index) => {
    if (index === 1) return { ...stop, value: Math.max(0.08, waterLevel - 0.03) }
    if (index === 2) return { ...stop, value: waterLevel }
    if (index === 3) return { ...stop, value: Math.min(0.72, waterLevel + 0.045) }
    return stop
  })

  let lower = adjustedStops[0]
  let upper = adjustedStops[adjustedStops.length - 1]

  for (let index = 1; index < adjustedStops.length; index += 1) {
    if (value <= adjustedStops[index].value) {
      lower = adjustedStops[index - 1]
      upper = adjustedStops[index]
      break
    }
  }

  const range = Math.max(0.0001, upper.value - lower.value)
  const amount = Math.min(1, Math.max(0, (value - lower.value) / range))

  return [
    Math.round(lerp(lower.color[0], upper.color[0], amount)),
    Math.round(lerp(lower.color[1], upper.color[1], amount)),
    Math.round(lerp(lower.color[2], upper.color[2], amount)),
  ]
}
