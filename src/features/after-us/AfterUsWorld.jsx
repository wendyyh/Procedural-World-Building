import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AfterUsScene } from './AfterUsScene.jsx'
import { DayNightControls } from './DayNightControls.jsx'
import { createDayClock } from './dayNight.js'
import { CHUNK_SIZE, DEFAULT_AGE, DEFAULT_WORLD, districtKey } from './worldModel.js'
import { useDistrictStream } from './useDistrictStream.js'
import { BUILDING_DEFAULTS, structureStage } from './buildingModel.js'
import './after-us.css'

function Range({ label, value, min = 0, max = 1, step = 0.05, onChange, hint, format }) {
  return <label className="after-range"><span className="after-range-heading"><span>{label}</span><strong>{format ? format(value) : `${Math.round(value * 100)}%`}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} style={{ '--range-progress': `${(value - min) / (max - min) * 100}%` }} />{hint && <small>{hint}</small>}</label>
}
function Group({ number, title, children }) { return <section className="after-control-group"><div className="after-group-title"><span>{number}</span><h3>{title}</h3></div><div className="after-group-body">{children}</div></section> }
const LABELS = { sunlight: 'Sunlight', humidity: 'Humidity', soilQuality: 'Soil health', waterLevel: 'Water level', density: 'Seed availability', growthRate: 'Growth rate', dispersal: 'Seed dispersal', community: 'Plant community', buildingDensity: 'Building density', buildingLayout: 'Building layout', buildingHeight: 'Building height', buildingMaterial: 'Building material', weatheringRate: 'Weathering rate' }
const LAYOUT_COPY = { courtyard: 'Buildings frame open courtyards with space for connected habitats.', streets: 'Repeated building rows follow the street grid, leaving lanes between blocks.', clustered: 'Smaller footprints gather in irregular groups with narrow gaps.' }
const COMMUNITY_COPY = { balanced: 'A mix of pioneer plants, climbers, shrubs, and young trees.', climbers: 'Climbers favor humid shade and use walls, pipes, and frames as supports.', meadow: 'Grasses and flowers spread across sunny cracks and open ground.', woodland: 'Shrubs and trees establish where soil and connected open ground allow deeper roots.' }
const OVERLAYS = { natural: ['Natural', 'Natural scene colors.'], light: ['Light', 'Long-term sun exposure: gold is exposed; blue-gray is sheltered. Independent of Time of Day.'], moisture: ['Moisture', 'Teal marks wet ground. Canals and sheltered walls retain moisture.'], soil: ['Soil', 'Green indicates healthier rooting ground; gray marks sealed or impoverished surfaces.'], impact: ['Ecological Impact', 'Roads interrupt dispersal. Buildings shelter roots, roofs dry faster, and water connects habitats.'] }
const DIRECTIONS = [['northwest', -1, -1], ['north', 0, -1], ['northeast', 1, -1], ['west', -1, 0], ['here', 0, 0], ['east', 1, 0], ['southwest', -1, 1], ['south', 0, 1], ['southeast', 1, 1]]

