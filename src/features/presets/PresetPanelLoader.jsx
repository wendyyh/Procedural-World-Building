import { lazy, Suspense } from 'react'
import { firebaseReady } from '../../lib/firebaseConfig.js'

const ConnectedPresetPanel = lazy(() => import('./PresetPanel.jsx'))

export function PresetPanelLoader(props) {
  if (!firebaseReady) {
    return (
      <section className="preset-panel" aria-labelledby={`${props.kind}-presets-title`}>
        <div className="section-heading">
          <div>
            <p className="panel-kicker">Personal cloud library</p>
            <h2 id={`${props.kind}-presets-title`}>Saved configurations</h2>
          </div>
          <span className="cloud-indicator">Offline</span>
        </div>
        <p className="control-note">Save the seed, generator settings, and view options. Geometry is rebuilt when loaded.</p>
        <p className="preset-empty">Cloud saves are ready to connect to a Firebase project. The generator remains fully interactive.
          {import.meta.env.DEV && <span> Add the web app values to <code>.env.local</code> to enable sign-in.</span>}
        </p>
      </section>
    )
  }

  return (
    <Suspense fallback={<section className="preset-panel"><p className="preset-empty">Opening cloud library…</p></section>}>
      <ConnectedPresetPanel {...props} />
    </Suspense>
  )
}
