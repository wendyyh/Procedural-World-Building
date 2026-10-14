import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const FORWARD_KEYS = new Set(['KeyW', 'ArrowUp'])
const BACKWARD_KEYS = new Set(['KeyS', 'ArrowDown'])
const LEFT_KEYS = new Set(['KeyA', 'ArrowLeft'])
const RIGHT_KEYS = new Set(['KeyD', 'ArrowRight'])

function isTypingTarget(target) {
  return target instanceof HTMLInputElement
    || target instanceof HTMLSelectElement
    || target instanceof HTMLTextAreaElement
}

function hasAnyKey(pressed, keys) {
  for (const key of keys) {
    if (pressed.has(key)) return true
  }
  return false
}

export function WorldNavigator({ enabled, size, controlsRef, onChunkChange }) {
  const { camera } = useThree()
  const pressed = useRef(new Set())
  const currentChunk = useRef({ x: 0, z: 0 })
  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const movement = useRef(new THREE.Vector3())

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isTypingTarget(event.target)) return
      if (
        enabled
        && (
          FORWARD_KEYS.has(event.code)
          || BACKWARD_KEYS.has(event.code)
          || LEFT_KEYS.has(event.code)
          || RIGHT_KEYS.has(event.code)
        )
      ) event.preventDefault()
      pressed.current.add(event.code)
    }
    const handleKeyUp = (event) => pressed.current.delete(event.code)
    const handleBlur = () => pressed.current.clear()

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [enabled])

  useEffect(() => {
    if (enabled) return

    currentChunk.current = { x: 0, z: 0 }
    onChunkChange({ x: 0, z: 0 })
  }, [enabled, onChunkChange])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!enabled || !controls) return

    const move = movement.current.set(0, 0, 0)
    const keys = pressed.current
    const forwardAmount = Number(hasAnyKey(keys, FORWARD_KEYS))
      - Number(hasAnyKey(keys, BACKWARD_KEYS))
    const rightAmount = Number(hasAnyKey(keys, RIGHT_KEYS))
      - Number(hasAnyKey(keys, LEFT_KEYS))

    if (forwardAmount !== 0 || rightAmount !== 0) {
      forward.current.subVectors(controls.target, camera.position)
      forward.current.y = 0
      forward.current.normalize()
      right.current.crossVectors(forward.current, camera.up).normalize()
      move.addScaledVector(forward.current, forwardAmount)
      move.addScaledVector(right.current, rightAmount)

      if (move.lengthSq() > 0) {
        const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 14 : 7
        move.normalize().multiplyScalar(speed * Math.min(delta, 0.05))
        camera.position.add(move)
        controls.target.add(move)
        controls.update()
      }
    }

    const nextChunk = {
      x: Math.floor((controls.target.x + size * 0.5) / size),
      z: Math.floor((controls.target.z + size * 0.5) / size),
    }

    if (
      nextChunk.x !== currentChunk.current.x
      || nextChunk.z !== currentChunk.current.z
    ) {
      currentChunk.current = nextChunk
      onChunkChange(nextChunk)
    }
  })

  return null
}
