import { useEffect, useRef, useState } from 'react';
import '../styles/loading.css';

type LoadingScreenProps = {
  onCountComplete: () => void;
};

const COUNT_MS = 1600;
const HOLD_AT_100_MS = 180;
const MAX_FONT_WAIT_MS = 4000;

/** Black intro: only a large white percentage. The actual page slides over it. */
export default function LoadingScreen({ onCountComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const callback = useRef(onCountComplete);
  callback.current = onCountComplete;

  useEffect(() => {
    let frame = 0;
    let doneTimer = 0;
    let mounted = true;
    let completed = false;
    let start: number | null = null;
    let fontsReady = document.fonts.status === 'loaded';

    document.fonts.ready.then(() => {
      if (mounted) fontsReady = true;
    });

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    function finish() {
      if (!mounted || completed) return;
      completed = true;
      setProgress(100);
      doneTimer = window.setTimeout(
        () => callback.current(),
        reducedMotion ? 0 : HOLD_AT_100_MS
      );
    }

    function tick(now: number) {
      if (start === null) start = now;
      const elapsed = now - start;

      if (reducedMotion) {
        finish();
        return;
      }

      // A linear count feels deliberate. Stop at 99 until fonts are ready.
      setProgress(Math.min(99, Math.floor((elapsed / COUNT_MS) * 100)));

      if (
        (elapsed >= COUNT_MS && fontsReady) ||
        elapsed >= MAX_FONT_WAIT_MS
      ) {
        finish();
      } else {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);

    return () => {
      mounted = false;
      cancelAnimationFrame(frame);
      window.clearTimeout(doneTimer);
    };
  }, []);

  return (
    <div
      className="intro-loader"
      role="status"
      aria-label="Loading Tsunami of Words"
      aria-live="off"
    >
      <div className="intro-loader__count" aria-hidden="true">
        <span className="intro-loader__number">{progress}</span>
        <span className="intro-loader__symbol">%</span>
      </div>
    </div>
  );
}
