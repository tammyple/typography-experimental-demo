
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import './sphere.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// ----------------------------------------
// POEM CONTENT
// ----------------------------------------

const POEM_LINES = [
  ['Some', 'thoughts', 'only', 'find'],
  ['their', 'shape', 'when', 'someone'],
  ['stays', 'long', 'enough', 'to', 'listen.'],
];

const WORDS = POEM_LINES.flat();

const FULL_POEM = POEM_LINES
  .map((line) => line.join(' '))
  .join(' ');

// ----------------------------------------
// ANIMATION SETTINGS
// ----------------------------------------

const SETTINGS = {
  idleSpeed: 0.35,
  exploringSpeed: 0.16,
  hoveringSpeed: 0.015,

  mouseRotation: 0.45,
  horizontalFollow: 3.5,
  verticalFollow: 7,

  hoverScale: 0.2,
  hoverFollow: 12,

  // Scroll progress:
  // 0.00–0.34: sphere stays intact
  // 0.34–0.82: sphere transforms into poem
  // 0.82–1.00: finished poem stays visible
  startGather: 0.34,
  endGather: 0.82,
};

// Distribute words across an imaginary sphere.
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

// Return a smooth value between 0 and 1.
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
  const instructionRef = useRef<HTMLParagraphElement>(null);

  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const targetRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const hoveredWordRef = useRef<number | null>(null);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);

  // ----------------------------------------
  // ACCESSIBILITY
  // ----------------------------------------

  useEffect(() => {
    const media = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

    const update = () => setReducedMotion(media.matches);

    update();
    media.addEventListener('change', update);

    return () => media.removeEventListener('change', update);
  }, []);

  // Recalculate word positions when the layout changes.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let lastWidth = stage.clientWidth;
    let lastHeight = stage.clientHeight;

    const observer = new ResizeObserver(() => {
      if (
        Math.abs(stage.clientWidth - lastWidth) > 2 ||
        Math.abs(stage.clientHeight - lastHeight) > 2
      ) {
        lastWidth = stage.clientWidth;
        lastHeight = stage.clientHeight;

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

  // ----------------------------------------
  // MAIN ANIMATION
  // ----------------------------------------

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

      // ------------------------------------
      // 1. SPHERE DIMENSIONS
      // ------------------------------------

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

      // Measure the final position of each word.
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

        if (instructionRef.current) {
          instructionRef.current.textContent =
            'POEM SHOWN WITHOUT ANIMATION';
        }

        return;
      }

      // ------------------------------------
      // 2. SCROLL STATE
      // ------------------------------------

      // scroll: raw ScrollTrigger progress
      // progress: actual sphere-to-poem transformation
      const motion = {
        scroll: 0,
        progress: 0,
      };

      let orbitAngle = 0;
      let orbitSpeed = SETTINGS.idleSpeed;
      let isVisible = false;

      const hoverAmounts = WORDS.map(() => 0);

      const pointer = {
        targetAngle: 0,
        angle: 0,

        targetTilt: 0.16,
        tilt: 0.16,

        inside: false,
      };

      let previousPointer: {
        x: number;
        y: number;
      } | null = null;

      // ------------------------------------
      // 3. MOUSE INTERACTION
      // ------------------------------------

      const onPointerEnter = (event: PointerEvent) => {
        if (event.pointerType === 'touch') return;

        pointer.inside = true;

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

        pointer.inside = true;

        const rect = stage.getBoundingClientRect();

        const normalizedX = gsap.utils.clamp(
          -1,
          1,
          (
            event.clientX -
            rect.left -
            rect.width / 2
          ) / (rect.width / 2)
        );

        // Rotate opposite to horizontal mouse position.
        pointer.targetAngle =
          -normalizedX * SETTINGS.mouseRotation;

        if (previousPointer) {
          const dy = event.clientY - previousPointer.y;

          pointer.targetTilt = gsap.utils.clamp(
            -0.4,
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

        pointer.inside = false;
        pointer.targetAngle = 0;
        pointer.targetTilt = 0.16;

        hoveredWordRef.current = null;
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

      // Only render when the section is nearby.
      const visibilityObserver = new IntersectionObserver(
        ([entry]) => {
          isVisible = entry.isIntersecting;
        },
        { rootMargin: '100px' }
      );

      visibilityObserver.observe(section);

      // ------------------------------------
      // 4. SCROLLTRIGGER
      // ------------------------------------

      const trigger = ScrollTrigger.create({
        trigger: section,

        start: 'top top',
        end: 'bottom bottom',

        invalidateOnRefresh: true,

        onUpdate: (self) => {
          // Read scroll position.
          // Don't transform the sphere immediately.
          motion.scroll = self.progress;
        },

        onRefresh: (self) => {
          motion.scroll = self.progress;
        },
      });

      motion.scroll = trigger.progress;

      motion.progress = smoothstep(
        SETTINGS.startGather,
        SETTINGS.endGather,
        motion.scroll
      );

      // ------------------------------------
      // 5. FRAME RENDERING
      // ------------------------------------

      const render = (
        _time: number,
        deltaTime: number
      ) => {
        if (!isVisible) return;

        const dt = Math.min(deltaTime / 1000, 0.05);

        // Transform only AFTER the introductory scroll.
        const goal = smoothstep(
          SETTINGS.startGather,
          SETTINGS.endGather,
          motion.scroll
        );

        // Smoothly follow scroll progress.
        motion.progress +=
          (goal - motion.progress) *
          (1 - Math.exp(-10 * dt));

        const progress = motion.progress;

        // --------------------------------
        // ORBIT SPEED
        // --------------------------------

        const readingWord =
          hoveredWordRef.current !== null &&
          progress < 0.12;

        const targetSpeed = readingWord
          ? SETTINGS.hoveringSpeed
          : pointer.inside
            ? SETTINGS.exploringSpeed
            : SETTINGS.idleSpeed;

        orbitSpeed +=
          (targetSpeed - orbitSpeed) *
          (1 - Math.exp(-5 * dt));

        const orbitStrength =
          1 - smoothstep(0.06, 0.48, progress);

        orbitAngle +=
          dt * orbitSpeed * orbitStrength;

        // --------------------------------
        // SMOOTH MOUSE FOLLOW
        // --------------------------------

        pointer.angle +=
          (pointer.targetAngle - pointer.angle) *
          (
            1 -
            Math.exp(
              -SETTINGS.horizontalFollow * dt
            )
          );

        pointer.tilt +=
          (pointer.targetTilt - pointer.tilt) *
          (
            1 -
            Math.exp(
              -SETTINGS.verticalFollow * dt
            )
          );

        const angle = orbitAngle + pointer.angle;

        // Unfold sphere into flatter arrangement.
        const flatten = smoothstep(
          0.04,
          0.58,
          progress
        );

        // Gather words into the final poem.
        const gather = smoothstep(
          0.28,
          1,
          progress
        );

        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // --------------------------------
        // ANIMATE EACH WORD
        // --------------------------------

        points.forEach((point, i) => {
          const word = words[i]!;
          const end = ends[i];

          // Rotate around imaginary vertical axis.
          const x =
            point.x * cos + point.z * sin;

          const z =
            point.z * cos - point.x * sin;

          const y =
            point.y * Math.cos(pointer.tilt) -
            z * Math.sin(pointer.tilt);

          const depth =
            point.y * Math.sin(pointer.tilt) +
            z * Math.cos(pointer.tilt);

          // Perspective projection.
          const perspective =
            760 / (760 - depth * radius);

          const sphereX =
            x *
            radius *
            perspective *
            (1 + 0.28 * flatten);

          const sphereY =
            -y *
            radius *
            perspective *
            (1 - 0.65 * flatten);

          const sphereScale =
            0.70 + (depth + 1) * 0.20;

          const sphereOpacity =
            0.32 + (depth + 1) * 0.30;

          // --------------------------------
          // WORD HOVER EMPHASIS
          // --------------------------------

          const hoverTarget =
            hoveredWordRef.current === i &&
            progress < 0.12
              ? 1
              : 0;

          hoverAmounts[i] +=
            (hoverTarget - hoverAmounts[i]) *
            (
              1 -
              Math.exp(
                -SETTINGS.hoverFollow * dt
              )
            );

          const emphasis =
            hoverAmounts[i] * (1 - gather);

          word.classList.toggle(
            'is-hovered',
            emphasis > 0.1
          );

          // --------------------------------
          // FINAL TRANSFORMS
          // --------------------------------

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

            scale:
              gsap.utils.interpolate(
                sphereScale,
                1,
                gather
              ) *
              (
                1 +
                emphasis * SETTINGS.hoverScale
              ),

            rotation: gsap.utils.interpolate(
              -x * 12,
              0,
              gather
            ),

            opacity: gsap.utils.interpolate(
              Math.max(sphereOpacity, emphasis),
              1,
              gather
            ),
          });

          word.style.zIndex =
            emphasis > 0.1
              ? '999'
              : String(
                  Math.round(
                    100 + depth * 80
                  )
                );
        });

        // --------------------------------
        // SIMPLE SCROLL INSTRUCTIONS
        // --------------------------------

        if (instructionRef.current) {
          let label = 'SCROLL TO FIND THE WORDS ↓';

          if (motion.scroll >= SETTINGS.endGather) {
            label = 'SCROLL UP TO RELEASE THEM ↑';
          } else if (
            motion.scroll >= SETTINGS.startGather
          ) {
            label = 'KEEP SCROLLING ↓';
          }

          if (
            instructionRef.current.textContent !== label
          ) {
            instructionRef.current.textContent = label;
          }
        }
      };

      gsap.ticker.add(render);
      render(0, 16);

      // ------------------------------------
      // CLEANUP
      // ------------------------------------

      return () => {
        gsap.ticker.remove(render);
        visibilityObserver.disconnect();

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

        hoveredWordRef.current = null;
        trigger.kill();
      };
    },
    {
      scope: sectionRef,
      dependencies: [layoutVersion, reducedMotion],
      revertOnUpdate: true,
    }
  );

  // ----------------------------------------
  // PAGE STRUCTURE
  // ----------------------------------------

  return (
    <section
      id="sphere-poem"
      ref={sectionRef}
      className={`sphere-experiment${
        reducedMotion
          ? ' sphere-reduced-motion'
          : ''
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
          className="sphere-stage"
          ref={stageRef}
        >
          <p className="sphere-sr-only">
            {FULL_POEM}
          </p>

          {/* Invisible layout for measuring word positions */}
          <div
            className="sphere-final-layout"
            ref={finalLayoutRef}
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
                      (sum, current) =>
                        sum + current.length,
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

          {/* Orbiting words forming the invisible sphere */}
          <div
            className="sphere-word-layer"
            aria-hidden="true"
          >
            {WORDS.map((word, index) => (
              <span
                key={index}
                className="sphere-word"
                ref={(element) => {
                  wordRefs.current[index] =
                    element;
                }}
                onPointerEnter={(event) => {
                  if (event.pointerType !== 'touch') {
                    hoveredWordRef.current = index;
                  }
                }}
                onPointerLeave={() => {
                  if (
                    hoveredWordRef.current === index
                  ) {
                    hoveredWordRef.current = null;
                  }
                }}
              >
                {word}
              </span>
            ))}
          </div>

          {!reducedMotion && (
            <p className="sphere-pointer-hint">
              MOVE YOUR CURSOR TO EXPLORE THE WORDS
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
              The words are mine. You help them
              find a shape.
            </p>
          </div>

          <p
            ref={instructionRef}
            className="sphere-instruction"
          >
            {reducedMotion
              ? 'POEM SHOWN WITHOUT ANIMATION'
              : 'SCROLL TO FIND THE WORDS ↓'}
          </p>
        </footer>

      </div>
    </section>
  );
}
