import { lazy, Suspense, useEffect, useRef, useState } from 'react'

const WorldCutout = lazy(() => import('./features/after-us/WorldCutout.jsx'))

export function WorldPreview({ large = false }) {
  const container = useRef(), fadeRef = useRef()
  const [visible, setVisible] = useState(false), [mounted, setMounted] = useState(false)
  const [pageVisible, setPageVisible] = useState(() => !document.hidden)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { setVisible(entry.isIntersecting); if (entry.isIntersecting) setMounted(true) }, { rootMargin: '80px' })
    observer.observe(container.current)
    const onVisibility = () => setPageVisible(!document.hidden)
    const media = window.matchMedia('(prefers-reduced-motion: reduce)'), onMotion = () => setReducedMotion(media.matches)
    document.addEventListener('visibilitychange', onVisibility); media.addEventListener('change', onMotion)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', onVisibility); media.removeEventListener('change', onMotion) }
  }, [])
  const active = visible && pageVisible && !reducedMotion
  return <figure ref={container} className={`world-preview${large ? ' world-preview-large' : ''}`} data-animating={active} aria-label="A deeply excavated 3D cutout of After Us with exposed soil, rock, and roots, automatically evolving from abandoned buildings to vegetation-covered ruins." title="Drag to rotate · Double-click to reset">
    <div className="world-preview-scene">
      <div className="world-preview-canvas" ref={fadeRef}>{mounted && <Suspense fallback={<div className="preview-loading">Loading world preview…</div>}><WorldCutout active={active} reducedMotion={reducedMotion} fadeRef={fadeRef} /></Suspense>}</div>
    </div>
  </figure>
}
