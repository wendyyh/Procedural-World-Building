import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../lib/firebase.js'
import { loadPreset, savePreset, signIn, signOutUser, subscribeToPresets } from './presetRepository.js'

function readableError(error) {
  if (error?.code === 'auth/popup-closed-by-user') return 'Sign-in was cancelled.'
  if (error?.code === 'auth/unauthorized-domain') return 'This site must be added to Firebase Authentication authorized domains.'
  if (error?.code === 'auth/operation-not-allowed') return 'Enable Google sign-in in Firebase Authentication.'
  if (error?.code === 'permission-denied') return 'Firestore denied access. Check the deployed security rules.'
  if (error?.code === 'failed-precondition') return 'The saved-configurations index has not been deployed yet.'
  return error?.message || 'Something went wrong. Please try again.'
}

function savedDate(date) {
  return date instanceof Date ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Just saved'
}

export function PresetPanel({ kind, config, view, onLoad }) {
  const [user, setUser] = useState(undefined)
  const [name, setName] = useState(kind === 'terrain' ? 'Terrain variation' : 'Voxel variation')
  const [presets, setPresets] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth) return undefined
    return onAuthStateChanged(auth, setUser, (nextError) => {
      setError(readableError(nextError))
      setUser(null)
    })
  }, [])

  useEffect(() => {
    if (!user) {
      setPresets([])
      setListLoading(false)
      return undefined
    }
    setListLoading(true)
    return subscribeToPresets(user.uid, kind, (items) => {
      setPresets(items)
      setListLoading(false)
    }, (nextError) => {
      setError(readableError(nextError))
      setListLoading(false)
    })
  }, [kind, user])

  async function handleSignIn() {
    setError('')
    setBusy('sign-in')
    try {
      await signIn()
    } catch (nextError) {
      setError(readableError(nextError))
    } finally {
      setBusy('')
    }
  }

  async function handleSave(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setBusy('save')
    try {
      await savePreset(user.uid, kind, name, config, view)
      setMessage('Saved to your cloud library.')
    } catch (nextError) {
      setError(readableError(nextError))
    } finally {
      setBusy('')
    }
  }

  async function handleLoad(item) {
    if (!window.confirm(`Load “${item.name}”? This replaces the current ${kind} settings.`)) return
    setError('')
    setMessage('')
    setBusy(item.id)
    try {
      const preset = await loadPreset(user.uid, kind, item.id)
      onLoad(preset)
      setMessage(`Loaded “${preset.name}”.`)
    } catch (nextError) {
      setError(readableError(nextError))
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="preset-panel" aria-labelledby={`${kind}-presets-title`}>
      <div className="section-heading">
        <div>
          <p className="panel-kicker">Personal cloud library</p>
          <h2 id={`${kind}-presets-title`}>Saved configurations</h2>
        </div>
        <span className="cloud-indicator is-ready">Cloud</span>
      </div>
      <p className="control-note">Save the seed, generator settings, and view options. Geometry is rebuilt when loaded.</p>

      {user === undefined ? (
        <p className="preset-empty">Checking sign-in…</p>
      ) : !user ? (
        <button type="button" className="preset-primary" disabled={Boolean(busy)} onClick={handleSignIn}>
          {busy === 'sign-in' ? 'Opening Google…' : 'Sign in with Google to save'}
        </button>
      ) : (
        <>
          <div className="preset-account">
            <span title={user.email || ''}>{user.displayName || user.email || 'Signed in'}</span>
            <button type="button" className="text-button" onClick={() => signOutUser().catch((nextError) => setError(readableError(nextError)))}>Sign out</button>
          </div>
          <form className="preset-form" onSubmit={handleSave}>
            <label className="field-control" htmlFor={`${kind}-preset-name`}><span>Configuration name</span></label>
            <div className="preset-form-row">
              <input id={`${kind}-preset-name`} type="text" maxLength="60" required value={name} onChange={(event) => setName(event.target.value)} />
              <button type="submit" className="preset-primary" disabled={Boolean(busy)}>{busy === 'save' ? 'Saving…' : 'Save current'}</button>
            </div>
          </form>
          <div className="preset-list-heading">Your {kind === 'terrain' ? 'terrain' : 'voxel'} saves <span>{presets.length}/40 recent</span></div>
          {listLoading ? <p className="preset-empty">Loading saves…</p> : presets.length ? (
            <ul className="preset-list">
              {presets.map((item) => (
                <li key={item.id}>
                  <span><strong>{item.name}</strong><small>{savedDate(item.updatedAt)}</small></span>
                  <button type="button" disabled={Boolean(busy)} onClick={() => handleLoad(item)}>{busy === item.id ? 'Loading…' : 'Load'}</button>
                </li>
              ))}
            </ul>
          ) : <p className="preset-empty">No configurations saved yet.</p>}
        </>
      )}
      {message && <p className="preset-message" role="status">{message}</p>}
      {error && <p className="preset-error" role="alert">{error}</p>}
    </section>
  )
}

export default PresetPanel
