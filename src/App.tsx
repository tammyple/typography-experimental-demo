
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { gsap } from 'gsap';
import SphereToPoem from './SphereToPoem';
import './styles.css';

type Effect = 'still' | 'float' | 'scramble' | 'type';

const WORD = 'ARCHIVE';

const EFFECTS: {
  id: Effect;
  label: string;
  hoverHint: string;
  selectedHint: string;
}[] = [
  {
    id: 'still',
    label: 'STILL',
    hoverHint: 'Every letter returns to its original place.',
    selectedHint: 'Everything is still.',
  },
  {
    id: 'float',
    label: 'FLOAT',
    hoverHint: 'Letters drift and bounce between the lines.',
    selectedHint: 'Grab a letter, move it, and throw it.',
  },
  {
    id: 'scramble',
    label: 'SCRAMBLE',
    hoverHint: 'Letters change before finding their way back.',
    selectedHint: 'Watch the letters scramble, then resolve.',
  },
  {
    id: 'type',
    label: 'TYPE',
    hoverHint: 'The word reveals itself one letter at a time.',
    selectedHint: 'Watch the word being typed out.',
  },
];

const FLOAT = {
  speed: 42,
  drift: 8,
  padding: 22,
  floatBounce: 0.8,
  throwBounce: 0.96,
  throwMultiplier: 0.85,
  maxThrowSpeed: 620,
  minThrowSpeed: 75,
};

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
          key={`${letter}-${i}`}
          className="preview-letter"
          style={{ '--i': i } as CSSProperties}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}

