
import { gsap } from 'gsap';

const CHARACTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?%#';

/**
 * Play one left-to-right decoding reveal.
 * Returns a cleanup function.
 */
export function playScramble(
  letters: HTMLSpanElement[],
  word: string
) {
  // Fix character widths while random glyphs change.
  const widths = letters.map(
    (el) => el.getBoundingClientRect().width
  );

  letters.forEach((el, i) => {
    el.style.width = `${widths[i]}px`;
    el.style.textAlign = 'center';
  });

  const state = { progress: 0 };

  let previousFrame = -1;
  let previousLocked = -1;

  const render = () => {
    const locked = Math.min(
      word.length,
      Math.floor(state.progress * word.length)
    );

    // Roughly 55 character updates per second.
    const frame = Math.floor(state.progress * 30);

    if (
      frame === previousFrame &&
      locked === previousLocked
    ) {
      return;
    }

    previousFrame = frame;
    previousLocked = locked;

    letters.forEach((el, i) => {
      if (i < locked) {
        // Revealed letters remain permanently correct.
        el.textContent = word[i];
      } else {
        // Unrevealed letters keep changing rapidly.
        let next = word[i];

        while (next === word[i]) {
          next = CHARACTERS[
            Math.floor(Math.random() * CHARACTERS.length)
          ];
        }

        el.textContent = next;
      }
    });
  };

  // Start with all characters scrambled.
  render();

  const tween = gsap.to(state, {
    progress: 1,
    duration: 0.55,
    ease: 'none',
    onUpdate: render,

    onComplete: () => {
      letters.forEach((el, i) => {
        el.textContent = word[i];
      });
    },
  });

  return () => {
    tween.kill();

    letters.forEach((el, i) => {
      el.textContent = word[i];
      el.style.removeProperty('width');
      el.style.removeProperty('text-align');
    });
  };
}
