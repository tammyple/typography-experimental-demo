import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { WEIGHT_LETTERS, WEIGHT_TEXT } from '../experiments/the-weight-of-words/config';
import {
  createWeightPhysics,
  type WeightPhysics,
} from '../experiments/the-weight-of-words/physics';
import '../styles/the-weight-of-words.css';

export default function TheWeightOfWords() {
  const stageRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const physicsRef = useRef<WeightPhysics | null>(null);

  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    if (reducedMotion) return;
    const stage = stageRef.current;
    const cursor = cursorRef.current;
    const letters = letterRefs.current.filter(
      (el): el is HTMLSpanElement => el !== null
    );
    if (!stage || !cursor || letters.length !== WEIGHT_LETTERS.length) return;

    const physics = createWeightPhysics(stage, letters, cursor);
    physicsRef.current = physics;

    // Reset after font loading, since letter measurements may change.
    let active = true;
    if (document.fonts.status !== 'loaded') {
      document.fonts.ready.then(() => {
        if (active) physics.restart();
      });
    }

    return () => {
      active = false;
      physics.destroy();
      if (physicsRef.current === physics) physicsRef.current = null;
    };
  }, [reducedMotion]);

  return (
    <section className="weight-page" aria-label="Experiment 003: The Weight of Words">
      <header className="experiment-header">
        <a className="experiment-header-brand" href="#/experiments">TSUNAMI OF WORDS</a>
        <span className="experiment-header-title">EXPERIMENT 003 / THE WEIGHT OF WORDS</span>
        <nav className="experiment-header-nav" aria-label="Experiment navigation"><a href="#/experiments">INDEX ↗</a></nav>
      </header>

      <div className="weight-rule" aria-hidden="true" />

      <div className="weight-stage" ref={stageRef}>
        {reducedMotion ? (
          <p className="weight-reduced-text">{WEIGHT_TEXT}</p>
        ) : (
          <>
            <div className="weight-letter-layer" aria-hidden="true">
              {WEIGHT_LETTERS.map((character, index) => (
                <span
                  className="weight-letter"
                  key={`${character}-${index}`}
                  ref={(node) => { letterRefs.current[index] = node; }}
                >
                  {character}
                </span>
              ))}
            </div>
            <div className="weight-brush" ref={cursorRef} aria-hidden="true" />
          </>
        )}
        <div className="weight-floor" aria-hidden="true" />
      </div>

      <footer className="weight-footer">
        <div className="weight-footer-about">
          <span className="weight-eyebrow">003 — GRAVITY STUDY</span>
          <p className="weight-instruction">
            {reducedMotion
              ? 'PHYSICS ANIMATION DISABLED BY YOUR MOTION PREFERENCE'
              : 'MOVE YOUR CURSOR TO SWEEP THE LETTERS · TOUCH AND DRAG ON MOBILE'}
          </p>
        </div>
        <button
          type="button"
          className="weight-restart"
          onClick={() => physicsRef.current?.restart()}
          disabled={reducedMotion}
          aria-label="Drop the letters again"
        >
          DROP AGAIN <span aria-hidden="true">↻</span>
        </button>
      </footer>
      <p className="weight-sr-only">{WEIGHT_TEXT}</p>
    </section>
  );
}
