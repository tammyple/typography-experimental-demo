import type { CSSProperties } from 'react';
import { experiments, experimentUrl } from '../data/experiments';
import '../styles/experiment-index.css';

type IntroPhase = 'counting' | 'revealing' | 'ready';

function AnimatedWord({ word, offset }: { word: string; offset: number }) {
  return (
    <span className="index-hero-word" aria-hidden="true">
      {Array.from(word).map((letter, i) => (
        <span className="index-hero-letter-clip" key={`${letter}-${i}`}>
          <span
            className="index-hero-letter"
            style={{ '--letter-index': offset + i } as CSSProperties}
          >
            {letter}
          </span>
        </span>
      ))}
    </span>
  );
}

export default function ExperimentIndex({
  introPhase = 'ready',
}: {
  introPhase?: IntroPhase;
}) {
  return (
    <section
      className="experiment-index"
      data-intro-phase={introPhase}
      aria-labelledby="index-title"
    >
      {/* The opening page contains just the large interactive title. */}
      <div className="index-hero">
        <h1 id="index-title" className="index-hero-heading" aria-label="Typography Experiment">
          <AnimatedWord word="Typography" offset={0} />
          <AnimatedWord word="Experiment" offset={10} />
        </h1>
      </div>

      {/* Keep the experiment links reachable below the intro. */}
      <nav className="experiment-index-list" aria-label="Choose an experiment">
        {experiments.map((experiment) => {
          const content = (
            <>
              <span className="experiment-index-number">{experiment.id}</span>
              <span className="experiment-index-title">{experiment.title}</span>
              <span className="experiment-index-arrow" aria-hidden="true">
                {experiment.available ? '↗' : 'SOON'}
              </span>
            </>
          );

          return experiment.available ? (
            <a
              key={experiment.id}
              href={experimentUrl(experiment.slug)}
              className="experiment-index-entry"
            >
              {content}
            </a>
          ) : (
            <div
              key={experiment.id}
              className="experiment-index-entry is-unavailable"
              aria-label={`${experiment.title}, coming soon`}
            >
              {content}
            </div>
          );
        })}
      </nav>
    </section>
  );
}
