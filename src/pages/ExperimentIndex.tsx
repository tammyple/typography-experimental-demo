import { useEffect, useState, type CSSProperties } from 'react';
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
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    if (!aboutOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setAboutOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [aboutOpen]);

  return (
    <section
      className="experiment-index"
      data-intro-phase={introPhase}
      aria-labelledby="index-title"
    >
      <header className="index-topbar">
        <button
          type="button"
          className="index-about-trigger"
          onClick={() => setAboutOpen(true)}
        >
          ABOUT ↗
        </button>
      </header>

      <div className="index-hero">
        <h1
          id="index-title"
          className="index-hero-heading"
          aria-label="Typography Experiment"
        >
          <AnimatedWord word="Typography" offset={0} />
          <AnimatedWord word="Experiment" offset={10} />
        </h1>
      </div>

      <nav className="experiment-index-list" aria-label="Choose an experiment">
        {experiments.map((experiment, index) => {
          const content = (
            <>
              <span className="experiment-index-number">{experiment.id}</span>
              <span className="experiment-index-title">{experiment.title}</span>
              <span className="experiment-index-arrow" aria-hidden="true">
                {experiment.available ? '↗' : 'SOON'}
              </span>
            </>
          );
          const stagger = { '--row-index': index } as CSSProperties;
          return experiment.available ? (
            <a
              key={experiment.id}
              href={experimentUrl(experiment.slug)}
              className="experiment-index-entry"
              style={stagger}
            >
              {content}
            </a>
          ) : (
            <div
              key={experiment.id}
              className="experiment-index-entry is-unavailable"
              style={stagger}
              aria-label={`${experiment.title}, coming soon`}
            >
              {content}
            </div>
          );
        })}
      </nav>

      {aboutOpen && (
        <div
          className="index-about-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAboutOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="index-about-title"
            className="index-about-dialog"
          >
            <div className="index-about-dialog-heading">
              <h2 id="index-about-title">About.</h2>
              <button type="button" autoFocus aria-label="Close about" onClick={() => setAboutOpen(false)}>×</button>
            </div>
            <p>
              Tsunami of Words is an interactive collection exploring what happens
              when typography, movement and language meet. Each experiment is a
              different way to interact with words.
            </p>
            <button type="button" className="index-about-close" onClick={() => setAboutOpen(false)}>
              BACK TO EXPERIMENTS ↗
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