export default function App() {
  const [effect, setEffect] = useState<Effect>('still');
  const [replay, setReplay] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Temporary instruction / effect description.
  const [hint, setHint] = useState(
    'Choose an effect to bring the words to life.'
  );
  const [hintVisible, setHintVisible] = useState(true);

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const hintTimer = useRef<number | null>(null);

  // ========================================
  // CONTEXTUAL HINTS
  // ========================================

  const showHint = useCallback(
    (message: string, milliseconds = 3000) => {
      // Cancel the old timer, if any.
      if (hintTimer.current !== null) {
        window.clearTimeout(hintTimer.current);
      }

      setHint(message);
      setHintVisible(true);

      // Fade after approximately three seconds.
      hintTimer.current = window.setTimeout(() => {
        setHintVisible(false);
      }, milliseconds);
    },
    []
  );

  useEffect(() => {
    // The opening hint is visible for three seconds.
    hintTimer.current = window.setTimeout(() => {
      setHintVisible(false);
    }, 3000);

    return () => {
      if (hintTimer.current !== null) {
        window.clearTimeout(hintTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!aboutOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAboutOpen(false);
      }
    };

    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('keydown', onEscape);
    };
  }, [aboutOpen]);

  function selectEffect(next: Effect) {
    const selected = EFFECTS.find(
      (item) => item.id === next
    )!;

    // Clicking displays the relevant instruction.
    showHint(selected.selectedHint, 3000);

    if (next === effect) {
      // Clicking SCRAMBLE or TYPE again replays it.
      if (next === 'scramble' || next === 'type') {
        setReplay((n) => n + 1);
      }
    } else {
      setEffect(next);
    }
  }

  // ========================================
  // MAIN TYPOGRAPHY ANIMATIONS
  // ========================================

  useLayoutEffect(() => {
    const stage = stageRef.current;

    const letters = letterRefs.current.filter(
      (node): node is HTMLSpanElement => node !== null
    );

    if (!stage || letters.length !== WORD.length) return;

    let removeTicker: (() => void) | undefined;
    const removeHandlers: Array<() => void> = [];

    const ctx = gsap.context(() => {
      // Always restore the original text first.
      letters.forEach((letter, i) => {
        letter.textContent = WORD[i];
      });

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

        const particles: Particle[] = letters.map(
          (el, index) => {
            const rect = el.getBoundingClientRect();

            const theta =
              (index / letters.length) * Math.PI * 2 +
              0.4;

            const homeVx =
              Math.cos(theta) * FLOAT.speed;

            const homeVy =
              Math.sin(theta) * FLOAT.speed;

            const minX =
              bounds.left + FLOAT.padding - rect.left;

            const maxX =
              bounds.right - FLOAT.padding - rect.right;

            const minY =
              bounds.top + FLOAT.padding - rect.top;

            const maxY =
              bounds.bottom - FLOAT.padding - rect.bottom;

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

        // ====================================
        // POINTER EVENTS
        // ====================================

        particles.forEach((p) => {
          const onDown = (event: PointerEvent) => {
            if (event.button !== 0 || p.dragging) {
              return;
            }

            event.preventDefault();

            p.dragging = true;
            p.pointerId = event.pointerId;

            p.startPointerX = event.clientX;
            p.startPointerY = event.clientY;
            p.startX = p.x;
            p.startY = p.y;

            p.lastPointerX = event.clientX;
            p.lastPointerY = event.clientY;
            p.lastMoveAt = performance.now();

            p.releaseVX = 0;
            p.releaseVY = 0;
            p.throwStrength = 0;

            p.el.classList.add('is-dragging');
            p.el.setPointerCapture(event.pointerId);
          };

          const onMove = (event: PointerEvent) => {
            if (
              !p.dragging ||
              p.pointerId !== event.pointerId
            ) {
              return;
            }

            const now = performance.now();

            const dt = Math.max(
              (now - p.lastMoveAt) / 1000,
              0.008
            );

            const vx =
              (event.clientX - p.lastPointerX) / dt;

            const vy =
              (event.clientY - p.lastPointerY) / dt;

            p.releaseVX =
              0.35 * p.releaseVX + 0.65 * vx;

            p.releaseVY =
              0.35 * p.releaseVY + 0.65 * vy;

            p.lastMoveAt = now;
            p.lastPointerX = event.clientX;
            p.lastPointerY = event.clientY;

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
              p.el.releasePointerCapture(event.pointerId);
            }

            const moving =
              performance.now() - p.lastMoveAt < 110;

            const vx = moving
              ? p.releaseVX * FLOAT.throwMultiplier
              : 0;

            const vy = moving
              ? p.releaseVY * FLOAT.throwMultiplier
              : 0;

            const magnitude = Math.hypot(vx, vy);

            if (magnitude >= FLOAT.minThrowSpeed) {
              const scale = Math.min(
                1,
                FLOAT.maxThrowSpeed / magnitude
              );

              p.vx = vx * scale;
              p.vy = vy * scale;
              p.throwStrength = 1;
            } else {
              p.vx = p.homeVx;
              p.vy = p.homeVy;
              p.throwStrength = 0;
            }
          };

          p.el.addEventListener('pointerdown', onDown);
          p.el.addEventListener('pointermove', onMove);
          p.el.addEventListener('pointerup', release);
          p.el.addEventListener('pointercancel', release);

          removeHandlers.push(() => {
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

            if (
              p.pointerId !== null &&
              p.el.hasPointerCapture(p.pointerId)
            ) {
              p.el.releasePointerCapture(p.pointerId);
            }
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
              // Thrown letters slowly lose energy.
              p.throwStrength *= Math.exp(
                -0.9 * dt
              );

              const returning =
                1 - Math.exp(-0.65 * dt);

              p.vx +=
                (p.homeVx - p.vx) * returning;

              p.vy +=
                (p.homeVy - p.vy) * returning;

              // Subtle floating drift.
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

              p.x += p.vx * dt;
              p.y += p.vy * dt;

              const bounce =
                FLOAT.floatBounce +
                (FLOAT.throwBounce -
                  FLOAT.floatBounce) *
                  p.throwStrength;

              let hitX = false;
              let hitY = false;

              // Horizontal boundaries.
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

              // Vertical boundaries.
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

              if (hitX || hitY) {
                p.squashAxis = hitX ? 'x' : 'y';

                p.squash =
                  p.throwStrength > 0.2
                    ? 0.13
                    : 0.06;

                p.squashVelocity = 0;
              }
            }

            // Damped elastic recovery.
            p.squashVelocity +=
              (-100 * p.squash -
                12 * p.squashVelocity) * dt;

            p.squash += p.squashVelocity * dt;

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
                : p.squashAxis === 'x'
                  ? 1 - p.squash
                  : 1 + p.squash * 0.4,

              scaleY: p.dragging
                ? 1.08
                : p.squashAxis === 'y'
                  ? 1 - p.squash
                  : 1 + p.squash * 0.4,

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
      // SCRAMBLE — CHARACTER DECODING
      // ======================================


      if (effect === 'scramble') {
        const characters =
          'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?#%';
      
        // Keep each letter's original width so the
        // overall composition doesn't jump around.
        const widths = letters.map(
          (letter) => letter.getBoundingClientRect().width
        );
      
        letters.forEach((letter, i) => {
          gsap.set(letter, {
            width: widths[i],
            textAlign: 'center',
          });
        });
      
        const state = { progress: 0 };
      
        // Limit how often the random glyphs change.
        let previousFrame = -1;
      
        function randomCharacter() {
          return characters[
            Math.floor(Math.random() * characters.length)
          ];
        }
      
        function updateScramble() {
          // How many letters have been permanently revealed?
          const lockedCount = Math.min(
            WORD.length,
            Math.floor(state.progress * WORD.length)
          );
      
          // Change random characters about 28 times per second.
          const currentFrame = Math.floor(
            state.progress * 28
          );
      
          if (
            currentFrame === previousFrame &&
            lockedCount < WORD.length
          ) {
            return;
          }
      
          previousFrame = currentFrame;
      
          letters.forEach((letter, i) => {
            if (i < lockedCount) {
              // This letter has been decoded.
              // It never scrambles again during this cycle.
              letter.textContent = WORD[i];
            } else {
              // This letter is still being decoded.
              letter.textContent = randomCharacter();
            }
          });
        }
      
        const timeline = gsap.timeline({
          repeat: -1,
          repeatDelay: 1.6,
        });
      
        timeline
          .call(() => {
            // Begin each cycle with ALL letters scrambled.
            state.progress = 0;
            previousFrame = -1;
            updateScramble();
          })
          .to(state, {
            progress: 1,
            duration: 1.05,
            ease: 'none',
      
            onUpdate: updateScramble,
      
            onComplete: () => {
              // Ensure the final word is always correct.
              letters.forEach((letter, i) => {
                letter.textContent = WORD[i];
              });
            },
          });
      }
      

      // ======================================
      // TYPE — CHARACTER REVEAL
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
                el.classList.remove('typing-current');
              });

              letter.classList.add('typing-current');
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
              el.classList.remove('typing-current');
            });
          },
          [],
          WORD.length * 0.2 + 0.5
        );
      }
    }, sectionRef);

    // Clean up when switching effects.
    return () => {
      removeTicker?.();

      removeHandlers.forEach((remove) => {
        remove();
      });

      ctx.revert();

      letters.forEach((letter, i) => {
        letter.classList.remove('typing-current');
        letter.textContent = WORD[i];
      });
    };
  }, [effect, replay]);

  // ========================================
  // PAGE STRUCTURE
  // ========================================

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

        <div
          id="home"
          ref={stageRef}
          className="playground-stage"
        >
          <h1
            className={`artwork mode-${effect}`}
            aria-label={WORD}
          >
            {WORD.split('').map((character, i) => (
              <span
                key={`${character}-${i}`}
                ref={(el) => {
                  letterRefs.current[i] = el;
                }}
                className="art-letter"
                aria-hidden="true"
              >
                {character}
              </span>
            ))}
          </h1>
        </div>

        <footer className="playground-footer">
          <p className="playground-mode">
            CURRENT MODE / {effect.toUpperCase()}
          </p>

          <nav
            className="playground-effects"
            aria-label="Typography effects"
          >
            {EFFECTS.map(
              ({ id, label, hoverHint }) => (
                <button
                  key={id}
                  type="button"
                  aria-label={`${label.toLowerCase()} typography effect`}
                  aria-pressed={effect === id}
                  onMouseEnter={() =>
                    showHint(hoverHint, 2700)
                  }
                  onFocus={() =>
                    showHint(hoverHint, 2700)
                  }
                  onClick={() => selectEffect(id)}
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
              )
            )}
          </nav>

          {/* Temporary, contextual instruction */}
          <p
            className={`playground-caption ${
              hintVisible ? 'is-visible' : ''
            }`}
            aria-live="polite"
          >
            {hint}
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
                onClick={() => setAboutOpen(false)}
                aria-label="Close about"
                className="cursor-pointer text-2xl"
              >
                ×
              </button>
            </div>

            <p className="mt-7 leading-relaxed">
              Tsunami of Words explores how letters
              float, scramble, and assemble into
              language.
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
