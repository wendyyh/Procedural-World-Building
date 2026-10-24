import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { AfterUsScene } from './AfterUsScene.jsx'
import { DayNightControls } from './DayNightControls.jsx'
import { createDayClock } from './dayNight.js'
import { CHUNK_SIZE, DEFAULT_WORLD, districtKey } from './worldModel.js'
import { useDistrictStream } from './useDistrictStream.js'
import { BUILD_KIT, EMPTY_PARCEL, SAVE_KEY, buildingDraft, changeParcel, historyReducer, newPlayerWorld, parsePlayerWorld, removePlacement, validateBuilding, validateSeed } from './builderModel.js'
import { SEEDS } from './plantedEcology.js'
import './after-us.css'
import './builder.css'

function KitIcon({ kind }) {
  return <svg viewBox="0 0 72 56" fill="none" aria-hidden="true">
    {['room', 'workshop'].includes(kind) ? <><path d="M12 23 35 10l25 13-23 14z" fill="#d4b49a" /><path d="M12 23v22l25 10V37z" fill="#b79d85" /><path d="m37 37 23-14v23L37 55z" fill="#ddc6ad" /><path d="M19 29v8l6 3v-8m18 8v8l6-3v-8m3-2v8l5-3v-8" fill="#788e82" />{kind === 'workshop' && <path d="m12 23 7-13 8 5 7-12 10 6 7-5 9 19-23 14z" fill="#9aa597" />}</>
      : kind === 'glasshouse' ? <><path d="M10 42V29C10 4 39 2 41 28v23z" fill="#bed0bf" opacity=".7" /><path d="m10 42 20-11 31 10-20 10z" fill="#c9bda2" /><path d="M10 42V29C10 4 39 2 41 28v23M20 37V24C20 0 49-2 51 23v23M30 31V19C30-5 59-7 61 18v23M10 29l20-10m11 9 20-10M25 10l20-10" stroke="#7e9383" strokeWidth="1.5" /></>
        : kind === 'ruin' ? <><path d="m12 38 23-12 25 12-23 14z" fill="#d4c6a9" /><path d="M13 38V14l5 2v6l8-4v-9l8-4v22" fill="#b8a48b" /><path d="m34 5 25 12v22L34 27z" fill="#d4bba0" /><path d="M39 25V14l6 3v11m5 2V19l6 3v11" fill="#879780" /></>
          : kind === 'birch' ? <><path d="M36 49V20m0 16-9-9m9 3 10-10" stroke="#a6a58d" strokeWidth="3" /><ellipse cx="34" cy="19" rx="18" ry="16" fill="#a2b38a" /><ellipse cx="44" cy="23" rx="12" ry="12" fill="#859e73" /><ellipse cx="25" cy="25" rx="11" ry="10" fill="#b9c49b" /></>
            : <><path d="M18 45c10-4 22-3 36 0" stroke="#afad8a" strokeWidth="2" />{[0, 1, 2, 3, 4].map((n) => <g key={n} transform={`translate(${20 + n * 8} ${43 - n % 2 * 5}) rotate(${n * 11 - 22})`}><path d="M0 0v-23" stroke="#789264" strokeWidth="1.5" /><ellipse cx="-4" cy="-12" rx={kind === 'fern' ? 3 : 5} ry="9" transform="rotate(-38 -4 -12)" fill={kind === 'ivy' ? '#789b72' : '#a2b383'} /><ellipse cx="4" cy="-20" rx="5" ry="9" transform="rotate(38 4 -20)" fill="#819f71" /></g>)}</>}
  </svg>
}

function loadHistory() {
  let present = null
  try { present = parsePlayerWorld(localStorage.getItem(SAVE_KEY)) } catch { /* Storage may be unavailable. */ }
  return { present: present ?? newPlayerWorld(), past: [], future: [] }
}
const MODES = [['build', 'Build', '⌂'], ['plant', 'Plant', '♧'], ['select', 'Select', '↖'], ['explore', 'Explore', '✥']]
const DIRECTIONS = [['Northwest', -1, -1, '↖'], ['North', 0, -1, '↑'], ['Northeast', 1, -1, '↗'], ['West', -1, 0, '←'], ['Home', 0, 0, '⌂'], ['East', 1, 0, '→'], ['Southwest', -1, 1, '↙'], ['South', 0, 1, '↓'], ['Southeast', 1, 1, '↘']]

