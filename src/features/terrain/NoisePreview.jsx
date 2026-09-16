import { useEffect, useRef } from 'react'
import { heightToRgb } from './generation/terrainColors.js'

export function NoisePreview({ field, waterLevel }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = field.side
    canvas.height = field.side
    const context = canvas.getContext('2d')
    const image = context.createImageData(field.side, field.side)

    for (let index = 0; index < field.values.length; index += 1) {
      const [red, green, blue] = heightToRgb(field.values[index], waterLevel)
      const pixel = index * 4
      image.data[pixel] = red
      image.data[pixel + 1] = green
      image.data[pixel + 2] = blue
      image.data[pixel + 3] = 255
    }

    context.putImageData(image, 0, 0)
  }, [field, waterLevel])

  return (
    <canvas
      ref={canvasRef}
      className="noise-preview"
      role="img"
      aria-label={`Topographic noise preview at ${field.resolution} by ${field.resolution} resolution`}
    />
  )
}
