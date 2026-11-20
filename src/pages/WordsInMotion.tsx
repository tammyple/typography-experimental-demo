
import {
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
  
        });
  
        return;
      }
  
      // ------------------------------------
      // NORMAL SWITCH
      // ------------------------------------
  
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
          <nav
            className="playground-effects"
            aria-label="Typography effects"
          >
            {EFFECTS.map(
              ({ id, label }) => (
                <button
                  type="button"
                  key={id}
                  disabled={isReturning}
                  aria-label={`${label.toLowerCase()} typography effect`}
                  aria-pressed={effect === id}
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
  
        </footer>
      </section>
    );
  }
  