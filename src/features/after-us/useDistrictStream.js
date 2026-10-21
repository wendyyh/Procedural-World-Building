import { useEffect, useMemo, useRef, useState } from 'react'
import { districtKey } from './worldModel.js'
import { buildingSignature } from './buildingModel.js'

export function useDistrictStream(config, year, center) {
  const worker = useRef(null), cache = useRef(new Map()), epoch = useRef(0), frame = useRef(null)
  const centerRef = useRef(center), start = useRef(0), signature = useRef(''), warm = useRef(false)
  const [revision, setRevision] = useState(0)
  const [pending, setPending] = useState(true)
  const [error, setError] = useState(null)
  const [latency, setLatency] = useState(0)
  centerRef.current = center
  const currentSignature = useMemo(() => JSON.stringify([config, year]), [config, year])

  useEffect(() => {
    cache.current.clear(); setRevision((value) => value + 1); setPending(true); setError(null)
    const instance = new Worker(new URL('./district.worker.js', import.meta.url), { type: 'module' })
    worker.current = instance
    instance.onmessage = ({ data }) => {
      if (data.type !== 'district' || data.epoch !== epoch.current) return
      const previous = cache.current.get(data.key)
      const model = data.model || previous?.model
      if (!model) return
      const changed = !previous?.snapshot || (data.epoch === epoch.current && previous.signature !== signature.current)
      const entry = previous && !changed ? previous : { ...previous, model }
      if (data.epoch === epoch.current && changed) { entry.snapshot = data.snapshot; entry.signature = signature.current }
      cache.current.set(data.key, entry)
      const current = centerRef.current
      if (cache.current.size > 36) {
        const farthest = [...cache.current.entries()].sort((a, b) => Math.hypot(b[1].model.cx - current.x, b[1].model.cz - current.z) - Math.hypot(a[1].model.cx - current.x, a[1].model.cz - current.z))
        cache.current.delete(farthest[0][0])
      }
      if (changed && Math.abs(data.x - current.x) <= 2 && Math.abs(data.z - current.z) <= 2 && frame.current === null) frame.current = requestAnimationFrame(() => { frame.current = null; setRevision((value) => value + 1) })
      if (data.epoch === epoch.current && data.x === current.x && data.z === current.z) { setPending(false); if (!warm.current) setLatency(Math.round(performance.now() - start.current)) }
    }
    instance.onerror = () => { setError('This district could not be prepared. Use “Generate New World” to retry.'); setPending(false) }
    return () => { instance.terminate(); if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null } if (worker.current === instance) worker.current = null }
  }, [config.seed])

  useEffect(() => {
    const currentEpoch = ++epoch.current
    signature.current = currentSignature
    start.current = performance.now()
    warm.current = cache.current.get(districtKey(center.x, center.z))?.signature === signature.current
    setPending(!warm.current)
    if (warm.current) setLatency(0)
    const generation = buildingSignature(config)
    const known = [...cache.current.entries()].filter(([, entry]) => entry.model.generation === generation).map(([key]) => key)
    worker.current?.postMessage({ type: 'view', epoch: currentEpoch, seed: config.seed, center, config, year, known })
  }, [config, year, center.x, center.z, currentSignature])

  const tiles = useMemo(() => [...cache.current.values()].filter((entry) => entry.snapshot && Math.abs(entry.model.cx - center.x) <= 2 && Math.abs(entry.model.cz - center.z) <= 2), [revision, center.x, center.z])
  const active = tiles.find(({ model }) => model.key === districtKey(center.x, center.z))
  return { tiles, active, pending, error, latency, cached: cache.current.size }
}