export function AfterUsWorld() {
  const dayClock = useRef(createDayClock())
  const [config, setConfig] = useState(DEFAULT_WORLD), [seedDraft, setSeedDraft] = useState(DEFAULT_WORLD.seed)
  const [overlay, setOverlay] = useState('natural'), [year, setYear] = useState(DEFAULT_AGE), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(2)
  const [focus, setFocus] = useState({ x: 0, z: 0 }), [jump, setJump] = useState(null), [cameraRevision, setCameraRevision] = useState(0), [changed, setChanged] = useState(null)
  const center = useMemo(() => ({ x: Math.round(focus.x / CHUNK_SIZE), z: Math.round(focus.z / CHUNK_SIZE) }), [focus.x, focus.z])
  const stream = useDistrictStream(config, year, center)
  const stats = stream.active?.snapshot.stats || { coverage: 0, facades: 0, connected: 0, moisture: 0, buildings: 0, integrity: 0, fallen: 0 }
  const statusYear = stream.active?.snapshot.year ?? year
  const structures = stream.active?.snapshot.structures || []
  const meanDamage = structures.reduce((sum, b) => sum + b.damage, 0) / Math.max(1, structures.length)
  const stat = (key) => stream.pending ? '—' : stats[key]
  const update = useCallback((key, value) => { setConfig((current) => ({ ...current, [key]: value })); setChanged(key) }, [])
  const onFocus = useCallback((next) => setFocus(next), [])
  useEffect(() => { if (!playing) return undefined; const interval = window.setInterval(() => setYear((current) => Math.min(80, current + speed)), 1000); return () => window.clearInterval(interval) }, [playing, speed])
  useEffect(() => { if (year >= 80) setPlaying(false) }, [year])
  const navigate = (dx, dz) => setJump({ x: (center.x + dx) * CHUNK_SIZE, z: (center.z + dz) * CHUNK_SIZE, revision: Date.now() })
  const returnHome = () => { setFocus({ x: 0, z: 0 }); setJump({ x: 0, z: 0, revision: Date.now() }); setCameraRevision((current) => current + 1) }
  const regenerate = (random = false) => {
    const seed = random ? `after-us-${Math.random().toString(36).slice(2, 7)}` : seedDraft.trim() || DEFAULT_WORLD.seed
    setSeedDraft(seed); setConfig((current) => ({ ...current, seed })); setChanged('seed'); returnHome()
  }
  const reset = () => { setConfig((current) => ({ ...current, sunlight: DEFAULT_WORLD.sunlight, humidity: DEFAULT_WORLD.humidity, soilQuality: DEFAULT_WORLD.soilQuality, waterLevel: DEFAULT_WORLD.waterLevel })); setChanged('environment') }
  const feedback = stream.pending ? 'Updating simulated state…' : changed === 'sunlight' ? 'Long-term sun exposure and structural shade updated.' : changed === 'humidity' || changed === 'waterLevel' ? `${stats.moisture}% ground moisture in this district.` : changed === 'community' ? COMMUNITY_COPY[config.community] : changed === 'soilQuality' ? 'Rooting conditions updated on ground, roofs, and wall seams.' : changed === 'seed' ? 'World generated from the selected seed.' : changed === 'environment' ? 'Environmental conditions reset to defaults.' : `${stats.coverage}% ground cover · ${stats.facades}% facade growth.`

  return <main className="after-world">
    <header className="after-header"><div><p className="after-eyebrow">NATURE RECLAIMS THE WORLD</p><h1>After Us<span>.</span></h1><p>A world shaped by what we leave behind.</p></div></header>
    <div className="after-layout">
      <div className="after-visual-column">
        <section className="after-stage" aria-label="Explore an extendable abandoned city reclaimed by nature" aria-busy={stream.pending} data-district-x={center.x} data-district-z={center.z} data-cached-districts={stream.cached} data-preview-latency-ms={stream.latency}>
          <AfterUsScene tiles={stream.tiles} config={config} overlay={overlay} focus={focus} onFocus={onFocus} cameraRevision={cameraRevision} jump={jump} dayClock={dayClock} />
          {!stream.active && <div className="after-world-loading" role="status">{stream.error || 'Loading district…'}</div>}
          {stream.error && stream.active && <div className="after-stream-error" role="alert">{stream.error}</div>}
          <div className="after-scene-toolbar"><span>Drag to explore · Right-drag to orbit · Scroll to zoom</span><button type="button" onClick={() => setCameraRevision((current) => current + 1)} aria-label="Reset world camera">↺ View</button></div>
        </section>
        <div className="after-world-summary" aria-live="polite"><p className="after-summary-caption">{stream.pending ? 'Updating ecosystem status…' : `Simulated state · Year ${statusYear} · Current district`}</p><div><span>GROUND COVER</span><strong>{stat('coverage')}<small>%</small></strong><i><b style={{ width: `${stream.pending ? 0 : stats.coverage}%` }} /></i></div><div><span>FACADE GROWTH</span><strong>{stat('facades')}<small>%</small></strong><small>mean climbing extent</small></div><div><span>CONNECTED HABITATS</span><strong>{stat('connected')}<small>%</small></strong><small>adjacent vegetated patches</small></div></div>
        <div className="after-exploration"><div><p className="after-eyebrow">YOUR CURRENT DISTRICT</p><h2>{stream.active?.model.name || 'Loading district…'}</h2><p>Drag the scene or use the arrows to explore adjacent districts.</p><button type="button" className="after-text-button" onClick={returnHome}>Return to the Old Exchange ↺</button></div><div className="after-district-map" role="group" aria-label="Explore neighboring districts">{DIRECTIONS.map(([name, dx, dz]) => { const ready = stream.tiles.some(({ model }) => model.key === districtKey(center.x + dx, center.z + dz)); return <button type="button" key={name} className={`${dx === 0 && dz === 0 ? 'current ' : ''}${ready ? 'ready' : ''}`} onClick={() => navigate(dx, dz)} aria-label={`Explore district ${name}`} title={name}>{dx === 0 && dz === 0 ? '●' : ['↖', '↑', '↗', '←', '•', '→', '↙', '↓', '↘'][DIRECTIONS.findIndex(([direction]) => direction === name)]}</button> })}</div></div>
      </div>
      <aside className="after-controls" aria-label="Ecosystem controls">
        <div className="after-controls-intro"><p className="after-eyebrow">WORLD CONTROLS</p><h2>Ecosystem controls</h2><p>Adjust conditions and inspect the simulated state at the selected year.</p></div>
        <Group number="01" title="Time & Evolution">
          <div className="after-age"><strong>{year}<small> years</small></strong><span>{year < 10 ? 'Pioneer plants are establishing.' : year < 30 ? 'Vegetation is spreading.' : year < 55 ? 'Nature is reclaiming the city.' : 'Woodland is developing.'}</span></div>
          <Range label="Elapsed Years" value={year} max={80} step={1} format={(v) => `${v} years`} onChange={setYear} />
          <p className="after-overlay-note">Years since departure. Preview plant growth and structural weathering together at the selected year.</p>
          <div className="after-play-row"><button type="button" className="after-play" onClick={() => { if (year >= 80) setYear(0); setPlaying((current) => !current) }} aria-label={playing ? 'Pause simulation' : 'Play simulation'}>{playing ? 'Ⅱ Pause' : '▶ Play simulation'}</button><button type="button" className="after-step" onClick={() => setYear((current) => Math.min(80, current + 5))}>+ 5 years</button></div>
          <label className="after-select-label">Simulation speed<select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={1}>1 year / second</option><option value={2}>2 years / second</option><option value={8}>8 years / second</option></select></label>
          <button type="button" className="after-text-button" onClick={() => { setYear(0); setPlaying(false) }}>Return to Year 0 ↺</button>
          <DayNightControls clock={dayClock} />
        </Group>
        <Group number="02" title="Environmental Conditions"><Range label="Sunlight" value={config.sunlight} min={0.1} onChange={(v) => update('sunlight', v)} hint="Long-term sun exposure: favors pioneers and dries exposed roofs" /><Range label="Humidity" value={config.humidity} min={0.05} onChange={(v) => update('humidity', v)} hint="Damp walls favor vines; waterlogged soil can limit roots" /><Range label="Soil health" value={config.soilQuality} min={0.05} onChange={(v) => update('soilQuality', v)} hint="Supports roots in cracks, planters, and open ground" /><Range label="Water level" value={config.waterLevel} onChange={(v) => update('waterLevel', v)} hint="Canals provide moisture; flooding limits establishment" /></Group>
        <Group number="03" title="Buildings & Decay">
          <p className="after-overlay-note">Shape the city left behind. Building controls update the layout at the current year.</p>
          <Range label="Building density" value={config.buildingDensity} min={0.35} max={2} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => update('buildingDensity', v)} hint="Adds lots where streets, railways, water, and spacing allow" />
          <label className="after-select-label">Building layout<select value={config.buildingLayout} onChange={(event) => update('buildingLayout', event.target.value)}><option value="courtyard">Open courtyards</option><option value="streets">Street rows</option><option value="clustered">Irregular clusters</option></select></label>
          <p className="after-overlay-note">{LAYOUT_COPY[config.buildingLayout]}</p>
          <Range label="Building height" value={config.buildingHeight} min={0.6} max={1.5} step={0.1} format={(v) => `${v.toFixed(1)}×`} onChange={(v) => update('buildingHeight', v)} hint="Changes floor count and height; taller buildings create more shade" />
          <label className="after-select-label">Building material<select value={config.buildingMaterial} onChange={(event) => update('buildingMaterial', event.target.value)}><option value="mixed">Mixed materials</option><option value="brick">Brick & plaster</option><option value="concrete">Reinforced concrete</option></select></label>
          <Range label="Weathering rate" value={config.weatheringRate} min={0.4} max={1.8} step={0.1} format={(v) => `${v.toFixed(1)}×`} onChange={(v) => update('weatheringRate', v)} hint="Dampness, exposure, and roots accelerate wear; concrete resists longer" />
          <div className="after-aging-checkpoints"><span>Aging checkpoints</span><div role="group" aria-label="Preview building age">{[0, 20, 40, 60, 80].map((age) => <button key={age} type="button" aria-label={`Preview Year ${age}`} aria-pressed={year === age} onClick={() => { setYear(age); setPlaying(false) }}>{age}<small>yr</small></button>)}</div></div>
          <div className="after-feedback after-building-status" aria-live="polite"><span>BUILDING STATUS</span><small>{stream.pending ? 'Updating selected year…' : `Simulated state · Year ${statusYear} · Current district`}</small><dl><div><dt>Buildings</dt><dd>{stat('buildings')}</dd></div><div><dt>Structure condition</dt><dd>{stat('integrity')}%</dd></div><div><dt>Fallen wall sections</dt><dd>{stat('fallen')}</dd></div></dl><p>{stream.pending ? 'Recalculating structures and habitat…' : structureStage(meanDamage)}</p></div>
          <p className="after-overlay-note">Stains → cracks → loose masonry → partial wall and roof loss. Openings admit light and seeds; fragments settle below the walls. These are model estimates for the selected year.</p>
          <button type="button" className="after-text-button" onClick={() => { setConfig((current) => ({ ...current, ...BUILDING_DEFAULTS })); setChanged('buildings') }}>Reset Building Controls ↺</button>
        </Group>
        <Group number="04" title="Vegetation & Growth"><label className="after-select-label">Plant Community<select value={config.community} onChange={(event) => update('community', event.target.value)}><option value="balanced">Mixed Succession</option><option value="climbers">Climbers & roof gardens</option><option value="meadow">Pioneers & wildflowers</option><option value="woodland">Shrubs & young woodland</option></select></label><p className="after-overlay-note">{COMMUNITY_COPY[config.community]}</p><Range label="Seed availability" value={config.density} min={0.2} max={1.5} onChange={(v) => update('density', v)} /><Range label="Growth rate" value={config.growthRate} min={0.2} max={2} format={(v) => `${v.toFixed(1)}×`} onChange={(v) => update('growthRate', v)} /><Range label="Seed dispersal" value={config.dispersal} min={0.1} max={1.8} onChange={(v) => update('dispersal', v)} hint="Roads slow spread; connected patches carry it further" /><div className="after-feedback" aria-live="polite"><span>LIVE ECOSYSTEM STATUS</span><small>{stream.pending ? 'Updating selected year' : `Simulated state · Year ${statusYear}`}{changed && LABELS[changed] ? ` · ${LABELS[changed]} updated` : ''}</small><p>{feedback}</p></div></Group>
        <Group number="05" title="Explore the Ecosystem"><div className="after-segmented after-overlay-options" role="group" aria-label="Ecological analysis">{Object.entries(OVERLAYS).map(([value, [label]]) => <button type="button" key={value} className={overlay === value ? 'active' : ''} aria-pressed={overlay === value} onClick={() => setOverlay(value)}>{label}</button>)}</div><p className="after-overlay-note">{OVERLAYS[overlay][1]}</p>{overlay === 'impact' && <div className="after-impact-key"><span><i style={{ background: '#b78479' }} /> Barriers</span><span><i style={{ background: '#7eaaa0' }} /> Water</span><span><i style={{ background: '#a6b876' }} /> Corridors</span></div>}<div className="after-fact"><span>DISTRICT MOISTURE</span><strong>{stat('moisture')}%</strong></div></Group>
        <Group number="06" title="World Generation"><div className="after-seed-row"><label htmlFor="after-seed">World seed</label><div><input id="after-seed" value={seedDraft} onChange={(event) => setSeedDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') regenerate() }} /><button type="button" onClick={() => regenerate()} aria-label="Generate world from seed">↻</button></div></div><button type="button" className="after-new-world" onClick={() => regenerate(true)}>Generate New World <span>↗</span></button></Group>
        <button type="button" className="after-reset" onClick={reset}>Reset Environmental Conditions <span>↺</span></button>
      </aside>
    </div>
    <footer className="after-footer"><span>AFTER US / NATURE RECLAIMS THE WORLD</span></footer>
  </main>
}
