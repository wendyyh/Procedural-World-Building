import { useMemo, useState } from 'react'
import { WORLDLINE_STAGES, createWorldlineGraph, getWorldlineHistory } from './createWorldlines.js'

const DEFAULT_SEED = 'tidal-atlas-04'
const DEFAULT_PREMISE = 'An archipelago learns to live with a changing sea.'
const AXES = [
  { key: 'balance', label: 'Landscape balance', color: '#8bdfbe' },
  { key: 'settlement', label: 'Settlement', color: '#e0ba84' },
  { key: 'knowledge', label: 'Knowledge', color: '#88b9d6' },
]

function graphPoint(path) {
  const depth = path.length
  const index = path ? Number.parseInt(path, 2) : 0
  return { x: 66 + depth * 145, y: 60 + ((index + 0.5) / 2 ** depth) * 500 }
}

function WorldlineGraph({ nodes, selected, onSelect }) {
  const entries = Object.values(nodes)
  return <div className="worldline-graph-wrap">
    <svg viewBox="0 0 860 640" role="img" aria-label="Branching diagram of 32 possible world histories">
      <g className="worldline-columns">{['Origin', ...WORLDLINE_STAGES.map((stage) => stage.era)].map((label, index) => <g key={label}><line x1={66 + index * 145} x2={66 + index * 145} y1="46" y2="572" /><text x={66 + index * 145} y="28" textAnchor="middle">{label.toUpperCase()}</text></g>)}</g>
      <g className="worldline-edges">{entries.filter((node) => node.parent !== null).map((node) => {
        const from = graphPoint(node.parent)
        const to = graphPoint(node.path)
        const active = selected.startsWith(node.path)
        return <path key={node.path} d={`M ${from.x} ${from.y} C ${from.x + 56} ${from.y}, ${to.x - 56} ${to.y}, ${to.x} ${to.y}`} className={active ? `active branch-${node.entry.branch}` : ''} />
      })}</g>
      <g className="worldline-nodes">{entries.map((node) => {
        const point = graphPoint(node.path)
        const isSelected = selected === node.path
        const onPath = selected.startsWith(node.path)
        return <g key={node.path} transform={`translate(${point.x} ${point.y})`} role="button" tabIndex={0} aria-label={node.path ? `Open ${node.entry.era}, ${node.entry.choice}, path ${node.path}` : 'Open world origin'} onClick={() => onSelect(node.path)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(node.path) } }} className={isSelected ? 'selected' : onPath ? 'on-path' : ''}>
          <circle r={isSelected ? 9 : node.depth === 5 ? 3.7 : 5.3} className={node.entry?.branch === 1 ? 'branch-one' : ''} />
          {isSelected && <circle r="15" className="node-ring" />}
        </g>
      })}</g>
      <text x="66" y="613" className="graph-caption">SELECT A NODE TO REVISIT ITS HISTORY</text>
    </svg>
  </div>
}

function WorldState({ state }) {
  return <div className="worldline-state">{AXES.map((axis) => <div key={axis.key} className="worldline-axis"><div><span>{axis.label}</span><output>{state[axis.key]}</output></div><div className="worldline-track"><i style={{ width: `${state[axis.key]}%`, backgroundColor: axis.color }} /></div></div>)}</div>
}

export function WorldlinesStudy() {
  const [seed, setSeed] = useState(DEFAULT_SEED)
  const [premise, setPremise] = useState(DEFAULT_PREMISE)
  const [selected, setSelected] = useState('')
  const [pathInput, setPathInput] = useState('')
  const [pathError, setPathError] = useState('')
  const nodes = useMemo(() => createWorldlineGraph(seed), [seed])
  const node = nodes[selected]
  const stage = WORLDLINE_STAGES[node.depth]
  const history = getWorldlineHistory(nodes, selected)

  const select = (path) => { setSelected(path); setPathInput(path); setPathError('') }
  const openPath = (event) => {
    event.preventDefault()
    if (!/^[01]{0,5}$/.test(pathInput) || !(pathInput in nodes)) {
      setPathError('Use up to five digits containing only 0 or 1.')
      return
    }
    select(pathInput)
  }

  return <main className="app-shell">
    <header className="masthead"><p className="eyebrow">EXPERIMENT 09 / POSSIBLE HISTORIES</p><h1>Worldlines</h1><p className="intro">One starting world can follow many histories. Make a choice, trace its consequences, then revisit another branch.</p></header>
    <div className="worldline-viewport">
      <section className="worldline-panel" aria-label="Interactive world history diagram">
        <div className="worldline-heading"><span>BRANCHING WORLD MODEL / {2 ** WORLDLINE_STAGES.length} ENDINGS</span><span>SEED {seed || 'UNTITLED'}</span></div>
        <div className="worldline-premise"><span>THE STARTING WORLD</span><strong>{premise || 'A world waiting for its first premise.'}</strong></div>
        <p className="worldline-mobile-hint">Swipe the diagram to explore later eras →</p>
        <WorldlineGraph nodes={nodes} selected={selected} onSelect={select} />
        <div className="worldline-footer"><span>Selected path: <strong>{selected || 'origin'}</strong></span><span>Era {node.depth} of {WORLDLINE_STAGES.length}</span></div>
      </section>
    </div>
    <aside className="control-panel worldline-controls" aria-label="Worldline controls">
      <section className="control-section"><h2>Starting world</h2>
        <label className="field-control"><span>Premise</span><textarea rows="3" value={premise} maxLength={180} onChange={(event) => setPremise(event.target.value)} /></label>
        <label className="field-control"><span>World seed</span><input value={seed} maxLength={40} onChange={(event) => { setSeed(event.target.value); select('') }} /></label>
        <form className="path-code-form" onSubmit={openPath}><label className="field-control"><span>Path code · 0 / 1 choices</span><input value={pathInput} maxLength={5} placeholder="e.g. 01011" onChange={(event) => setPathInput(event.target.value)} /></label><button type="submit">Open path</button></form>
        {pathError && <p className="path-error" role="alert">{pathError}</p>}
        <p className="control-note">The seed and path code reproduce the same rule-driven state. The premise names the world; it does not change the rules.</p>
      </section>
      <section className="control-section"><h2>Current state</h2><WorldState state={node.state} /></section>
      {stage ? <section className="control-section worldline-decision"><p className="panel-kicker">{stage.era} / decision {node.depth + 1}</p><h2>{stage.title}</h2><p>{stage.prompt}</p><div className="worldline-choices">{stage.choices.map((choice, index) => <button type="button" key={choice.title} onClick={() => select(`${selected}${index}`)}><span>{index === 0 ? '00 / CARE' : '01 / CHANGE'}</span><strong>{choice.title}</strong><small>{choice.description}</small></button>)}</div></section> : <section className="control-section worldline-ending"><p className="panel-kicker">Possible ending / {selected}</p><h2>{node.outcome.title}</h2><p>{node.outcome.text}</p><button type="button" onClick={() => select(selected.slice(0, -1))}>Return to last fork ↖</button></section>}
      <section className="control-section"><h2>Chronicle</h2>{history.length ? <ol className="worldline-history">{history.map((item) => <li key={item.path}><span>{item.entry.era}</span><strong>{item.entry.choice}</strong><small>{item.entry.description}</small></li>)}</ol> : <p className="control-note">The first decision begins this history.</p>}</section>
      <button type="button" className="reset-button" onClick={() => select('')}>Return to origin</button>
    </aside>
  </main>
}
