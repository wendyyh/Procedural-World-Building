import { EXPERIMENTS, experimentHref } from './experiments.js'
import { ExperimentArtwork } from './ExperimentArtwork.jsx'
import { WorldPreview } from './WorldPreview.jsx'

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
          <h1><span>A world reclaimed</span><span>by nature.</span></h1>
          <p className="overview-lead">
            Explore After Us, a procedural world where nature reclaims abandoned streets,
            rooftops, and railways. Adjust the conditions and watch the ecosystem evolve.
          </p>
          <div className="overview-actions">
            <a className="primary-link" href="#world">Explore the world <span aria-hidden="true">↗</span></a>
            <a className="text-link" href="#experiments">Explore the experiments <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <div className="overview-visual">
          <WorldPreview />
        </div>
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
