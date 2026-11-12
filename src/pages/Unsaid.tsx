import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ERASURE } from '../experiments/unsaid/config';
import { createEraseMask, type Point } from '../experiments/unsaid/mask';
import { paintForeground } from '../experiments/unsaid/typography';
import '../styles/unsaid.css';

type ErasureController = { reset(): void };

export default function Unsaid() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brushRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ErasureController | null>(null);

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
    const brush = brushRef.current;
    const ctx = canvas?.getContext('2d');
    if (!stage || !canvas || !brush || !ctx) return;

    const mask = createEraseMask();
    let width = 1;
    let height = 1;
    let dpr = 1;
    let raf = 0;
    let startTime = 0;
    let lastTime = 0;
    let activePointer: number | null = null;
    let previous: Point | null = null;
    let previousTime = 0;
    let currentRadius: number = ERASURE.brushRadius;
    let isVisible = true;

    function draw(timestamp = lastTime) {
      lastTime = timestamp;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const elapsed = reducedMotion
        ? 0
        : (timestamp - startTime) / 1000;

      paintForeground(ctx!, width, height, elapsed);
      mask.composite(ctx!, width, height, timestamp);
    }

    function resize() {
      const nextWidth = Math.max(1, stage!.clientWidth);
      const nextHeight = Math.max(1, stage!.clientHeight);
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);

      if (
        nextWidth === width &&
        nextHeight === height &&
        nextDpr === dpr
      ) return;

      width = nextWidth;
      height = nextHeight;
      dpr = nextDpr;
      currentRadius = Math.min(
        ERASURE.brushRadius,
        Math.max(34, width * 0.12)
      );

      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      mask.resize(width, height, dpr);
      brush!.style.width = `${currentRadius * 2}px`;
      brush!.style.height = `${currentRadius * 2}px`;
      draw();
    }

    function getPoint(event: PointerEvent): Point {
      const rect = stage!.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }

    function setBrushPosition(point: Point) {
      brush!.style.left = `${point.x}px`;
      brush!.style.top = `${point.y}px`;
    }

    function onPointerEnter(event: PointerEvent) {
      if (event.pointerType === 'touch') return;
      stage!.classList.add('is-hovered');
      setBrushPosition(getPoint(event));
    }

    function onPointerDown(event: PointerEvent) {
      if (activePointer !== null) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      activePointer = event.pointerId;
      previous = getPoint(event);
      previousTime = performance.now();
      stage!.setPointerCapture(event.pointerId);
      stage!.classList.add('is-erasing');
      setBrushPosition(previous);
      const now = performance.now();
      mask.dab(previous, currentRadius, now, reducedMotion);
      draw(now);
    }

    function onPointerMove(event: PointerEvent) {
      const point = getPoint(event);
      if (event.pointerType !== 'touch') setBrushPosition(point);
      if (activePointer !== event.pointerId || !previous) return;

      const now = performance.now();
      const deltaMs = Math.max(8, now - previousTime);
      const distance = Math.hypot(
        point.x - previous.x,
        point.y - previous.y
      );
      const speed = (distance / deltaMs) * 1000;

      mask.stroke(previous, point, currentRadius, speed, now, reducedMotion);
      previous = point;
      previousTime = now;
      draw(now);
    }

    function onPointerUp(event: PointerEvent) {
      if (activePointer !== event.pointerId) return;
      activePointer = null;
      previous = null;
      stage!.classList.remove('is-erasing');
      if (stage!.hasPointerCapture(event.pointerId)) {
        stage!.releasePointerCapture(event.pointerId);
      }
    }

    function onPointerLeave() {
      if (activePointer === null) stage!.classList.remove('is-hovered');
    }

    function tick(timestamp: number) {
      if (!startTime) startTime = timestamp;
      if (isVisible) draw(timestamp);
      raf = requestAnimationFrame(tick);
    }

    controllerRef.current = {
      reset() {
        mask.clear();
        draw();
      },
    };

    stage.addEventListener('pointerenter', onPointerEnter);
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);
    stage.addEventListener('pointerleave', onPointerLeave);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    intersectionObserver.observe(stage);

    resize();
    if (!reducedMotion) raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      stage.removeEventListener('pointerenter', onPointerEnter);
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerup', onPointerUp);
      stage.removeEventListener('pointercancel', onPointerUp);
      stage.removeEventListener('pointerleave', onPointerLeave);
      if (activePointer !== null && stage.hasPointerCapture(activePointer)) {
        stage.releasePointerCapture(activePointer);
      }
      controllerRef.current = null;
    };
  }, [reducedMotion]);

  return (
    <section className="unsaid-page" aria-label="Experiment 004: Unsaid">
      <header className="unsaid-header">
        <a href="#/experiments" className="unsaid-brand">TSUNAMI OF WORDS</a>
        <span className="unsaid-header-number">EXPERIMENT 004 / UNSAID</span>
        <a href="#/experiments" className="unsaid-nav-link">INDEX ↗</a>
      </header>

      <div className="unsaid-rule" aria-hidden="true" />

      <div
        className="unsaid-stage"
        ref={stageRef}
        aria-label={`Drag to remove repeated words and reveal ${ERASURE.revealedText}`}
      >
        <div className="unsaid-hidden-layer" aria-hidden="true">
          <div className="unsaid-big-type">
            <span className="unsaid-big-type-lead">{ERASURE.revealedLines[0]}</span>
            <span className="unsaid-big-type-main">{ERASURE.revealedLines[1]}</span>
          </div>
        </div>
        <canvas className="unsaid-foreground" ref={canvasRef} aria-hidden="true" />
        <div className="unsaid-brush" ref={brushRef} aria-hidden="true" />
      </div>

      <footer className="unsaid-footer">
        <span className="unsaid-instruction">DRAG TO DISSOLVE</span>
        <div className="unsaid-footer-actions">
          <a href="#/experiments/the-weight-of-words" className="unsaid-previous">
            ← PREVIOUS
          </a>
          <button
            type="button"
            className="unsaid-reset"
            onClick={() => controllerRef.current?.reset()}
          >
            START AGAIN ↻
          </button>
        </div>
      </footer>
      <p className="unsaid-sr-only">
        The repeated phrase is “{ERASURE.repeatedText}”. Erasing reveals “{ERASURE.revealedText}”.
      </p>
    </section>
  );
}