export function AfterUsWorld() {
  const [history, dispatch] = useReducer(historyReducer, undefined, loadHistory)
  const world = history.present
  const [mode, setMode] = useState('build'), [buildKind, setBuildKind] = useState('room'), [seedKind, setSeedKind] = useState('meadow')
  const [turned, setTurned] = useState(false), [hover, setHover] = useState(null), [selectedId, setSelectedId] = useState(null)
  const [focus, setFocus] = useState({ x: 0, z: 0 }), [jump, setJump] = useState(null), [cameraRevision, setCameraRevision] = useState(0)
  const [playing, setPlaying] = useState(false), [notice, setNotice] = useState('Choose a building piece, then click the parcel to place it.')
  const [saveStatus, setSaveStatus] = useState('Saving your world…'), [overlay, setOverlay] = useState('natural')
  const dayClock = useRef(createDayClock(14))
  const center = useMemo(() => ({ x: Math.round(focus.x / CHUNK_SIZE), z: Math.round(focus.z / CHUNK_SIZE) }), [focus.x, focus.z])
  const key = districtKey(center.x, center.z), parcel = world.districts[key] ?? EMPTY_PARCEL
  const config = useMemo(() => ({ ...DEFAULT_WORLD, seed: world.seed, playerBuilt: true, districtEdits: world.districts, weatheringRate: 0.55 }), [world.seed, world.districts])
  const stream = useDistrictStream(config, world.year, center), model = stream.active?.model
  const selectedBuilding = parcel.buildings.find((b) => b.id === selectedId), selectedPlant = parcel.plants.find((p) => p.id === selectedId)
  const ghostAt = (point) => !point ? null : mode === 'move' && selectedBuilding ? { ...selectedBuilding, x: Math.round(point.x * 2) / 2, z: Math.round(point.z * 2) / 2 } : mode === 'build' ? buildingDraft(buildKind, point.x, point.z, turned) : null
  const ghost = ghostAt(hover)
  const host = model?.buildings.find((b) => b.authoredId === hover?.buildingId)
  const invalid = ghost ? validateBuilding(model, ghost, mode === 'move' ? selectedId : undefined) : hover && mode === 'plant' ? validateSeed(model, seedKind, hover.x, hover.z, host) : null
  const stats = stream.active?.snapshot.stats
  const allParcels = Object.values(world.districts), totalBuildings = allParcels.reduce((sum, p) => sum + p.buildings.length, 0), totalPlants = allParcels.reduce((sum, p) => sum + p.plants.length, 0)

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(world)); setSaveStatus('Saved on this device') }
    catch { setSaveStatus('Storage unavailable · keep this tab open') }
  }, [world])
  useEffect(() => {
    if (!playing || world.year >= 9999) return undefined
    const timer = setInterval(() => dispatch({ type: 'year', amount: 1 }), 900)
    return () => clearInterval(timer)
  }, [playing, world.year >= 9999])
  useEffect(() => { setHover(null); setSelectedId(null); setMode((current) => current === 'move' ? 'select' : current) }, [key])
  const onFocus = useCallback((value) => setFocus(value), [])
  const chooseMode = (value) => { setMode(value); setHover(null); setPlaying(false) }
  const edit = (update) => dispatch({ type: 'edit', update })
  const updateBuilding = (patch) => {
    edit((current) => changeParcel(current, key, (p) => ({ ...p, buildings: p.buildings.map((b) => b.id === selectedId ? { ...b, ...patch } : b) })))
    setNotice('Your building changed. Its shape changes the shade and surfaces around it.')
  }
  const removeSelected = () => {
    edit((current) => removePlacement(current, key, selectedId)); setSelectedId(null); setMode('select'); setNotice('Removed. Undo will bring it back.')
  }
  const navigate = (dx, dz, home = false) => {
    setPlaying(false); setHover(null)
    setJump({ x: home ? 0 : (center.x + dx) * CHUNK_SIZE, z: home ? 0 : (center.z + dz) * CHUNK_SIZE, revision: Date.now() })
  }
  const onAction = (point) => {
    if (stream.pending || !model) { setNotice('Preparing the parcel…'); return }
    if (mode === 'select') { setSelectedId(point.seedId ?? point.buildingId ?? null); return }
    if (mode === 'build' || mode === 'move') {
      const draft = ghostAt(point), reason = validateBuilding(model, draft, mode === 'move' ? selectedId : undefined)
      if (reason) { setNotice(reason); return }
      if (mode === 'move') { updateBuilding({ x: draft.x, z: draft.z }); setMode('select'); setHover(null); setNotice('Building moved. Its ivy moves with it.'); return }
      if (parcel.buildings.length >= 40) { setNotice('This parcel is full. Explore a neighboring block.'); return }
      const building = { ...draft, id: crypto.randomUUID(), createdAt: world.year }
      edit((current) => changeParcel(current, key, (p) => ({ ...p, buildings: [...p.buildings, building] })))
      setSelectedId(building.id); setMode('select'); setHover(null)
      setNotice(`${BUILD_KIT[buildKind].name} placed. Shape it below, or choose Plant to bring it to life.`)
    } else if (mode === 'plant') {
      const target = model.buildings.find((b) => b.authoredId === point.buildingId)
      const reason = validateSeed(model, seedKind, point.x, point.z, target)
      if (reason) { setNotice(reason); return }
      if (parcel.plants.length >= 150) { setNotice('This garden is full. Explore another block to keep planting.'); return }
      const plant = { id: crypto.randomUUID(), kind: seedKind, x: target ? target.x : point.x, z: target ? target.z + target.depth / 2 + 0.3 : point.z, plantedAt: world.year, ...(target ? { buildingId: target.authoredId } : {}) }
      edit((current) => changeParcel(current, key, (p) => ({ ...p, plants: [...p.plants, plant] })))
      setSelectedId(plant.id); setHover(null); setNotice(`${SEEDS[seedKind].name} planted. Advance five years to watch it grow.`)
    }
  }
  useEffect(() => {
    const handleKey = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement || event.target.isContentEditable) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); setPlaying(false); dispatch({ type: event.shiftKey ? 'redo' : 'undo' }); setSelectedId(null); setMode('select') }
      else if (event.key === 'Escape') { chooseMode('select'); setSelectedId(null) }
      else if (!event.metaKey && !event.ctrlKey && event.key.toLowerCase() === 'r' && mode === 'build') setTurned((v) => !v)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [mode])
  const undo = (type) => { setPlaying(false); dispatch({ type }); setSelectedId(null); setMode('select'); setHover(null); setNotice(type === 'undo' ? 'Your last change was undone.' : 'Your change was restored.') }
  const guidance = !totalBuildings ? ['01', 'Make a place.', 'Place your first room. Its walls, windows, and roof will take shape around your choice.'] : !totalPlants ? ['02', 'Invite nature in.', 'Choose Plant. Sow a meadow on the ground or ivy against your new building.'] : world.year === 0 ? ['03', 'Give it time.', 'Advance five years and watch your seeds find their way through the world you built.'] : ['04', 'Keep making room.', 'Add to your garden, or cross the street to begin a new one. Your work stays here.']
  const editor = { model, mode, hover, ghost, invalid, selectedId, onHover: setHover, onAction }

  return <main className="after-world builder-world">
    <header className="after-header"><div><p className="after-eyebrow">A WORLD YOU BUILD & PLANT</p><h1>After Us<span>.</span></h1><p>Make a little place. Let nature take its time.</p></div><div className="builder-save"><i />{saveStatus}<span>{totalBuildings} structures · {totalPlants} seeds</span></div></header>
    <div className="builder-layout">
      <div className="after-visual-column">
        <div className="builder-toolbar"><div role="group" aria-label="World tools">{MODES.map(([value, label, icon]) => <button key={value} type="button" aria-pressed={mode === value || value === 'select' && mode === 'move'} onClick={() => chooseMode(value)}><span aria-hidden="true">{icon}</span>{label}</button>)}</div><div className="builder-history"><button type="button" aria-label="Undo last change" disabled={!history.past.length} onClick={() => undo('undo')}>↶</button><button type="button" aria-label="Redo last change" disabled={!history.future.length} onClick={() => undo('redo')}>↷</button></div></div>
        <section className={`after-stage builder-stage tool-${mode}`} aria-label="Build and plant your world" aria-busy={stream.pending} data-district-x={center.x} data-district-z={center.z} onPointerLeave={() => setHover(null)}>
          <AfterUsScene tiles={stream.tiles} config={config} overlay={overlay} focus={focus} onFocus={onFocus} cameraRevision={cameraRevision} jump={jump} dayClock={dayClock} editor={editor} />
          <div className="builder-parcel-label"><span>YOUR PARCEL</span><strong>{model?.name ?? 'The Old Exchange'}</strong><small>{center.x}, {center.z}</small></div>
          {!stream.active && <div className="after-world-loading" role="status">{stream.error ?? 'Preparing your first parcel…'}</div>}
          {stream.error && stream.active && <div className="after-stream-error" role="alert">{stream.error}</div>}
          <div className={`builder-placement-hint ${invalid ? 'is-invalid' : ''}`} aria-live="polite">{hover && invalid ? invalid : mode === 'build' ? 'Click to place · R to rotate footprint' : mode === 'plant' ? seedKind === 'ivy' ? 'Click a building to plant ivy' : 'Click open ground to plant' : mode === 'move' ? 'Click a new position · Esc to cancel' : mode === 'select' ? 'Click a building or seed marker to edit' : 'Drag to explore neighboring parcels'}</div>
          <div className="after-scene-toolbar"><span>Right-drag to orbit · Scroll to zoom</span><button type="button" onClick={() => setCameraRevision((v) => v + 1)}>↺ View</button></div>
        </section>
        <div className="builder-bottom-row"><div className="builder-guidance"><span>{guidance[0]}</span><div><h2>{guidance[1]}</h2><p>{guidance[2]}</p></div></div><div className="builder-navigation"><div><span>ANOTHER PLACE TO BEGIN</span><p>Every block is yours to shape.</p></div><div className="after-district-map" role="group" aria-label="Explore neighboring parcels">{DIRECTIONS.map(([name, dx, dz, icon]) => <button key={name} type="button" aria-label={name === 'Home' ? 'Return to your first parcel' : `Explore ${name.toLowerCase()} parcel`} title={name} className={name === 'Home' ? 'current' : world.districts[districtKey(center.x + dx, center.z + dz)] ? 'ready' : ''} onClick={() => navigate(dx, dz, name === 'Home')}>{icon}</button>)}</div></div></div>
      </div>
      <aside className="builder-panel" aria-label="Building and planting tools">
        <div className="builder-panel-heading"><p className="after-eyebrow">YOUR GARDEN KIT</p><h2>{mode === 'build' ? 'Small pieces. Your place.' : mode === 'plant' ? 'It starts with a seed.' : mode === 'explore' ? 'A world of possibilities.' : 'Make it your own.'}</h2></div>
        {(mode === 'build' || mode === 'plant') && <><div className="builder-catalog">{Object.entries(mode === 'build' ? BUILD_KIT : SEEDS).map(([value, item]) => <button key={value} type="button" aria-pressed={(mode === 'build' ? buildKind : seedKind) === value} onClick={() => { mode === 'build' ? setBuildKind(value) : setSeedKind(value); setHover(null) }}><KitIcon kind={value} /><strong>{item.name}</strong><small>{mode === 'build' ? `${item.width} × ${item.depth} m` : value === 'ivy' ? 'Climbs structures' : value === 'birch' ? 'Grows into a tree' : 'Spreads from its roots'}</small></button>)}</div><p className="builder-kit-hint">{(mode === 'build' ? BUILD_KIT[buildKind] : SEEDS[seedKind]).hint}</p>{mode === 'build' && <button className="builder-secondary" type="button" onClick={() => setTurned((v) => !v)}>↻ Rotate footprint <kbd>R</kbd><span>{turned ? '90°' : '0°'}</span></button>}</>}
        {(mode === 'select' || mode === 'move') && (selectedBuilding ? <div className="builder-inspector"><div className="builder-selection-title"><KitIcon kind={selectedBuilding.kind} /><div><span>YOUR STRUCTURE</span><h3>{BUILD_KIT[selectedBuilding.kind].name}</h3><p>Placed in year {selectedBuilding.createdAt}</p></div></div>{selectedBuilding.type === 'apartment' && <><div className="builder-storeys"><span>Storeys</span><div><button type="button" aria-label="Remove a storey" disabled={selectedBuilding.floors <= 1 || stream.pending} onClick={() => updateBuilding({ floors: selectedBuilding.floors - 1 })}>−</button><strong>{selectedBuilding.floors}</strong><button type="button" aria-label="Add a storey" disabled={selectedBuilding.floors >= 4 || stream.pending} onClick={() => updateBuilding({ floors: selectedBuilding.floors + 1 })}>+</button></div></div><label className="after-select-label">Roof shape<select value={selectedBuilding.roofForm} onChange={(e) => updateBuilding({ roofForm: e.target.value })}><option value="flat">Flat terrace</option><option value="gable">Pitched roof</option><option value="sawtooth">Sawtooth roof</option></select></label></>}{selectedBuilding.type !== 'greenhouse' && <label className="after-select-label">Material<select value={selectedBuilding.material} onChange={(e) => updateBuilding({ material: e.target.value })}><option value="brick">Warm brick & plaster</option><option value="concrete">Pale concrete</option></select></label>}<p className="builder-kit-hint">{selectedBuilding.type === 'apartment' ? 'Each storey adds windows and casts more shade. Ferns enjoy the sheltered ground; ivy can climb the walls.' : BUILD_KIT[selectedBuilding.kind].hint}</p><div className="builder-edit-actions"><button className="builder-secondary" type="button" onClick={() => { setMode(mode === 'move' ? 'select' : 'move'); setHover(null) }}>{mode === 'move' ? 'Cancel move' : 'Move structure'}</button><button className="builder-remove" type="button" onClick={removeSelected}>Remove</button></div><button className="builder-primary" type="button" onClick={() => { chooseMode('plant'); setSeedKind('ivy') }}>Plant something here ↗</button></div> : selectedPlant ? <div className="builder-inspector"><div className="builder-selection-title"><KitIcon kind={selectedPlant.kind} /><div><span>YOUR SEED</span><h3>{SEEDS[selectedPlant.kind].name}</h3><p>Planted in year {selectedPlant.plantedAt}</p></div></div><p className="builder-kit-hint">{SEEDS[selectedPlant.kind].hint}</p><button className="builder-remove" type="button" onClick={removeSelected}>Remove seed and its growth</button></div> : <div className="builder-empty-selection"><span>↖</span><p>Choose a building to add storeys, change its roof, or move it. Choose a seed marker to inspect your planting.</p><button className="builder-primary" type="button" onClick={() => chooseMode('build')}>Add a building piece</button></div>)}
        {mode === 'explore' && <div className="builder-explore-copy"><p>Drag across the streets to find another open parcel. Roads, rails, and water continue between blocks.</p><p>Your buildings and plants stay where you put them, ready for your return.</p><button className="builder-primary" type="button" onClick={() => chooseMode('build')}>Build on this parcel</button></div>}
        <div className="builder-feedback" role="status">{notice}</div>
        <section className="builder-time"><div className="builder-time-heading"><div><p className="after-eyebrow">LET IT GROW</p><h3>Year {world.year}<span>of your garden</span></h3></div><span className="builder-sun" aria-hidden="true">☼</span></div><p>Seeds spread from where you plant them. Structures slowly weather with time.</p><div className="after-play-row"><button className="after-play" type="button" aria-pressed={playing} onClick={() => { setPlaying((v) => !v); setMode('select'); setHover(null) }}>{playing ? 'Ⅱ Pause growth' : '▷ Watch it grow'}</button><button className="after-step" type="button" disabled={world.year >= 9999} onClick={() => { setPlaying(false); dispatch({ type: 'year', amount: 5 }); setNotice('Five years pass. Your plants respond to the places you chose.') }}>+ 5 years</button></div><div className="builder-metrics"><div><strong>{parcel.buildings.length}</strong><span>structures placed</span></div><div><strong>{parcel.plants.length}</strong><span>seeds planted</span></div><div><strong>{stats?.coverage ?? 0}%</strong><span>ground reclaimed</span></div></div></section>
        <details className="builder-conditions"><summary>Light & habitat</summary><DayNightControls clock={dayClock} /><label className="after-select-label">See the habitat<select value={overlay} onChange={(e) => setOverlay(e.target.value)}><option value="natural">Natural colors</option><option value="light">Sun & shade</option><option value="moisture">Ground moisture</option></select></label><p>Buildings create shade. Canals keep nearby ground damp. These conditions influence how your plants grow.</p></details>
      </aside>
    </div>
    <footer className="after-footer"><span>AFTER US / BUILT BY YOU, RECLAIMED BY NATURE</span><span>FIRST PLAYABLE STUDY · LOCAL SAVE</span></footer>
  </main>
}
