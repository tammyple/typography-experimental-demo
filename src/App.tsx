
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import { gsap } from 'gsap';
import SphereToPoem from './SphereToPoem';
import './styles.css';

type Effect = 'still' | 'float' | 'distort' | 'type';

const EFFECTS: { id: Effect; label: string }[] = [
  { id: 'still', label: 'STILL' },
  { id: 'float', label: 'FLOAT' },
  { id: 'distort', label: 'DISTORT' },
  { id: 'type', label: 'TYPE' },
];

const WORD = 'WORDS';

// ----------------------------------------
// FLOAT SETTINGS
// ----------------------------------------

const FLOAT = {
  speed: 42,
  drift: 8,
  padding: 22,

  floatBounce: 0.80,
  throwBounce: 0.96,

  throwMultiplier: 0.85,
  maxThrowSpeed: 620,
  minThrowSpeed: 75,
};

function EffectLabel({
  label,
  effect,
}: {
  label: string;
  effect: Effect;
}) {
  return (
    <span
      className={`preview preview-${effect}`}
      aria-hidden="true"
    >
      {label.split('').map((letter, i) => (
        <span
          className="preview-letter"
          key={`${letter}-${i}`}
          style={{ '--i': i } as CSSProperties}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}

// Each floating letter has its own physics state.
type Particle = {
  el: HTMLSpanElement;
  index: number;

  x: number;
  y: number;

  vx: number;
  vy: number;

  homeVx: number;
  homeVy: number;

  minX: number;
  maxX: number;
  minY: number;
  maxY: number;

  throwStrength: number;

  dragging: boolean;
  pointerId: number | null;

  startPointerX: number;
  startPointerY: number;
  startX: number;
  startY: number;

  lastPointerX: number;
  lastPointerY: number;
  lastMoveAt: number;

  releaseVX: number;
  releaseVY: number;

  squash: number;
  squashVelocity: number;
  squashAxis: 'x' | 'y';
};

export default function App() {
  const [effect, setEffect] = useState<Effect>('still');
  const [aboutOpen, setAboutOpen] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const letterRefs =
    useRef<(HTMLSpanElement | null)[]>([]);

  const displacementRef =
    useRef<SVGFEDisplacementMapElement>(null);

  // ----------------------------------------
  // ABOUT MODAL
  // ----------------------------------------

  useEffect(() => {
    if (!aboutOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAboutOpen(false);
      }
    };

    document.addEventListener(
      'keydown',
      closeOnEscape
    );

    return () => {
      document.removeEventListener(
        'keydown',
        closeOnEscape
      );
    };
  }, [aboutOpen]);

  // ----------------------------------------
  // MAIN TYPOGRAPHY EFFECTS
  // ----------------------------------------

  useLayoutEffect(() => {
    const stage = stageRef.current;

    const letters = letterRefs.current.filter(
      (el): el is HTMLSpanElement => el !== null
    );

    if (!stage || letters.length !== WORD.length) {
      return;
    }

    const cleanupHandlers: Array<() => void> = [];
    let removeTicker: (() => void) | undefined;

    const ctx = gsap.context(() => {
      // Reset when switching effects.
      gsap.set(letters, {
        x: 0,
        y: 0,
        rotation: 0,
        skewX: 0,
        scale: 1,
        scaleX: 1,
        scaleY: 1,
        autoAlpha: 1,
      });

      // Keep the text static for reduced-motion users.
      if (
        window.matchMedia(
          '(prefers-reduced-motion: reduce)'
        ).matches
      ) {
        return;
      }

      // ======================================
      // FLOAT — GRAB, THROW AND BOUNCE
      // ======================================

      if (effect === 'float') {
        const bounds = stage.getBoundingClientRect();

        // Give every letter its own position,
        // velocity, boundaries and drag state.
        const particles: Particle[] = letters.map(
          (el, index) => {
            const rect = el.getBoundingClientRect();

            const theta =
              (index / letters.length) *
                Math.PI * 2 +
              0.4;

            const homeVx =
              Math.cos(theta) * FLOAT.speed;

            const homeVy =
              Math.sin(theta) * FLOAT.speed;

            // Letter-specific movement boundaries.
            const minX =
              bounds.left +
              FLOAT.padding -
              rect.left;

            const maxX =
              bounds.right -
              FLOAT.padding -
              rect.right;

            const minY =
              bounds.top +
              FLOAT.padding -
              rect.top;

            const maxY =
              bounds.bottom -
              FLOAT.padding -
              rect.bottom;

            return {
              el,
              index,

              x: 0,
              y: 0,

              vx: homeVx,
              vy: homeVy,

              homeVx,
              homeVy,

              minX: Math.min(minX, maxX),
              maxX: Math.max(minX, maxX),
              minY: Math.min(minY, maxY),
              maxY: Math.max(minY, maxY),

              throwStrength: 0,

              dragging: false,
              pointerId: null,

              startPointerX: 0,
              startPointerY: 0,
              startX: 0,
              startY: 0,

              lastPointerX: 0,
              lastPointerY: 0,
              lastMoveAt: 0,

              releaseVX: 0,
              releaseVY: 0,

              squash: 0,
              squashVelocity: 0,
              squashAxis: 'x',
            };
          }
        );

        const clamp = gsap.utils.clamp;
        const now = () => performance.now();

        // ====================================
        // POINTER EVENTS FOR EVERY LETTER
        // ====================================

        particles.forEach((p) => {
          // --------------------------------
          // GRAB
          // --------------------------------

          const onDown = (event: PointerEvent) => {
            if (event.button !== 0 || p.dragging) {
              return;
            }

            event.preventDefault();

            p.dragging = true;
            p.pointerId = event.pointerId;

            // Record the cursor position when grabbed.
            p.startPointerX = event.clientX;
            p.startPointerY = event.clientY;

            // Record the letter's current position.
            p.startX = p.x;
            p.startY = p.y;

            p.lastPointerX = event.clientX;
            p.lastPointerY = event.clientY;
            p.lastMoveAt = now();

            p.releaseVX = 0;
            p.releaseVY = 0;
            p.throwStrength = 0;

            p.el.classList.add('is-dragging');

            // Continue receiving pointer events even
            // when dragging outside the letter.
            p.el.setPointerCapture(event.pointerId);
          };

          // --------------------------------
          // DRAG
          // --------------------------------

          const onMove = (event: PointerEvent) => {
            if (
              !p.dragging ||
              p.pointerId !== event.pointerId
            ) {
              return;
            }

            const currentTime = now();

            const seconds = Math.max(
              (currentTime - p.lastMoveAt) / 1000,
              0.008
            );

            // How quickly is the cursor moving?
            const vx =
              (event.clientX - p.lastPointerX) /
              seconds;

            const vy =
              (event.clientY - p.lastPointerY) /
              seconds;

            // Blend recent velocities so throwing
            // doesn't depend on a single event.
            p.releaseVX =
              0.35 * p.releaseVX + 0.65 * vx;

            p.releaseVY =
              0.35 * p.releaseVY + 0.65 * vy;

            p.lastMoveAt = currentTime;

            p.lastPointerX = event.clientX;
            p.lastPointerY = event.clientY;

            // Follow the cursor, but stay inside
            // the stage's invisible boundaries.
            p.x = clamp(
              p.minX,
              p.maxX,
              p.startX +
                event.clientX -
                p.startPointerX
            );

            p.y = clamp(
              p.minY,
              p.maxY,
              p.startY +
                event.clientY -
                p.startPointerY
            );
          };

          // --------------------------------
          // RELEASE / THROW
          // --------------------------------

          const release = (event: PointerEvent) => {
            if (
              !p.dragging ||
              p.pointerId !== event.pointerId
            ) {
              return;
            }

            p.dragging = false;
            p.pointerId = null;

            p.el.classList.remove('is-dragging');

            if (
              p.el.hasPointerCapture(event.pointerId)
            ) {
              p.el.releasePointerCapture(
                event.pointerId
              );
            }

            // If the cursor stopped before release,
            // don't create an artificial throw.
            const wasMoving =
              now() - p.lastMoveAt < 110;

            const vx = wasMoving
              ? p.releaseVX * FLOAT.throwMultiplier
              : 0;

            const vy = wasMoving
              ? p.releaseVY * FLOAT.throwMultiplier
              : 0;

            const speed = Math.hypot(vx, vy);

            if (speed >= FLOAT.minThrowSpeed) {
              // Limit very aggressive throws.
              const scale = Math.min(
                1,
                FLOAT.maxThrowSpeed / speed
              );

              p.vx = vx * scale;
              p.vy = vy * scale;

              // Use stronger bouncing temporarily.
              p.throwStrength = 1;
            } else {
              // Simply resume floating.
              p.vx = p.homeVx;
              p.vy = p.homeVy;
              p.throwStrength = 0;
            }
          };

          p.el.addEventListener(
            'pointerdown',
            onDown
          );

          p.el.addEventListener(
            'pointermove',
            onMove
          );

          p.el.addEventListener(
            'pointerup',
            release
          );

          p.el.addEventListener(
            'pointercancel',
            release
          );

          cleanupHandlers.push(() => {
            p.el.removeEventListener(
              'pointerdown',
              onDown
            );

            p.el.removeEventListener(
              'pointermove',
              onMove
            );

            p.el.removeEventListener(
              'pointerup',
              release
            );

            p.el.removeEventListener(
              'pointercancel',
              release
            );

            p.el.classList.remove('is-dragging');
          });
        });

        // ====================================
        // CONTINUOUS FLOATING PHYSICS
        // ====================================

        let elapsed = 0;

        const tick = (
          _time: number,
          deltaMs: number
        ) => {
          const dt = Math.min(
            deltaMs / 1000,
            0.04
          );

          elapsed += dt;

          for (const p of particles) {
            if (!p.dragging) {
              // --------------------------------
              // THROWN LETTERS SLOW DOWN
              // --------------------------------

              // Strong bounce gradually disappears.
              p.throwStrength *= Math.exp(
                -0.9 * dt
              );

              // Return toward gentle floating velocity.
              const returning =
                1 - Math.exp(-0.65 * dt);

              p.vx +=
                (p.homeVx - p.vx) * returning;

              p.vy +=
                (p.homeVy - p.vy) * returning;

              // Add subtle changes in direction.
              p.vx +=
                Math.sin(
                  elapsed * 0.72 +
                    p.index * 1.9
                ) *
                FLOAT.drift *
                dt;

              p.vy +=
                Math.cos(
                  elapsed * 0.56 +
                    p.index * 2.3
                ) *
                FLOAT.drift *
                dt;

              // Move according to velocity.
              p.x += p.vx * dt;
              p.y += p.vy * dt;

              // --------------------------------
              // CHOOSE BOUNCE STRENGTH
              // --------------------------------

              // Immediately after throwing, the
              // bounce is stronger. It gradually
              // returns to the float bounce.
              const bounce =
                FLOAT.floatBounce +
                (
                  FLOAT.throwBounce -
                  FLOAT.floatBounce
                ) *
                  p.throwStrength;

              let hitX = false;
              let hitY = false;

              // --------------------------------
              // LEFT / RIGHT BOUNDARIES
              // --------------------------------

              if (p.x <= p.minX) {
                p.x = p.minX;

                p.vx = Math.abs(p.vx) * bounce;
                p.homeVx = Math.abs(p.homeVx);

                hitX = true;
              } else if (p.x >= p.maxX) {
                p.x = p.maxX;

                p.vx = -Math.abs(p.vx) * bounce;
                p.homeVx = -Math.abs(p.homeVx);

                hitX = true;
              }

              // --------------------------------
              // TOP / BOTTOM BOUNDARIES
              // --------------------------------

              if (p.y <= p.minY) {
                p.y = p.minY;

                p.vy = Math.abs(p.vy) * bounce;
                p.homeVy = Math.abs(p.homeVy);

                hitY = true;
              } else if (p.y >= p.maxY) {
                p.y = p.maxY;

                p.vy = -Math.abs(p.vy) * bounce;
                p.homeVy = -Math.abs(p.homeVy);

                hitY = true;
              }

              // --------------------------------
              // SMALL ELASTIC BOUNCE
              // --------------------------------

              if (hitX || hitY) {
                p.squashAxis = hitX ? 'x' : 'y';

                p.squash =
                  p.throwStrength > 0.2
                    ? 0.13
                    : 0.06;

                p.squashVelocity = 0;
              }
            }

            // ==================================
            // DAMPED SPRING DEFORMATION
            // ==================================

            p.squashVelocity +=
              (
                -100 * p.squash -
                12 * p.squashVelocity
              ) * dt;

            p.squash +=
              p.squashVelocity * dt;

            const scaleX =
              p.squashAxis === 'x'
                ? 1 - p.squash
                : 1 + p.squash * 0.4;

            const scaleY =
              p.squashAxis === 'y'
                ? 1 - p.squash
                : 1 + p.squash * 0.4;

            // ==================================
            // UPDATE LETTER APPEARANCE
            // ==================================

            gsap.set(p.el, {
              x: p.x,
              y: p.y,

              rotation: p.dragging
                ? 0
                : Math.sin(
                    elapsed * 0.48 + p.index
                  ) * 4,

              scaleX: p.dragging
                ? 1.08
                : scaleX,

              scaleY: p.dragging
                ? 1.08
                : scaleY,

              zIndex: p.dragging ? 10 : 1,
            });
          }
        };

        gsap.ticker.add(tick);

        removeTicker = () => {
          gsap.ticker.remove(tick);
        };
      }

      // ======================================
      // DISTORT
      // ======================================

      if (effect === 'distort') {
        const map = displacementRef.current;

        if (map) {
          gsap.fromTo(
            map,
            { attr: { scale: 3 } },
            {
              attr: { scale: 17 },
              duration: 1.7,
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut',
            }
          );
        }

        gsap.to(letters, {
          skewX: (i) => i % 2 === 0 ? -7 : 7,
          scaleY: (i) => i % 2 === 0 ? 1.06 : 0.94,
          y: (i) => i % 2 === 0 ? -7 : 7,

          duration: 1.5,
          stagger: 0.12,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      // ======================================
      // TYPE
      // ======================================

      if (effect === 'type') {
        gsap.set(letters, {
          autoAlpha: 0,
          y: 7,
        });

        const timeline = gsap.timeline();

        letters.forEach((letter, i) => {
          const at = i * 0.2;

          timeline.call(
            () => {
              letters.forEach((el) => {
                el.classList.remove(
                  'typing-current'
                );
              });

              letter.classList.add(
                'typing-current'
              );
            },
            [],
            at
          );

          timeline.to(
            letter,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.06,
              ease: 'none',
            },
            at
          );
        });

        timeline.call(
          () => {
            letters.forEach((el) => {
              el.classList.remove(
                'typing-current'
              );
            });
          },
          [],
          WORD.length * 0.2 + 0.5
        );
      }
    }, sectionRef);

    // Clean up everything when changing modes.
    return () => {
      removeTicker?.();

      cleanupHandlers.forEach((remove) => {
        remove();
      });

      ctx.revert();

      letters.forEach((el) => {
        el.classList.remove('typing-current');
      });
    };
  }, [effect]);

  // ----------------------------------------
  // JSX
  // ----------------------------------------

  return (
    <main className="min-h-svh w-full bg-[#f3f1ec] text-[#171717]">
      <section
        ref={sectionRef}
        className="playground-screen"
        aria-label="Tsunami of Words typography playground"
      >
        <header className="playground-header">
          <a href="#home" className="hover:opacity-60">
            TSUNAMI OF WORDS
          </a>

          <div className="flex items-center gap-6">
            <a
              href="#sphere-poem"
              className="hover:underline"
            >
              SPHERE ↘
            </a>

            <button
              type="button"
              onClick={() => setAboutOpen(true)}
              className="cursor-pointer hover:opacity-60"
            >
              ABOUT ↗
            </button>
          </div>
        </header>

        <div className="playground-divider" />

        {/* Letters float within this stage */}
        <div
          id="home"
          ref={stageRef}
          className="playground-stage"
        >
          {/* SVG filter for DISTORT */}
          <svg
            className="filter-definitions"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <filter
                id="words-distortion"
                x="-10%"
                y="-20%"
                width="120%"
                height="140%"
              >
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.012 0.032"
                  numOctaves="2"
                  seed="4"
                  result="noise"
                />

                <feDisplacementMap
                  ref={displacementRef}
                  in="SourceGraphic"
                  in2="noise"
                  scale="3"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>
          </svg>

          <h1
            className={`artwork mode-${effect}`}
            aria-label={WORD}
          >
            {WORD.split('').map((char, i) => (
              <span
                key={`${char}-${i}`}
                ref={(el) => {
                  letterRefs.current[i] = el;
                }}
                className="art-letter"
                aria-hidden="true"
              >
                {char}
              </span>
            ))}
          </h1>
        </div>

        <footer className="playground-footer">
          <p
            className="playground-mode"
            aria-live="polite"
          >
            CURRENT MODE / {effect.toUpperCase()}
          </p>

          <nav
            className="playground-effects"
            aria-label="Typography effects"
          >
            {EFFECTS.map(({ id, label }) => (
              <button
                type="button"
                key={id}
                aria-label={`${label.toLowerCase()} typography effect`}
                aria-pressed={effect === id}
                onClick={() => setEffect(id)}
                className={`effect-control ${
                  effect === id ? 'is-active' : ''
                }`}
              >
                <EffectLabel
                  label={label}
                  effect={id}
                />

                <span
                  className="effect-underline"
                  aria-hidden="true"
                />
              </button>
            ))}
          </nav>

          <p className="playground-caption">
            Select an effect to change the typography.
          </p>
        </footer>
      </section>

      <SphereToPoem />

      {aboutOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setAboutOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            className="w-full max-w-[480px] bg-[#f3f1ec] p-7 shadow-2xl sm:p-10"
          >
            <div className="flex items-start justify-between gap-4">
              <h2
                id="about-title"
                className="font-serif text-4xl"
              >
                About this experiment.
              </h2>

              <button
                type="button"
                autoFocus
                aria-label="Close about"
                onClick={() => setAboutOpen(false)}
                className="cursor-pointer text-2xl"
              >
                ×
              </button>
            </div>

            <p className="mt-7 leading-relaxed">
              Tsunami of Words explores how typography
              changes when letters move, distort,
              and find their way into language.
            </p>

            <button
              type="button"
              onClick={() => setAboutOpen(false)}
              className="mt-8 border-b border-black pb-1 text-sm"
            >
              BACK TO EXPERIMENT ↗
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
