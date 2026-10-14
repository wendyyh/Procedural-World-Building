import { useEffect, useRef } from 'react'
import { heightToRgb } from './generation/terrainColors.js'

function sampleSlope(field, index) {
  const row = Math.floor(index / field.side)
  const column = index % field.side
  const left = field.values[row * field.side + Math.max(0, column - 1)]
  const right = field.values[row * field.side + Math.min(field.side - 1, column + 1)]
  const top = field.values[Math.max(0, row - 1) * field.side + column]
  const bottom = field.values[Math.min(field.side - 1, row + 1) * field.side + column]

  return Math.min(1, Math.hypot(right - left, bottom - top) * 6)
}

export function NoisePreview({
  field,
  waterLevel,
  surfaceMode,
  contours,
  contourInterval,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = field.side
    canvas.height = field.side
    const context = canvas.getContext('2d')
    const image = context.createImageData(field.side, field.side)

    for (let index = 0; index < field.values.length; index += 1) {
      const [red, green, blue] = heightToRgb(field.values[index], waterLevel, {
        surfaceMode,
        slope: sampleSlope(field, index),
        contours,
        contourInterval,
      })
      const pixel = index * 4
      image.data[pixel] = red
      image.data[pixel + 1] = green
      image.data[pixel + 2] = blue
      image.data[pixel + 3] = 255
    }

    context.putImageData(image, 0, 0)
  }, [contourInterval, contours, field, surfaceMode, waterLevel])

  return (
    <canvas
      ref={canvasRef}
      className="noise-preview"
      role="img"
      aria-label={`${surfaceMode} terrain preview at ${field.resolution} by ${field.resolution} resolution`}
    />
  )
}
