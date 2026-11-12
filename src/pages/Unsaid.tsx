import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ERASURE } from '../experiments/unsaid/config';
import { createVaporMask, type Point } from '../experiments/unsaid/mask';
import { paintForeground } from '../experiments/unsaid/typography';
import '../styles/unsaid.css';

/** Experiment 004 — moving the pointer reveals a temporary vapour opening. */
export default function Unsaid() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

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
    const stageElement = stageRef.current;
    const canvasElement = canvasRef.current;
    const cursorElement = cursorRef.current;
    const context = canvasElement?.getContext('2d');
    if (!stageElement || !canvasElement || !cursorElement || !context) return;

    // Non-null aliases for the event and animation callbacks below.
    const stage: HTMLDivElement = stageElement;
    const canvas: HTMLCanvasElement = canvasElement;
    const cursor: HTMLDivElement = cursorElement;
    const ctx: CanvasRenderingContext2D = context;

    const mask = createVaporMask(reducedMotion);
    let width = 1;
    let height = 1;
    let dpr = 1;
    let raf = 0;
    let startTime = 0;
    let visible = true;

    let previousMouse: Point | null = null;
    let previousTime = 0;
    let activeTouch: number | null = null;

    const getPoint = (event: PointerEvent): Point => {
      const rect = stage.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    function paint(timestamp: number) {
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const elapsed = reducedMotion || !startTime
        ? 0
        : Math.max(0, timestamp - startTime) / 1000;
      paintForeground(ctx!, width, height, elapsed);
      mask.composite(ctx!, width, height, timestamp);
    }

    function resize() {
      const w = Math.max(1, stage.clientWidth);
      const h = Math.max(1, stage.clientHeight);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (w === width && h === height && ratio === dpr) return;

      width = w;
      height = h;
      dpr = ratio;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      mask.resize(width, height);
      paint(performance.now());
    }

    function moveCursor(point: Point) {
      cursor!.style.left = `${point.x}px`;
      cursor!.style.top = `${point.y}px`;
    }

    function startMouse(event: PointerEvent) {
      if (event.pointerType === 'touch') return;
      const point = getPoint(event);
      stage.classList.add('is-hovered');
      moveCursor(point);
      const now = performance.now();
      previousMouse = point;
      previousTime = now;
      mask.emit(point, now);
    }

    function movePointer(event: PointerEvent) {
      const isTouch = event.pointerType === 'touch';
      if (isTouch && activeTouch !== event.pointerId) return;

      const point = getPoint(event);
      if (!isTouch) {
        stage.classList.add('is-hovered');
        moveCursor(point);
      }

      const now = performance.now();
      const previous = previousMouse;
      if (previous) {
        const dt = Math.max(8, now - previousTime);
        const velocity = {
          x: ((point.x - previous.x) / dt) * 1000,
          y: ((point.y - previous.y) / dt) * 1000,
        };
        mask.move(previous, point, now, velocity);
      } else {
        mask.emit(point, now);
      }

      previousMouse = point;
      previousTime = now;
    }

    // Touch devices don't have hover; they reveal as the finger moves.
    function onPointerDown(event: PointerEvent) {
      if (event.pointerType !== 'touch') return;
      if (activeTouch !== null) return;
      event.preventDefault();
      activeTouch = event.pointerId;
      stage.setPointerCapture(event.pointerId);
      previousMouse = getPoint(event);
      previousTime = performance.now();
      mask.emit(previousMouse, previousTime);
    }

    function endTouch(event: PointerEvent) {
      if (activeTouch !== event.pointerId) return;
      activeTouch = null;
      previousMouse = null;
      if (stage.hasPointerCapture(event.pointerId)) {
        stage.releasePointerCapture(event.pointerId);
      }
    }

    function leavePointer(event: PointerEvent) {
      if (event.pointerType === 'touch') return;
      stage.classList.remove('is-hovered');
      previousMouse = null;
    }

    function tick(timestamp: number) {
      if (!startTime) startTime = timestamp;
      if (visible) paint(timestamp);
      raf = requestAnimationFrame(tick);
    }

    stage.addEventListener('pointerenter', startMouse);
    stage.addEventListener('pointermove', movePointer);
    stage.addEventListener('pointerleave', leavePointer);
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointerup', endTouch);
    stage.addEventListener('pointercancel', endTouch);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    intersectionObserver.observe(stage);

    resize();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      stage.removeEventListener('pointerenter', startMouse);
      stage.removeEventListener('pointermove', movePointer);
      stage.removeEventListener('pointerleave', leavePointer);
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointerup', endTouch);
      stage.removeEventListener('pointercancel', endTouch);
      if (activeTouch !== null && stage.hasPointerCapture(activeTouch)) {
        stage.releasePointerCapture(activeTouch);
      }
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
        aria-label={`Move your pointer to temporarily reveal ${ERASURE.revealedText}`}
      >
        <div className="unsaid-hidden-layer" aria-hidden="true">
          <div className="unsaid-big-type">
            <span className="unsaid-big-type-lead">{ERASURE.revealedLines[0]}</span>
            <span className="unsaid-big-type-main">{ERASURE.revealedLines[1]}</span>
          </div>
        </div>
        <canvas className="unsaid-foreground" ref={canvasRef} aria-hidden="true" />
        <div
          className="unsaid-brush"
          ref={cursorRef}
          style={{ width: ERASURE.cursorDiameter, height: ERASURE.cursorDiameter }}
          aria-hidden="true"
        />
      </div>

      <footer className="unsaid-footer">
        <span className="unsaid-instruction">MOVE TO REVEAL · WATCH IT FADE</span>
        <a href="#/experiments/the-weight-of-words" className="unsaid-previous">
          ← PREVIOUS
        </a>
      </footer>
      <p className="unsaid-sr-only">
        The repeated phrase is “{ERASURE.repeatedText}”. Moving the pointer
        temporarily reveals “{ERASURE.revealedText}”. The surface returns
        automatically when you stop moving.
      </p>
    </section>
  );
}
