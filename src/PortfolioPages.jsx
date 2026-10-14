import { EXPERIMENTS, experimentHref } from './experiments.js'
import { ExperimentArtwork } from './ExperimentArtwork.jsx'
import { WorldPreview } from './WorldPreview.jsx'

function SystemAccordion() {
  return (
    <details className="system-accordion">
      <summary><span>Explore the systems behind the world</span><span>{EXPERIMENTS.length} studies <b aria-hidden="true">＋</b></span></summary>
      <div className="system-accordion-content">
        {EXPERIMENTS.map((experiment) => (
          <a href={experimentHref(experiment.slug)} key={experiment.slug}>
            <span>{experiment.number}</span><strong>{experiment.system}</strong><span aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
    </details>
  )
}

function ExperimentCard({ experiment }) {
  return (
    <a className={`experiment-card experiment-card-${experiment.slug}`} href={experimentHref(experiment.slug)}>
      <ExperimentArtwork slug={experiment.slug} />
      <span className="experiment-card-top"><span>EXPERIMENT {experiment.number}</span><span className="live-dot">LIVE</span></span>
      <span className="experiment-card-type">{experiment.type}</span>
      <strong>{experiment.title}</strong>
      <span className="experiment-card-description">{experiment.description}</span>
      <span className="experiment-card-footer">
        <span className="experiment-tags">{experiment.tags.map((tag) => <span key={tag}>{tag}</span>)}</span>
        <span className="experiment-card-arrow" aria-hidden="true">↗</span>
      </span>
    </a>
  )
}

export function Overview() {
  return (
    <main className="portfolio-page overview-page">
      <section className="overview-hero">
        <div className="overview-copy">
          <p className="eyebrow">PROCEDURAL WORLD / PROJECT OVERVIEW</p>
          <h1>A world built from rules.</h1>
          <p className="overview-lead">
            A customizable world is taking shape. Explore the vision for the place we are building,
            and the interactive studies shaping its terrain, ecology, movement, and stories.
          </p>
          <div className="overview-actions">
            <a className="primary-link" href="#world">Explore the world <span aria-hidden="true">↗</span></a>
            <a className="text-link" href="#experiments">Explore the experiments <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <div className="overview-visual">
          <WorldPreview />
          <SystemAccordion />
        </div>
      </section>
      <section className="overview-next" aria-labelledby="next-heading">
        <div>
          <p className="eyebrow">THE IDEA</p>
          <h2 id="next-heading">From separate studies to one coherent place.</h2>
        </div>
        <p>Terrain, ecology, motion, branching forms, and possible histories are becoming a shared set of rules. The next step is to bring them together in a world people can shape and revisit.</p>
      </section>
    </main>
  )
}

export function WorldLanding() {
  return (
    <main className="portfolio-page world-page">
      <section className="world-hero">
        <div className="world-copy">
          <p className="eyebrow">THE WORLD / IN DEVELOPMENT</p>
          <h1>A place shaped by your choices.</h1>
          <p>The future world will bring terrain, living systems, pathways, and possible histories into one customizable place. This is a preview of that direction while the interactive model is being built.</p>
          <a className="text-link" href="#experiments">Explore the working experiments <span aria-hidden="true">↗</span></a>
        </div>
        <WorldPreview large />
      </section>
      <section className="world-principles" aria-label="World building themes">
        <div><span>01 / SHAPE</span><h2>Form the landscape</h2><p>Start with terrain, elevation, water, and the paths that connect them.</p></div>
        <div><span>02 / GROW</span><h2>Give it life</h2><p>Populate the world with ecology, movement, and branching forms.</p></div>
        <div><span>03 / EVOLVE</span><h2>Follow its futures</h2><p>Let rules and decisions generate distinct histories from one starting place.</p></div>
      </section>
    </main>
  )
}

export function ExperimentIndex() {
  return (
    <main className="portfolio-page experiment-index">
      <header className="index-header">
        <p className="eyebrow">WORKING STUDIES / {String(EXPERIMENTS.length).padStart(2, '0')}</p>
        <h1>Experiments</h1>
        <p>Each study explores a different system behind the world. Open one to see how its rules shape space.</p>
      </header>
      <div className="experiment-grid">
        {EXPERIMENTS.map((experiment) => <ExperimentCard key={experiment.number} experiment={experiment} />)}
      </div>
      <div className="index-footnote"><span>THE WORLD IS TAKING SHAPE</span><a href="#world">Explore the world ↗</a></div>
    </main>
  )
}
