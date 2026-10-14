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

function mixColor(start, end, amount) {
  return [
    Math.round(lerp(start[0], end[0], amount)),
    Math.round(lerp(start[1], end[1], amount)),
    Math.round(lerp(start[2], end[2], amount)),
  ]
}

function topographicColor(value, waterLevel) {
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

  return mixColor(lower.color, upper.color, amount)
}

export function heightToRgb(
  value,
  waterLevel,
  {
    surfaceMode = 'topographic',
    slope = 0,
    contours = false,
    contourInterval = 0.08,
  } = {},
) {
  let color

  if (surfaceMode === 'elevation') {
    color = mixColor([9, 20, 31], [232, 238, 226], value)
  } else if (surfaceMode === 'slope') {
    const steepness = Math.min(1, Math.max(0, slope))
    color = mixColor([55, 116, 91], [213, 208, 191], steepness)
  } else {
    color = topographicColor(value, waterLevel)
  }

  if (contours) {
    const phase = (value / Math.max(0.015, contourInterval)) % 1
    const distanceToLine = Math.min(phase, 1 - phase)
    const lineStrength = Math.max(0, 1 - distanceToLine / 0.1) * 0.52
    color = mixColor(color, [5, 12, 18], lineStrength)
  }

  return color
}
