import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const VERTEX_SHADER = `
  attribute float elevation;
  varying float vElevation;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vElevation = elevation;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const FRAGMENT_SHADER = `
  precision highp float;

  varying float vElevation;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  uniform float uWaterLevel;
  uniform float uContourInterval;
  uniform float uContours;
  uniform int uSurfaceMode;
  uniform float uBandScale;
  uniform float uEdgeStrength;
  uniform float uShoreWidth;
  uniform float uTime;

  vec3 topographic(float height) {
    vec3 deepWater = vec3(0.020, 0.098, 0.169);
    vec3 shallowWater = vec3(0.325, 0.592, 0.647);
    vec3 sand = vec3(0.827, 0.745, 0.525);
    vec3 grass = vec3(0.322, 0.537, 0.310);
    vec3 forest = vec3(0.196, 0.365, 0.231);
    vec3 rock = vec3(0.396, 0.388, 0.357);
    vec3 snow = vec3(0.902, 0.922, 0.906);

    vec3 color = mix(deepWater, shallowWater, smoothstep(0.0, uWaterLevel, height));
    color = mix(color, sand, smoothstep(uWaterLevel, uWaterLevel + 0.045, height));
    color = mix(color, grass, smoothstep(uWaterLevel + 0.035, 0.50, height));
    color = mix(color, forest, smoothstep(0.48, 0.68, height));
    color = mix(color, rock, smoothstep(0.65, 0.82, height));
    return mix(color, snow, smoothstep(0.80, 1.0, height));
  }

  void main() {
    vec3 normal = normalize(vNormal);
    float slope = clamp(1.0 - abs(normal.y), 0.0, 1.0);
    vec3 color;

    if (uSurfaceMode == 1) {
      color = mix(vec3(0.035, 0.078, 0.122), vec3(0.910, 0.933, 0.886), vElevation);
    } else if (uSurfaceMode == 2) {
      color = mix(vec3(0.216, 0.455, 0.357), vec3(0.835, 0.816, 0.749), slope);
    } else if (uSurfaceMode == 3) {
      float bands = 0.5 + 0.5 * sin((vWorldPosition.x + vWorldPosition.z * 0.72) * uBandScale);
      color = mix(vec3(0.075, 0.244, 0.337), vec3(0.900, 0.668, 0.443), smoothstep(0.15, 0.85, bands));
    } else if (uSurfaceMode == 4) {
      vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
      float facing = clamp(dot(normal, viewDirection), 0.0, 1.0);
      float rim = pow(1.0 - facing, 2.4) * uEdgeStrength;
      color = mix(vec3(0.067, 0.177, 0.220), vec3(0.399, 0.875, 0.771), clamp(rim, 0.0, 1.0));
    } else if (uSurfaceMode == 5) {
      float distanceFromShore = abs(vElevation - uWaterLevel);
      float wave = sin(vWorldPosition.x * 3.1 + uTime * 1.8) * sin(vWorldPosition.z * 2.4 - uTime * 1.2);
      float foam = 1.0 - smoothstep(uShoreWidth * 0.25, uShoreWidth, distanceFromShore + wave * 0.008);
      color = mix(topographic(vElevation), vec3(0.866, 0.971, 0.914), foam * 0.9);
    } else {
      color = topographic(vElevation);
    }

    float phase = fract(vElevation / max(0.015, uContourInterval));
    float distanceToContour = min(phase, 1.0 - phase);
    float contour = 1.0 - smoothstep(0.018, 0.065, distanceToContour);
    color = mix(color, vec3(0.018, 0.039, 0.055), contour * 0.62 * uContours);

    vec3 lightDirection = normalize(vec3(0.38, 0.74, 0.45));
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float light = 0.62 + diffuse * 0.38;
    gl_FragColor = vec4(color * light, 1.0);
  }
`

const SURFACE_MODES = {
  topographic: 0,
  elevation: 1,
  slope: 2,
  position: 3,
  fresnel: 4,
  shoreline: 5,
}

export function TerrainMesh({
  field,
  size,
  heightScale,
  waterLevel,
  wireframe,
  surfaceMode,
  contours,
  contourInterval,
  studyOptions,
  position = [0, 0, 0],
}) {
  const materialRef = useRef(null)
  const geometry = useMemo(() => {
    const nextGeometry = new THREE.PlaneGeometry(
      size,
      size,
      field.resolution,
      field.resolution,
    )
    const positions = nextGeometry.attributes.position
    const elevations = new Float32Array(positions.count)

    for (let index = 0; index < positions.count; index += 1) {
      const value = field.values[index]
      positions.setZ(index, (value - waterLevel) * heightScale)
      elevations[index] = value
    }

    positions.needsUpdate = true
    nextGeometry.setAttribute('elevation', new THREE.BufferAttribute(elevations, 1))
    nextGeometry.computeVertexNormals()
    nextGeometry.computeBoundingBox()
    nextGeometry.computeBoundingSphere()
    return nextGeometry
  }, [field, heightScale, size, waterLevel])

  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(() => ({
    uWaterLevel: { value: waterLevel },
    uContourInterval: { value: contourInterval },
    uContours: { value: contours ? 1 : 0 },
    uSurfaceMode: { value: SURFACE_MODES[surfaceMode] ?? 0 },
    uBandScale: { value: studyOptions?.bandScale ?? 0.75 },
    uEdgeStrength: { value: studyOptions?.edgeStrength ?? 1.3 },
    uShoreWidth: { value: studyOptions?.shoreWidth ?? 0.045 },
    uTime: { value: 0 },
  }), [])

  useEffect(() => {
    const liveUniforms = materialRef.current?.uniforms ?? uniforms
    liveUniforms.uWaterLevel.value = waterLevel
    liveUniforms.uContourInterval.value = contourInterval
    liveUniforms.uContours.value = contours ? 1 : 0
    liveUniforms.uSurfaceMode.value = SURFACE_MODES[surfaceMode] ?? 0
    liveUniforms.uBandScale.value = studyOptions?.bandScale ?? 0.75
    liveUniforms.uEdgeStrength.value = studyOptions?.edgeStrength ?? 1.3
    liveUniforms.uShoreWidth.value = studyOptions?.shoreWidth ?? 0.045
    if (materialRef.current) materialRef.current.uniformsNeedUpdate = true
  }, [uniforms, waterLevel, contourInterval, contours, surfaceMode, studyOptions])

  useFrame(({ clock }) => {
    if (materialRef.current && surfaceMode === 'shoreline') {
      materialRef.current.uniforms.uTime.value = studyOptions?.animate === false ? 0 : clock.elapsedTime
    }
  })

  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation-x={-Math.PI / 2}
      receiveShadow
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        wireframe={wireframe}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
