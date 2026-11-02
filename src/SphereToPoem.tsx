
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { useGSAP } from '@gsap/react';
import './sphere.css';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, useGSAP);

// Change these lines to your own poem.
const POEM_LINES = [
  ['Some', 'thoughts', 'only', 'find'],
  ['their', 'shape', 'when', 'someone'],
  ['stays', 'long', 'enough', 'to', 'listen.'],
];

const WORDS = POEM_LINES.flat();
const FULL_POEM = POEM_LINES
  .map((line) => line.join(' '))
  .join(' ');

// Give each word a stable position on an imaginary sphere.
function spherePosition(index: number, total: number) {
  const y = 1 - 2 * ((index + 0.5) / total);
  const horizontalRadius = Math.sqrt(
    Math.max(0, 1 - y * y)
  );
  const longitude = index * 2.3999632297;

  return {
    x: Math.cos(longitude) * horizontalRadius,
    y,
    z: Math.sin(longitude) * horizontalRadius,
  };
}

function smoothstep(
  from: number,
  to: number,
  value: number
) {
  const t = gsap.utils.clamp(
    0,
    1,
    (value - from) / (to - from)
  );

  return t * t * (3 - 2 * t);
}

export default function SphereToPoem() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const finalLayoutRef = useRef<HTMLDivElement>(null);

  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const targetRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const progressRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const scrollTweenRef = useRef<gsap.core.Tween | null>(null);

  const [isGathered, setIsGathered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);

  // Accessibility: detect reduced-motion preference.
  useEffect(() => {
    const media = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

    const update = () => setReducedMotion(media.matches);
    update();

    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  // Remeasure the poem when the stage or fonts change.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let lastWidth = stage.clientWidth;
    let lastHeight = stage.clientHeight;

    const observer = new ResizeObserver(() => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;

      if (
        Math.abs(width - lastWidth) > 2 ||
        Math.abs(height - lastHeight) > 2
      ) {
        lastWidth = width;
        lastHeight = height;
        setLayoutVersion((n) => n + 1);
      }
    });

    observer.observe(stage);

    let active = true;

    document.fonts.ready.then(() => {
      if (active) setLayoutVersion((n) => n + 1);
    });

    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);

  useGSAP(
    () => {
      const stage = stageRef.current;
      const section = sectionRef.current;
      const finalLayout = finalLayoutRef.current;

      if (!stage || !section || !finalLayout) return;

      const words = wordRefs.current;
      const targets = targetRefs.current;

      if (
        words.length !== WORDS.length ||
        targets.length !== WORDS.length ||
        words.some((el) => !el) ||
        targets.some((el) => !el)
      ) {
        return;
      }

      const box = stage.getBoundingClientRect();

      // ======================================
      // 1. RESPONSIVE SPHERE SIZE
      // ======================================

      // The sphere fits the available space between
      // the heading and the footer.
      const radius = Math.max(
        85,
        Math.min(
          box.width * 0.34,
          (box.height - 64) * 0.43,
          285
        )
      );

      const points = WORDS.map((_, i) =>
        spherePosition(i, WORDS.length)
      );

      // Measure the final positions of every word.
      const ends = targets.map((target) => {
        const rect = target!.getBoundingClientRect();

        return {
          x:
            rect.left +
            rect.width / 2 -
            (box.left + box.width / 2),

          y:
            rect.top +
            rect.height / 2 -
            (box.top + box.height / 2),
        };
      });

      gsap.set(words, {
        xPercent: -50,
        yPercent: -50,
      });

      gsap.set(finalLayout, {
        opacity: reducedMotion ? 1 : 0,
      });

      if (reducedMotion) {
        gsap.set(words, { opacity: 0 });

        if (progressRef.current) {
          progressRef.current.textContent = 'POEM REVEALED';
        }

        triggerRef.current = null;
        return;
      }

      // ======================================
      // 2. ONE SHARED PROGRESS VALUE
      // ======================================

      // Both clicking and scrolling use this progress.
      // 0 = sphere, 1 = completed poem.
      const motion = {
        progress: 0,
        target: 0,
      };

      let orbitAngle = 0;
      let isVisible = false;

      let previousPointer: {
        x: number;
        y: number;
      } | null = null;

      const pointer = {
        targetAngle: 0,
        angle: 0,
        targetTilt: 0.16,
        tilt: 0.16,
      };

      // ======================================
      // 3. MOUSE MOVEMENT
      // ======================================

      const onPointerEnter = (event: PointerEvent) => {
        if (event.pointerType === 'touch') return;

        previousPointer = {
          x: event.clientX,
          y: event.clientY,
        };
      };

      const onPointerMove = (event: PointerEvent) => {
        if (
          event.pointerType === 'touch' ||
          motion.progress > 0.12
        ) {
          return;
        }

        if (previousPointer) {
          const dx = event.clientX - previousPointer.x;
          const dy = event.clientY - previousPointer.y;

          // Move in the opposite direction of the cursor.
          pointer.targetAngle -= dx * 0.007;

          pointer.targetTilt = gsap.utils.clamp(
            -0.40,
            0.55,
            pointer.targetTilt - dy * 0.003
          );
        }

        previousPointer = {
          x: event.clientX,
          y: event.clientY,
        };
      };

      const onPointerLeave = () => {
        previousPointer = null;
        pointer.targetTilt = 0.16;
      };

      stage.addEventListener(
        'pointerenter',
        onPointerEnter
      );
      stage.addEventListener(
        'pointermove',
        onPointerMove
      );
      stage.addEventListener(
        'pointerleave',
        onPointerLeave
      );

      // Only render the orbit while this section is nearby.
      const observer = new IntersectionObserver(
        ([entry]) => {
          isVisible = entry.isIntersecting;
        },
        { rootMargin: '100px' }
      );

      observer.observe(section);

      // ======================================
      // 4. SCROLL CONTROLS PROGRESS
      // ======================================

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        invalidateOnRefresh: true,

        onUpdate: (self) => {
          motion.target = self.progress;
          setIsGathered(self.progress >= 0.99);
        },
      });

      triggerRef.current = trigger;
      motion.target = trigger.progress;
      motion.progress = motion.target;

      setIsGathered(trigger.progress >= 0.99);

      // ======================================
      // 5. RENDER SPHERE AND POEM
      // ======================================

      const render = (
        _time: number,
        deltaTime: number
      ) => {
        if (!isVisible) return;

        const dt = Math.min(deltaTime / 1000, 0.05);

        // Smoothly follow scroll progress.
        const easing = 1 - Math.exp(-10 * dt);

        motion.progress +=
          (motion.target - motion.progress) * easing;

        const progress = motion.progress;

        // Gradually slow the orbit while gathering.
        const orbitStrength =
          1 - smoothstep(0.06, 0.48, progress);

        orbitAngle += dt * 0.20 * orbitStrength;

        // Smooth mouse-follow movement.
        const follow = 1 - Math.exp(-8 * dt);

        pointer.angle +=
          (pointer.targetAngle - pointer.angle) * follow;

        pointer.tilt +=
          (pointer.targetTilt - pointer.tilt) * follow;

        const angle = orbitAngle + pointer.angle;

        // Sphere -> flattened arrangement -> poem.
        const flatten = smoothstep(0.04, 0.58, progress);
        const gather = smoothstep(0.28, 1, progress);

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        points.forEach((point, i) => {
          const word = words[i]!;
          const end = ends[i];

          // Rotate each word around the Y axis.
          const x = point.x * cos + point.z * sin;
          const z = point.z * cos - point.x * sin;

          // Apply the vertical tilt.
          const y =
            point.y * Math.cos(pointer.tilt) -
            z * Math.sin(pointer.tilt);

          const depth =
            point.y * Math.sin(pointer.tilt) +
            z * Math.cos(pointer.tilt);

          // Perspective creates depth without Three.js.
          const perspective =
            760 / (760 - depth * radius);

          const sphereX =
            x * radius * perspective *
            (1 + 0.28 * flatten);

          const sphereY =
            -y * radius * perspective *
            (1 - 0.65 * flatten);

          const sphereScale =
            0.70 + (depth + 1) * 0.20;

          const sphereOpacity =
            0.32 + (depth + 1) * 0.30;

          // Animate the SAME words to the final poem.
          gsap.set(word, {
            x: gsap.utils.interpolate(
              sphereX,
              end.x,
              gather
            ),
            y: gsap.utils.interpolate(
              sphereY,
              end.y,
              gather
            ),
            scale: gsap.utils.interpolate(
              sphereScale,
              1,
              gather
            ),
            rotation: gsap.utils.interpolate(
              -x * 12,
              0,
              gather
            ),
            opacity: gsap.utils.interpolate(
              sphereOpacity,
              1,
              gather
            ),
          });

          word.style.zIndex = String(
            Math.round(100 + depth * 80)
          );
        });

        if (progressRef.current) {
          progressRef.current.textContent =
            `${Math.round(progress * 100)}% ORGANIZED`;
        }
      };

      gsap.ticker.add(render);
      render(0, 16);

      // ======================================
      // 6. CLEANUP
      // ======================================

      return () => {
        gsap.ticker.remove(render);
        observer.disconnect();

        stage.removeEventListener(
          'pointerenter',
          onPointerEnter
        );
        stage.removeEventListener(
          'pointermove',
          onPointerMove
        );
        stage.removeEventListener(
          'pointerleave',
          onPointerLeave
        );

        triggerRef.current = null;
        scrollTweenRef.current?.kill();
      };
    },
    {
      scope: sectionRef,
      dependencies: [layoutVersion, reducedMotion],
      revertOnUpdate: true,
    }
  );

  // ======================================
  // 7. CLICK USES THE SAME SCROLL ANIMATION
  // ======================================

  function handleGather() {
    const trigger = triggerRef.current;
    if (!trigger) return;

    scrollTweenRef.current?.kill();

    scrollTweenRef.current = gsap.to(window, {
      scrollTo: {
        y: isGathered ? trigger.start : trigger.end,
        autoKill: true,
      },
      duration: 1.6,
      ease: 'power2.inOut',
    });
  }

  // ======================================
  // 8. PAGE STRUCTURE
  // ======================================

  return (
    <section
      id="sphere-poem"
      ref={sectionRef}
      className={`sphere-experiment${
        reducedMotion ? ' sphere-reduced-motion' : ''
      }`}
      aria-labelledby="sphere-title"
    >
      <div className="sphere-shell">

        <header className="sphere-heading">
          <p className="sphere-eyebrow">
            TSUNAMI OF WORDS / EXPERIMENT 002
          </p>

          <h2 id="sphere-title">
            Help me find the words.
          </h2>
        </header>

        <div className="sphere-divider" />

        <div
          ref={stageRef}
          className="sphere-stage"
        >
          <p className="sphere-sr-only">
            {FULL_POEM}
          </p>

          {/* Invisible poem used for calculating positions */}
          <div
            ref={finalLayoutRef}
            className="sphere-final-layout"
            aria-hidden="true"
          >
            {POEM_LINES.map((line, row) => (
              <div
                className="sphere-poem-line"
                key={row}
              >
                {line.map((word, i) => {
                  const index = POEM_LINES
                    .slice(0, row)
                    .reduce(
                      (count, current) =>
                        count + current.length,
                      0
                    ) + i;

                  return (
                    <span
                      key={index}
                      ref={(element) => {
                        targetRefs.current[index] =
                          element;
                      }}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Only words — no SVG sphere guide */}
          <div
            className="sphere-word-layer"
            aria-hidden="true"
          >
            {WORDS.map((word, index) => (
              <span
                className="sphere-word"
                key={index}
                ref={(element) => {
                  wordRefs.current[index] = element;
                }}
              >
                {word}
              </span>
            ))}
          </div>

          {!reducedMotion && (
            <p className="sphere-pointer-hint">
              MOVE YOUR CURSOR TO TURN THE WORDS
            </p>
          )}
        </div>

        <div className="sphere-divider" />

        <footer className="sphere-controls">
          <div>
            <p className="sphere-eyebrow">
              THE CREATIVE PROCESS
            </p>

            <p className="sphere-description">
              The words are mine. You help them find
              a shape.
            </p>
          </div>

          <div className="sphere-action">
            <span
              ref={progressRef}
              className="sphere-progress"
            >
              0% ORGANIZED
            </span>

            {reducedMotion ? (
              <span className="sphere-scroll-hint">
                POEM SHOWN WITHOUT ANIMATION
              </span>
            ) : (
              <button
                type="button"
                className="sphere-cta"
                onClick={handleGather}
              >
                {isGathered
                  ? 'Scatter again ↺'
                  : 'Gather the words ↗'}
              </button>
            )}
          </div>
        </footer>

        {!reducedMotion && (
          <p className="sphere-scroll-hint sphere-scroll-note">
            OR SCROLL TO REVEAL THE POEM ↓
          </p>
        )}

      </div>
    </section>
  );
}
