
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
  } from 'react';
  
  import { gsap } from 'gsap';
  
  import {
    EFFECTS,
    WORD,
    type Effect,
  } from '../experiments/words-in-motion/effects/config';
  
  import {
    startFloat,
    type FloatController,
  } from '../experiments/words-in-motion/effects/float';
  
  import { playScramble } from '../experiments/words-in-motion/effects/scramble';
  import { playType } from '../experiments/words-in-motion/effects/type';
  
  import '../styles/words-in-motion.css';
  
  // ----------------------------------------
  // EFFECT LABELS
  // ----------------------------------------
  
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
  
  export default function WordsInMotion() {
    // ----------------------------------------
    // REACT STATE
    // ----------------------------------------
  
    const [effect, setEffect] =
      useState<Effect>('still');
  
    const [replay, setReplay] = useState(0);
  
    const [isReturning, setIsReturning] =
      useState(false);
  
    const [aboutOpen, setAboutOpen] =
      useState(false);
  
    const [hint, setHint] = useState(
      'Choose an effect to bring the words to life.'
    );
  
    const [hintVisible, setHintVisible] =
      useState(true);
  
    // ----------------------------------------
    // ELEMENT REFERENCES
    // ----------------------------------------
  
    const sectionRef = useRef<HTMLElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
  
    const letterRefs =
      useRef<(HTMLSpanElement | null)[]>([]);
  
    const floatRef =
      useRef<FloatController | null>(null);
  
    const transitioningRef = useRef(false);
  
    const hintTimerRef =
      useRef<number | null>(null);
  
    // ----------------------------------------
    // CONTEXTUAL INSTRUCTIONS
    // ----------------------------------------
  
    const showHint = useCallback(
      (message: string, duration = 3000) => {
        if (hintTimerRef.current !== null) {
          window.clearTimeout(hintTimerRef.current);
        }
  
        setHint(message);
        setHintVisible(true);
  
        hintTimerRef.current = window.setTimeout(
          () => setHintVisible(false),
          duration
        );
      },
      []
    );
  
    useEffect(() => {
      hintTimerRef.current = window.setTimeout(
        () => setHintVisible(false),
        3000
      );
  
      return () => {
        if (hintTimerRef.current !== null) {
          window.clearTimeout(hintTimerRef.current);
        }
      };
    }, []);
  
    // ----------------------------------------
    // ABOUT MODAL
    // ----------------------------------------
  
    useEffect(() => {
      if (!aboutOpen) return;
  
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setAboutOpen(false);
        }
      };
  
      document.addEventListener('keydown', onKey);
  
      return () => {
        document.removeEventListener('keydown', onKey);
      };
    }, [aboutOpen]);
  
    // ----------------------------------------
    // ANIMATION CONTROLLER
    // ----------------------------------------
  
    useLayoutEffect(() => {
      const stage = stageRef.current;
  
      const letters = letterRefs.current.filter(
        (el): el is HTMLSpanElement =>
          el !== null
      );
  
      if (
        !stage ||
        letters.length !== WORD.length
      ) {
        return;
      }
  
      // Reset the letters before entering the next mode.
      gsap.killTweensOf(letters);
  
      letters.forEach((el, i) => {
        el.textContent = WORD[i];
  
        el.classList.remove(
          'typing-current',
          'is-dragging'
        );
  
        el.style.removeProperty('width');
        el.style.removeProperty('text-align');
      });
  
      gsap.set(letters, {
        x: 0,
        y: 0,
        rotation: 0,
        skewX: 0,
        scaleX: 1,
        scaleY: 1,
        autoAlpha: 1,
      });
  
      // Accessibility: don't animate when reduced
      // motion is requested.
      if (
        window.matchMedia(
          '(prefers-reduced-motion: reduce)'
        ).matches
      ) {
        return;
      }
  
      // ------------------------------------
      // FLOAT
      // ------------------------------------
  
      if (effect === 'float') {
        const controller = startFloat(
          stage,
          letters
        );
  
        floatRef.current = controller;
  
        return () => {
          controller.dispose();
  
          if (floatRef.current === controller) {
            floatRef.current = null;
          }
        };
      }
  
      // ------------------------------------
      // SCRAMBLE
      // ------------------------------------
  
      if (effect === 'scramble') {
        return playScramble(letters, WORD);
      }
  
      // ------------------------------------
      // TYPE
      // ------------------------------------
  
      if (effect === 'type') {
        return playType(letters);
      }
  
      // STILL requires no animation.
    }, [effect, replay]);
  
    // ----------------------------------------
    // SWITCH EFFECTS
    // ----------------------------------------
  
    function selectEffect(next: Effect) {
      // Prevent conflicting selections while
      // FLOAT is returning home.
      if (transitioningRef.current) return;
  
      const option = EFFECTS.find(
        (item) => item.id === next
      )!;
  
      // ------------------------------------
      // FLOAT -> OTHER EFFECT
      // ------------------------------------
  
      if (
        effect === 'float' &&
        next !== 'float' &&
        floatRef.current
      ) {
        transitioningRef.current = true;
        setIsReturning(true);
  
        floatRef.current.returnHome(() => {
          // Switch only after the return animation.
          setEffect(next);
          setIsReturning(false);
          transitioningRef.current = false;
  
          showHint(option.selectedHint);
        });
  
        return;
      }
  
      // ------------------------------------
      // NORMAL SWITCH
      // ------------------------------------
  
      showHint(option.selectedHint);
  
      if (next === effect) {
        // Replay one-shot animations.
        if (
          next === 'scramble' ||
          next === 'type'
        ) {
          setReplay((n) => n + 1);
        }
      } else {
        setEffect(next);
      }
    }
  
    // ----------------------------------------
    // PAGE LAYOUT
    // ----------------------------------------
  
    return (
      <section
        ref={sectionRef}
        className="playground-screen"
        aria-label="Tsunami of Words typography playground"
      >
        <header className="playground-header">
          <a
            href="#/experiments"
            className="hover:opacity-60"
          >
            TSUNAMI OF WORDS
          </a>
  
          <div className="flex items-center gap-6">
            <a href="#/experiments" className="hover:underline">
              INDEX ↗
            </a>
            <a
              href="#/experiments/finding-form"
              className="hover:underline"
            >
              NEXT ↘
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
  
        {/* First horizontal divider */}
        <div className="playground-divider" />
  
        {/* Typography animation stage */}
        <div
          id="home"
          ref={stageRef}
          className="playground-stage"
        >
          <h1
            className={`artwork mode-${effect}${
              isReturning ? ' is-returning' : ''
            }`}
            aria-label={WORD}
          >
            {WORD.split('').map((char, i) => (
              <span
                key={`${char}-${i}`}
                className="art-letter"
                aria-hidden="true"
                ref={(el) => {
                  letterRefs.current[i] = el;
                }}
              >
                {char}
              </span>
            ))}
          </h1>
        </div>
  
        {/* Effect selection */}
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
                  type="button"
                  key={id}
                  disabled={isReturning}
                  aria-label={`${label.toLowerCase()} typography effect`}
                  aria-pressed={effect === id}
                  onMouseEnter={() => {
                    if (!isReturning) {
                      showHint(hoverHint, 2700);
                    }
                  }}
                  onFocus={() => {
                    if (!isReturning) {
                      showHint(hoverHint, 2700);
                    }
                  }}
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
  
          <p
            className={`playground-caption ${
              hintVisible ? 'is-visible' : ''
            }`}
            aria-live="polite"
          >
            {hint}
          </p>
        </footer>
  
        {/* About dialog */}
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
                moves, changes, and becomes language.
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
      </section>
    );
  }
  