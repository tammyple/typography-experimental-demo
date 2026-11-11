import { experiments, experimentUrl } from '../data/experiments';
import '../styles/experiment-index.css';

export default function ExperimentIndex() {
  return (
    <section className="experiment-index" aria-labelledby="index-title">
      <header className="experiment-index-header">
        <a href="#/experiments" className="experiment-index-brand">
          TSUNAMI OF WORDS
        </a>
        <span>AN INTERACTIVE COLLECTION / 2026</span>
      </header>

      <div className="experiment-index-intro">
        <p className="experiment-index-eyebrow">A COLLECTION OF EXPERIMENTS</p>
        <h1 id="index-title">Experiments.</h1>
        <p>Words, movement, and the ways they find meaning.</p>
      </div>

      <nav className="experiment-index-list" aria-label="Choose an experiment">
        {experiments.map((experiment) => {
          const contents = (
            <>
              <span className="experiment-index-number">{experiment.id}</span>
              <span className="experiment-index-title">{experiment.title}</span>
              <span className="experiment-index-description">
                {experiment.description}
              </span>
              <span className="experiment-index-arrow" aria-hidden="true">
                {experiment.available ? '↗' : 'SOON'}
              </span>
            </>
          );

          return experiment.available ? (
            <a
              key={experiment.id}
              className="experiment-index-entry"
              href={experimentUrl(experiment.slug)}
            >
              {contents}
            </a>
          ) : (
            <div
              key={experiment.id}
              className="experiment-index-entry is-unavailable"
              aria-label={`${experiment.title}, coming soon`}
            >
              {contents}
            </div>
          );
        })}
      </nav>

      <footer className="experiment-index-footer">
        <span>SELECT AN EXPERIMENT TO BEGIN</span>
        <span>{experiments.filter((item) => item.available).length} AVAILABLE</span>
      </footer>
    </section>
  );
}
