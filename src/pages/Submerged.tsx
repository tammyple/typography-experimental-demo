import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createSubmergedLens } from '../experiments/submerged/lens';
import '../styles/submerged.css';

/** Experiment 005 — bending typography as though through a water-filled lens. */
export default function Submerged() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState(true);
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
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const cursor = cursorRef.current;
    if (!stage || !canvas || !cursor) return;

    const scene = createSubmergedLens(stage, canvas, setSupported);
    let touchId: number | null = null;

    function updateCursor(event: PointerEvent) {
      const rect = stage!.getBoundingClientRect();
      cursor!.style.left = `${event.clientX - rect.left}px`;
      cursor!.style.top = `${event.clientY - rect.top}px`;
      if (event.pointerType !== 'touch') stage!.classList.add('is-interacting');
    }

    function enter(event: PointerEvent) {
      if (event.pointerType === 'touch') return;
      updateCursor(event);
      if (!reducedMotion) scene.move(event.clientX, event.clientY);
    }

    function move(event: PointerEvent) {
      if (event.pointerType === 'touch' && touchId !== event.pointerId) return;
      updateCursor(event);
      if (!reducedMotion) scene.move(event.clientX, event.clientY);
    }

    function leave(event: PointerEvent) {
      if (event.pointerType === 'touch') return;
      stage!.classList.remove('is-interacting');
      scene.leave();
    }

    function down(event: PointerEvent) {
      if (event.pointerType === 'touch') {
        if (touchId !== null) return;
        touchId = event.pointerId;
        stage!.setPointerCapture(event.pointerId);
        event.preventDefault();
      }
      if (!reducedMotion) scene.pulse(event.clientX, event.clientY);
    }

    function up(event: PointerEvent) {
      if (event.pointerType === 'touch' && touchId === event.pointerId) {
        if (stage!.hasPointerCapture(event.pointerId)) stage!.releasePointerCapture(event.pointerId);
        touchId = null;
        scene.leave();
      }
    }

    stage.addEventListener('pointerenter', enter);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerleave', leave);
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);

    return () => {
      scene.destroy();
      stage.classList.remove('is-interacting');
      stage.removeEventListener('pointerenter', enter);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerleave', leave);
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', up);
    };
  }, [reducedMotion]);

  return (
    <section className="submerged-page" aria-label="Experiment 005: Submerged">
      <header className="submerged-header">
        <a href="#/experiments" className="submerged-brand">TSUNAMI OF WORDS</a>
        <span className="submerged-id">EXPERIMENT 005 / SUBMERGED</span>
        <a href="#/experiments" className="submerged-nav">INDEX ↗</a>
      </header>

      <div className="submerged-rule" aria-hidden="true" />

      <div className="submerged-stage" ref={stageRef}>
        <canvas ref={canvasRef} className="submerged-canvas" aria-hidden="true" />
        <div ref={cursorRef} className="submerged-cursor" aria-hidden="true">
          <span className="submerged-cursor-cross">+</span>
        </div>
        <p className="submerged-sr-only">Nothing stays still. Move your cursor over the letters to see them bend as if through water. Click to make a ripple.</p>
        {!supported && (
          <p className="submerged-webgl-note" role="status">WebGL is unavailable, so the underwater distortion is disabled.</p>
        )}
      </div>

      <footer className="submerged-footer">
        <span className="submerged-caption">005 / A STUDY IN REFRACTION</span>
        <span className="submerged-hint">{reducedMotion
          ? 'MOVEMENT DISABLED BY YOUR SYSTEM PREFERENCE'
          : 'MOVE TO DISTORT THE WORDS · CLICK TO MAKE A RIPPLE'}</span>
        <a href="#/experiments" className="submerged-nav">ALL EXPERIMENTS ↗</a>
      </footer>
    </section>
  );
}
